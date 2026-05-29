const CHATTY_NAME = 'Chatty, the chosen one'
const INTERACTION_RADIUS = 1
const MAX_RECOVERY_FAILURES = 3
const MAX_PATH_EXPANSIONS = 6000
const {
	CANONICAL_CLASSIC_MAP_IDS,
	createClassicGameRuntime
} = require('./classicRuntime')
const { inferTaskTargetMapId } = require('./story/targetMaps')

const CLASSIC_RUNTIME = createClassicGameRuntime()

const CARDINAL_STEPS = [
	{ direction: 'east', x: 1, y: 0 },
	{ direction: 'south', x: 0, y: 1 },
	{ direction: 'west', x: -1, y: 0 },
	{ direction: 'north', x: 0, y: -1 }
]

const DIALOGUE_TARGET_KINDS = new Set(['dialogue', 'rumor', 'ally', 'ideology', 'speech', 'goal', 'choice'])

const ZONE_ALIASES = {
	tavern: ['tavern', 'bartender', 'snack'],
	'mayor-house': ['mayor', 'leonard'],
	market: ['market', 'trader', 'cloth'],
	'town-square': ['square', 'rally', 'banner', 'proclamation'],
	armory: ['armory', 'armor', 'stone guard'],
	cellar: ['cellar', 'ledger', 'mite', 'rat'],
	'forest-edge': ['forest', 'bramble', 'blackroot'],
	'hidden-camp': ['hidden', 'camp', 'goblin'],
	'under-road': ['under-road', 'sealed-door', 'binding', 'first goblin name'],
	graveyard: ['graveyard', 'grave', 'stone', 'buried'],
	'tainted-forest': ['tainted', 'blackroot', 'corruption'],
	'loot-lair': ['loot', 'lair', 'supply cache'],
	'orc-castle': ['orc', 'castle', 'patrol'],
	'kingdom-road': ['kingdom', 'permit', 'politics'],
	'lich-boss': ['lich boss', 'bone clerk', 'boss chamber'],
	'overworld-road': ['overworld', 'charter', 'free road']
}

const ACTOR_ZONE_BY_DIALOG = {
	BARTENDER: 'tavern',
	MAYOR_LEONARD: 'mayor-house',
	DWARF_BILI: 'market',
	STONE_GUARD: 'armory'
}

const ACTOR_ZONE_BY_SPRITE = {
	bartender: 'tavern',
	mayor: 'mayor-house',
	dwarf: 'market',
	marketTrader: 'market',
	hoodedVillager: 'town-square',
	forestWanderer: 'forest-edge',
	lanternKeeper: 'under-road',
	stoneGuard: 'armory'
}

const DECORATIVE_DIALOG_NAMES = new Set(['bar', 'counter', 'table', 'chair', 'bench', 'bed', 'sign', 'chest', 'door'])

