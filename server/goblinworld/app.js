const express = require('express')
const path = require('path')
const { createInitialWorld, createWorldFromTiledMap, GoblinWorld, createEvent } = require('./liveWorld')
const { getClassicRuntimeSnapshot } = require('./classicRuntime')
const { getRegisteredMap, loadRegisteredTiledMap } = require('./mapRegistry')
const { getControllerStatus, startGoblinLoop } = require('./openaiGoblin')
const { createWorldPersistence } = require('./persistence')

function createDefaultWorld(staticRoot) {
	const persistence = createWorldPersistence(path.join(staticRoot, '.goblinworld'))
	const persisted = persistence.loadSnapshot()
	if (persisted) return new GoblinWorld(enrichPersistedWorld(persisted, staticRoot), { staticRoot })
	return createFreshWorld(staticRoot)
}

function createFreshWorld(staticRoot) {
	try {
		const mapDefinition = getRegisteredMap('mulberryTown')
		const tiledMap = loadRegisteredTiledMap(staticRoot, 'mulberryTown')
		return new GoblinWorld(
			createWorldFromTiledMap(tiledMap, {
				name: mapDefinition.label,
				mapId: mapDefinition.id,
				staticRoot
			}),
			{ staticRoot }
		)
	} catch (error) {
		return new GoblinWorld(createInitialWorld(), { staticRoot })
	}
}

function enrichPersistedWorld(state, staticRoot) {
	if (!state || !state.map || !Array.isArray(state.map.actors)) return state
	try {
		const mapId = state.map.id || 'mulberryTown'
		const mapDefinition = getRegisteredMap(mapId)
		const tiledMap = loadRegisteredTiledMap(staticRoot, mapDefinition.id)
		const freshState = createWorldFromTiledMap(tiledMap, {
			name: state.map.name || mapDefinition.label,
			mapId: mapDefinition.id,
			staticRoot
		})
		state.map.id = state.map.id || freshState.map.id
		state.map.portalLinks = freshState.map.portalLinks
		if (Array.isArray(freshState.map.blocked) && freshState.map.blocked.length > 0) {
			state.map.blocked = freshState.map.blocked
		}
		const metadataById = new Map((freshState.map.actors || []).map(actor => [actor.id, actor]))
		const metadataByHome = new Map((freshState.map.actors || []).map(actor => [`${actor.name}|${actor.home.x}|${actor.home.y}`, actor]))
		const metadataByPosition = new Map((freshState.map.actors || []).map(actor => [`${actor.name}|${actor.x}|${actor.y}`, actor]))
		state.map.actors = state.map.actors.map(actor => {
			const home = actor.home || actor
			const metadata = metadataById.get(actor.id) || metadataByHome.get(`${actor.name}|${home.x}|${home.y}`) || metadataByPosition.get(`${actor.name}|${actor.x}|${actor.y}`)
			if (!metadata) return actor
			return {
				...actor,
				id: actor.id || metadata.id,
				entityType: actor.entityType || metadata.entityType || '',
				dialog: actor.dialog || metadata.dialog || '',
				wanders: actor.wanders === undefined ? metadata.wanders : actor.wanders,
				dialogBubbleEnabled: actor.dialogBubbleEnabled === undefined ? metadata.dialogBubbleEnabled : actor.dialogBubbleEnabled,
				bubbleData: actor.bubbleData === undefined ? metadata.bubbleData : actor.bubbleData,
				spriteKey: actor.spriteKey === undefined || actor.spriteKey === null ? metadata.spriteKey : actor.spriteKey,
				facing: actor.facing || metadata.facing,
				animation: actor.animation || metadata.animation,
				home: actor.home || metadata.home
			}
		})
	} catch (error) {}
	return state
}

function sendSse(res, event) {
	const payload = typeof event.toSse === 'function' ? event.toSse() : createEvent(event).toSse()
	res.write(payload)
}

function getPublicControllerStatus(loopOptions = {}) {
	return getControllerStatus(loopOptions)
}

function getAdminToken(options = {}) {
	return options.adminToken || process.env.GOBLINWORLD_ADMIN_TOKEN || ''
}

