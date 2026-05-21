const fs = require('fs')
const path = require('path')

const DEFAULT_STATIC_ROOT = path.join(__dirname, '..', '..')

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
	}
}

const PORTAL_TARGETS = Object.values(REGISTERED_MAPS).reduce((targets, map) => {
	map.portalIds.forEach(portalId => {
		targets[portalId] = map.id
	})
	return targets
}, {})

function getRegisteredMapIds() {
	return Object.keys(REGISTERED_MAPS)
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

function isPortalObject(object = {}) {
	const properties = getObjectProperties(object)
	const entityType = String(properties.entity_type || object.type || '').toUpperCase()
	return Boolean(properties.portalID) && (entityType === 'LEVEL_TRANSITION' || entityType === 'LADDER')
}

function getPortalLinksForTiledMap(tiledMap = {}, mapId = 'mulberryTown') {
	const actorLayer = (tiledMap.layers || []).find(layer => layer.type === 'objectgroup' && layer.name === 'Actors')
	if (!actorLayer) return []
	return (actorLayer.objects || [])
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
		.filter(link => link.targetMapId && link.targetMapId !== mapId)
}

function getReciprocalPortal(tiledMap = {}, mapId = 'mulberryTown', sourceMapId = '') {
	return getPortalLinksForTiledMap(tiledMap, mapId).find(link => link.targetMapId === sourceMapId) || null
}

module.exports = {
	REGISTERED_MAPS,
	getMapIdForPortal,
	getPortalLinksForTiledMap,
	getReciprocalPortal,
	getRegisteredMap,
	getRegisteredMapIds,
	loadRegisteredTiledMap
}
