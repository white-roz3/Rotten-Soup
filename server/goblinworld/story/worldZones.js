const DEFAULT_ZONE_RADIUS = 7

const STORY_ZONES = {
	tavern: {
		label: 'Tavern',
		aliases: ['tavern', 'bartender', 'snack', 'counter'],
		centerRatio: { x: 0.22, y: 0.38 },
		radius: 7
	},
	'mayor-house': {
		label: 'Mayor House',
		aliases: ['mayor', 'leonard', 'office'],
		centerRatio: { x: 0.7, y: 0.28 },
		radius: 7
	},
	market: {
		label: 'Market',
		aliases: ['market', 'trader', 'cloth', 'road'],
		centerRatio: { x: 0.5, y: 0.48 },
		radius: 8
	},
	'town-square': {
		label: 'Town Square',
		aliases: ['square', 'rally', 'banner', 'proclamation', 'dawn'],
		centerRatio: { x: 0.5, y: 0.5 },
		radius: 8
	},
	armory: {
		label: 'Armory',
		aliases: ['armory', 'armor', 'stone guard', 'guard'],
		centerRatio: { x: 0.78, y: 0.62 },
		radius: 7
	},
	cellar: {
		label: 'Cellar',
		aliases: ['cellar', 'ledger', 'mite', 'rat', 'storage'],
		centerRatio: { x: 0.24, y: 0.52 },
		radius: 7
	},
	'forest-edge': {
		label: 'Forest Edge',
		aliases: ['forest', 'bramble', 'blackroot', 'woods'],
		centerRatio: { x: 0.85, y: 0.4 },
		radius: 8
	},
	'hidden-camp': {
		label: 'Hidden Camp',
		aliases: ['hidden', 'camp', 'goblin', 'goblins'],
		centerRatio: { x: 0.12, y: 0.75 },
		radius: 8
	},
	'under-road': {
		label: 'Under Road',
		aliases: ['under-road', 'under road', 'sealed door', 'binding', 'first goblin name', 'lamp'],
		centerRatio: { x: 0.66, y: 0.75 },
		radius: 8
	},
	mulberry: {
		label: 'Mulberry',
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
	const candidates = Object.keys(STORY_ZONES)
		.filter(zoneId => zoneId !== 'mulberry')
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