function isAuthorizedAdmin(req, token) {
	if (!token) return false
	const header = req.get('authorization') || ''
	return header === `Bearer ${token}`
}

function createGoblinWorldApp(options = {}) {
	const app = express()
	const staticRoot = options.staticRoot || path.join(__dirname, '..', '..')
	const world = options.world || createDefaultWorld(staticRoot)
	const persistence = options.persistence === false ? null : options.persistence || createWorldPersistence(path.join(staticRoot, '.goblinworld'))
	const loopOptions = options.loop || {}
	const adminToken = getAdminToken(options)
	const startedAt = Date.now()
	const clients = new Set()

	app.disable('x-powered-by')
	app.use(express.json({ limit: '64kb' }))

	function broadcast(event) {
		if (persistence) {
			persistence.appendEvent(event)
			persistence.saveSnapshot(world.getSnapshot())
		}
		clients.forEach(res => {
			sendSse(res, event)
		})
	}

	app.get('/api/live/state', (req, res) => {
		const snapshot = world.getSnapshot()
		const controller = {
			...getPublicControllerStatus(loopOptions),
			plan: snapshot.story && snapshot.story.directorPlan ? snapshot.story.directorPlan : null
		}
		delete snapshot.memory
		res.json({
			...snapshot,
			model: controller.model,
			controller,
			runtime: snapshot.runtime || getClassicRuntimeSnapshot(snapshot, { staticRoot })
		})
	})

	app.get('/api/live/health', (req, res) => {
		const snapshot = world.getSnapshot()
		const controller = {
			...getPublicControllerStatus(loopOptions),
			plan: snapshot.story && snapshot.story.directorPlan ? snapshot.story.directorPlan : null
		}
		res.json({
			ok: true,
			status: snapshot.status,
			turn: snapshot.turn,
			uptimeSeconds: Math.max(0, Math.round((Date.now() - startedAt) / 1000)),
			clients: clients.size,
			controller,
			persistence: {
				enabled: Boolean(persistence)
			},
			story: {
				phaseId: snapshot.story && snapshot.story.phaseId,
				sceneType: snapshot.story && snapshot.story.scene && snapshot.story.scene.sceneType,
				activeQuest: snapshot.tasks && snapshot.tasks.find(task => task.status === 'active' || task.status === 'combat')
					? snapshot.tasks.find(task => task.status === 'active' || task.status === 'combat').title
					: null
			},
			events: {
				buffered: Array.isArray(snapshot.events) ? snapshot.events.length : 0
			}
		})
	})

	app.post('/api/live/admin/reset', (req, res) => {
		if (!adminToken) {
			res.status(404).json({ ok: false })
			return
		}
		if (!isAuthorizedAdmin(req, adminToken)) {
			res.status(403).json({ ok: false })
			return
		}
		if (persistence && typeof persistence.clear === 'function') persistence.clear()
		const freshWorld = createFreshWorld(staticRoot)
		world.replaceState(freshWorld.state)
		const snapshot = world.getSnapshot()
		delete snapshot.memory
		res.json({
			ok: true,
			snapshot
		})
	})

	app.get('/api/live/events', (req, res) => {
		res.writeHead(200, {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache, no-transform',
			Connection: 'keep-alive',
			'X-Accel-Buffering': 'no'
		})
		res.write('retry: 2500\n\n')
		clients.add(res)

		world.getSnapshot().events.forEach(event => sendSse(res, event))

		req.on('close', () => {
			clients.delete(res)
		})
	})

	if (options.startLoop !== false) {
		const stopLoop = startGoblinLoop(world, broadcast, loopOptions)
		app.locals.stopGoblinWorld = stopLoop
	}

	app.use('/v1', express.static(path.join(staticRoot, 'legacy/v1')))
	app.use('/v2', express.static(path.join(staticRoot, 'legacy/v2')))
	app.use('/v3', express.static(path.join(staticRoot, 'legacy/v3')))
	app.use(express.static(path.join(staticRoot, 'dist')))
	app.get('*', (req, res) => {
		res.sendFile(path.join(staticRoot, 'dist/index.html'))
	})

	return app
}

module.exports = {
	createGoblinWorldApp
}