const STORY_WAYPOINTS = {
	tavern: [
		{ id: 'tavern-exterior', label: 'Tavern Exterior', ratio: { x: 0.32, y: 0.38 } },
		{ id: 'tavern-entrance', label: 'Tavern Entrance', ratio: { x: 0.25, y: 0.38 } },
		{ id: 'bar-counter', label: 'Bar Counter', ratio: { x: 0.18, y: 0.34 } }
	],
	'mayor-house': [
		{ id: 'mayor-house-exterior', label: 'Mayor House Exterior', ratio: { x: 0.68, y: 0.34 } },
		{ id: 'mayor-office', label: 'Mayor Office', ratio: { x: 0.7, y: 0.28 } }
	],
	market: [
		{ id: 'market-road', label: 'Market Road', ratio: { x: 0.5, y: 0.48 } },
		{ id: 'market-stalls', label: 'Market Stalls', ratio: { x: 0.56, y: 0.5 } }
	],
	'town-square': [
		{ id: 'town-square', label: 'Town Square', ratio: { x: 0.5, y: 0.5 } },
		{ id: 'banner-place', label: 'Banner Place', ratio: { x: 0.52, y: 0.46 } }
	],
	armory: [
		{ id: 'armory-door', label: 'Armory Door', ratio: { x: 0.74, y: 0.58 } },
		{ id: 'old-road-armory', label: 'Old Road Armory', ratio: { x: 0.78, y: 0.62 } }
	],
	cellar: [
		{ id: 'cellar-hatch', label: 'Cellar Hatch', ratio: { x: 0.24, y: 0.52 } },
		{ id: 'cellar-storage', label: 'Cellar Storage', ratio: { x: 0.2, y: 0.56 } }
	],
	'forest-edge': [
		{ id: 'forest-edge', label: 'Forest Edge', ratio: { x: 0.85, y: 0.4 } },
		{ id: 'lantern-road-end', label: 'Lantern Road End', ratio: { x: 0.78, y: 0.43 } }
	],
	'hidden-camp': [
		{ id: 'hidden-camp-approach', label: 'Hidden Camp Approach', ratio: { x: 0.16, y: 0.72 } },
		{ id: 'hidden-camp', label: 'Hidden Camp', ratio: { x: 0.12, y: 0.75 } }
	],
	'under-road': [
		{ id: 'under-road-entrance', label: 'Under Road Entrance', ratio: { x: 0.66, y: 0.75 } },
		{ id: 'sealed-door', label: 'Sealed Door', ratio: { x: 0.7, y: 0.76 } }
	],
	graveyard: [
		{ id: 'graveyard-gate', label: 'Graveyard Gate', ratio: { x: 0.5, y: 0.88 } },
		{ id: 'old-goblin-stones', label: 'Old Goblin Stones', ratio: { x: 0.48, y: 0.5 } }
	],
	'tainted-forest': [
		{ id: 'tainted-tree-line', label: 'Tainted Tree Line', ratio: { x: 0.12, y: 0.5 } },
		{ id: 'blackroot-mark', label: 'Blackroot Mark', ratio: { x: 0.54, y: 0.46 } }
	],
	'loot-lair': [
		{ id: 'loot-lair-mouth', label: 'Loot Lair Mouth', ratio: { x: 0.1, y: 0.52 } },
		{ id: 'supply-cache', label: 'Supply Cache', ratio: { x: 0.54, y: 0.45 } }
	],
	'orc-castle': [
		{ id: 'orc-castle-road', label: 'Orc Castle Road', ratio: { x: 0.12, y: 0.5 } },
		{ id: 'patrol-line', label: 'Patrol Line', ratio: { x: 0.5, y: 0.5 } }
	],
	'kingdom-road': [
		{ id: 'kingdom-road', label: 'Kingdom Road', ratio: { x: 0.5, y: 0.82 } },
		{ id: 'permit-house', label: 'Permit House', ratio: { x: 0.52, y: 0.48 } }
	],
	'lich-boss': [
		{ id: 'lich-boss-entry', label: 'Lich Boss Entry', ratio: { x: 0.5, y: 0.9 } },
		{ id: 'bone-ledger', label: 'Bone Ledger', ratio: { x: 0.5, y: 0.45 } }
	],
	'overworld-road': [
		{ id: 'overworld-road', label: 'Overworld Road', ratio: { x: 0.5, y: 0.5 } },
		{ id: 'charter-crossing', label: 'Charter Crossing', ratio: { x: 0.62, y: 0.5 } }
	],
	mulberry: [
		{ id: 'mulberry-road', label: 'Mulberry Road', ratio: { x: 0.5, y: 0.5 } }
	]
}

function samePosition(a, b) {
	return a && b && a.x === b.x && a.y === b.y
}

function positionKey(position) {
	return `${position.x},${position.y}`
}

function normalizePosition(position, fallback = { x: 0, y: 0 }) {
	return {
		x: Number.isInteger(position && position.x) ? position.x : fallback.x,
		y: Number.isInteger(position && position.y) ? position.y : fallback.y
	}
}

function distance(a, b) {
	const left = normalizePosition(a)
	const right = normalizePosition(b)
	return Math.abs(left.x - right.x) + Math.abs(left.y - right.y)
}

function isInsideMap(snapshot, position) {
	const map = snapshot.map || {}
	return position.x >= 0 && position.y >= 0 && position.x < map.width && position.y < map.height
}

function isBlocked(snapshot, position) {
	const blockedTiles = (snapshot.map && snapshot.map.blocked) || []
	return !isInsideMap(snapshot, position) || blockedTiles.some(blocked => samePosition(blocked, position))
}

function isActorOccupied(snapshot, position, ignoreActorIds = []) {
	const ignored = new Set(ignoreActorIds)
	return ((snapshot.map && snapshot.map.actors) || []).some(actor => {
		if (ignored.has(actor.id)) return false
		return samePosition(actor, position)
	})
}

function isWalkable(snapshot, position, ignoreActorIds = []) {
	return !isBlocked(snapshot, position) && !isActorOccupied(snapshot, position, ignoreActorIds)
}

function legalMoveForPosition(snapshot, position) {
	return (snapshot.legalMoves || []).find(move => samePosition(move, position)) || position
}

function directionForStep(start, target) {
	const dx = target.x - start.x
	const dy = target.y - start.y
	const step = CARDINAL_STEPS.find(candidate => candidate.x === dx && candidate.y === dy)
	return step ? step.direction : undefined
}

function withDirection(snapshot, position) {
	if (!position) return null
	const legal = legalMoveForPosition(snapshot, position)
	if (legal.direction) return legal
	const direction = directionForStep(snapshot.goblin.position, position)
	return direction ? { direction, x: position.x, y: position.y } : position
}

function isDialogueActor(actor) {
	const entityType = String(actor.entityType || '').toUpperCase()
	const name = String(actor.name || '').toLowerCase()
	if (DECORATIVE_DIALOG_NAMES.has(name)) return false
	if (entityType === 'NPC') return true
	if (!actor.dialog) return false
	return Boolean(actor.spriteKey && ACTOR_ZONE_BY_SPRITE[actor.spriteKey])
}

function getDialogueActors(snapshot) {
	return ((snapshot.map && snapshot.map.actors) || []).filter(isDialogueActor)
}

