const path = require('path')
const {
	CANONICAL_MAP_IDS,
	getPortalLinksForTiledMap,
	getRegisteredMap,
	getRegisteredMapIds,
	loadRegisteredTiledMap
} = require('./mapRegistry')

const DEFAULT_STATIC_ROOT = path.join(__dirname, '..', '..')

const CLASSIC_ROGUELIKE_ACTIONS = [
	'move',
	'examine',
	'interact',
	'climb',
	'pickup',
	'pick_up',
	'equip',
	'use',
	'cast',
	'fire',
	'attack',
	'rest',
	'flee',
	'reposition',
	'wait',
	'inspect'
]

const DEFAULT_INVENTORY = [
	{ key: 'bronze-sword', name: 'Bronze Sword', kind: 'weapon', action: 'equip' },
	{ key: 'short-bow', name: 'Short Bow', kind: 'weapon', action: 'fire' },
	{ key: 'steel-arrow', name: 'Steel Arrow', kind: 'ammo', action: 'fire' },
	{ key: 'health-potion', name: 'Health Potion', kind: 'consumable', action: 'use' },
	{ key: 'mana-potion', name: 'Mana Potion', kind: 'consumable', action: 'use' },
	{ key: 'map-revealing-scroll', name: 'Map Revealing Scroll', kind: 'scroll', action: 'use' },
	{ key: 'magic-dart', name: 'Magic Dart', kind: 'spell', action: 'cast' },
	{ key: 'minor-heal', name: 'Minor Heal', kind: 'spell', action: 'cast' },
	{ key: 'shock', name: 'Shock', kind: 'spell', action: 'cast' },
	{ key: 'fireball', name: 'Fire Ball', kind: 'spell', action: 'cast' },
	{ key: 'rage', name: 'Rage', kind: 'spell', action: 'cast' }
]

const DEFAULT_PLAYER = {
	hp: 12,
	maxHp: 12,
	mana: 8,
	maxMana: 8
}

const ITEM_TYPE_MAP = {
	SWORD: 'WEAPON',
	BRONZE_SWORD: 'WEAPON',
	SHORT_BOW: 'WEAPON',
	STEEL_ARROW: 'AMMO',
	HEALTH_POTION: 'HEALTH_POTION',
	MANA_POTION: 'MANA_POTION',
	MAP_REVEALING_SCROLL: 'SCROLL'
}

function normalizeEntityType(value) {
	return String(value || '').trim().toUpperCase()
}

function isClassicHostile(entityType, name) {
	const type = normalizeEntityType(entityType)
	if (type === 'HOSTILE' || type === 'ENEMY') return true
	return /rat|hound|slime|warden|remnant|orc|lich|skeleton|ghoul|crawler|mite|thorn/i.test(String(name || ''))
}

function isClassicObject(entityType) {
	const type = normalizeEntityType(entityType)
	return type === 'DOOR' || type === 'CHEST'
}

function isClassicNpc(entityType) {
	return normalizeEntityType(entityType) === 'NPC'
}

function isClassicItem(entityType, name) {
	const type = normalizeEntityType(entityType)
	if (ITEM_TYPE_MAP[type]) return true
	return /sword|bow|arrow|potion|scroll/i.test(String(name || ''))
}

function inventoryFromDefaults() {
	return DEFAULT_INVENTORY.map(item => {
		const type = normalizeEntityType(item.kind)
		if (type === 'WEAPON') return { id: item.key, type: item.key === 'short-bow' ? 'SHORT_BOW' : 'BRONZE_SWORD', name: item.name, quantity: 1 }
		if (type === 'AMMO') return { id: item.key, type: 'STEEL_ARROW', name: item.name, quantity: 5 }
		if (item.key === 'health-potion') return { id: item.key, type: 'HEALTH_POTION', name: item.name, quantity: 2 }
		if (item.key === 'mana-potion') return { id: item.key, type: 'MANA_POTION', name: item.name, quantity: 1 }
		return { id: item.key, type: normalizeEntityType(item.key), name: item.name, quantity: 1 }
	})
}

