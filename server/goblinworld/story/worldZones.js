const DEFAULT_ZONE_RADIUS = 7

const STORY_ZONES = {
	tavern: {
		label: 'Tavern',
		mapIds: ['mulberryTown'],
		aliases: ['tavern', 'bartender', 'snack', 'counter'],
		centerRatio: { x: 0.22, y: 0.38 },
		radius: 7
	},
	'mayor-house': {
		label: 'Mayor House',
		mapIds: ['mulberryTown'],
		aliases: ['mayor', 'leonard', 'office'],
		centerRatio: { x: 0.7, y: 0.28 },
		radius: 7
	},
	market: {
		label: 'Market',
		mapIds: ['mulberryTown'],
		aliases: ['market', 'trader', 'cloth', 'road'],
		centerRatio: { x: 0.5, y: 0.48 },
		radius: 8
	},
	'town-square': {
		label: 'Town Square',
		mapIds: ['mulberryTown'],
		aliases: ['square', 'rally', 'banner', 'proclamation', 'dawn'],
		centerRatio: { x: 0.5, y: 0.5 },
		radius: 8
	},
	armory: {
		label: 'Armory',
		mapIds: ['mulberryTown'],
		aliases: ['armory', 'armor', 'stone guard', 'guard'],
		centerRatio: { x: 0.78, y: 0.62 },
		radius: 7
	},
	cellar: {
		label: 'Cellar',
		mapIds: ['mulberryTown'],
		aliases: ['cellar', 'ledger', 'mite', 'rat', 'storage'],
		centerRatio: { x: 0.24, y: 0.52 },
		radius: 7
	},
	'forest-edge': {
		label: 'Forest Edge',
		mapIds: ['mulberryForest'],
		aliases: ['forest', 'bramble', 'blackroot', 'woods'],
		centerRatio: { x: 0.85, y: 0.4 },
		radius: 8
	},
	'hidden-camp': {
		label: 'Hidden Camp',
		mapIds: ['mulberryForest'],
		aliases: ['hidden', 'camp', 'goblin', 'goblins'],
		centerRatio: { x: 0.12, y: 0.75 },
		radius: 8
	},
	'under-road': {
		label: 'Under Road',
		mapIds: ['lichLair'],
		aliases: ['under-road', 'under road', 'sealed door', 'binding', 'first goblin name', 'lamp'],
		centerRatio: { x: 0.66, y: 0.75 },
		radius: 8
	},
	graveyard: {
		label: 'Graveyard',
		mapIds: ['mulberryGraveyard'],
		aliases: ['graveyard', 'grave', 'stone', 'buried names'],
		centerRatio: { x: 0.48, y: 0.5 },
		radius: 999
	},
	'tainted-forest': {
		label: 'Tainted Forest',
		mapIds: ['taintedForest'],
		aliases: ['tainted forest', 'blackroot', 'corruption'],
		centerRatio: { x: 0.5, y: 0.5 },
		radius: 999
	},
	'loot-lair': {
		label: 'Loot Goblin Lair',
		mapIds: ['lootGoblinLair'],
		aliases: ['loot goblin', 'lair', 'supply cache'],
		centerRatio: { x: 0.5, y: 0.5 },
		radius: 999
	},
	'orc-castle': {
		label: 'Orc Castle',
		mapIds: ['orcCastle'],
		aliases: ['orc castle', 'castle', 'patrol'],
		centerRatio: { x: 0.5, y: 0.5 },
		radius: 999
	},
	'kingdom-road': {
		label: 'Kingdom Road',
		mapIds: ['kingdom'],
		aliases: ['kingdom', 'permit', 'clean boots'],
		centerRatio: { x: 0.5, y: 0.5 },
		radius: 999
	},
	'lich-boss': {
		label: 'Lich Boss Chamber',
		mapIds: ['lichBoss'],
		aliases: ['lich boss', 'bone clerk', 'boss chamber'],
		centerRatio: { x: 0.5, y: 0.5 },
		radius: 999
	},
	'overworld-road': {
		label: 'Overworld Road',
		mapIds: ['overworld'],
		aliases: ['overworld', 'charter road', 'free road'],
		centerRatio: { x: 0.5, y: 0.5 },
		radius: 999
	},
	mulberry: {
		label: 'Mulberry',
		mapIds: ['mulberryTown'],
		aliases: ['mulberry', 'town'],
		centerRatio: { x: 0.5, y: 0.5 },
		radius: 999
	}
}

function normalizePosition(position, fallback = { x: 0, y: 0 }) {
	return {
		x: Number.isInteger(position && position.x) ? position.x : fallback.x,
		y: Number.isInteger(position && position.y) ? position.y : fallback.y
	}
}

function getMapSize(map = {}) {
	return {
		width: Math.max(1, Number.isInteger(map.width) ? map.width : 1),
		height: Math.max(1, Number.isInteger(map.height) ? map.height : 1)
	}
}

function getZoneCenter(map = {}, zoneId = 'mulberry') {
	const zone = STORY_ZONES[zoneId] || STORY_ZONES.mulberry
	const size = getMapSize(map)
	return {
		x: Math.max(0, Math.min(size.width - 1, Math.floor(size.width * zone.centerRatio.x))),
		y: Math.max(0, Math.min(size.height - 1, Math.floor(size.height * zone.centerRatio.y)))
	}
}

function distance(a, b) {
	const left = normalizePosition(a)
	const right = normalizePosition(b)
	return Math.abs(left.x - right.x) + Math.abs(left.y - right.y)
}

function getZoneForPosition(map = {}, position = {}) {
	const point = normalizePosition(position)
	const mapId = map && map.id ? map.id : 'mulberryTown'
	const candidates = Object.keys(STORY_ZONES)
		.filter(zoneId => zoneId !== 'mulberry')
		.filter(zoneId => {
			const mapIds = STORY_ZONES[zoneId].mapIds || []
			return !mapIds.length || mapIds.includes(mapId)
		})
		.map(zoneId => {
			const zone = STORY_ZONES[zoneId]
			return {
				zoneId,
				label: zone.label,
				distance: distance(point, getZoneCenter(map, zoneId)),
				radius: zone.radius || DEFAULT_ZONE_RADIUS
			}
		})
		.filter(candidate => candidate.distance <= candidate.radius)
		.sort((a, b) => a.distance - b.distance || a.zoneId.localeCompare(b.zoneId))
	return candidates[0] || { zoneId: 'mulberry', label: STORY_ZONES.mulberry.label, distance: 0, radius: STORY_ZONES.mulberry.radius }
}

function inferZoneFromText(value = '') {
	const text = String(value || '').toLowerCase()
	for (const [zoneId, zone] of Object.entries(STORY_ZONES)) {
		if ((zone.aliases || []).some(alias => text.includes(alias))) return zoneId
	}
	return ''
}

function getZoneLabel(zoneId = '') {
	return (STORY_ZONES[zoneId] && STORY_ZONES[zoneId].label) || zoneId || 'Mulberry'
}

module.exports = {
	STORY_ZONES,
	getZoneCenter,
	getZoneForPosition,
	getZoneLabel,
	inferZoneFromText
}