function actorText(actor) {
	return `${actor.name || ''} ${actor.dialog || ''} ${actor.spriteKey || ''}`.toLowerCase()
}

function actorMatchesName(actor, name) {
	const target = String(name || '').toLowerCase()
	const text = actorText(actor)
	if (!target) return false
	if (target === 'tavern-or-mayor') return actor.dialog === 'BARTENDER' || actor.dialog === 'MAYOR_LEONARD'
	if (target.includes('bartender')) return actor.dialog === 'BARTENDER' || text.includes('bartender')
	if (target.includes('mayor') || target.includes('leonard')) return actor.dialog === 'MAYOR_LEONARD' || text.includes('mayor') || text.includes('leonard')
	if (target.includes('dwarf') || target.includes('bili')) return actor.dialog === 'DWARF_BILI' || text.includes('dwarf') || text.includes('bili')
	if (target.includes('stone') || target.includes('guard')) return text.includes('stone') || text.includes('guard') || actor.spriteKey === 'stoneGuard'
	if (target.includes('forest') || target.includes('wander')) return text.includes('forest') || text.includes('wander') || actor.spriteKey === 'forestWanderer'
	if (target.includes('lantern')) return text.includes('lantern') || actor.spriteKey === 'lanternKeeper'
	if (target.includes('market') || target.includes('trader') || target.includes('cloth')) return text.includes('market') || text.includes('trader') || actor.spriteKey === 'marketTrader'
	if (target.includes('hood')) return text.includes('hood') || actor.spriteKey === 'hoodedVillager'
	if (target.includes('goblin')) return text.includes('goblin') || ['nib', 'muck', 'skrit'].some(part => text.includes(part))
	return text.includes(target)
}

function getActorDisplayName(actor) {
	if (!actor) return ''
	if (actor.name && actor.name !== 'NPC') return actor.name
	if (actor.dialog === 'BARTENDER') return 'Bartender'
	if (actor.dialog === 'MAYOR_LEONARD') return 'Mayor Leonard'
	if (actor.dialog === 'DWARF_BILI') return 'Dwarf Bili'
	if (actor.dialog === 'STONE_GUARD') return 'Stone Guard'
	if (actor.spriteKey === 'marketTrader') return 'Market Trader'
	if (actor.spriteKey === 'forestWanderer') return 'Forest Wanderer'
	if (actor.spriteKey === 'lanternKeeper') return 'Lantern Keeper'
	if (actor.spriteKey === 'stoneGuard') return 'Stone Guard'
	return actor.name || 'Villager'
}

function getTaskActors(snapshot, task) {
	const target = (task && task.target) || {}
	const actors = getDialogueActors(snapshot)
	let matches = []
	if (target.dialog) {
		matches = actors.filter(actor => actor.dialog === target.dialog)
	}
	if (!matches.length && target.name) {
		matches = actors.filter(actor => actorMatchesName(actor, target.name))
	}
	if (!matches.length && !target.dialog && !target.name && DIALOGUE_TARGET_KINDS.has(target.kind)) {
		matches = actors
	}
	const goblin = snapshot.goblin.position
	return matches.slice().sort((a, b) => distance(goblin, a) - distance(goblin, b) || String(a.id || a.name).localeCompare(String(b.id || b.name)))
}

function getActorZone(actor) {
	if (!actor) return ''
	if (actor.dialog && ACTOR_ZONE_BY_DIALOG[actor.dialog]) return ACTOR_ZONE_BY_DIALOG[actor.dialog]
	if (actor.spriteKey && ACTOR_ZONE_BY_SPRITE[actor.spriteKey]) return ACTOR_ZONE_BY_SPRITE[actor.spriteKey]
	return ''
}

function getTargetZone(task, actor) {
	if (actor) return getActorZone(actor) || 'town-square'
	const target = (task && task.target) || {}
	if (target.zone) return target.zone
	const text = `${target.kind || ''} ${target.name || ''} ${target.enemy || ''} ${task ? task.title || '' : ''}`.toLowerCase()
	for (const [zone, aliases] of Object.entries(ZONE_ALIASES)) {
		if (aliases.some(alias => text.includes(alias))) return zone
	}
	if (target.kind === 'combat') return 'town-square'
	if (target.kind === 'self' || target.kind === 'identity') return 'mulberry'
	return 'mulberry'
}

function getCurrentMapId(snapshot) {
	return snapshot.map && snapshot.map.id ? snapshot.map.id : 'mulberryTown'
}

function getTargetMapId(task = {}) {
	return inferTaskTargetMapId(task)
}

function getMapRoute(currentMapId = 'mulberryTown', targetMapId = '') {
	if (!targetMapId || targetMapId === currentMapId) return [currentMapId]
	if (CANONICAL_CLASSIC_MAP_IDS.includes(currentMapId) && CANONICAL_CLASSIC_MAP_IDS.includes(targetMapId)) {
		const route = CLASSIC_RUNTIME.findMapRoute(currentMapId, targetMapId)
		if (route.length) return route
	}
	return [currentMapId, targetMapId]
}