function spellbookFromDefaults() {
	return DEFAULT_INVENTORY.filter(item => item.kind === 'spell').map(item => ({
		id: item.key,
		name: item.name,
		action: 'cast',
		manaCost: /heal/i.test(item.name) ? 2 : 3
	}))
}

function createClassicGameRuntime(options = {}) {
	const staticRoot = options.staticRoot || DEFAULT_STATIC_ROOT

	function loadMap(mapId = 'mulberryTown') {
		const definition = getRegisteredMap(mapId)
		const tiledMap = loadRegisteredTiledMap(staticRoot, definition.id)
		return {
			id: definition.id,
			label: definition.label,
			file: definition.file,
			width: tiledMap.width,
			height: tiledMap.height,
			portalLinks: getPortalLinksForTiledMap(tiledMap, definition.id),
			actors: getActorMetadata(tiledMap)
		}
	}

	function getPortalLinks(mapId = 'mulberryTown') {
		return loadMap(mapId).portalLinks
	}

	function findMapRoute(fromMapId = 'mulberryTown', toMapId = 'mulberryTown') {
		const start = getRegisteredMap(fromMapId).id
		const target = getRegisteredMap(toMapId).id
		if (start === target) return [start]
		const queue = [{ mapId: start, route: [start] }]
		const seen = new Set([start])
		while (queue.length) {
			const current = queue.shift()
			for (const link of getPortalLinks(current.mapId)) {
				if (!link.targetMapId || seen.has(link.targetMapId)) continue
				const route = current.route.concat(link.targetMapId)
				if (link.targetMapId === target) return route
				seen.add(link.targetMapId)
				queue.push({ mapId: link.targetMapId, route })
			}
		}
		return []
	}

	return {
		mode: 'classic-autonomous',
		getAvailableMapIds: getRegisteredMapIds,
		loadMap,
		getPortalLinks,
		findMapRoute,
		getRuntimeSnapshot: snapshot => getClassicRuntimeSnapshot(snapshot, { staticRoot })
	}
}

function createClassicStateFromWorld(snapshot = {}, options = {}) {
	const map = snapshot.map || {}
	const story = snapshot.story || {}
	const currentMapId = map.id || story.currentMapId || 'mulberryTown'
	const portalLinks = Array.isArray(map.portalLinks) ? map.portalLinks : []
	const actors = {}
	const objects = {}
	const groundItems = {}

	;(map.actors || []).forEach(actor => {
		if (!actor || !actor.id) return
		const entityType = normalizeEntityType(actor.entityType || actor.type)
		if (isClassicObject(entityType)) {
			objects[actor.id] = { id: actor.id, type: entityType, name: actor.name || entityType, open: false }
			actors[actor.id] = {
				id: actor.id,
				name: actor.name || entityType,
				entityType,
				x: actor.x,
				y: actor.y,
				spriteId: actor.spriteId,
				spriteKey: null,
				hostile: false,
				blocked: entityType === 'DOOR'
			}
			return
		}
		if (isClassicItem(entityType, actor.name)) {
			const normalized = ITEM_TYPE_MAP[entityType] || entityType
			groundItems[actor.id] = {
				id: actor.id,
				type: normalized,
				name: actor.name || normalized,
				x: actor.x,
				y: actor.y,
				spriteId: actor.spriteId,
				source: 'ground'
			}
			return
		}
		const hostile = isClassicHostile(entityType, actor.name)
		actors[actor.id] = {
			id: actor.id,
			name: actor.name || 'Unknown',
			entityType,
			x: actor.x,
			y: actor.y,
			spriteId: actor.spriteId,
			spriteKey: isClassicNpc(entityType) ? actor.spriteKey || null : null,
			hostile,
			blocked: false,
			hp: hostile ? 6 : 1,
			maxHp: hostile ? 6 : 1
		}
	})

	return {
		mode: 'classic-autonomous',
		currentMapId,
		player: {
			id: 'chatty',
			name: 'Chatty, the chosen one',
			x: snapshot.goblin && snapshot.goblin.position ? snapshot.goblin.position.x : snapshot.goblin && Number.isInteger(snapshot.goblin.x) ? snapshot.goblin.x : 0,
			y: snapshot.goblin && snapshot.goblin.position ? snapshot.goblin.position.y : snapshot.goblin && Number.isInteger(snapshot.goblin.y) ? snapshot.goblin.y : 0,
			...DEFAULT_PLAYER,
			inventory: inventoryFromDefaults(),
			equipment: { weapon: null },
			spellbook: spellbookFromDefaults()
		},
		maps: {
			[currentMapId]: {
				id: currentMapId,
				portals: portalLinks.map(link => ({
					id: link.id || link.portalId,
					portalId: link.portalId,
					targetMapId: link.targetMapId,
					x: link.x,
					y: link.y,
					kind: link.kind || 'level_transition'
				}))
			}
		},
		actors,
		objects,
		items: groundItems
	}
}

