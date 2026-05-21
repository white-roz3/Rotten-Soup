const ENCOUNTERS = {
	'cellar-rats': {
		id: 'cellar-rats',
		enemy: 'Cellar Rat',
		enemyType: 'swarm',
		hp: 6,
		armor: 0,
		weakness: 'stamp the bite pattern after inspection',
		weaknessTag: 'bite-pattern',
		waves: 1,
		objective: 'Survive the first nuisance without losing the cloak.',
		moraleEffect: 'Chatty proves prophecy can bruise and continue.',
		victoryCallback: 'survived-first-nuisance',
		intents: [
			{ id: 'bite-cloak', line: 'Cellar Rat: Warm cloak. Bite cloak.', damage: 1, effect: 'cloak tugged' },
			{ id: 'scatter-feet', line: 'Bitey Weed: Ankles are a public resource.', damage: 1, effect: 'movement pressured' }
		]
	},
	'ledger-mites': {
		id: 'ledger-mites',
		enemy: 'Ledger Mite',
		enemyType: 'paper-magic',
		hp: 8,
		armor: 1,
		weakness: 'ink dries when exposed by inspection',
		weaknessTag: 'dry-ink',
		waves: 2,
		objective: 'Recover the Goblin Ledger while mites try to tax every breath.',
		moraleEffect: 'The first paper magic loses authority in public.',
		victoryCallback: 'ledger-mites-broken',
		intents: [
			{ id: 'tax-breath', line: 'Ledger Mite: Tax. Tax. Tax.', damage: 1, effect: 'morale pinched' },
			{ id: 'paper-bite', line: 'Ledger Mite: Name goes in. Fear comes out.', damage: 2, effect: 'name pressure' }
		]
	},
	'bramble-crawlers': {
		id: 'bramble-crawlers',
		enemy: 'Bramble Crawler',
		enemyType: 'road-control',
		hp: 9,
		armor: 1,
		weakness: 'roots expose their soft knots after inspection',
		weaknessTag: 'soft-knots',
		waves: 2,
		objective: 'Break road control so rumors can become routes.',
		moraleEffect: 'Roads begin carrying Chatty without flinching.',
		victoryCallback: 'roads-opened',
		intents: [
			{ id: 'root-bind', line: 'Bramble Crawler: Root says bind. Root says bite.', damage: 1, effect: 'feet slowed' },
			{ id: 'thorn-lash', line: 'Bramble Crawler: Road belongs to thorn.', damage: 2, effect: 'road fear rises' }
		]
	},
	'crown-hounds': {
		id: 'crown-hounds',
		enemy: 'Crown Hound',
		enemyType: 'patrol',
		hp: 10,
		armor: 1,
		weakness: 'hounds hesitate when the protected goblins speak their own names',
		weaknessTag: 'spoken-names',
		waves: 2,
		objective: 'Protect hidden goblins long enough for them to choose movement.',
		moraleEffect: 'Hidden goblins see that the line can hold.',
		victoryCallback: 'hidden-goblins-protected',
		intents: [
			{ id: 'ledger-law', line: 'Crown Hound: Ledger law. Goblin flaw.', damage: 2, effect: 'fear spikes' },
			{ id: 'name-snap', line: 'Crown Hound: Recorded feet return to cages.', damage: 2, effect: 'escort threatened' }
		]
	},
	'pantry-slimes': {
		id: 'pantry-slimes',
		enemy: 'Pantry Slime',
		enemyType: 'resource-threat',
		hp: 8,
		armor: 0,
		weakness: 'salt and banner cloth split the slime after inspection',
		weaknessTag: 'salt-split',
		waves: 1,
		objective: 'Defend banner supplies from a creature with terrible taste.',
		moraleEffect: 'The banner survives its first ridiculous trial.',
		victoryCallback: 'banner-supplies-defended',
		intents: [
			{ id: 'consume-cloak', line: 'Pantry Slime: Consume cloak. Become chosen.', damage: 1, effect: 'supply shelf shaking' },
			{ id: 'slime-invoice', line: 'Pantry Slime: Soup property becomes slime property.', damage: 1, effect: 'cloth threatened' }
		]
	},
	'armor-scraps': {
		id: 'armor-scraps',
		enemy: 'Armor Scrap',
		enemyType: 'armory',
		hp: 9,
		armor: 2,
		weakness: 'rusted joints reveal themselves under inspection',
		weaknessTag: 'rusted-joints',
		waves: 1,
		objective: 'Win enough armory scrap to turn defense from wish to tool.',
		moraleEffect: 'Old weapons stop only serving old law.',
		victoryCallback: 'armory-scraps-claimed',
		intents: [
			{ id: 'old-salute', line: 'Armor Scrap: Old order stands. New knees break.', damage: 2, effect: 'armor pressure' },
			{ id: 'helmet-bite', line: 'Armor Scrap: Clang. Kneel. Repeat.', damage: 1, effect: 'noise panic' }
		]
	},
	'thorn-wave': {
		id: 'thorn-wave',
		enemy: 'Thorn Scout',
		enemyType: 'wave-defense',
		hp: 7,
		armor: 1,
		weakness: 'lantern smoke reveals the lead scout after inspection',
		weaknessTag: 'lantern-smoke',
		waves: 3,
		objective: 'Hold the market road through three waves.',
		moraleEffect: 'Mulberry learns the small line is a real line.',
		victoryCallback: 'market-road-held',
		intents: [
			{ id: 'root-order', line: 'Thorn Scout: Root says bind. Crown says count.', damage: 2, effect: 'line pressed' },
			{ id: 'flank-market', line: 'Crown Hound: Market breaks. Goblins kneel.', damage: 2, effect: 'market flank threatened' }
		]
	},
	'ledger-warden': {
		id: 'ledger-warden',
		enemy: 'Ledger Warden',
		enemyType: 'boss',
		hp: 18,
		armor: 2,
		weakness: 'the First Goblin Name weakens each hook after inspection',
		weaknessTag: 'first-name',
		waves: 3,
		objective: 'Break the binding stone and recover the stolen First Name.',
		moraleEffect: 'Every hidden goblin feels their name become heavier.',
		victoryCallback: 'first-name-returned',
		intents: [
			{ id: 'name-hook', line: 'Ledger Warden: Names are hooks. Debts are chains.', damage: 3, effect: 'name hook pulls' },
			{ id: 'ink-wisp', line: 'Ink Wisp: Blot the free. Smear the small.', damage: 2, effect: 'vision darkened' }
		]
	},
	'crown-remnant': {
		id: 'crown-remnant',
		enemy: 'Crown Remnant',
		enemyType: 'finale',
		hp: 22,
		armor: 2,
		weakness: 'the freedom proclamation breaks its accounting language',
		weaknessTag: 'freedom-proclamation',
		waves: 3,
		objective: 'Survive the final battle and speak conquest as freedom from fear.',
		moraleEffect: 'The square stops asking old fear for permission.',
		victoryCallback: 'crown-remnant-defeated',
		intents: [
			{ id: 'order-returns', line: 'Crown Remnant: Order returns. Goblins kneel. Ledger closes.', damage: 3, effect: 'square fear rises' },
			{ id: 'accounting-error', line: 'Crown Remnant: Freedom is an accounting error.', damage: 3, effect: 'ledger language burns' }
		]
	}
}

