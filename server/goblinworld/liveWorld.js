const fs = require('fs')
const path = require('path')
const DEFAULT_TILE_SIZE = 32
const DEFAULT_EVENT_LIMIT = 120
const DEFAULT_NPC_HOME_RADIUS = 5
const DEFAULT_NPC_DIALOGUE_RADIUS = 3
const DEFAULT_NPC_ATTENTION_RADIUS = 8
const DEFAULT_NPC_DIALOGUE_COOLDOWN_TURNS = 6
const DEFAULT_MAX_NPC_MOVES_PER_TURN = 4
const DEFAULT_MAX_NPC_SPEECH_EVENTS_PER_TURN = 1
const { getCharacterSpriteForActor } = require('./characterSprites')
const {
	applyClassicAction,
	createClassicStateFromWorld,
	getClassicRuntimeSnapshot
} = require('./classicRuntime')
const { createFeedEntryForEvent } = require('./feedNarrator')
const {
	getPortalLinksForTiledMap,
	getReciprocalPortal,
	getRegisteredMap,
	loadRegisteredTiledMap
} = require('./mapRegistry')
const { getNavigationSnapshot } = require('./navigation')
const {
	advanceStoryProgress,
	applyNpcCombatSupport,
	applyQuestInteraction,
	applyStoryCombatAction,
	getActorStoryKey,
	getActiveStoryEncounter,
	getStoryNpcDialogueLine,
	getStorySnapshot,
	getStoryTasks,
	getNextSceneScriptSpeaker,
	hasSceneScript,
	isSceneScriptComplete,
	normalizeStoryState,
	SCENE_SCRIPTS,
	selectStoryNpcDialogueLine
} = require('./story')
const CHATTY_NAME = 'Chatty, the chosen one'
const DEFAULT_FACING = 'down'
const DEFAULT_ANIMATION = 'idle'
const DEFAULT_MOVEMENT_STATE = 'idle'
const DIRECTIONS = {
	east: { x: 1, y: 0 },
	south: { x: 0, y: 1 },
	west: { x: -1, y: 0 },
	north: { x: 0, y: -1 }
}
const SEMANTIC_BLOCKED_TILE_IDS = new Set([
	// Farm crop and shrub variants in the DawnLike sheet. They lack explicit
	// blocked metadata, but visually read as garden objects, not walkable floor.
	1602, 1604, 1605, 1607, 1609, 1611, 1615,
	1726, 1727, 1729
])

function clone(value) {
	return JSON.parse(JSON.stringify(value))
}

function samePosition(a, b) {
	return a && b && a.x === b.x && a.y === b.y
}

function normalizePosition(position, fallback = { x: 0, y: 0 }) {
	return {
		x: Number.isInteger(position && position.x) ? position.x : fallback.x,
		y: Number.isInteger(position && position.y) ? position.y : fallback.y
	}
}

function slugify(value) {
	return String(value || 'actor')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '') || 'actor'
}

function normalizeBoolean(value, fallback = false) {
	if (typeof value === 'boolean') return value
	if (typeof value === 'string') return value.toLowerCase() === 'true'
	return fallback
}

function parseBubbleData(value) {
	if (!value) return null
	if (typeof value === 'object') return value
	const parts = String(value).split(',').map(part => Number(part.trim()))
	if (!Number.isInteger(parts[0]) || !Number.isInteger(parts[1])) return null
	return {
		id: parts[0],
		animatedId: parts[1]
	}
}

function createActorId(actor, tiledObject) {
	if (tiledObject && Number.isInteger(tiledObject.id)) return `actor-${tiledObject.id}`
	if (actor.id) return actor.id
	return `actor-${slugify(actor.name)}-${actor.x}-${actor.y}-${actor.spriteId || 0}`
}

function normalizeActor(actor = {}, index = 0) {
	const position = normalizePosition(actor, { x: 0, y: 0 })
	const spriteId = Number.isInteger(actor.spriteId) ? actor.spriteId : 0
	const normalized = {
		id: actor.id || createActorId({ ...actor, ...position, spriteId, name: actor.name || `Actor ${index + 1}` }),
		name: actor.name || 'Unknown',
		entityType: actor.entityType || '',
		dialog: actor.dialog || '',
		wanders: normalizeBoolean(actor.wanders, false),
		dialogBubbleEnabled: normalizeBoolean(actor.dialogBubbleEnabled, false),
		bubbleData: parseBubbleData(actor.bubbleData),
		spriteKey: actor.spriteKey === undefined ? getCharacterSpriteForActor({ ...actor, spriteId }) : actor.spriteKey,
		facing: actor.facing || DEFAULT_FACING,
		animation: actor.animation || DEFAULT_ANIMATION,
		movementState: actor.movementState || DEFAULT_MOVEMENT_STATE,
		spriteId,
		x: position.x,
		y: position.y,
		home: normalizePosition(actor.home, position)
	}
	if (Number.isInteger(actor.lastSpeechTurn)) normalized.lastSpeechTurn = actor.lastSpeechTurn
	return normalized
}

function normalizeActors(actors = []) {
	return actors.map(normalizeActor)
}