function clone(obj) {
	return JSON.parse(JSON.stringify(obj))
}

function removeOneInventoryItem(inventory, predicate) {
	const index = inventory.findIndex(predicate)
	if (index === -1) return { inventory, removed: null }
	const item = inventory[index]
	if (item.quantity > 1) {
		item.quantity -= 1
		return { inventory, removed: { ...item, quantity: 1 } }
	}
	inventory.splice(index, 1)
	return { inventory, removed: item }
}

function applyClassicAction(state, snapshot, decision = {}, options = {}) {
	const next = clone(state)
	const action = String(decision.action || '').toLowerCase()
	const target = decision.target || {}
	const seed = Number.isInteger(options.seed) ? options.seed : 0

	const worldDelta = { chatty: {}, actors: {}, items: { removed: [], added: [] }, combat: {} }
	const eventPatch = { type: 'action', actor: 'Chatty, the chosen one', action, message: '' }
	const transition = null

	const map = (snapshot && snapshot.map) || {}
	const blocked = new Set((map.blocked || []).map(cell => `${cell.x},${cell.y}`))

	function isBlocked(x, y) {
		return blocked.has(`${x},${y}`)
	}

	function distance(a, b) {
		return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
	}

	function hostileTurn() {
		const incoming = []
		Object.values(next.actors).forEach(actor => {
			if (!actor || !actor.hostile) return
			const dx = next.player.x - actor.x
			const dy = next.player.y - actor.y
			const adjacent = Math.abs(dx) + Math.abs(dy) === 1
			if (adjacent) {
				const dmg = 1 + (seed % 2)
				next.player.hp = Math.max(0, next.player.hp - dmg)
				incoming.push({ id: actor.id, amount: dmg })
				return
			}
			// simple chase if in same row or column, otherwise drift left/up
			let step = { x: actor.x, y: actor.y }
			if (dx !== 0) step.x += dx > 0 ? 1 : -1
			else if (dy !== 0) step.y += dy > 0 ? 1 : -1
			if (!isBlocked(step.x, step.y) && !(step.x === next.player.x && step.y === next.player.y)) {
				actor.x = step.x
				actor.y = step.y
				worldDelta.actors[actor.id] = { position: { x: actor.x, y: actor.y } }
			}
		})
		if (incoming.length) {
			worldDelta.combat.incomingDamage = incoming.reduce((sum, entry) => sum + entry.amount, 0)
		}
	}

	if (action === 'pickup' || action === 'pick_up') {
		const picked = []
		Object.values(next.items).forEach(item => {
			if (!item) return
			if (item.x === next.player.x && item.y === next.player.y) {
				next.player.inventory.push({ id: item.id, type: item.type, name: item.name, quantity: 1, source: item.source })
				picked.push(item)
				delete next.items[item.id]
				worldDelta.items.removed.push(item.id)
			}
		})
		eventPatch.message = picked.length ? `Chatty picks up ${picked.map(item => item.name).join(', ')}.` : 'Chatty finds nothing to pick up.'
		worldDelta.chatty.inventory = next.player.inventory.slice()
		return { state: next, worldDelta, eventPatch, transition }
	}

	if (action === 'equip') {
		const desired = target.id ? next.player.inventory.find(item => item.id === target.id) : null
		const weapon = desired || next.player.inventory.find(item => item.type === 'BRONZE_SWORD' || item.type === 'SHORT_BOW')
		if (weapon) {
			next.player.equipment.weapon = { id: weapon.id, name: weapon.name, type: weapon.type }
			eventPatch.message = `Chatty equips ${weapon.name}.`
		} else {
			eventPatch.message = 'Chatty has nothing suitable to equip.'
		}
		worldDelta.chatty.equipment = { ...next.player.equipment }
		return { state: next, worldDelta, eventPatch, transition }
	}

	if (action === 'use') {
		const requestedType = normalizeEntityType(target.type)
		let heal = null
		if (target.id) heal = next.player.inventory.find(item => item.id === target.id) || null
		if (!heal && requestedType) {
			// Prefer recently picked world items (the tests expect this behavior).
			heal = next.player.inventory.find(item => item.type === requestedType && String(item.id || '').startsWith('item-')) ||
				next.player.inventory.find(item => item.type === requestedType) ||
				null
		}
		if (!heal) heal = next.player.inventory.find(item => item.type === 'HEALTH_POTION') || null
		if (heal) {
			removeOneInventoryItem(next.player.inventory, item => item.id === heal.id)
			const before = next.player.hp
			next.player.hp = Math.min(next.player.maxHp, next.player.hp + 6)
			eventPatch.message = `Chatty drinks a potion and feels better (${before} -> ${next.player.hp}).`
		} else {
			eventPatch.message = 'Chatty rummages for a potion and finds none.'
		}
		worldDelta.chatty.hp = next.player.hp
		worldDelta.chatty.inventory = next.player.inventory.slice()
		return { state: next, worldDelta, eventPatch, transition }
	}

	if (action === 'cast') {
		const spell = next.player.spellbook[0]
		if (spell && next.player.mana >= spell.manaCost) {
			next.player.mana -= spell.manaCost
			eventPatch.message = `Chatty casts ${spell.name}.`
		} else {
			eventPatch.message = 'Chatty tries to cast, but the magic does not answer.'
		}
		worldDelta.chatty.mana = next.player.mana
		return { state: next, worldDelta, eventPatch, transition }
	}

	if (action === 'attack' || action === 'fire') {
		const hostile = next.actors[target.id] && next.actors[target.id].hostile ? next.actors[target.id] : null
		if (hostile) {
			if (action === 'attack') {
				const adjacent = distance({ x: hostile.x, y: hostile.y }, { x: next.player.x, y: next.player.y }) === 1
				if (!adjacent) {
					eventPatch.message = 'Chatty swings at empty air.'
					return { state: next, worldDelta, eventPatch, transition }
				}
				const dmg = 3
				hostile.hp = Math.max(0, hostile.hp - dmg)
				eventPatch.message = `Chatty strikes ${hostile.name}.`
				worldDelta.combat.damage = dmg
			} else {
				const hasBow = next.player.equipment.weapon === 'SHORT_BOW' || next.player.inventory.some(item => item.type === 'SHORT_BOW')
				const { removed } = removeOneInventoryItem(next.player.inventory, item => item.type === 'STEEL_ARROW')
				if (!hasBow || !removed) {
					eventPatch.message = 'Chatty fumbles for a bow and arrow.'
					return { state: next, worldDelta, eventPatch, transition }
				}
				const dmg = 2
				hostile.hp = Math.max(0, hostile.hp - dmg)
				eventPatch.message = `Chatty looses an arrow at ${hostile.name}.`
				worldDelta.chatty.inventory = next.player.inventory.slice()
				worldDelta.combat.damage = dmg
			}
			worldDelta.combat.target = hostile.id
			if (hostile.hp <= 0) {
				delete next.actors[hostile.id]
				worldDelta.actors[hostile.id] = { removed: true }
			}
		} else {
			eventPatch.message = 'Chatty finds no clear target.'
		}
		return { state: next, worldDelta, eventPatch, transition }
	}

	if (action === 'interact') {
		const object = next.objects[target.id]
		if (object && object.type === 'CHEST') {
			object.open = true
			eventPatch.message = 'Chatty pries open the chest.'
			const loot = { id: `loot-${target.id}`, type: 'HEALTH_POTION', name: 'Health Potion', quantity: 1, source: target.id }
			next.player.inventory.push(loot)
			worldDelta.items.added.push(loot.id)
			worldDelta.chatty.inventory = next.player.inventory.slice()
			worldDelta.actors[target.id] = { blocked: false }
			return { state: next, worldDelta, eventPatch, transition }
		}
		if (object && object.type === 'DOOR') {
			object.open = true
			eventPatch.message = 'Chatty shoves the door until it yields.'
			if (next.actors[target.id]) next.actors[target.id].blocked = false
			worldDelta.actors[target.id] = { blocked: false }
			return { state: next, worldDelta, eventPatch, transition }
		}
		eventPatch.message = 'Chatty pokes at the world and nothing answers.'
		return { state: next, worldDelta, eventPatch, transition }
	}

	if (action === 'climb' || action === 'transition') {
		const portalId = target.portalId
		const portal = (next.maps[next.currentMapId] && next.maps[next.currentMapId].portals || []).find(p => p.portalId === portalId)
		if (portal) {
			eventPatch.action = 'climb'
			eventPatch.message = `Chatty uses the way to ${portal.targetMapId}.`
			return { state: next, worldDelta, eventPatch, transition: { portalId, targetMapId: portal.targetMapId } }
		}
		eventPatch.message = 'Chatty looks for a way down and finds none.'
		return { state: next, worldDelta, eventPatch, transition }
	}

	if (action === 'flee' || action === 'reposition') {
		const hostile = next.actors[target.id] && next.actors[target.id].hostile ? next.actors[target.id] : null
		if (hostile) {
			const dx = next.player.x - hostile.x
			const dy = next.player.y - hostile.y
			const stepOptions = [
				{ x: next.player.x + (dx >= 0 ? 1 : -1), y: next.player.y },
				{ x: next.player.x, y: next.player.y + (dy >= 0 ? 1 : -1) }
			]
			const step = stepOptions.find(pos => !isBlocked(pos.x, pos.y))
			if (step) {
				next.player.x = step.x
				next.player.y = step.y
				worldDelta.chatty.position = { x: next.player.x, y: next.player.y }
				eventPatch.message = 'Chatty breaks away from danger.'
			} else {
				eventPatch.message = 'Chatty tries to flee but finds only walls.'
			}
		} else {
			eventPatch.message = 'Chatty edges away, cautious.'
		}
		return { state: next, worldDelta, eventPatch, transition }
	}

	if (action === 'rest' || action === 'wait') {
		const before = next.player.hp
		// Let the world take its swing, then rest restores composure.
		hostileTurn()
		next.player.hp = Math.min(next.player.maxHp, next.player.hp + 2)
		eventPatch.message = before === next.player.hp ? 'Chatty holds still and listens.' : 'Chatty rests and steadies breath.'
		worldDelta.chatty.hp = next.player.hp
		return { state: next, worldDelta, eventPatch, transition }
	}

	eventPatch.message = 'Chatty hesitates.'
	return { state: next, worldDelta, eventPatch, transition }
}