function getPortalRouteTarget(currentMapId, targetMapId) {
	const mapRoute = getMapRoute(currentMapId, targetMapId)
	return {
		finalTargetMapId: targetMapId,
		mapRoute,
		nextMapId: mapRoute.length > 1 ? mapRoute[1] : targetMapId
	}
}

function getAdjacentWalkableTiles(snapshot, actor) {
	return CARDINAL_STEPS
		.map(step => ({ x: actor.x + step.x, y: actor.y + step.y }))
		.filter(position => isWalkable(snapshot, position, [actor.id]))
}

function findZoneAnchorActor(snapshot, zone) {
	const actors = (snapshot.map && snapshot.map.actors) || []
	return (
		actors.find(actor => {
			if (actor.dialog && ACTOR_ZONE_BY_DIALOG[actor.dialog] === zone) return true
			if (actor.spriteKey && ACTOR_ZONE_BY_SPRITE[actor.spriteKey] === zone) return true
			return false
		}) || null
	)
}

function zoneCenter(snapshot, zone) {
	const map = snapshot.map || {}
	const width = Math.max(1, map.width || 1)
	const height = Math.max(1, map.height || 1)
	const anchorActor = findZoneAnchorActor(snapshot, zone)
	if (anchorActor && Number.isInteger(anchorActor.x) && Number.isInteger(anchorActor.y)) {
		return {
			x: Math.max(0, Math.min(width - 1, anchorActor.x)),
			y: Math.max(0, Math.min(height - 1, anchorActor.y))
		}
	}
	const points = {
		tavern: { x: Math.floor(width * 0.22), y: Math.floor(height * 0.38) },
		'mayor-house': { x: Math.floor(width * 0.7), y: Math.floor(height * 0.28) },
		market: { x: Math.floor(width * 0.5), y: Math.floor(height * 0.48) },
		'town-square': { x: Math.floor(width * 0.5), y: Math.floor(height * 0.5) },
		armory: { x: Math.floor(width * 0.78), y: Math.floor(height * 0.62) },
		cellar: { x: Math.floor(width * 0.24), y: Math.floor(height * 0.52) },
		'forest-edge': { x: Math.floor(width * 0.85), y: Math.floor(height * 0.4) },
		'hidden-camp': { x: Math.floor(width * 0.12), y: Math.floor(height * 0.75) },
		'under-road': { x: Math.floor(width * 0.66), y: Math.floor(height * 0.75) },
		mulberry: { x: Math.floor(width * 0.5), y: Math.floor(height * 0.5) }
	}
	const point = points[zone] || points.mulberry
	return {
		x: Math.max(0, Math.min(width - 1, point.x)),
		y: Math.max(0, Math.min(height - 1, point.y))
	}
}

function clampPosition(snapshot, ratio = {}) {
	const map = snapshot.map || {}
	const width = Math.max(1, map.width || 1)
	const height = Math.max(1, map.height || 1)
	return {
		x: Math.max(0, Math.min(width - 1, Math.floor(width * (Number.isFinite(ratio.x) ? ratio.x : 0.5)))),
		y: Math.max(0, Math.min(height - 1, Math.floor(height * (Number.isFinite(ratio.y) ? ratio.y : 0.5))))
	}
}

function expandDestination(snapshot, position) {
	const candidates = [
		position,
		...CARDINAL_STEPS.map(step => ({ x: position.x + step.x, y: position.y + step.y })),
		...CARDINAL_STEPS.map(step => ({ x: position.x + step.x * 2, y: position.y + step.y * 2 }))
	]
	return candidates.filter((candidate, index, list) => {
		if (!isWalkable(snapshot, candidate)) return false
		return list.findIndex(other => samePosition(other, candidate)) === index
	})
}

function getZoneWaypoints(snapshot, zone = 'mulberry') {
	const waypoints = STORY_WAYPOINTS[zone] || STORY_WAYPOINTS.mulberry
	return waypoints.map(waypoint => ({
		id: waypoint.id,
		label: waypoint.label,
		position: clampPosition(snapshot, waypoint.ratio)
	}))
}

function getWaypointRoute(snapshot, zone) {
	const waypoints = getZoneWaypoints(snapshot, zone)
	for (const waypoint of waypoints) {
		const exactDestinations = isWalkable(snapshot, waypoint.position) ? [waypoint.position] : []
		const exactPath = findPath(snapshot, snapshot.goblin.position, exactDestinations)
		const exactReached = exactDestinations.some(destination => samePosition(snapshot.goblin.position, destination))
		if (exactReached || exactPath.length) {
			return {
				waypoint,
				destinations: exactDestinations,
				path: exactReached ? [] : exactPath,
				reached: exactReached
			}
		}
		const currentPosition = snapshot.goblin && snapshot.goblin.position
		const destinations = expandDestination(snapshot, waypoint.position)
		const expandedReached = destinations.some(destination => samePosition(destination, currentPosition))
		const pathDestinations = expandedReached
			? destinations
			: destinations.filter(destination => !samePosition(destination, currentPosition))
		const path = expandedReached ? [] : findPath(snapshot, snapshot.goblin.position, pathDestinations)
		if (expandedReached || path.length) {
			return {
				waypoint,
				destinations,
				path,
				reached: expandedReached
			}
		}
	}
	return {
		waypoint: waypoints[0] || null,
		destinations: [],
		path: [],
		reached: false
	}
}

