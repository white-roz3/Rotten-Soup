const fs = require('fs')
const path = require('path')

const DEFAULT_STATIC_ROOT = path.join(__dirname, '..', '..')

const CANONICAL_MAP_IDS = [
	'mulberryTown',
	'mulberryForest',
	'mulberryGraveyard',
	'lichLair',
	'lootGoblinLair',
	'overworld',
	'kingdom',
	'orcCastle',
	'taintedForest',
	'lichBoss'
]

const REGISTERED_MAPS = {
	mulberryTown: {
		id: 'mulberryTown',
		label: 'Mulberry Town',
		file: 'mulberryTown.json',
		portalIds: ['Mulberry Town']
	},
	mulberryForest: {
		id: 'mulberryForest',
		label: 'Mulberry Forest',
		file: 'mulberryForest.json',
		portalIds: ['Mulberry Forest']
	},
	mulberryGraveyard: {
		id: 'mulberryGraveyard',
		label: 'Mulberry Graveyard',
		file: 'mulberryGraveyard.json',
		portalIds: ['Mulberry Graveyard']
	},
	lichLair: {
		id: 'lichLair',
		label: 'Lich Lair',
		file: 'lichLair.json',
		portalIds: ['Lich Lair']
	},
	lootGoblinLair: {
		id: 'lootGoblinLair',
		label: 'Loot Goblin Lair',
		file: 'lootGoblinLair.json',
		portalIds: ['Mulberry Dungeon', 'Forest Dungeon', 'Loot Goblin Lair']
	},
	overworld: {
		id: 'overworld',
		label: 'Overworld',
		file: 'overworld.json',
		portalIds: ['Overworld']
	},
	kingdom: {
		id: 'kingdom',
		label: 'Kingdom',
		file: 'kingdom.json',
		portalIds: ['Kingdom']
	},
	orcCastle: {
		id: 'orcCastle',
		label: 'Orc Castle',
		file: 'orcCastle.json',
		portalIds: ['Orc Castle']
	},
	taintedForest: {
		id: 'taintedForest',
		label: 'Tainted Forest',
		file: 'taintedForest.json',
		portalIds: ['Tainted Forest']
	},
	lichBoss: {
		id: 'lichBoss',
		label: 'Lich Boss',
		file: 'lichBoss.json',
		portalIds: ['Lich Boss']
	}
}

const AUTHORED_PORTAL_LINKS = {
	mulberryForest: [
		{ portalId: 'Overworld', targetMapId: 'overworld', ratio: { x: 0.98, y: 0.5 }, direction: 'east' }
	],
	lootGoblinLair: [
		{ portalId: 'Mulberry Forest', targetMapId: 'mulberryForest', ratio: { x: 0.08, y: 0.5 }, direction: 'up' }
	],
	overworld: [
		{ portalId: 'Mulberry Forest', targetMapId: 'mulberryForest', ratio: { x: 0.08, y: 0.45 }, direction: 'west' },
		{ portalId: 'Kingdom', targetMapId: 'kingdom', ratio: { x: 0.52, y: 0.32 }, direction: 'north' },
		{ portalId: 'Tainted Forest', targetMapId: 'taintedForest', ratio: { x: 0.78, y: 0.58 }, direction: 'east' }
	],
	kingdom: [
		{ portalId: 'Overworld', targetMapId: 'overworld', ratio: { x: 0.2, y: 0.92 }, direction: 'south' },
		{ portalId: 'Orc Castle', targetMapId: 'orcCastle', ratio: { x: 0.86, y: 0.18 }, direction: 'east' }
	],
	orcCastle: [
		{ portalId: 'Kingdom', targetMapId: 'kingdom', ratio: { x: 0.08, y: 0.5 }, direction: 'west' }
	],
	taintedForest: [
		{ portalId: 'Overworld', targetMapId: 'overworld', ratio: { x: 0.12, y: 0.5 }, direction: 'west' },
		{ portalId: 'Lich Boss', targetMapId: 'lichBoss', ratio: { x: 0.82, y: 0.22 }, direction: 'down' }
	],
	lichLair: [
		{ portalId: 'Lich Boss', targetMapId: 'lichBoss', ratio: { x: 0.5, y: 0.08 }, direction: 'down' }
	],
	lichBoss: [
		{ portalId: 'Lich Lair', targetMapId: 'lichLair', ratio: { x: 0.5, y: 0.92 }, direction: 'up' },
		{ portalId: 'Tainted Forest', targetMapId: 'taintedForest', ratio: { x: 0.18, y: 0.5 }, direction: 'west' }
	]
}