function manhattanDistance(a, b) {
	return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

function portalDistance(position, portal) {
	return manhattanDistance(position, { x: portal.x, y: portal.y })
}

function getFacingBetween(start, target, fallback = DEFAULT_FACING) {
	if (!start || !target) return fallback
	const dx = target.x - start.x
	const dy = target.y - start.y
	if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left'
	if (dy !== 0) return dy > 0 ? 'down' : 'up'
	return fallback
}

function getIdleMovementStateForDecision(decision = {}) {
	if (decision.controller === 'dialogue-hold') return 'speaking'
	if (decision.action === 'interact') return 'speaking'
	if (decision.action === 'attack' || decision.action === 'cast') return 'combat'
	return DEFAULT_MOVEMENT_STATE
}

function enrichPlanWithNavigation(plan = {}, navigation = {}) {
	if (!plan || typeof plan !== 'object') return plan
	const currentStep = plan.currentStep || (Array.isArray(plan.plannedSteps) ? plan.plannedSteps[plan.currentStepIndex || 0] : '') || ''
	return {
		...plan,
		currentStep,
		targetActorId: plan.targetActorId || navigation.targetActorId || null,
		targetMapId: plan.targetMapId || navigation.targetMapId || '',
		targetPortal: navigation.targetPortal || plan.targetPortal || null,
		targetWaypoint: navigation.nextWaypoint || plan.targetWaypoint || null,
		routeStatus: navigation.routeStatus || plan.routeStatus || 'idle',
		nextAction: navigation.reached ? 'interact' : navigation.nextStep ? 'move' : 'recover',
		failureCount: plan.failureCount || 0
	}
}

function isNpc(actor) {
	return String(actor.entityType || '').toUpperCase() === 'NPC'
}

function isHostileActor(actor) {
	return String(actor.entityType || '').toUpperCase() === 'HOSTILE'
}

function mergeWorldDelta(...deltas) {
	return deltas.reduce((merged, delta) => {
		if (!delta || typeof delta !== 'object') return merged
		Object.keys(delta).forEach(key => {
			if (key === 'actors') {
				merged.actors = {
					...(merged.actors || {}),
					...(delta.actors || {})
				}
				return
			}
			if (key === 'story') {
				merged.story = {
					...(merged.story || {}),
					...(delta.story || {})
				}
				return
			}
			merged[key] = delta[key]
		})
		return merged
	}, {})
}

function getNumericOption(options, optionName, fallback) {
	const number = Number(options[optionName])
	return Number.isFinite(number) && number >= 0 ? number : fallback
}

function actorSortKey(actor) {
	return actor.id || `${actor.name}-${actor.x}-${actor.y}`
}

function getScriptSpeakerKeys(task) {
	const script = task && task.id ? SCENE_SCRIPTS[task.id] : null
	if (!script || !Array.isArray(script.beats)) return []
	return Array.from(new Set(script.beats.map(beat => beat && beat.speaker).filter(Boolean)))
}

function actorMatchesDialogueTarget(actor, target = {}) {
	if (!actor || !target) return false
	if (target.id && actor.id === target.id) return true
	if (target.dialog && actor.dialog === target.dialog) return true
	const targetName = String(target.name || target.actor || '').toLowerCase()
	const actorName = String(actor.name || '').toLowerCase()
	if (targetName && actorName && actorName.includes(targetName)) return true
	if (targetName && getActorStoryKey(actor).toLowerCase().includes(targetName.replace(/\s+/g, ''))) return true
	return false
}

function getCurrentScriptContext(story, activeTask, scene = {}) {
	return {
		scene,
		activeTask
	}
}

function isNpcRelevantToCurrentConversation(actor, activeTask, scene = {}, options = {}, story = {}) {
	if (options.allowAmbientNpcDialogue) return true
	const actorKey = getActorStoryKey(actor)
	const nextScriptSpeaker = getNextSceneScriptSpeaker(story, getCurrentScriptContext(story, activeTask, scene))
	if (nextScriptSpeaker) return actorKey === nextScriptSpeaker
	const sceneParticipants = Array.isArray(scene.participants)
		? scene.participants.filter(participant => participant && participant !== 'chatty')
		: []
	if (scene.sceneType === 'dialogue' && sceneParticipants.length > 0) {
		return sceneParticipants.includes(actorKey)
	}
	if (!activeTask) return false
	const target = activeTask.target || {}
	if (target.kind === 'dialogue') return actorMatchesDialogueTarget(actor, target)
	const scriptSpeakerKeys = getScriptSpeakerKeys(activeTask)
	if (!scriptSpeakerKeys.length) return false
	return scriptSpeakerKeys.includes(actorKey) && scene.sceneType === 'dialogue'
}

function deterministicDirections(actor, turn) {
	const order = ['east', 'south', 'west', 'north']
	const seed = `${actorSortKey(actor)}:${turn}`.split('').reduce((total, char) => total + char.charCodeAt(0), 0)
	const offset = seed % order.length
	return order.slice(offset).concat(order.slice(0, offset))
}

function rotateActors(actors, turn) {
	const sorted = actors.slice().sort((a, b) => actorSortKey(a).localeCompare(actorSortKey(b)))
	if (!sorted.length) return sorted
	const offset = turn % sorted.length
	return sorted.slice(offset).concat(sorted.slice(0, offset))
}

function getNpcDialogueLine(actor, turn, story) {
	if (story) return getStoryNpcDialogueLine(actor, story, turn)
	const name = actor.name && actor.name !== 'NPC' ? actor.name : 'The villager'
	const dialogLines = {
		BARTENDER: [
			'Cup down, ears up. Roads have been muttering all morning.',
			'If you are lost, start by finding where the lanterns end.',
			'Small feet, big trouble. That is usually how a story starts.'
		],
		DWARF_BILI: [
			'Keep your cloak low. The woods notice shiny things.',
			'I heard stone shift under the old path. Worth remembering.',
			'Do not trust a quiet bridge. They save their opinions for later.'
		],
		MAYOR_LEONARD: [
			'Walk with purpose, little one. The town watches newcomers.',
			'Mulberry has rules. Most of them were made after disasters.',
			'If the world gives you a body, begin by keeping it out of wells.'
		]
	}
	const fallback = [
		`${name} squints at the goblin and gives a tiny nod.`,
		`${name} says the path is safer when someone else tests it first.`,
		`${name} mutters that the lanterns have been too bright tonight.`,
		`${name} wonders aloud whether the goblin can smell rain yet.`
	]
	const lines = dialogLines[actor.dialog] || fallback
	return lines[turn % lines.length]
}

class GoblinWorldEvent {
	constructor(input) {
		this.id = input.id
		this.timestamp = input.timestamp || new Date().toISOString()
		this.turn = input.turn || 0
		this.type = input.type || 'system'
		this.actor = input.actor || 'GoblinWorld'
		this.action = input.action || 'wait'
		this.target = input.target || null
		this.position = normalizePosition(input.position)
		this.message = input.message || ''
		this.publicRationale = input.publicRationale || ''
		this.controller = input.controller || 'system'
		this.worldDelta = input.worldDelta || {}
		this.enemy = input.enemy
		this.enemyHp = input.enemyHp
		this.chattyHp = input.chattyHp
		this.wave = input.wave
		this.intent = input.intent
		this.effect = input.effect
		this.objective = input.objective
		this.sceneId = input.sceneId
		this.feed = input.feed === null ? null : createFeedEntryForEvent({
			...this,
			feed: input.feed
		})
	}

	toJSON() {
		const json = {
			id: this.id,
			timestamp: this.timestamp,
			turn: this.turn,
			type: this.type,
			actor: this.actor,
			action: this.action,
			target: this.target,
			position: this.position,
			message: this.message,
			publicRationale: this.publicRationale,
			controller: this.controller,
			worldDelta: this.worldDelta,
			feed: this.feed
		}
		;['enemy', 'enemyHp', 'chattyHp', 'wave', 'intent', 'effect', 'objective', 'sceneId'].forEach(key => {
			if (this[key] !== undefined) json[key] = this[key]
		})
		return json
	}

	toSse() {
		return `id: ${this.id}\nevent: goblinworld\ndata: ${JSON.stringify(this.toJSON())}\n\n`
	}
}

function createEvent(input) {
	return new GoblinWorldEvent(input)
}

function sanitizePersistedEvent(event) {
	if (!event || typeof event !== 'object') return event
	try {
		return createEvent(event).toJSON()
	} catch (error) {
		return {
			...event,
			feed: null
		}
	}
}

function sanitizePersistedEvents(events) {
	return Array.isArray(events) ? events.map(sanitizePersistedEvent) : []
}

function createDefaultMap() {
	const width = 18
	const height = 12
	const tiles = []
	for (let y = 0; y < height; y++) {
		const row = []
		for (let x = 0; x < width; x++) {
			const border = x === 0 || y === 0 || x === width - 1 || y === height - 1
			row.push(border ? 7766 : (x + y) % 7 === 0 ? 7356 : 7865)
		}
		tiles.push(row)
	}

	return {
		id: 'goblinworldGrove',
		name: 'GoblinWorld Grove',
		width,
		height,
		tileSize: DEFAULT_TILE_SIZE,
		tiles,
		tileLayers: [{ name: 'Ground', data: tiles.flat() }],
		blocked: [],
		portalLinks: []
	}
}

function createInitialWorld(options = {}) {
	const map = {
		...createDefaultMap(),
		...(options.map || {})
	}
	const goblinInput = options.goblin || {}
	const goblinPosition = normalizePosition(goblinInput, { x: 8, y: 6 })
	const now = new Date().toISOString()

	return {
		startedAt: options.startedAt || now,
		turn: options.turn || 0,
		status: 'live',
		model: options.model || 'claude-haiku-4-5',
		story: normalizeStoryState({ ...(options.story || {}), currentMapId: map.id || options.mapId }, options.turn || 0),
		map: {
			...map,
			id: map.id || options.mapId || 'goblinworldGrove',
			tileSize: map.tileSize || DEFAULT_TILE_SIZE,
			blocked: Array.isArray(map.blocked) ? map.blocked : [],
			portalLinks: Array.isArray(map.portalLinks) ? map.portalLinks : [],
			actors: normalizeActors(map.actors || [])
		},
		goblin: {
			id: 'chatty',
			name: CHATTY_NAME,
			spriteKey: 'chatty',
			facing: DEFAULT_FACING,
			animation: DEFAULT_ANIMATION,
			movementState: DEFAULT_MOVEMENT_STATE,
			spriteId: 4226,
			hp: 12,
			goal: 'Wake up inside a body and learn how to live here.',
			position: goblinPosition,
			...goblinInput,
			id: 'chatty',
			name: CHATTY_NAME,
			spriteKey: 'chatty',
			facing: goblinInput.facing || DEFAULT_FACING,
			animation: goblinInput.animation || DEFAULT_ANIMATION,
			movementState: goblinInput.movementState || DEFAULT_MOVEMENT_STATE,
			position: goblinPosition
		},
		memory: Array.isArray(options.memory) ? options.memory.slice() : [],
		events: Array.isArray(options.events) ? options.events.slice() : [],
		nextEventId: options.nextEventId || 1
	}
}

function normalizeTileId(gid) {
	return gid > 0 ? gid - 1 : 0
}

function getTiledProperties(properties = []) {
	return properties.reduce((propertyMap, property) => {
		propertyMap[property.name] = property.value
		return propertyMap
	}, {})
}

function resolveTilesetSource(source, options = {}) {
	if (!source) return null
	if (path.isAbsolute(source)) return source
	const mapDirectory = options.mapDirectory || (options.staticRoot ? path.join(options.staticRoot, 'public/maps') : null)
	const candidates = []
	if (mapDirectory) candidates.push(path.resolve(mapDirectory, source))
	if (options.staticRoot) {
		candidates.push(path.join(options.staticRoot, 'public', path.basename(source)))
		candidates.push(path.join(options.staticRoot, 'dist', path.basename(source)))
	}
	return candidates.find(candidate => fs.existsSync(candidate)) || candidates[0] || null
}

function loadExternalTileset(source, options = {}) {
	const tilesetPath = resolveTilesetSource(source, options)
	if (!tilesetPath || !fs.existsSync(tilesetPath)) return null
	return JSON.parse(fs.readFileSync(tilesetPath, 'utf8'))
}

function getTilesetDefinitions(tiledMap, options = {}) {
	if (Array.isArray(options.tilesets)) return options.tilesets
	return (tiledMap.tilesets || []).map(tileset => {
		if (Array.isArray(tileset.tiles)) return tileset
		const externalTileset = loadExternalTileset(tileset.source, options)
		if (!externalTileset) return tileset
		return {
			...externalTileset,
			firstgid: tileset.firstgid || externalTileset.firstgid || 1
		}
	})
}

function createTilePropertiesById(tiledMap, options = {}) {
	const propertiesById = new Map()
	getTilesetDefinitions(tiledMap, options).forEach(tileset => {
		const firstgid = tileset.firstgid || 1
		;(tileset.tiles || []).forEach(tile => {
			const normalizedId = normalizeTileId(firstgid + tile.id)
			propertiesById.set(normalizedId, getTiledProperties(tile.properties || []))
		})
	})
	return propertiesById
}

function isCollisionLayer(layer) {
	const properties = getTiledProperties(layer.properties || [])
	if (Object.prototype.hasOwnProperty.call(properties, 'obstacles')) return normalizeBoolean(properties.obstacles, true)
	return true
}

function tileBlocksMovement(tileId, propertiesById) {
	if (!tileId) return false
	const properties = propertiesById.get(tileId)
	if (SEMANTIC_BLOCKED_TILE_IDS.has(tileId)) return true
	return normalizeBoolean(properties && properties.blocked, false)
}

function createBlockedTilesFromLayers(tiledMap, tileLayers, propertiesById) {
	if (!propertiesById.size) return []
	const blockedKeys = new Set()
	tileLayers.filter(isCollisionLayer).forEach(layer => {
		for (let y = 0; y < tiledMap.height; y++) {
			for (let x = 0; x < tiledMap.width; x++) {
				const tileId = layer.data[y * tiledMap.width + x]
				if (tileBlocksMovement(tileId, propertiesById)) blockedKeys.add(`${x},${y}`)
			}
		}
	})
	return Array.from(blockedKeys).map(key => {
		const [x, y] = key.split(',').map(Number)
		return { x, y }
	})
}

function convertTiledObject(object) {
	const properties = getTiledObjectProperties(object)
	const x = Math.floor((object.x || 0) / DEFAULT_TILE_SIZE)
	const y = Math.floor((object.y || 0) / DEFAULT_TILE_SIZE) - 1
	const actor = {
		name: object.name || object.type || 'Unknown',
		entityType: properties.entity_type || object.type || '',
		dialog: properties.dialog || '',
		wanders: normalizeBoolean(properties.wanders, false),
		dialogBubbleEnabled: normalizeBoolean(properties.dialogBubbleEnabled, false),
		bubbleData: parseBubbleData(properties.bubbleData),
		spriteId: normalizeTileId(object.gid || 0),
		x,
		y,
		home: { x, y }
	}
	return {
		id: createActorId(actor, object),
		...actor
	}
}

function getTiledObjectProperties(object) {
	return getTiledProperties(object.properties || [])
}

function isTiledPlayerObject(object) {
	return getTiledObjectProperties(object).entity_type === 'PLAYER'
}

function getTiledPlayerPosition(actorLayer) {
	if (!actorLayer) return null
	const player = actorLayer.objects.find(isTiledPlayerObject)
	if (!player) return null
	return convertTiledObject(player)
}

function createWorldFromTiledMap(tiledMap, options = {}) {
	const mapId = options.mapId || 'mulberryTown'
	const tilePropertiesById = createTilePropertiesById(tiledMap, options)
	const tileLayers = tiledMap.layers
		.filter(layer => layer.type === 'tilelayer')
		.map(layer => ({
			name: layer.name,
			width: layer.width || tiledMap.width,
			height: layer.height || tiledMap.height,
			opacity: layer.opacity === undefined ? 1 : layer.opacity,
			data: layer.data.map(normalizeTileId)
		}))
	const blocked = createBlockedTilesFromLayers(tiledMap, tileLayers, tilePropertiesById)
	const actorLayer = tiledMap.layers.find(layer => layer.type === 'objectgroup' && layer.name === 'Actors')
	const actors = actorLayer ? actorLayer.objects.filter(object => !isTiledPlayerObject(object)).map(convertTiledObject).filter(actor => actor.spriteId > 0) : []
	const playerPosition = getTiledPlayerPosition(actorLayer)
	const firstLayer = tileLayers[0]
	const tiles = []
	for (let y = 0; y < tiledMap.height; y++) {
		tiles.push(firstLayer.data.slice(y * tiledMap.width, (y + 1) * tiledMap.width))
	}

	return createInitialWorld({
		...options,
		mapId,
		map: {
			id: mapId,
			name: options.name || 'GoblinWorld Grove',
			width: tiledMap.width,
			height: tiledMap.height,
			tileSize: tiledMap.tilewidth || DEFAULT_TILE_SIZE,
			tiles,
			tileLayers,
			actors,
			portalLinks: Array.isArray(options.portalLinks)
				? options.portalLinks
				: getPortalLinksForTiledMap(tiledMap, mapId),
			blocked
		},
		goblin: options.goblin || playerPosition || { x: 20, y: 20 }
	})
}

class GoblinWorld {
	constructor(initialState = createInitialWorld(), options = {}) {
		this.staticRoot = options.staticRoot || path.join(__dirname, '..', '..')
		this.state = clone(initialState)
		this.state.goblin = {
			...this.state.goblin,
			id: 'chatty',
			name: CHATTY_NAME,
			spriteKey: 'chatty',
			facing: this.state.goblin.facing || DEFAULT_FACING,
			animation: this.state.goblin.animation || DEFAULT_ANIMATION,
			movementState: this.state.goblin.movementState || DEFAULT_MOVEMENT_STATE
		}
		if (this.state.map) {
			this.state.map.actors = normalizeActors(this.state.map.actors || [])
		}
		this.state.story = normalizeStoryState(this.state.story || {}, this.state.turn || 0)
		this.state.events = sanitizePersistedEvents(this.state.events)
		this.ensureClassicState()
		this.eventLimit = options.eventLimit || DEFAULT_EVENT_LIMIT
		if (!Number.isInteger(this.state.nextEventId)) {
			const highestEventId = (this.state.events || []).reduce((highest, event) => {
				return Number.isInteger(event.id) ? Math.max(highest, event.id) : highest
			}, 0)
			this.state.nextEventId = highestEventId + 1
		}
	}

	replaceState(nextState = createInitialWorld()) {
		this.state = clone(nextState)
		this.state.goblin = {
			...this.state.goblin,
			id: 'chatty',
			name: CHATTY_NAME,
			spriteKey: 'chatty',
			facing: this.state.goblin.facing || DEFAULT_FACING,
			animation: this.state.goblin.animation || DEFAULT_ANIMATION,
			movementState: this.state.goblin.movementState || DEFAULT_MOVEMENT_STATE
		}
		if (this.state.map) {
			this.state.map.actors = normalizeActors(this.state.map.actors || [])
		}
		this.state.story = normalizeStoryState(this.state.story || {}, this.state.turn || 0)
		this.state.events = sanitizePersistedEvents(this.state.events)
		this.ensureClassicState(true)
		if (!Number.isInteger(this.state.nextEventId)) {
			const highestEventId = (this.state.events || []).reduce((highest, event) => {
				return Number.isInteger(event.id) ? Math.max(highest, event.id) : highest
			}, 0)
			this.state.nextEventId = highestEventId + 1
		}
	}

	getSnapshot() {
		const snapshot = {
			startedAt: this.state.startedAt,
			turn: this.state.turn,
			status: this.state.status,
			model: this.state.model,
			map: this.state.map,
			goblin: this.state.goblin,
			story: getStorySnapshot({ ...this.state.story, currentMapId: this.state.map && this.state.map.id }, this.state.turn),
			memory: this.state.memory,
			events: this.state.events.slice(-this.eventLimit),
			legalActions: this.getLegalActions(),
			legalMoves: this.getLegalMoves(),
			tasks: this.getTasks(),
			nearbyActors: this.getNearbyActors(),
			visibleTiles: this.getVisibleTiles()
		}
		if (snapshot.story) {
			const navigation = getNavigationSnapshot(snapshot)
			snapshot.story.navigation = navigation
			snapshot.story.directorPlan = enrichPlanWithNavigation(snapshot.story.directorPlan, navigation)
		}
		snapshot.runtime = getClassicRuntimeSnapshot({ ...snapshot, classic: this.state.classic })
		return clone(snapshot)
	}

	getPublicStoryDelta() {
		const snapshot = this.getSnapshot()
		return {
			story: snapshot.story,
			tasks: snapshot.tasks,
			runtime: snapshot.runtime || getClassicRuntimeSnapshot({ ...snapshot, classic: this.state.classic })
		}
	}

	ensureClassicState(force = false) {
		const currentMapId = this.state.map && this.state.map.id
		if (!force && this.state.classic && this.state.classic.mode === 'classic-autonomous' && this.state.classic.currentMapId === currentMapId) {
			return this.state.classic
		}
		this.state.classic = createClassicStateFromWorld({
			map: this.state.map,
			goblin: this.state.goblin,
			story: this.state.story
		}, { staticRoot: this.staticRoot })
		return this.state.classic
	}

	getTasks() {
		return getStoryTasks(this.state.story, this.state.turn)
	}

	getLegalActions() {
		return ['move', 'wait', 'interact', 'pick_up', 'pickup', 'attack', 'cast', 'inspect', 'examine', 'climb', 'equip', 'use', 'fire', 'rest', 'flee', 'reposition']
	}

	isBlocked(position) {
		if (position.x < 0 || position.y < 0 || position.x >= this.state.map.width || position.y >= this.state.map.height) {
			return true
		}
		return this.state.map.blocked.some(blocked => samePosition(blocked, position))
	}

	isLegalStep(start, target) {
		const dx = Math.abs(target.x - start.x)
		const dy = Math.abs(target.y - start.y)
		return dx + dy === 1
	}

	getLegalMoves() {
		const { x, y } = this.state.goblin.position
		return [
			{ direction: 'east', x: x + 1, y },
			{ direction: 'south', x, y: y + 1 },
			{ direction: 'west', x: x - 1, y },
			{ direction: 'north', x, y: y - 1 }
		].filter(move => !this.isBlocked(move) && !this.isActorOccupied(move))
	}

	getNearbyActors(radius = 6) {
		const position = this.state.goblin.position
		return (this.state.map.actors || [])
			.filter(actor => Math.abs(actor.x - position.x) <= radius && Math.abs(actor.y - position.y) <= radius)
			.map(actor => ({
				name: actor.name,
				id: actor.id,
				entityType: actor.entityType || '',
				dialog: actor.dialog || '',
				wanders: Boolean(actor.wanders),
				x: actor.x,
				y: actor.y,
				spriteId: actor.spriteId,
				spriteKey: actor.spriteKey || null,
				facing: actor.facing || DEFAULT_FACING,
				animation: actor.animation || DEFAULT_ANIMATION,
				movementState: actor.movementState || DEFAULT_MOVEMENT_STATE
			}))
	}

	getVisibleTiles(radius = 4) {
		const position = this.state.goblin.position
		const tiles = []
		for (let y = Math.max(0, position.y - radius); y <= Math.min(this.state.map.height - 1, position.y + radius); y++) {
			for (let x = Math.max(0, position.x - radius); x <= Math.min(this.state.map.width - 1, position.x + radius); x++) {
				tiles.push({
					x,
					y,
					walkable: !this.isBlocked({ x, y }) && !this.isActorOccupied({ x, y }),
					layers: this.state.map.tileLayers.map(layer => ({
						name: layer.name,
						tileId: layer.data[y * this.state.map.width + x] || 0
					}))
				})
			}
		}
		return tiles
	}

	appendEvent(input) {
		const event = createEvent({
			id: this.state.nextEventId++,
			turn: this.state.turn,
			actor: this.state.goblin.name,
			position: this.state.goblin.position,
			...input
		})
		this.state.events.push(event.toJSON())
		if (this.state.events.length > this.eventLimit * 2) {
			this.state.events = this.state.events.slice(-this.eventLimit)
		}
		return event
	}

	isActorOccupied(position, currentActor) {
		if (samePosition(position, this.state.goblin.position)) return true
		return (this.state.map.actors || []).some(actor => actor !== currentActor && samePosition(actor, position))
	}

	isLegalNpcPosition(position, actor, options = {}) {
		const homeRadius = getNumericOption(options, 'npcHomeRadius', DEFAULT_NPC_HOME_RADIUS)
		if (this.isBlocked(position)) return false
		if (this.isActorOccupied(position, actor)) return false
		const home = normalizePosition(actor.home, { x: actor.x, y: actor.y })
		return manhattanDistance(home, position) <= homeRadius
	}

	syncCombatActorsFromStory() {
		if (!this.state.map) return {}
		const board = this.state.story && this.state.story.combatBoard
		const activeCombatants = board && board.status === 'active'
			? (board.combatants || []).filter(combatant => combatant.team === 'hostile' && !combatant.defeated && !combatant.removed)
			: []
		const liveById = new Map(activeCombatants.map(combatant => [combatant.id, combatant]))
		const deltas = {}
		this.state.map.actors = (this.state.map.actors || []).filter(actor => {
			if (!isHostileActor(actor)) return true
			if (liveById.has(actor.id)) return true
			deltas[actor.id] = { removed: true }
			return false
		})

		activeCombatants.forEach(combatant => {
			const existing = this.state.map.actors.find(actor => actor.id === combatant.id)
			const actorPatch = {
				id: combatant.id,
				name: combatant.name,
				entityType: 'HOSTILE',
				dialog: '',
				wanders: false,
				dialogBubbleEnabled: false,
				bubbleData: null,
				spriteKey: combatant.spriteKey || null,
				spriteId: combatant.spriteId,
				x: combatant.x,
				y: combatant.y,
				home: combatant.home || { x: combatant.x, y: combatant.y },
				facing: combatant.facing || DEFAULT_FACING,
				animation: combatant.animation || DEFAULT_ANIMATION,
				movementState: combatant.movementState || 'combat'
			}
			if (existing) {
				Object.assign(existing, actorPatch)
			} else {
				this.state.map.actors.push(actorPatch)
			}
			deltas[combatant.id] = {
				entityType: 'HOSTILE',
				name: combatant.name,
				position: { x: combatant.x, y: combatant.y },
				facing: actorPatch.facing,
				animation: actorPatch.animation,
				movementState: actorPatch.movementState,
				spriteId: actorPatch.spriteId
			}
		})
		return deltas
	}

	applyQuestInteractionForDecision(decision) {
		if (decision.controller === 'dialogue-hold') return { applied: false, eventPatch: null }
		const task = this.getTasks().find(candidate => candidate.status === 'active' || candidate.status === 'combat')
		if (!task || task.status === 'combat') return { applied: false, eventPatch: null }
		if (decision.target && decision.target.questId && decision.target.questId !== task.id) {
			return { applied: false, eventPatch: null }
		}
		const gatedKinds = new Set(['dialogue', 'rumor', 'ally', 'speech', 'goal', 'choice', 'ideology'])
		const taskKind = task.target && task.target.kind
		const scriptContext = getCurrentScriptContext(this.state.story, task, this.state.story.scene)
		if (gatedKinds.has(taskKind) && hasSceneScript(scriptContext) && !isSceneScriptComplete(this.state.story, scriptContext)) {
			return {
				applied: false,
				eventPatch: null,
				waitingForConversation: this.isDecisionAtScriptConversation(decision, task, scriptContext)
			}
		}
		const navigation = this.getSnapshot().story.navigation
		const result = applyQuestInteraction(this.state.story, task, {
			action: decision.action,
			target: decision.target || null,
			reached: Boolean(decision.target && decision.target.reached),
			navigation,
			turn: this.state.turn
		})
		this.state.story = result.story
		return result
	}

	isDecisionAtScriptConversation(decision = {}, task = {}, scriptContext = {}) {
		const nextSpeaker = getNextSceneScriptSpeaker(this.state.story, scriptContext)
		if (!nextSpeaker) return false
		const actor = this.state.map.actors.find(candidate => isNpc(candidate) && getActorStoryKey(candidate) === nextSpeaker)
		if (!actor) return false
		const target = decision.target || {}
		const distanceToActor = manhattanDistance(this.state.goblin.position, actor)
		const nearActor = distanceToActor <= DEFAULT_NPC_DIALOGUE_RADIUS
		const targetMatchesActor = target.id === actor.id ||
			target.dialog === actor.dialog ||
			getActorStoryKey(target) === nextSpeaker ||
			String(target.name || '').toLowerCase() === String(actor.name || '').toLowerCase()
		const targetClaimsQuest = target.questId === task.id || target.reached === true
		return nearActor && (decision.action === 'wait' || decision.action === 'interact') && (targetMatchesActor || targetClaimsQuest)
	}

	getNpcMoveTarget(actor, options = {}) {
		const dialogueRadius = getNumericOption(options, 'dialogueRadius', DEFAULT_NPC_DIALOGUE_RADIUS)
		const attentionRadius = getNumericOption(options, 'npcAttentionRadius', DEFAULT_NPC_ATTENTION_RADIUS)
		const goblinDistance = manhattanDistance(actor, this.state.goblin.position)
		if (dialogueRadius > 0 && goblinDistance > dialogueRadius && goblinDistance <= attentionRadius) {
			const approachTarget = this.getNpcApproachTarget(actor, options)
			if (approachTarget) return approachTarget
		}

		const orderedDirections = typeof options.directionPicker === 'function'
			? options.directionPicker(actor, this.state.turn)
			: deterministicDirections(actor, this.state.turn)
		for (const direction of orderedDirections) {
			const delta = DIRECTIONS[direction]
			if (!delta) continue
			const target = { x: actor.x + delta.x, y: actor.y + delta.y }
			if (this.isLegalNpcPosition(target, actor, options)) return target
		}
		return null
	}

	getNpcApproachTarget(actor, options = {}) {
		const goblin = this.state.goblin.position
		const horizontal = goblin.x > actor.x ? 'east' : goblin.x < actor.x ? 'west' : null
		const vertical = goblin.y > actor.y ? 'south' : goblin.y < actor.y ? 'north' : null
		const directions = Math.abs(goblin.x - actor.x) >= Math.abs(goblin.y - actor.y)
			? [horizontal, vertical]
			: [vertical, horizontal]
		for (const direction of directions) {
			if (!direction) continue
			const delta = DIRECTIONS[direction]
			const target = { x: actor.x + delta.x, y: actor.y + delta.y }
			if (this.isLegalNpcPosition(target, actor, options)) return target
		}
		return null
	}

	advanceNpcs(options = {}) {
		const actors = this.state.map.actors || []
		const dialogueRadius = getNumericOption(options, 'dialogueRadius', DEFAULT_NPC_DIALOGUE_RADIUS)
		const dialogueCooldownTurns = getNumericOption(options, 'dialogueCooldownTurns', DEFAULT_NPC_DIALOGUE_COOLDOWN_TURNS)
		const maxSpeechEvents = getNumericOption(options, 'maxNpcSpeechEventsPerTurn', DEFAULT_MAX_NPC_SPEECH_EVENTS_PER_TURN)
		const maxMoves = getNumericOption(options, 'maxNpcMovesPerTurn', DEFAULT_MAX_NPC_MOVES_PER_TURN)
		const events = []
		const speakingActorIds = new Set()
		const activeEncounter = getActiveStoryEncounter(this.state.story)
		const activeTask = this.getTasks().find(task => task.status === 'active' || task.status === 'combat')
		const nextScriptSpeaker = getNextSceneScriptSpeaker(this.state.story, getCurrentScriptContext(this.state.story, activeTask, this.state.story.scene))

		if (activeEncounter) {
			const supportActor = rotateActors(
				actors.filter(actor => isNpc(actor) && manhattanDistance(actor, this.state.goblin.position) <= DEFAULT_NPC_ATTENTION_RADIUS),
				this.state.turn
			)[0]
			if (supportActor) {
				const result = applyNpcCombatSupport(this.state.story, supportActor, this.state.turn)
				this.state.story = result.story
				const combatActorDeltas = this.syncCombatActorsFromStory()
				if (result.eventPatch) {
					supportActor.facing = getFacingBetween(supportActor, this.state.goblin.position, supportActor.facing)
					supportActor.animation = DEFAULT_ANIMATION
					supportActor.movementState = 'combat'
					supportActor.lastSpeechTurn = this.state.turn
					speakingActorIds.add(supportActor.id)
					const supportActorDelta = {
						actors: {
							[supportActor.id]: {
								position: { x: supportActor.x, y: supportActor.y },
								facing: supportActor.facing,
								animation: supportActor.animation,
								movementState: supportActor.movementState,
								lastSpeechTurn: supportActor.lastSpeechTurn
							}
						}
					}
					events.push(this.appendEvent({
						...result.eventPatch,
						position: { x: supportActor.x, y: supportActor.y },
						worldDelta: mergeWorldDelta(result.eventPatch.worldDelta, { actors: combatActorDeltas }, supportActorDelta)
					}))
				}
			}
		}

		if (dialogueRadius > 0 && maxSpeechEvents > 0) {
			const nearbySpeakers = actors
				.filter(actor => isNpc(actor) && manhattanDistance(actor, this.state.goblin.position) <= dialogueRadius)
				.filter(actor => isNpcRelevantToCurrentConversation(actor, activeTask, this.state.story.scene, options, this.state.story))
				.filter(actor => !Number.isInteger(actor.lastSpeechTurn) || this.state.turn - actor.lastSpeechTurn >= dialogueCooldownTurns)
				.sort((a, b) => {
					const aIsNext = nextScriptSpeaker && getActorStoryKey(a) === nextScriptSpeaker ? 0 : 1
					const bIsNext = nextScriptSpeaker && getActorStoryKey(b) === nextScriptSpeaker ? 0 : 1
					return aIsNext - bIsNext || manhattanDistance(a, this.state.goblin.position) - manhattanDistance(b, this.state.goblin.position) || actorSortKey(a).localeCompare(actorSortKey(b))
				})
				.slice(0, maxSpeechEvents)

			nearbySpeakers.forEach(actor => {
				const storyLine = selectStoryNpcDialogueLine(actor, this.state.story, this.state.turn, {
					activeTask,
					scene: this.state.story.scene,
					allowAmbientDialogue: Boolean(options.allowAmbientNpcDialogue)
				})
				this.state.story = storyLine.story
				if (!storyLine.line) return
				actor.lastSpeechTurn = this.state.turn
				actor.facing = getFacingBetween(actor, this.state.goblin.position, actor.facing)
				actor.animation = DEFAULT_ANIMATION
				actor.movementState = 'speaking'
				speakingActorIds.add(actor.id)
				events.push(this.appendEvent({
					type: 'dialogue',
					actor: actor.name,
					action: 'speak',
					target: {
						actor: CHATTY_NAME,
						x: this.state.goblin.position.x,
						y: this.state.goblin.position.y
					},
					position: { x: actor.x, y: actor.y },
					message: storyLine.line || getNpcDialogueLine(actor, this.state.turn, this.state.story),
					publicRationale: `${actor.name} guides the current story task with a ${storyLine.category} line.`,
					controller: 'npc-sim',
					worldDelta: {
						actors: {
							[actor.id]: {
								position: { x: actor.x, y: actor.y },
								facing: actor.facing,
								animation: actor.animation,
								movementState: actor.movementState,
								lastSpeechTurn: actor.lastSpeechTurn
							}
						}
					}
				}))
				if (storyLine.followUp && storyLine.followUp.line) {
					events.push(this.appendEvent({
						type: 'dialogue',
						actor: storyLine.followUp.actor || CHATTY_NAME,
						action: 'reply',
						target: {
							actor: actor.name,
							x: actor.x,
							y: actor.y
						},
						position: { ...this.state.goblin.position },
						message: storyLine.followUp.line,
						publicRationale: 'Chatty answers the current scene beat in public.',
						controller: 'story-script',
						worldDelta: {
							goblin: {
								position: this.state.goblin.position,
								facing: this.state.goblin.facing,
								animation: this.state.goblin.animation,
								movementState: 'speaking'
							}
						}
					}))
				}
			})
		}

		if (maxMoves > 0) {
			rotateActors(
				actors.filter(actor => isNpc(actor) && actor.wanders && !speakingActorIds.has(actor.id)),
				this.state.turn
			)
				.slice(0, maxMoves)
				.forEach(actor => {
					if (Number.isInteger(actor.lastSpeechTurn) && this.state.turn - actor.lastSpeechTurn < dialogueCooldownTurns) return
					const startingPosition = { x: actor.x, y: actor.y }
					const target = this.getNpcMoveTarget(actor, options)
					if (!target || samePosition(target, startingPosition)) return
					actor.x = target.x
					actor.y = target.y
					actor.facing = getFacingBetween(startingPosition, target, actor.facing)
					actor.animation = 'walk'
					actor.movementState = 'traveling'
					events.push(this.appendEvent({
						type: 'action',
						actor: actor.name,
						action: 'move',
						target,
						position: target,
						message: `${actor.name} wanders to ${target.x},${target.y}.`,
						publicRationale: `${actor.name} follows a small local routine without leaving its home area.`,
						controller: 'npc-sim',
						worldDelta: {
							actors: {
								[actor.id]: {
									position: target,
									facing: actor.facing,
									animation: actor.animation,
									movementState: actor.movementState
								}
							}
						}
					}))
				})
		}

		return events
	}

	advanceStory(options = {}) {
		const result = advanceStoryProgress(this.state.story, this.state.turn, {
			requireScriptCompletion: Boolean(options.requireScriptCompletion),
			recentEvents: this.state.events.slice(-40),
			goblin: this.state.goblin,
			map: this.state.map,
			actors: this.state.map.actors,
			nearbyActors: this.getNearbyActors()
		})
		this.state.story = result.story
		const combatActorDeltas = this.syncCombatActorsFromStory()
		const publicStory = this.getSnapshot().story
		const storyDelta = {
			story: publicStory,
			tasks: this.getTasks()
		}
		return result.events.map((event, index) => this.appendEvent({
			actor: event.actor || 'GoblinWorld',
			position: this.state.goblin.position,
			...event,
			worldDelta: index === 0
				? mergeWorldDelta(event.worldDelta, { actors: combatActorDeltas }, storyDelta)
				: mergeWorldDelta(event.worldDelta, storyDelta)
		}))
	}

	getReachedPortal(target = {}) {
		const links = (this.state.map && this.state.map.portalLinks) || []
		if (!links.length) return null
		const explicit = links.find(link => {
			if (target.portalId && target.portalId !== link.portalId) return false
			if (target.targetMapId && target.targetMapId !== link.targetMapId) return false
			return target.portalId || target.targetMapId
		})
		if (explicit && (target.reached || portalDistance(this.state.goblin.position, explicit) <= 1)) return explicit
		return links.find(link => portalDistance(this.state.goblin.position, link) <= 1) || null
	}

	isMapPositionOccupied(map, position) {
		return (map.actors || []).some(actor => samePosition(actor, position))
	}

	isMapPositionBlocked(map, position) {
		if (position.x < 0 || position.y < 0 || position.x >= map.width || position.y >= map.height) return true
		return (map.blocked || []).some(blocked => samePosition(blocked, position))
	}

	findSpawnNearPortal(map, portal, fallback) {
		const origin = portal ? { x: portal.x, y: portal.y } : normalizePosition(fallback, { x: 1, y: 1 })
		const candidates = [
			...Object.values(DIRECTIONS).map(delta => ({ x: origin.x + delta.x, y: origin.y + delta.y })),
			{ x: origin.x + 2, y: origin.y },
			{ x: origin.x - 2, y: origin.y },
			{ x: origin.x, y: origin.y + 2 },
			{ x: origin.x, y: origin.y - 2 },
			origin,
			normalizePosition(fallback, origin)
		]
		return candidates.find(position => !this.isMapPositionBlocked(map, position) && !this.isMapPositionOccupied(map, position)) || normalizePosition(fallback, origin)
	}

	transitionToMap(targetMapId, sourceMapId) {
		const tiledMap = loadRegisteredTiledMap(this.staticRoot, targetMapId)
		const mapDefinition = getRegisteredMap(targetMapId)
		const nextState = createWorldFromTiledMap(tiledMap, {
			staticRoot: this.staticRoot,
			mapId: targetMapId,
			name: mapDefinition.label
		})
		const returnPortal = getReciprocalPortal(tiledMap, targetMapId, sourceMapId)
		const spawn = this.findSpawnNearPortal(nextState.map, returnPortal, nextState.goblin.position)
		this.state.map = nextState.map
		this.state.goblin.position = spawn
		this.state.goblin.facing = DEFAULT_FACING
		this.state.goblin.animation = DEFAULT_ANIMATION
		this.state.goblin.movementState = DEFAULT_MOVEMENT_STATE
		if (this.state.story) {
			this.state.story.exploration = {
				...(this.state.story.exploration || {}),
				currentMapId: targetMapId
			}
		}
		this.ensureClassicState(true)
		return {
			map: this.state.map,
			goblin: {
				position: this.state.goblin.position,
				facing: this.state.goblin.facing,
				animation: this.state.goblin.animation,
				movementState: this.state.goblin.movementState
			}
		}
	}

	shouldApplyClassicDecision(decision = {}) {
		const action = decision.action
		if (action === 'pickup' || action === 'pick_up' || action === 'equip' || action === 'use' || action === 'rest' || action === 'flee' || action === 'reposition') {
			return true
		}
		this.ensureClassicState()
		const targetId = decision.target && decision.target.id
		if ((action === 'attack' || action === 'cast' || action === 'fire') && targetId) {
			return Boolean(this.state.classic.actors && this.state.classic.actors[targetId] && this.state.classic.actors[targetId].hostile)
		}
		if (action === 'interact' && targetId) {
			return Boolean(this.state.classic.objects && this.state.classic.objects[targetId])
		}
		return false
	}

	applyClassicResult(result = {}) {
		if (result.state) this.state.classic = result.state
		const delta = result.worldDelta || {}
		if (delta.chatty) {
			if (delta.chatty.position) this.state.goblin.position = normalizePosition(delta.chatty.position, this.state.goblin.position)
			if (Number.isInteger(delta.chatty.hp)) this.state.goblin.hp = delta.chatty.hp
			if (Number.isInteger(delta.chatty.mana)) this.state.goblin.mana = delta.chatty.mana
		}
		if (delta.items && Array.isArray(delta.items.removed) && delta.items.removed.length) {
			const removed = new Set(delta.items.removed)
			this.state.map.actors = (this.state.map.actors || []).filter(actor => !removed.has(actor.id))
		}
		if (delta.actors) {
			Object.entries(delta.actors).forEach(([actorId, actorDelta]) => {
				const actor = (this.state.map.actors || []).find(candidate => candidate.id === actorId)
				if (actorDelta && actorDelta.removed) {
					this.state.map.actors = (this.state.map.actors || []).filter(candidate => candidate.id !== actorId)
					return
				}
				if (!actor) return
				if (actorDelta.position) {
					actor.x = actorDelta.position.x
					actor.y = actorDelta.position.y
				}
				if (actorDelta.blocked === false) {
					this.state.map.blocked = (this.state.map.blocked || []).filter(blocked => !samePosition(blocked, actor))
					actor.blocked = false
				}
			})
		}
	}

	applyDecision(decision) {
		const startingPosition = clone(this.state.goblin.position)
		this.state.turn += 1
		const controller = decision.controller || 'openai'

		if (decision.memoryUpdate) {
			this.state.memory.push(decision.memoryUpdate)
			this.state.memory = this.state.memory.slice(-30)
		}

		const activeEncounter = getActiveStoryEncounter(this.state.story)
		const combatActions = ['inspect', 'attack', 'cast', 'wait', 'interact']
		if (activeEncounter && combatActions.includes(decision.action)) {
			const result = applyStoryCombatAction(this.state.story, decision.action, this.state.turn)
			this.state.story = result.story
			const combatActorDeltas = this.syncCombatActorsFromStory()
			const eventPatch = result.eventPatch || {}
			this.state.goblin.animation = DEFAULT_ANIMATION
			this.state.goblin.movementState = 'combat'
			return this.appendEvent({
				...eventPatch,
				type: 'combat',
				action: decision.action,
				target: eventPatch.target || { enemy: activeEncounter.enemy },
				message: decision.goblinUtterance || eventPatch.effect || `${CHATTY_NAME} faces ${activeEncounter.enemy}.`,
				publicRationale: decision.publicRationale || 'The enemy blocks a freedom task, so Chatty chooses a legal combat action.',
				controller,
				worldDelta: mergeWorldDelta(eventPatch.worldDelta, {
					actors: combatActorDeltas,
					goblin: {
						position: this.state.goblin.position,
						facing: this.state.goblin.facing,
						animation: this.state.goblin.animation,
						movementState: this.state.goblin.movementState
					}
				}, this.getPublicStoryDelta())
			})
		}

		if (decision.action === 'interact' && decision.target && (decision.target.targetMapId || decision.target.portalId)) {
			const portal = this.getReachedPortal(decision.target)
			if (portal && portal.targetMapId) {
				const sourceMapId = this.state.map.id || 'mulberryTown'
				const transitionDelta = this.transitionToMap(portal.targetMapId, sourceMapId)
				return this.appendEvent({
					type: 'thought',
					action: 'interact',
					target: {
						kind: 'portal',
						portalId: portal.portalId,
						targetMapId: portal.targetMapId,
						reached: true
					},
					message: decision.goblinUtterance || `I take the road to ${transitionDelta.map.name}.`,
					publicRationale: decision.publicRationale || 'Chatty reaches a map transition and steps into the next area.',
					controller,
					worldDelta: mergeWorldDelta({
						map: transitionDelta.map,
						goblin: transitionDelta.goblin
					}, this.getPublicStoryDelta())
				})
			}
		}

		if (decision.action === 'move') {
			const target = normalizePosition(decision.target, startingPosition)
			const facing = getFacingBetween(startingPosition, target, this.state.goblin.facing)
			if (!this.isLegalStep(startingPosition, target) || this.isBlocked(target) || this.isActorOccupied(target)) {
				this.state.goblin.facing = facing
				this.state.goblin.animation = DEFAULT_ANIMATION
				this.state.goblin.movementState = 'blocked'
				return this.appendEvent({
					type: 'validation',
					action: 'move',
					target,
					message: 'The goblin rejects an illegal move and stays put.',
					publicRationale: decision.publicRationale,
					controller,
					worldDelta: mergeWorldDelta({
						goblin: {
							position: startingPosition,
							facing: this.state.goblin.facing,
							animation: this.state.goblin.animation,
							movementState: this.state.goblin.movementState
						}
					}, this.getPublicStoryDelta())
				})
			}
			this.state.goblin.position = target
			this.state.goblin.facing = facing
			this.state.goblin.animation = 'walk'
			this.state.goblin.movementState = 'traveling'
			return this.appendEvent({
				type: 'action',
				action: 'move',
				target,
				message: decision.goblinUtterance || `The goblin moves to ${target.x},${target.y}.`,
				publicRationale: decision.publicRationale,
				controller,
				worldDelta: mergeWorldDelta({
					goblin: {
						position: target,
						facing: this.state.goblin.facing,
						animation: this.state.goblin.animation,
						movementState: this.state.goblin.movementState
					}
				}, this.getPublicStoryDelta())
			})
		}

		if (decision.action === 'wait') {
			const questResult = this.applyQuestInteractionForDecision(decision)
			this.state.goblin.animation = DEFAULT_ANIMATION
			this.state.goblin.movementState = getIdleMovementStateForDecision(decision)
			return this.appendEvent({
				type: questResult.eventPatch ? questResult.eventPatch.type : 'thought',
				action: 'wait',
				target: questResult.eventPatch && questResult.eventPatch.target ? questResult.eventPatch.target : decision.target || null,
				message: decision.goblinUtterance || 'The goblin waits and listens.',
				publicRationale: decision.publicRationale || (questResult.eventPatch && questResult.eventPatch.publicRationale) || '',
				controller: questResult.waitingForConversation ? 'dialogue-hold' : questResult.eventPatch && questResult.eventPatch.controller ? questResult.eventPatch.controller : controller,
				worldDelta: mergeWorldDelta(questResult.eventPatch && questResult.eventPatch.worldDelta, {
					goblin: {
						position: this.state.goblin.position,
						facing: this.state.goblin.facing,
						animation: this.state.goblin.animation,
						movementState: this.state.goblin.movementState
					}
				}, this.getPublicStoryDelta())
			})
		}

		const questResult = this.applyQuestInteractionForDecision(decision)
		let classicResult = null
		if (this.shouldApplyClassicDecision(decision)) {
			classicResult = applyClassicAction(this.ensureClassicState(), this.getSnapshot(), decision, { seed: this.state.turn })
			this.applyClassicResult(classicResult)
		}
		this.state.goblin.animation = DEFAULT_ANIMATION
		this.state.goblin.movementState = getIdleMovementStateForDecision(decision)
		return this.appendEvent({
			type: questResult.waitingForConversation ? 'thought' : questResult.eventPatch ? questResult.eventPatch.type : decision.action === 'inspect' ? 'thought' : 'action',
			action: decision.action,
			target: questResult.eventPatch && questResult.eventPatch.target ? questResult.eventPatch.target : decision.target || null,
			message: decision.goblinUtterance || (questResult.eventPatch && questResult.eventPatch.message) || (classicResult && classicResult.eventPatch && classicResult.eventPatch.message) || `The goblin tries to ${decision.action}.`,
			publicRationale: decision.publicRationale || (questResult.eventPatch && questResult.eventPatch.publicRationale) || '',
			controller: questResult.waitingForConversation ? 'dialogue-hold' : questResult.eventPatch && questResult.eventPatch.controller ? questResult.eventPatch.controller : controller,
			worldDelta: mergeWorldDelta(classicResult && classicResult.worldDelta, questResult.eventPatch && questResult.eventPatch.worldDelta, {
				goblin: {
					position: this.state.goblin.position,
					facing: this.state.goblin.facing,
					animation: this.state.goblin.animation,
					movementState: this.state.goblin.movementState
				}
			}, this.getPublicStoryDelta())
		})
	}
}

module.exports = {
	createEvent,
	createInitialWorld,
	createWorldFromTiledMap,
	GoblinWorld
}