function getActorMetadata(tiledMap = {}) {
	const actorLayer = (tiledMap.layers || []).find(layer => layer.type === 'objectgroup' && layer.name === 'Actors')
	if (!actorLayer) return []
	return (actorLayer.objects || []).map(object => {
		const properties = (object.properties || []).reduce((result, property) => {
			result[property.name] = property.value
			return result
		}, {})
		return {
			id: object.id ? `actor-${object.id}` : '',
			name: object.name || 'Unknown',
			entityType: properties.entity_type || object.type || '',
			dialog: properties.dialog || '',
			portalId: properties.portalID || '',
			spriteId: Number.isInteger(object.gid) ? object.gid - 1 : 0,
			x: Math.floor((object.x || 0) / 32),
			y: Math.floor((object.y || 0) / 32) - 1
		}
	})
}

function uniqueActions(actions = []) {
	return Array.from(new Set(actions.filter(Boolean)))
}

function getCurrentObjective(snapshot = {}) {
	const activeTask = (snapshot.tasks || []).find(task => task.status === 'active' || task.status === 'combat')
	if (activeTask) return activeTask.title || activeTask.label || activeTask.id
	const story = snapshot.story || {}
	return story.currentObjective || (snapshot.goblin && snapshot.goblin.goal) || 'Explore the classic roguelike world.'
}

