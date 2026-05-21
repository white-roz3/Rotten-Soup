const { CHARACTER_ARCS, getCharacter } = require('./characters')
const { getScriptedDialogueLines } = require('./scriptedDialogue')

const LINE_CATEGORIES = [
	'guide',
	'warning',
	'reaction',
	'victory',
	'failure',
	'callback',
	'allyRecruitment',
	'ideology',
	'combatBark'
]

const PHASE_CONTEXT = {
	'phase-1': {
		title: 'The Body Wakes Up Wrong',
		thread: 'the body is real, the cloak is real, and Mulberry has started staring',
		pressure: 'first contact must teach Chatty where doors, voices, and teeth are'
	},
	'phase-2': {
		title: 'The Ledger Of Small Chains',
		thread: 'the old ledger turns names into hooks and cowardice into procedure',
		pressure: 'the book must be found before the town pretends paper is harmless'
	},
	'phase-3': {
		title: 'Mud Road Diplomacy',
		thread: 'roads, rumors, and reluctant friends begin carrying the movement',
		pressure: 'Chatty needs allies before bravery becomes a lonely accident'
	},
	'phase-4': {
		title: 'The Hidden Goblin Census',
		thread: 'hidden goblins decide whether rescue is a promise or a new cage',
		pressure: 'the freedom list must replace the ledger without copying its hunger'
	},
	'phase-5': {
		title: 'The Banner Of Bad Ideas',
		thread: 'cloth, glass, ink, and bad courage become a signal no one can ignore',
		pressure: 'a symbol must gather people without turning rage into a leash'
	},
	'phase-6': {
		title: 'The Small War Begins',
		thread: 'the old powers answer the banner with patrols, teeth, and panic',
		pressure: 'the line must hold long enough for fear to learn it can lose'
	},
	'phase-7': {
		title: 'The Crown Below',
		thread: 'the under road keeps the root of the ledger and the First Goblin Name',
		pressure: 'Chatty must break the name magic without becoming hungry for control'
	},
	'phase-8': {
		title: 'Dawn Of The Chosen One',
		thread: 'the square becomes a trial where freedom must define conquest correctly',
		pressure: 'the final speech must free people from fear, not hand them a new owner'
	}
}