const PORTAL_TARGETS = Object.values(REGISTERED_MAPS).reduce((targets, map) => {
	map.portalIds.forEach(portalId => {
		targets[portalId] = map.id
	})
	return targets
}, {})

function getRegisteredMapIds() {
	return CANONICAL_MAP_IDS.slice()
}

function getRegisteredMap(mapId = 'mulberryTown') {
	return REGISTERED_MAPS[mapId] || REGISTERED_MAPS.mulberryTown
}

function getMapIdForPortal(portalId = '') {
	return PORTAL_TARGETS[String(portalId || '').trim()] || ''
}

function getMapPath(staticRoot = DEFAULT_STATIC_ROOT, mapId = 'mulberryTown') {
	const map = getRegisteredMap(mapId)
	return path.join(staticRoot, 'public/maps', map.file)
}

function loadRegisteredTiledMap(staticRoot = DEFAULT_STATIC_ROOT, mapId = 'mulberryTown') {
	const mapPath = getMapPath(staticRoot, mapId)
	return JSON.parse(fs.readFileSync(mapPath, 'utf8'))
}

function getObjectProperties(object = {}) {
	return (object.properties || []).reduce((properties, property) => {
		properties[property.name] = property.value
		return properties
	}, {})
}

function objectTilePosition(object = {}) {
	return {
		x: Math.floor((object.x || 0) / 32),
		y: Math.floor((object.y || 0) / 32) - 1
	}
}

function ratioTilePosition(tiledMap = {}, ratio = {}) {
	const width = Math.max(1, tiledMap.width || 1)
	const height = Math.max(1, tiledMap.height || 1)
	return {
		x: Math.max(0, Math.min(width - 1, Math.floor(width * (Number.isFinite(ratio.x) ? ratio.x : 0.5)))),
		y: Math.max(0, Math.min(height - 1, Math.floor(height * (Number.isFinite(ratio.y) ? ratio.y : 0.5))))
	}
}

function isPortalObject(object = {}) {
	const properties = getObjectProperties(object)
	const entityType = String(properties.entity_type || object.type || '').toUpperCase()
	return Boolean(properties.portalID) && (entityType === 'LEVEL_TRANSITION' || entityType === 'LADDER')
}

function getPortalLinksForTiledMap(tiledMap = {}, mapId = 'mulberryTown') {
	const actorLayer = (tiledMap.layers || []).find(layer => layer.type === 'objectgroup' && layer.name === 'Actors')
	const tiledLinks = actorLayer ? (actorLayer.objects || [])
		.filter(isPortalObject)
		.map(object => {
			const properties = getObjectProperties(object)
			const position = objectTilePosition(object)
			const portalId = String(properties.portalID || '').trim()
			const targetMapId = getMapIdForPortal(portalId)
			return {
				id: `portal-${object.id || `${mapId}-${portalId}`}`,
				name: object.name || 'Portal',
				portalId,
				sourceMapId: mapId,
				targetMapId,
				kind: String(properties.entity_type || object.type || '').toLowerCase(),
				direction: properties.direction || '',
				x: position.x,
				y: position.y
			}
			})
			.filter(link => link.targetMapId && link.targetMapId !== mapId) : []
	const authoredLinks = (AUTHORED_PORTAL_LINKS[mapId] || []).map((link, index) => {
		const position = ratioTilePosition(tiledMap, link.ratio)
		return {
			id: `authored-portal-${mapId}-${index}`,
			name: link.name || link.portalId,
			portalId: link.portalId,
			sourceMapId: mapId,
			targetMapId: link.targetMapId,
			kind: 'authored',
			direction: link.direction || '',
			x: position.x,
			y: position.y,
			authored: true
		}
	})
	const seen = new Set()
	return tiledLinks.concat(authoredLinks).filter(link => {
		const key = `${link.portalId}:${link.targetMapId}`
		if (seen.has(key)) return false
		seen.add(key)
		return true
	})
}

function getReciprocalPortal(tiledMap = {}, mapId = 'mulberryTown', sourceMapId = '') {
	return getPortalLinksForTiledMap(tiledMap, mapId).find(link => link.targetMapId === sourceMapId) || null
}

module.exports = {
	CANONICAL_MAP_IDS,
	REGISTERED_MAPS,
	getMapIdForPortal,
	getPortalLinksForTiledMap,
	getReciprocalPortal,
	getRegisteredMap,
	getRegisteredMapIds,
	loadRegisteredTiledMap
}