function getEncounterDefinition(id) {
	return ENCOUNTERS[id] || null
}

function createEncounterState(id, taskId) {
	const definition = getEncounterDefinition(id)
	if (!definition) return null
	return {
		id: definition.id,
		taskId,
		enemy: definition.enemy,
		enemyType: definition.enemyType,
		hp: definition.hp,
		maxHp: definition.hp,
		armor: definition.armor,
		weakness: definition.weakness,
		weaknessTag: definition.weaknessTag,
		weaknessRevealed: false,
		wave: 1,
		waves: definition.waves,
		intentIndex: 0,
		intent: definition.intents[0].id,
		objective: definition.objective,
		moraleEffect: definition.moraleEffect,
		victoryCallback: definition.victoryCallback,
		defeated: false,
		inspected: false,
		chattyHp: 12,
		maxChattyHp: 12
	}
}

function getCurrentIntent(encounter) {
	const definition = getEncounterDefinition(encounter.id)
	if (!definition) return null
	return definition.intents[encounter.intentIndex % definition.intents.length]
}

function cloneEncounterView(encounter) {
	if (!encounter) return null
	return {
		taskId: encounter.taskId,
		id: encounter.id,
		enemy: encounter.enemy,
		enemyType: encounter.enemyType,
		hp: encounter.hp,
		maxHp: encounter.maxHp,
		armor: encounter.armor,
		weakness: encounter.weaknessRevealed ? encounter.weakness : null,
		weaknessRevealed: Boolean(encounter.weaknessRevealed),
		wave: encounter.wave,
		waves: encounter.waves,
		intent: encounter.intent,
		objective: encounter.objective,
		chattyHp: encounter.chattyHp,
		maxChattyHp: encounter.maxChattyHp,
		defeated: Boolean(encounter.defeated)
	}
}

module.exports = {
	ENCOUNTERS,
	cloneEncounterView,
	createEncounterState,
	getCurrentIntent,
	getEncounterDefinition
}