const PHASE_DIALOGUE_BEATS = {
	'phase-1': {
		guide: [
			'Go to the tavern first. People talk when cups are nearby.',
			'Find Mayor Leonard if the tavern gets too loud. He knows which rules still have teeth.'
		],
		warning: [
			'Do not walk into the well. Mulberry already has enough stories that start stupid.',
			'If furniture moves by itself, assume it is either cursed or owned by the tavern.'
		],
		reaction: [
			'That cloak is not pretending anymore. The town saw it walk.',
			'People are staring because a prophecy with feet is harder to ignore.'
		],
		victory: [
			'The first bite did not end you. That is enough proof for the next room.',
			'Keep the cloak closed and the ears open. The town just learned you bruise like everyone else.'
		],
		failure: [
			'Stand up, check the cloak, and try the door again.',
			'If the first plan failed, use the second plan. If there is no second plan, invent one loudly.'
		],
		callback: [
			'The wall scribbles named you before anyone asked if you wanted the job.',
			'Remember who spoke first. First voices become useful later.'
		],
		allyRecruitment: [
			'If this body is real, someone needs to keep watch while the town panics.',
			'Help the little cloak reach a proper answer before the old rules do.'
		],
		ideology: [
			'Being chosen does not make you owned by prophecy.',
			'Start small. A free footstep still counts.'
		],
		combatBark: [
			'Hit the rat before it makes a legal argument.',
			'Bitey weeds hate fire, boots, and being taken seriously.'
		]
	},
	'phase-2': {
		guide: [
			'Ask Leonard where the ledger was kept, then check every cellar he avoids naming.',
			'The old storage smells like damp paper. That is where guilty records like to sleep.'
		],
		warning: [
			'Do not read every name out loud. Some books listen back.',
			'Ledger mites look small because old cruelty prefers tiny clerks.'
		],
		reaction: [
			'The ledger is not history. It is a trap that learned handwriting.',
			'Now the town has to admit those names belonged to people.'
		],
		victory: [
			'The mites scattered. The book is weaker when someone laughs at it.',
			'One list lost its bite. Do not let another list grow teeth.'
		],
		failure: [
			'If the ledger slips away, follow who profits from the silence.',
			'A missed page is not the whole book. Search the crates again.'
		],
		callback: [
			'The first voice led to the first record. That was not an accident.',
			'The scribbles and the ledger agree on one thing, names have power.'
		],
		allyRecruitment: [
			'Someone must witness the copied names so the ledger cannot swallow them twice.',
			'If you know where paper moved, say it now before fear edits you.'
		],
		ideology: [
			'A debt written by a thief is still theft.',
			'Names are not hooks. Names are people trying to stand up.'
		],
		combatBark: [
			'Inspect the mite first if it starts chanting tax.',
			'Strike the paper thing before it files a complaint.'
		]
	},
	'phase-3': {
		guide: [
			'Follow the lantern road until the honest path stops. The useful path keeps going.',
			'Find three mouths with three versions of the same rumor. The overlap is the truth.'
		],
		warning: [
			'Bramble crawlers punish straight lines. Step around them or make them regret botany.',
			'Do not trust a road that suddenly gets polite.'
		],
		reaction: [
			'The road knows your name now. That means the rumors will arrive before the cloak does.',
			'Mulberry gossip just became a supply line with bad manners.'
		],
		victory: [
			'The brambles backed off. The road can carry more than fear now.',
			'One safe path is not freedom, but it lets freedom arrive with dry socks.'
		],
		failure: [
			'If the road closes, ask who was scared enough to close it.',
			'Lost rumors come back if you leave a lantern and a snack.'
		],
		callback: [
			'The copied names need a road. Roads need witnesses.',
			'Bili remembers a silence that cost people. Make him spend that memory properly.'
		],
		allyRecruitment: [
			'Ask who will walk with you now, before the road has to be brave alone.',
			'Pathfinders do not need permission. They need someone worth guiding.'
		],
		ideology: [
			'Freedom cannot just hide better. It has to move.',
			'Revenge is easy to point. Freedom has to ask where people want to go.'
		],
		combatBark: [
			'Cut the crawler when it reaches for the road.',
			'Use the road cache if the vines start boxing you in.'
		]
	},
	'phase-4': {
		guide: [
			'Look under roots, behind sheds, and near smoke that pretends to be weather.',
			'Say the phrase slowly. Hidden goblins need proof that rescue can listen.'
		],
		warning: [
			'Hounds follow fear faster than footprints.',
			'Do not drag anyone into freedom. Ask first, then guard the answer.'
		],
		reaction: [
			'The hidden ones are answering. That is bigger than applause.',
			'The old census loses power every time a goblin says their own name.'
		],
		victory: [
			'The hounds lost the scent. Keep moving before law learns a new trick.',
			'One group reached safety because someone guarded their choice.'
		],
		failure: [
			'If a camp runs, leave a sign that says you will come back without chains.',
			'Fear refusing help is still fear surviving. Respect it and try again.'
		],
		callback: [
			'The ledger named them as debt. Let the new list name them as people.',
			'The road rumors were right. The town was lying by omission.'
		],
		allyRecruitment: [
			'Let them stand beside you only if they choose it. The point is choice.',
			'If you can carry a lamp, a name, or a warning, you can carry part of this.'
		],
		ideology: [
			'Small does not mean owned. Say it until the hounds hate hearing it.',
			'A freedom list is a promise, not a leash.'
		],
		combatBark: [
			'Keep the hound away from the camp path.',
			'Attack when it lowers its head. Crown law taught it bad posture.'
		]
	},
	'phase-5': {
		guide: [
			'Gather cloth, glass, and blackroot ink. A banner needs proof it came from trouble.',
			'Ask the guard about the armory, then watch which rule he pretends not to bend.'
		],
		warning: [
			'Symbols gather hope and anger. Do not let either one drive alone.',
			'Pantry slime looks harmless until it starts eating the supplies.'
		],
		reaction: [
			'The banner is ugly enough to be honest.',
			'People are looking for a place to stand. That cloth just became a direction.'
		],
		victory: [
			'The supplies held. Rebellion survives on rope, crumbs, and spite.',
			'The armory yielded scraps. Even old locks get tired of old law.'
		],
		failure: [
			'If the cloth tears, stitch the names closer together.',
			'Lost supplies can be replaced. Lost nerve needs witnesses.'
		],
		callback: [
			'Bili wanted a bite mark. Give the banner one before fear does.',
			'The copied names belong near the banner, not under another floorboard.'
		],
		allyRecruitment: [
			'Bring cloth if you are scared. Bring ink if you are angry. Bring both if you are honest.',
			'Anyone who can tie a knot can help make the signal.'
		],
		ideology: [
			'A banner should point people together, not order them into line.',
			'No symbol gets to own the people standing under it.'
		],
		combatBark: [
			'Keep the slime off the food. Revolutions get cranky when hungry.',
			'Armor scraps are loud. Hit them between the rattles.'
		]
	},
	'phase-6': {
		guide: [
			'Hold the market road first. If it breaks, the hidden groups scatter.',
			'Put lamps at the corners and allies at the gaps.'
		],
		warning: [
			'Patrols want panic more than victory.',
			'Do not chase every enemy. Some of them only want to pull the line apart.'
		],
		reaction: [
			'The tavern closed and the revolution opened. That is a clean trade.',
			'The town just watched small bodies hold a road.'
		],
		victory: [
			'The wave broke. Count everyone before cheering.',
			'Morale rose because the banner stayed up and nobody had to pretend fear was law.'
		],
		failure: [
			'If the line buckles, fall back to the lamps and make the enemy walk through light.',
			'A lost corner is not a lost road. Rally at the banner.'
		],
		callback: [
			'The road cache matters now. Whoever saved it just saved breath.',
			'Clean fights make brave witnesses. Messy ones still need bandages.'
		],
		allyRecruitment: [
			'If you ever wanted to help quietly, quiet is over.',
			'Stand near the banner if you can fight. Stand behind it if you can carry the hurt.'
		],
		ideology: [
			'Defense is not domination. Hold the road so people can leave or return by choice.',
			'The old law wants kneeling. The line answers by standing.'
		],
		combatBark: [
			'Inspect the scout before it calls the next wave.',
			'Hit the hound when it lunges for the banner side.'
		]
	},
	'phase-7': {
		guide: [
			'Find the sealed door under the town stones. The ledger root is below polite flooring.',
			'Take a lamp before the under road starts lying about distance.'
		],
		warning: [
			'Do not answer if the dark calls you by a name you did not choose.',
			'The Warden will make ownership sound tidy. That is how chains dress for court.'
		],
		reaction: [
			'The First Name is close. Every hidden goblin can feel the air getting heavier.',
			'The basement hates being understood.'
		],
		victory: [
			'The binding cracked. Names are coming home with dirt on their shoes.',
			'The under road opened because you refused the crown shaped bait.'
		],
		failure: [
			'If the lamp goes out, stop. Darkness tells better lies to moving feet.',
			'If the Warden hooks a name, speak the phrase and break eye contact.'
		],
		callback: [
			'Every inspected weakness taught you how to read this room.',
			'Every ally above ground is a reason to come back up.'
		],
		allyRecruitment: [
			'One person carries the lamp. Everyone else carries the reason.',
			'If someone knows the old tunnels, make them guide you before the ledger does.'
		],
		ideology: [
			'A first name is not a throne. It is a door back into yourself.',
			'Breaking chains is not the same as holding the chain end.'
		],
		combatBark: [
			'Inspect the Warden before striking. Its weakness hides inside the wording.',
			'Attack the binding when it starts counting names.'
		]
	},
	'phase-8': {
		guide: [
			'Return to the square with the First Name where everyone can hear it.',
			'Put goblins by the road, townsfolk by the lamps, and yourself where the old fear can see you.'
		],
		warning: [
			'The Crown Remnant will call ownership order. Do not let it rename the room.',
			'A crowd can become a cage if nobody says what freedom refuses.'
		],
		reaction: [
			'The square is listening. Even the old stones look nervous.',
			'The hidden ones are not hidden now, and that changes the shape of morning.'
		],
		victory: [
			'The Remnant broke because the crowd stopped lending it fear.',
			'Dawn arrived with witnesses, mud, and no ledger strong enough to close it.'
		],
		failure: [
			'If the speech falters, return to the phrase and make the square repeat it.',
			'If fear surges, point to the open roads and count who is still standing.'
		],
		callback: [
			'The copied names, the banner, and the First Name all belong in the same sentence now.',
			'Everyone you listened to has reached the square in one way or another.'
		],
		allyRecruitment: [
			'If anyone is still hiding, send them down the old road and keep the lamps on.',
			'Tomorrow has to be chosen, not shouted by prophecy.'
		],
		ideology: [
			'Conquest means conquering fear. People are not territory.',
			'Freedom is not permission from old law. It is the crowd owning its own names.'
		],
		combatBark: [
			'Do not let the Remnant close the square.',
			'Strike when it says order. That word is where it keeps the chain.'
		]
	}
}

