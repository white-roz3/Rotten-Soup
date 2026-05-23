const { getZoneMapIds, inferZoneFromText } = require('./worldZones')

const DIALOG_TARGET_MAP_IDS = {
	BARTENDER: 'mulberryTown',
	MAYOR_LEONARD: 'mulberryTown',
	DWARF_BILI: 'mulberryTown',
	STONE_GUARD: 'mulberryTown',
	NANI_AND_BILI_RESCUE: 'mulberryForest'
}

function taskTargetText(task = {}) {
	const target = task.target || {}
	return `${target.zone || ''} ${target.name || ''} ${target.dialog || ''} ${target.enemy || ''} ${target.kind || ''} ${task.title || ''}`
}

function inferTaskTargetMapId(task = {}) {
	const target = task.target || {}
	if (target.mapId) return target.mapId
	if (target.dialog && DIALOG_TARGET_MAP_IDS[target.dialog]) return DIALOG_TARGET_MAP_IDS[target.dialog]
	const zoneId = target.zone || inferZoneFromText(taskTargetText(task))
	const mapIds = getZoneMapIds(zoneId)
	return mapIds.length === 1 ? mapIds[0] : ''
}

module.exports = {
	DIALOG_TARGET_MAP_IDS,
	inferTaskTargetMapId
}