function getZoneDestinations(snapshot, zone) {
	const center = zoneCenter(snapshot, zone)
	const candidates = [
		center,
		...CARDINAL_STEPS.map(step => ({ x: center.x + step.x, y: center.y + step.y })),
		...CARDINAL_STEPS.map(step => ({ x: center.x + step.x * 2, y: center.y + step.y * 2 }))
	]
	return candidates.filter((position, index, list) => {
		if (!isWalkable(snapshot, position)) return false
		return list.findIndex(candidate => samePosition(candidate, position)) === index
	})
}

function getNeighbors(snapshot, position) {
	return CARDINAL_STEPS
		.map(step => ({ x: position.x + step.x, y: position.y + step.y }))
		.filter(candidate => isWalkable(snapshot, candidate))
}

class MinHeap {
	constructor() {
		this.items = []
	}

	size() {
		return this.items.length
	}

	push(key, priority) {
		const items = this.items
		items.push({ key, priority })
		let index = items.length - 1
		while (index > 0) {
			const parent = (index - 1) >> 1
			if (items[parent].priority <= items[index].priority) break
			const swap = items[parent]
			items[parent] = items[index]
			items[index] = swap
			index = parent
		}
	}

	pop() {
		const items = this.items
		const top = items[0]
		const last = items.pop()
		if (items.length) {
			items[0] = last
			let index = 0
			const length = items.length
			for (;;) {
				const left = index * 2 + 1
				const right = left + 1
				let smallest = index
				if (left < length && items[left].priority < items[smallest].priority) smallest = left
				if (right < length && items[right].priority < items[smallest].priority) smallest = right
				if (smallest === index) break
				const swap = items[smallest]
				items[smallest] = items[index]
				items[index] = swap
				index = smallest
			}
		}
		return top.key
	}
}

function manhattanToNearest(position, destinations) {
	let best = Infinity
	for (const destination of destinations) {
		const cost = Math.abs(position.x - destination.x) + Math.abs(position.y - destination.y)
		if (cost < best) best = cost
	}
	return best === Infinity ? 0 : best
}

function buildBlockedLookup(snapshot) {
	const map = snapshot.map || {}
	const blocked = new Set()
	for (const tile of map.blocked || []) {
		if (Number.isInteger(tile.x) && Number.isInteger(tile.y)) blocked.add(positionKey(tile))
	}
	for (const actor of map.actors || []) {
		if (Number.isInteger(actor.x) && Number.isInteger(actor.y)) blocked.add(positionKey(actor))
	}
	return { blocked, width: map.width || 0, height: map.height || 0 }
}

function reconstructPath(cameFrom, destinationKey, startKey, positionsByKey) {
	const keys = []
	let key = destinationKey
	while (key !== startKey) {
		keys.push(key)
		const parent = cameFrom.get(key)
		if (parent === undefined) break
		key = parent
	}
	keys.reverse()
	return keys.map(stepKey => positionsByKey.get(stepKey))
}

function findPath(snapshot, start, destinations) {
	const normalizedStart = normalizePosition(start)
	const destinationList = (destinations || []).map(position => normalizePosition(position))
	const destinationKeys = new Set(destinationList.map(positionKey))
	const startKey = positionKey(normalizedStart)
	if (!destinationKeys.size || destinationKeys.has(startKey)) return []

	const { blocked, width, height } = buildBlockedLookup(snapshot)
	const cameFrom = new Map()
	const gScore = new Map([[startKey, 0]])
	const positionsByKey = new Map([[startKey, normalizedStart]])
	const closed = new Set()
	const open = new MinHeap()
	open.push(startKey, manhattanToNearest(normalizedStart, destinationList))
	let expansions = 0

	while (open.size() && expansions < MAX_PATH_EXPANSIONS) {
		const currentKey = open.pop()
		if (closed.has(currentKey)) continue
		if (destinationKeys.has(currentKey)) return reconstructPath(cameFrom, currentKey, startKey, positionsByKey)
		closed.add(currentKey)
		expansions += 1
		const current = positionsByKey.get(currentKey)
		const currentG = gScore.get(currentKey)
		for (const step of CARDINAL_STEPS) {
			const nextX = current.x + step.x
			const nextY = current.y + step.y
			if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height) continue
			const nextKey = `${nextX},${nextY}`
			if (blocked.has(nextKey) || closed.has(nextKey)) continue
			const tentativeG = currentG + 1
			if (tentativeG < (gScore.has(nextKey) ? gScore.get(nextKey) : Infinity)) {
				const next = { x: nextX, y: nextY }
				cameFrom.set(nextKey, currentKey)
				gScore.set(nextKey, tentativeG)
				positionsByKey.set(nextKey, next)
				open.push(nextKey, tentativeG + manhattanToNearest(next, destinationList))
			}
		}
	}
	return []
}