const DEFAULT_CATEGORY_TEXT = LINE_CATEGORIES.reduce((lookup, category) => {
	lookup[category] = getPhaseIds().flatMap(phaseId => PHASE_DIALOGUE_BEATS[phaseId][category])
	return lookup
}, {})

const PUBLIC_RATIONALES = [
	'The current task points toward a person who knows more than the dirt.',
	'A safe path exists, so Chatty tests it before testing danger.',
	'The nearby voice may unlock the next step, so Chatty stops walking and listens.',
	'The enemy blocks a freedom task, so Chatty chooses battle instead of wandering.',
	'The banner matters because symbols make scared feet move together.',
	'The ledger works by making fear look official, so Chatty looks for proof.',
	'The story has moved from private survival to public consequence.',
	'Freedom here means breaking ownership, not becoming the owner.'
]

const CHATTY_COMBAT_LINES = [
	'I swing with historic inconvenience.',
	'Your knees have entered negotiations.',
	'This cloak has survived soup. It can survive you.',
	'I am not trapped in here with danger. Danger is briefly sharing a room with destiny.',
	'Victory smells like mud and bad decisions.',
	'I bite the concept of authority with my whole schedule.',
	'Small does not mean soft.',
	'The cloak votes for violence in self defense.'
]

const CHATTY_PUBLIC_LINES = {
	'phase-1': [
		'I have fingers. Too many? No, probably enough.',
		'This cloak accepts me. That is legally a destiny.',
		'If I am chosen, I choose snacks first.',
		'I walk because the floor has challenged me.'
	],
	'phase-2': [
		'I reject paperwork as a natural predator.',
		'This ledger smells like old boots and unfairness.',
		'I shall liberate the names. Also maybe the cheese.',
		'The book thinks it is a cage. I disagree with literature.'
	],
	'phase-3': [
		'Diplomacy means I stand near someone until they say useful things.',
		'Bramble creatures have voted for violence. I respect civic process.',
		'Allies acquired: one dwarf, two rumors, and a suspicious stick.',
		'I am becoming a road problem with witnesses.'
	],
	'phase-4': [
		'I am not tax. I am worse for tax.',
		'Small does not mean owned. Write that bigger.',
		'I have found my people. They are rude, damp, and correct.',
		'Rescue should ask permission before becoming heroic.'
	],
	'phase-5': [
		'This banner is tactically ugly. Perfect.',
		'I conquer this pantry slime in the name of everyone with knees.',
		'Freedom requires cloth, ink, and someone yelling first.',
		'If a symbol must be tidy, it is probably a receipt.'
	],
	'phase-6': [
		'I did not ask for war. I asked for snacks and basic dignity.',
		'If they wanted peace, they should have made oppression less crunchy.',
		'The banner is still up. Therefore we are winning.',
		'I protect the road because the road is learning our names.'
	],
	'phase-7': [
		'I reject being alphabetized by evil.',
		'This basement has terrible politics.',
		'First name found. It is warm. It is angry. I like it.',
		'I descend with a lamp, a cloak, and several legal objections.'
	],
	'phase-8': [
		'I am Chatty, the chosen one, because I chose back.',
		'Small does not mean owned.',
		'Names are not hooks. Roads are not cages. Soup is not taxable by ghosts.',
		'We conquer the fear that kept us hiding.'
	]
}

