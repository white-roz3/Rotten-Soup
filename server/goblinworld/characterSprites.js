const fs = require('fs')
const path = require('path')

function loadCharacterManifest() {
	const candidates = [
		path.join(__dirname, '../../public/images/goblinworld/characters/manifest.json'),
		path.join(__dirname, '../../dist/images/goblinworld/characters/manifest.json'),
		path.join(__dirname, '../../railway_dist/images/goblinworld/characters/manifest.json')
	]
	const manifestPath = candidates.find(candidate => fs.existsSync(candidate))
	if (!manifestPath) {
		throw new Error(`GoblinWorld character manifest not found. Checked: ${candidates.join(', ')}`)
	}
	return require(manifestPath)
}

const manifest = loadCharacterManifest()

const CORE_CHARACTER_KEYS = [
	'chatty',
	'bartender',
	'mayor',
	'dwarf',
	'marketTrader',
	'hoodedVillager',
	'forestWanderer',
	'lanternKeeper',
	'stoneGuard'
]

const CHARACTER_SPRITES = manifest.characters

const DIALOG_SPRITES = {
	BARTENDER: 'bartender',
	MAYOR_LEONARD: 'mayor',
	DWARF_BILI: 'dwarf'
}

const SPRITE_ID_BUCKETS = {
	marketTrader: new Set([2480, 2481, 2482, 5179]),
	hoodedVillager: new Set([1475, 4692, 4694, 4817, 8042]),
	forestWanderer: new Set([3973, 3974, 8040, 8041, 8043, 8044, 8163]),
	lanternKeeper: new Set([3852, 4815, 8401]),
	stoneGuard: new Set([8760, 8761, 5172, 5173])
}

function getCharacterSpriteForActor(actor = {}) {
	if (actor.spriteKey && CHARACTER_SPRITES[actor.spriteKey]) return actor.spriteKey
	if (String(actor.entityType || '').toUpperCase() !== 'NPC') return null
	if (actor.dialog && DIALOG_SPRITES[actor.dialog]) return DIALOG_SPRITES[actor.dialog]

	const spriteId = Number(actor.spriteId)
	for (const [spriteKey, spriteIds] of Object.entries(SPRITE_ID_BUCKETS)) {
		if (spriteIds.has(spriteId)) return spriteKey
	}

	const fallback = ['hoodedVillager', 'forestWanderer', 'marketTrader', 'lanternKeeper', 'stoneGuard']
	return fallback[Math.abs(Number.isFinite(spriteId) ? spriteId : 0) % fallback.length]
}

module.exports = {
	CHARACTER_SPRITES,
	CORE_CHARACTER_KEYS,
	getCharacterSpriteForActor
}