function findFirstStepToward(snapshot, destinations) {
	const path = findPath(snapshot, snapshot.goblin.position, destinations)
	return path.length ? withDirection(snapshot, path[0]) : null
}

function getCurrentTask(snapshot) {
	const tasks = Array.isArray(snapshot.tasks) ? snapshot.tasks : []
	return tasks.find(task => task.status === 'combat' || task.status === 'active') || null
}

function getNavigationTask(snapshot, taskInput) {
	if (taskInput) return taskInput
	const task = getCurrentTask(snapshot)
	const plan = snapshot.story && snapshot.story.directorPlan
	if (plan && plan.status === 'recovering' && plan.targetZone && (plan.failureCount || 0) <= MAX_RECOVERY_FAILURES) {
		return {
			id: plan.questId || (task && task.id) || 'director-recovery',
			title: plan.currentIntent || `Reach ${plan.targetName || plan.targetZone}`,
			status: 'active',
			target: {
				kind: 'place',
				zone: plan.targetZone,
				name: plan.targetName || plan.targetZone
			}
		}
	}
	return task
}

function getRecentGoblinPositions(snapshot, limit = 16) {
	const events = Array.isArray(snapshot.events) ? snapshot.events : []
	const positions = []
	for (let index = events.length - 1; index >= 0 && positions.length < limit; index -= 1) {
		const event = events[index]
		if (event.actor !== CHATTY_NAME || event.action !== 'move') continue
		const position = event.worldDelta && event.worldDelta.goblin && event.worldDelta.goblin.position
			? event.worldDelta.goblin.position
			: event.position
		if (position && Number.isInteger(position.x) && Number.isInteger(position.y)) {
			positions.push({ x: position.x, y: position.y })
		}
	}
	return positions
}

function detectMovementLoop(snapshot, options = {}) {
	const window = Number.isInteger(options.window) ? options.window : 12
	const recent = getRecentGoblinPositions(snapshot, window)
	if (recent.length < 6) return false
	const distinct = new Set(recent.map(positionKey)).size
	const maxDistinct = Number.isInteger(options.maxDistinct) ? options.maxDistinct : Math.max(2, Math.floor(recent.length / 3))
	return distinct <= maxDistinct
}

function getRecentPositionScores(snapshot, limit = 24) {
	const recent = getRecentGoblinPositions(snapshot, limit)
	return recent.reduce((counts, position, index) => {
		const key = positionKey(position)
		counts[key] = (counts[key] || 0) + Math.max(1, limit - index)
		return counts
	}, {})
}

function isCovered(coverage, x, y) {
	if (!coverage || !coverage.data || !coverage.width) return false
	if (x < 0 || y < 0 || x >= coverage.width || y >= (coverage.height || 0)) return false
	return coverage.data[y * coverage.width + x] === 1
}

function findExplorationStep(snapshot, coverage) {
	if (!coverage || !coverage.data || !coverage.width) return null
	const start = normalizePosition(snapshot.goblin && snapshot.goblin.position)
	const { blocked, width, height } = buildBlockedLookup(snapshot)
	if (!width || !height) return null
	const startKey = positionKey(start)
	const cameFrom = new Map()
	const positionsByKey = new Map([[startKey, start]])
	const seen = new Set([startKey])
	const queue = [start]
	let head = 0
	while (head < queue.length) {
		const current = queue[head]
		head += 1
		const currentKey = positionKey(current)
		for (const step of CARDINAL_STEPS) {
			const nextX = current.x + step.x
			const nextY = current.y + step.y
			if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height) continue
			const nextKey = `${nextX},${nextY}`
			if (seen.has(nextKey) || blocked.has(nextKey)) continue
			seen.add(nextKey)
			cameFrom.set(nextKey, currentKey)
			const next = { x: nextX, y: nextY }
			positionsByKey.set(nextKey, next)
			if (!isCovered(coverage, nextX, nextY)) {
				const path = reconstructPath(cameFrom, nextKey, startKey, positionsByKey)
				return path.length ? path[0] : null
			}
			queue.push(next)
		}
	}
	return null
}

function chooseExplorationMove(snapshot, coverage = null) {
	if (coverage) {
		const frontierStep = findExplorationStep(snapshot, coverage)
		if (frontierStep) return withDirection(snapshot, frontierStep)
	}
	const legalMoves = Array.isArray(snapshot.legalMoves) ? snapshot.legalMoves : []
	if (!legalMoves.length) return null
	const recentScores = getRecentPositionScores(snapshot)
	const previousPosition = getRecentGoblinPositions(snapshot, 4)[1]
	return legalMoves.slice().sort((a, b) => {
		const aKey = positionKey(a)
		const bKey = positionKey(b)
		const aScore = (recentScores[aKey] || 0) + (previousPosition && samePosition(a, previousPosition) ? 12 : 0)
		const bScore = (recentScores[bKey] || 0) + (previousPosition && samePosition(b, previousPosition) ? 12 : 0)
		if (aScore !== bScore) return aScore - bScore
		return `${a.x},${a.y}`.localeCompare(`${b.x},${b.y}`)
	})[0]
}