const FINAL_PROCLAMATION = [
	'I am Chatty, the chosen one, because I chose back.',
	'Small does not mean owned.',
	'Names are not hooks. Roads are not cages. Soup is not taxable by ghosts.',
	'We conquer the fear that kept us hiding.',
	'We take the square, the road, the cellar, the dumb old ledger, and tomorrow.',
	'Any goblin who wants freedom, stand up. Any friend who wants trouble, stand near us.'
]

function getPhaseIds() {
	return Object.keys(PHASE_CONTEXT)
}

function rotateLines(lines, offset) {
	if (!lines.length) return lines
	const normalized = Math.abs(offset) % lines.length
	return lines.slice(normalized).concat(lines.slice(0, normalized))
}

function buildDialogueBanks() {
	const banks = {}
	Object.keys(CHARACTER_ARCS).forEach(characterKey => {
		banks[characterKey] = {}
		getPhaseIds().forEach((phaseId, phaseIndex) => {
			banks[characterKey][phaseId] = {}
			const scriptedLines = getScriptedDialogueLines(characterKey, phaseId)
			LINE_CATEGORIES.forEach((category, categoryOffset) => {
				banks[characterKey][phaseId][category] = rotateLines(scriptedLines, phaseIndex + categoryOffset)
			})
			banks[characterKey][phaseId].arc = [
				`${getCharacter(characterKey).displayName}: ${getCharacter(characterKey).beats[phaseIndex]}`
			]
		})
	})
	return banks
}