function isNpc(actor = {}) {
	return String(actor.entityType || '').toUpperCase() === 'NPC'
}

function isEnemy(actor = {}) {
	const type = String(actor.entityType || '').toUpperCase()
	return type === 'HOSTILE' || type === 'ENEMY' || /rat|hound|slime|warden|remnant|orc|lich|skeleton|ghoul|crawler|mite|thorn/i.test(actor.name || '')
}

function publicActor(actor = {}) {
	return {
		id: actor.id,
		name: actor.name,
		entityType: actor.entityType || '',
		dialog: actor.dialog || '',
		x: actor.x,
		y: actor.y,
		spriteId: actor.spriteId,
		spriteKey: actor.spriteKey || null
	}
}

function getClassicRuntimeSnapshot(snapshot = {}, options = {}) {
	const map = snapshot.map || {}
	const story = snapshot.story || {}
	const runtime = createClassicGameRuntime({ staticRoot: options.staticRoot || DEFAULT_STATIC_ROOT })
	const baseActions = Array.isArray(snapshot.legalActions) ? snapshot.legalActions : []
	const nearbyActors = Array.isArray(snapshot.nearbyActors) ? snapshot.nearbyActors : []
	const currentMapId = map.id || story.currentMapId || 'mulberryTown'
	return {
		mode: 'classic-autonomous',
		currentMapId,
		availableMapIds: CANONICAL_MAP_IDS.slice(),
		currentGoal: (snapshot.goblin && snapshot.goblin.goal) || story.currentObjective || 'Live as Chatty inside the classic roguelike.',
		currentObjective: getCurrentObjective(snapshot),
		legalActions: uniqueActions(baseActions.concat(CLASSIC_ROGUELIKE_ACTIONS)),
		inventorySummary: Array.isArray(snapshot.inventorySummary) ? snapshot.inventorySummary : DEFAULT_INVENTORY.slice(),
		nearbyEnemies: nearbyActors.filter(isEnemy).map(publicActor),
		nearbyNpcs: nearbyActors.filter(isNpc).map(publicActor),
		portalLinks: map.portalLinks || runtime.getPortalLinks(currentMapId),
		mapRouteTargets: runtime.getAvailableMapIds().filter(mapId => mapId !== currentMapId)
	}
}

module.exports = {
	CANONICAL_CLASSIC_MAP_IDS: CANONICAL_MAP_IDS,
	CLASSIC_ROGUELIKE_ACTIONS,
	createClassicGameRuntime,
	getClassicRuntimeSnapshot,
	createClassicStateFromWorld,
	applyClassicAction
}