function getDestinationSet(snapshot, task, targetActor, targetZone) {
	if (targetActor) return getAdjacentWalkableTiles(snapshot, targetActor)
	return getZoneDestinations(snapshot, targetZone)
}

function getPortalDestinations(snapshot, portal) {
	if (!portal) return []
	const candidates = [
		{ x: portal.x, y: portal.y },
		...CARDINAL_STEPS.map(step => ({ x: portal.x + step.x, y: portal.y + step.y })),
		...CARDINAL_STEPS.map(step => ({ x: portal.x + step.x * 2, y: portal.y + step.y * 2 }))
	]
	return candidates.filter((position, index, list) => {
		if (!isWalkable(snapshot, position)) return false
		return list.findIndex(candidate => samePosition(candidate, position)) === index
	})
}

function resolvePortalRoute(snapshot, task, options = {}) {
	const targetMapId = options.targetMapId || getTargetMapId(task)
	const currentMapId = getCurrentMapId(snapshot)
	if (!targetMapId || targetMapId === currentMapId) return null
	const routeTarget = getPortalRouteTarget(currentMapId, targetMapId)
	const portals = ((snapshot.map && snapshot.map.portalLinks) || []).filter(link => link.targetMapId === routeTarget.nextMapId)
	const candidates = portals.map(portal => {
		const destinations = getPortalDestinations(snapshot, portal)
		const path = findPath(snapshot, snapshot.goblin.position, destinations)
		const reached = distance(snapshot.goblin.position, portal) <= INTERACTION_RADIUS || destinations.some(destination => samePosition(destination, snapshot.goblin.position))
		return { portal, destinations, path, reached }
	})
	const route = candidates
		.filter(candidate => candidate.reached || candidate.path.length)
		.sort((a, b) => {
			const aDistance = a.reached ? 0 : a.path.length
			const bDistance = b.reached ? 0 : b.path.length
			return aDistance - bDistance || String(a.portal.id).localeCompare(String(b.portal.id))
		})[0]
	if (!route) {
		return {
			mode: 'portal',
			questId: task ? task.id : null,
			targetTitle: task ? task.title : 'Reach the next map',
			targetZone: (task && task.target && task.target.zone) || '',
			targetMapId: routeTarget.nextMapId,
			finalTargetMapId: routeTarget.finalTargetMapId,
			nextMapId: routeTarget.nextMapId,
			mapRoute: routeTarget.mapRoute,
			targetPortal: portals[0] || null,
			destinations: [],
			path: [],
			nextStep: null,
			distance: 0,
			reached: false,
			routeStatus: 'blocked',
			nextWaypoint: null,
			unreachableReason: 'portal-unreachable',
			proxyReached: false,
			stuck: detectMovementLoop(snapshot),
			targetReason: `The next objective needs a route through ${routeTarget.nextMapId} toward ${targetMapId}.`,
			updatedTurn: snapshot.turn || 0
		}
	}
	return {
		mode: 'portal',
		questId: task ? task.id : null,
		targetTitle: task ? task.title : 'Reach the next map',
		targetZone: (task && task.target && task.target.zone) || '',
		targetMapId: routeTarget.nextMapId,
		finalTargetMapId: routeTarget.finalTargetMapId,
		nextMapId: routeTarget.nextMapId,
		mapRoute: routeTarget.mapRoute,
		targetPortal: route.portal,
		destinations: route.destinations,
		path: route.path,
		nextStep: route.path.length ? withDirection(snapshot, route.path[0]) : null,
		distance: route.path.length,
		reached: route.reached,
		routeStatus: route.reached ? 'portal-reached' : 'ready',
		nextWaypoint: null,
		unreachableReason: '',
		proxyReached: false,
		stuck: detectMovementLoop(snapshot),
		targetReason: `${task ? task.title : 'The next objective'} needs the ${route.portal.portalId} portal on the way to ${targetMapId}.`,
		updatedTurn: snapshot.turn || 0
	}
}

function resolveActorRoute(snapshot, actors) {
	const candidates = (actors || []).map(actor => {
		const destinations = getAdjacentWalkableTiles(snapshot, actor)
		const path = findPath(snapshot, snapshot.goblin.position, destinations)
		const reached = distance(snapshot.goblin.position, actor) <= INTERACTION_RADIUS
		return {
			actor,
			destinations,
			path,
			reached
		}
	})
	const reachable = candidates
		.filter(candidate => candidate.reached || candidate.path.length)
		.sort((a, b) => {
			const aDistance = a.reached ? 0 : a.path.length
			const bDistance = b.reached ? 0 : b.path.length
			return aDistance - bDistance || String(a.actor.id || a.actor.name).localeCompare(String(b.actor.id || b.actor.name))
		})[0]
	if (reachable) return reachable
	return candidates[0] || null
}