const LINE_BANKS = buildDialogueBanks()

function getDialogueLines(characterKey, phaseId, category = 'guide') {
	const banks = LINE_BANKS[characterKey] || LINE_BANKS.hoodedVillager
	const phase = banks[phaseId] || banks['phase-1']
	return (phase[category] || phase.guide || []).slice()
}

function getAllStoryText() {
	const values = []
	Object.values(PHASE_CONTEXT).forEach(phase => {
		values.push(phase.title, phase.thread, phase.pressure)
	})
	Object.values(CHARACTER_ARCS).forEach(character => {
		values.push(character.displayName, character.role, character.arc, ...character.beats, ...character.voice)
	})
	Object.values(LINE_BANKS).forEach(characterBank => {
		Object.values(characterBank).forEach(phaseBank => {
			Object.values(phaseBank).forEach(lines => {
				if (Array.isArray(lines)) values.push(...lines)
			})
		})
	})
	Object.values(CHATTY_PUBLIC_LINES).forEach(lines => values.push(...lines))
	values.push(...PUBLIC_RATIONALES, ...CHATTY_COMBAT_LINES, ...FINAL_PROCLAMATION)
	return values
}

function getSpeakerLinePools() {
	const pools = {}
	Object.entries(LINE_BANKS).forEach(([characterKey, characterBank]) => {
		Object.entries(characterBank).forEach(([phaseId, phaseBank]) => {
			Object.entries(phaseBank).forEach(([category, lines]) => {
				if (Array.isArray(lines)) pools[`${characterKey}:${phaseId}:${category}`] = lines.slice()
			})
		})
	})
	return pools
}

function getChattyLine(phaseId, turn = 0) {
	const lines = CHATTY_PUBLIC_LINES[phaseId] || CHATTY_PUBLIC_LINES['phase-1']
	return lines[turn % lines.length]
}

module.exports = {
	CHATTY_COMBAT_LINES,
	CHATTY_PUBLIC_LINES,
	FINAL_PROCLAMATION,
	LINE_BANKS,
	LINE_CATEGORIES,
	PHASE_CONTEXT,
	PUBLIC_RATIONALES,
	getAllStoryText,
	getChattyLine,
	getDialogueLines,
	getSpeakerLinePools
}