function resolveQuestNavigation(snapshot, taskInput) {
	const task = getNavigationTask(snapshot, taskInput)
	const targetActors = getTaskActors(snapshot, task)
	const target = task && task.target ? task.target : {}
	const currentMapId = getCurrentMapId(snapshot)
	const inferredTargetMapId = getTargetMapId(task)
	const localTargetMapId = !target.mapId && targetActors.length ? currentMapId : inferredTargetMapId
	const shouldRouteAcrossMaps = Boolean(task && inferredTargetMapId && inferredTargetMapId !== currentMapId && (target.mapId || !targetActors.length))
	const portalRoute = shouldRouteAcrossMaps ? resolvePortalRoute(snapshot, task, { targetMapId: inferredTargetMapId }) : null
	if (portalRoute) return portalRoute
	const actorRoute = resolveActorRoute(snapshot, targetActors)
	const targetActor = actorRoute ? actorRoute.actor : null
	const targetZone = getTargetZone(task, targetActor)
	let destinations = actorRoute ? actorRoute.destinations : getDestinationSet(snapshot, task, targetActor, targetZone)
	let path = actorRoute ? actorRoute.path : findPath(snapshot, snapshot.goblin.position, destinations)
	let nextWaypoint = null
	let unreachableReason = ''
	let routeStatus = 'blocked'
	let proxyReached = false
	if (targetActor && !path.length && !(actorRoute && actorRoute.reached)) {
		const waypointRoute = getWaypointRoute(snapshot, targetZone)
		if (waypointRoute.reached || waypointRoute.path.length || waypointRoute.destinations.some(destination => samePosition(snapshot.goblin.position, destination))) {
			destinations = waypointRoute.destinations
			path = waypointRoute.path
			nextWaypoint = waypointRoute.waypoint
			unreachableReason = 'target-actor-unreachable'
			proxyReached = Boolean(waypointRoute.reached || waypointRoute.destinations.some(destination => samePosition(snapshot.goblin.position, destination)))
			routeStatus = proxyReached ? 'proxy-reached' : 'recovering'
		}
	}
	const nextStep = path.length ? withDirection(snapshot, path[0]) : null
	const reached = targetActor
		? distance(snapshot.goblin.position, targetActor) <= INTERACTION_RADIUS || proxyReached
		: destinations.some(destination => samePosition(snapshot.goblin.position, destination))
	if (reached) routeStatus = proxyReached ? 'proxy-reached' : 'reached'
	else if (!routeStatus || routeStatus === 'blocked') routeStatus = nextStep ? 'ready' : 'blocked'
	const targetTitle = task ? task.title : 'Scout the next clue'
	const targetActorName = targetActor ? getActorDisplayName(targetActor) : ''
	return {
		mode: task ? 'quest' : 'explore',
		questId: task ? task.id : null,
		targetTitle,
		targetZone,
		targetMapId: localTargetMapId || currentMapId,
		finalTargetMapId: localTargetMapId || currentMapId,
		nextMapId: '',
		mapRoute: localTargetMapId && localTargetMapId !== currentMapId ? getMapRoute(currentMapId, localTargetMapId) : [currentMapId],
		targetPortal: null,
		targetActorId: targetActor ? targetActor.id : null,
		targetActorName,
		destinations,
		path,
		nextStep,
		distance: path.length,
		reached,
		routeStatus,
		nextWaypoint: nextWaypoint ? { id: nextWaypoint.id, label: nextWaypoint.label, position: nextWaypoint.position } : null,
		unreachableReason,
		proxyReached,
		stuck: detectMovementLoop(snapshot),
		targetReason: targetActorName
			? `${targetTitle} needs ${targetActorName}.`
			: `${targetTitle} points toward ${targetZone}.`,
		updatedTurn: snapshot.turn || 0
	}
}

function getNavigationSnapshot(snapshot) {
	const route = resolveQuestNavigation(snapshot)
	const safe = {
		mode: route.mode,
		questId: route.questId,
		targetTitle: route.targetTitle,
		targetZone: route.targetZone,
		targetMapId: route.targetMapId,
		finalTargetMapId: route.finalTargetMapId,
		nextMapId: route.nextMapId,
		mapRoute: route.mapRoute,
		targetPortal: route.targetPortal,
		targetActorId: route.targetActorId,
		targetActorName: route.targetActorName,
		targetReason: route.targetReason,
		nextStep: route.nextStep,
		distance: route.distance,
		reached: route.reached,
		routeStatus: route.routeStatus,
		nextWaypoint: route.nextWaypoint,
		unreachableReason: route.unreachableReason,
		proxyReached: route.proxyReached,
		stuck: route.stuck,
		updatedTurn: route.updatedTurn
	}
	return safe
}

module.exports = {
	CARDINAL_STEPS,
	chooseExplorationMove,
	detectMovementLoop,
	distance,
	findExplorationStep,
	findFirstStepToward,
	findPath,
	getAdjacentWalkableTiles,
	getCurrentTask,
	getDialogueActors,
	getNavigationSnapshot,
	getRecentGoblinPositions,
	getTaskActors,
	getZoneWaypoints,
	positionKey,
	resolveQuestNavigation,
	samePosition
}
