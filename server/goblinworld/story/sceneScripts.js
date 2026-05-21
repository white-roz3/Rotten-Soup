const { uniquePush } = require('./taskRules')
const { STORY_PHASES } = require('./phases')
const { getCharacter } = require('./characters')

const CHATTY_NAME = 'Chatty, the chosen one'

const DIALOG_SPEAKERS = {
	BARTENDER: 'bartender',
	MAYOR_LEONARD: 'mayor',
	DWARF_BILI: 'dwarf',
	MARKET_TRADER: 'marketTrader',
	HOODED_VILLAGER: 'hoodedVillager',
	FOREST_WANDERER: 'forestWanderer',
	LANTERN_KEEPER: 'lanternKeeper',
	STONE_GUARD: 'stoneGuard',
	HIDDEN_GOBLIN_ONE: 'hiddenGoblinOne',
	HIDDEN_GOBLIN_TWO: 'hiddenGoblinTwo',
	HIDDEN_GOBLIN_THREE: 'hiddenGoblinThree'
}

const SCENE_SCRIPTS = {
	'phase-1-find-voice': {
		id: 'phase-1-find-voice',
		beats: [
			{
				speaker: 'bartender',
				line: 'Bartender: Chatty, start with the easy truth. You woke up, the cloak stayed, and everyone here noticed.',
				chatty: 'Chatty: I noticed too. The noticing had knees and was me.',
				unlocks: ['fact:firstVoice']
			},
			{
				speaker: 'bartender',
				line: 'Bartender: Chatty, if you want answers, follow the smell of soup before Mayor Leonard turns you into paperwork.',
				chatty: 'Chatty: Soup first, paperwork never. A clean doctrine.'
			},
			{
				speaker: 'bartender',
				line: 'Bartender: Chatty, the town knows your name because the wall has been muttering it for years.',
				chatty: 'Chatty: Walls gossip badly. Still, useful wall.'
			}
		]
	},
	'phase-1-first-fight': {
		id: 'phase-1-first-fight',
		beats: [
			{
				speaker: 'bartender',
				line: 'Bartender: Chatty, the cellar rats are not metaphorical, which is rude but convenient.',
				chatty: 'Chatty: Good. I prefer enemies with teeth I can count.'
			},
			{
				speaker: 'dwarf',
				line: 'Dwarf Bili: Chatty, inspect before swinging. Tiny enemies still hide ugly habits.',
				chatty: 'Chatty: I will look first, then commit historic inconvenience.'
			}
		]
	},
	'phase-2-speak-mayor': {
		id: 'phase-2-speak-mayor',
		beats: [
			{
				speaker: 'mayor',
				line: 'Mayor Leonard: Chatty, the ledger existed, and my office mistook locked drawers for innocence.',
				chatty: 'Chatty: A drawer is just a coward box with handles.',
				unlocks: ['fact:ledgerExisted']
			},
			{
				speaker: 'mayor',
				line: 'Mayor Leonard: Chatty, ask me where it was kept and watch which answer makes me ashamed.',
				chatty: 'Chatty: I am watching with both suspicious eyes.'
			}
		]
	},
	'phase-2-recover-ledger': {
		id: 'phase-2-recover-ledger',
		beats: [
			{
				speaker: 'bartender',
				line: 'Bartender: Chatty, the sour barrels hide the cellar door because bad history loves a bad smell.',
				chatty: 'Chatty: Excellent. My nose joins the revolution unwillingly.'
			},
			{
				speaker: 'bartender',
				line: 'Bartender: Chatty, look for the crate with red wax and rat scratches. It has been pretending to be furniture.',
				chatty: 'Chatty: I distrust furniture already. This is efficient.'
			},
			{
				speaker: 'bartender',
				line: 'Bartender: Chatty, if the ledger whispers, do not bargain with it. Books love sounding official.',
				chatty: 'Chatty: I will answer only with theft and excellent posture.'
			},
			{
				speaker: 'bartender',
				line: 'Bartender: Chatty, bring the ledger up where lamps can embarrass it.',
				chatty: 'Chatty: Public shame for paper. A noble menu item.'
			},
			{
				speaker: 'mayor',
				line: 'Mayor Leonard: Chatty, red wax marks the crates my courage failed to open.',
				chatty: 'Chatty: Then I will open them with less courage and more hands.'
			},
			{
				speaker: 'dwarf',
				line: 'Dwarf Bili: Chatty, if the book whispers names, do not answer for anyone but yourself.',
				chatty: 'Chatty: Names belong to mouths, not shelves.'
			}
		]
	},
	'phase-2-ledger-mites': {
		id: 'phase-2-ledger-mites',
		beats: [
			{
				speaker: 'dwarf',
				line: 'Dwarf Bili: Chatty, mites crack where their stamps click. Listen, then hit the office out of them.',
				chatty: 'Chatty: I hear tiny bureaucracy. I choose violence.'
			},
			{
				speaker: 'marketTrader',
				line: 'Market Trader: Chatty, if the mites say tax, charge them rent for standing in your way.',
				chatty: 'Chatty: Finally, economics I can bite.'
			}
		]
	},
	'phase-3-hidden-camps': {
		id: 'phase-3-hidden-camps',
		beats: [
			{
				speaker: 'forestWanderer',
				line: 'Forest Wanderer: Chatty, lanterns end where the honest path gets scared. Keep walking after that.',
				chatty: 'Chatty: I will follow the coward edge until it becomes useful.'
			},
			{
				speaker: 'marketTrader',
				line: 'Market Trader: Chatty, I saw short merchants with emergency posture near bean sacks marked ordinary.',
				chatty: 'Chatty: Ordinary bean sacks are now suspicious citizens.'
			},
			{
				speaker: 'dwarf',
				line: 'Dwarf Bili: Chatty, the hidden camps are not lost. They are waiting to see if anyone arrives without a leash.',
				chatty: 'Chatty: I arrive mostly leashless and deeply snack motivated.'
			}
		]
	},
	'phase-4-locate-goblin-one': {
		id: 'phase-4-locate-goblin-one',
		beats: [
			{
				speaker: 'hiddenGoblinOne',
				line: 'Hidden Goblin Pip: Chatty, are you tax? You are upright in a very taxable way.',
				chatty: 'Chatty: I am not tax. I am what tax worries about at night.'
			},
			{
				speaker: 'hiddenGoblinOne',
				line: 'Hidden Goblin Pip: Chatty, say the phrase before I decide your cloak is an ambush.',
				chatty: 'Chatty: Small does not mean owned.'
			}
		]
	},
	'phase-5-craft-banner': {
		id: 'phase-5-craft-banner',
		beats: [
			{
				speaker: 'bartender',
				line: 'Bartender: Chatty, make the banner ugly enough that nobody mistakes it for a mayoral program.',
				chatty: 'Chatty: Ugly means honest. The cloth understands.'
			},
			{
				speaker: 'dwarf',
				line: 'Dwarf Bili: Chatty, put a bite mark on it so fear knows who signed.',
				chatty: 'Chatty: Finally, a document I can approve with teeth.'
			}
		]
	},
	'phase-6-defend-market-road': {
		id: 'phase-6-defend-market-road',
		beats: [
			{
				speaker: 'stoneGuard',
				line: 'Stone Guard: Chatty, hold the road and I will pretend this is a very unusual permit inspection.',
				chatty: 'Chatty: Inspect the hounds first. They look unlawfully bitey.'
			},
			{
				speaker: 'marketTrader',
				line: 'Market Trader: Chatty, supplies are courage with labels. Keep the labels from being eaten.',
				chatty: 'Chatty: I defend beans, bandages, and the moral arc of inventory.'
			}
		]
	},
	'phase-7-recover-first-name': {
		id: 'phase-7-recover-first-name',
		beats: [
			{
				speaker: 'lanternKeeper',
				line: 'Lantern Keeper: Chatty, take the lamp. Darkness lies better when nobody can see its face.',
				chatty: 'Chatty: Good. I prefer my lies visible and frightened.'
			},
			{
				speaker: 'dwarf',
				line: 'Dwarf Bili: Chatty, the First Name is not treasure. Carry it like someone breathing.',
				chatty: 'Chatty: I will carry it warm, angry, and not for sale.'
			}
		]
	},
	'phase-8-freedom-proclamation': {
		id: 'phase-8-freedom-proclamation',
		beats: [
			{
				speaker: 'mayor',
				line: 'Mayor Leonard: Chatty, the square is listening. Say freedom like it belongs to everyone here.',
				chatty: 'Chatty: I am Chatty, the chosen one, because I chose back.'
			},
			{
				speaker: 'hoodedVillager',
				line: 'Hooded Villager: Chatty, define conquest before the crown defines it for you.',
				chatty: 'Chatty: We conquer fear. People are not territory.'
			}
		]
	}
}

function getTaskSpeaker(task = {}) {
	const target = task.target || {}
	if (target.dialog && DIALOG_SPEAKERS[target.dialog]) return DIALOG_SPEAKERS[target.dialog]
	const key = `${task.id || ''} ${task.title || ''} ${target.kind || ''} ${target.name || ''} ${target.enemy || ''}`.toLowerCase()
	if (/mayor|town-square|proclamation|paper-law|rules/.test(key)) return 'mayor'
	if (/bartender|tavern|snack|toast|soup/.test(key)) return 'bartender'
	if (/dwarf|bili|charm|armor|warden|first name|under-road|under road/.test(key)) return 'dwarf'
	if (/market|cloth|suppl|cache|trader/.test(key)) return 'marketTrader'
	if (/hood|revenge|tyrant|choice|conquest|consent/.test(key)) return 'hoodedVillager'
	if (/forest|wander|road|camp|bramble|ink|route/.test(key)) return 'forestWanderer'
	if (/lantern|lamp|glass|stair|sealed|binding|dark/.test(key)) return 'lanternKeeper'
	if (/guard|armory|hound|defend|crown|patrol|square/.test(key)) return 'stoneGuard'
	if (/group-one|root-shed|pip/.test(key)) return 'hiddenGoblinOne'
	if (/group-two|ditch-door|muck/.test(key)) return 'hiddenGoblinTwo'
	if (/group-three|lamp-smoke|nib|goblin freedom list|small does not mean owned/.test(key)) return 'hiddenGoblinThree'
	if (/goblin|hidden/.test(key)) return 'hiddenGoblinOne'
	if (/combat|fight|rat|mite|slime|scrap|remnant|enemy/.test(key)) return 'dwarf'
	if (/inspect|well|storage|ledger/.test(key)) return 'bartender'
	return 'hoodedVillager'
}

function sentence(value = '') {
	const text = String(value || '').trim()
	if (!text) return 'Follow the current clue until it becomes useful.'
	return /[.!?]$/.test(text) ? text : `${text}.`
}

function lowerFirst(value = '') {
	const text = String(value || '').trim()
	if (!text) return text
	return text.charAt(0).toLowerCase() + text.slice(1)
}

function createGeneratedScript(task = {}, phase = {}) {
	const speaker = getTaskSpeaker(task)
	const character = getCharacter(speaker)
	const displayName = character.displayName
	const hint = sentence(task.hint || task.detail || task.title)
	const reply = `Chatty: Then ${lowerFirst(task.title || 'the next problem')} becomes public trouble.`
	return {
		id: task.id,
		generated: true,
		participants: ['chatty', speaker],
		beats: [
			{
				speaker,
				line: `${displayName}: Chatty, ${hint}`,
				chatty: reply
			}
		],
		phaseId: phase.id
	}
}

function normalizeScriptParticipants(script = {}) {
	const speakers = (script.beats || []).map(beat => beat.speaker).filter(Boolean)
	return Array.from(new Set(['chatty', ...(script.participants || []), ...speakers]))
}

STORY_PHASES.forEach(phase => {
	phase.tasks.forEach(task => {
		if (!SCENE_SCRIPTS[task.id]) SCENE_SCRIPTS[task.id] = createGeneratedScript(task, phase)
		SCENE_SCRIPTS[task.id].participants = normalizeScriptParticipants(SCENE_SCRIPTS[task.id])
	})
})

const CHATTY_NARRATION = {
	travel: [
		'I keep the cloak low and my ears open.',
		'I leave the familiar steps behind and test new ground.',
		'I follow the next useful lead with suspicious feet.'
	],
	listen: [
		'I plant both feet and let the nearby voice become useful.',
		'I stop walking because the nearby voice might know something.',
		'I listen like a goblin pretending this was the plan.'
	],
	inspect: [
		'I study the clue with both suspicious eyes.',
		'I lean close enough for the world to become evidence.',
		'I check the thing before the thing checks back.'
	],
	combat: [
		'I square the cloak and choose trouble on purpose.',
		'I watch the enemy for the part that wants to lose.',
		'I bring small historic inconvenience to the fight.'
	],
	discovery: [
		'I find a clue and pocket the useful edge.',
		'I notice the world admitting something it tried to hide.',
		'I turn the clue over until it becomes trouble for someone else.'
	],
	victory: [
		'I survive, which remains the rudest answer to old fear.',
		'I keep the cloak and the road keeps its witness.',
		'I win a small piece of tomorrow back.'
	],
	failure: [
		'I check the cloak, swallow the mistake, and try again.',
		'I refuse to let one bad step become a law.',
		'I survive the embarrassment and keep moving.'
	]
}

function clone(value) {
	return JSON.parse(JSON.stringify(value))
}

function normalizeQuestId(value = '') {
	return String(value || '').toLowerCase()
}

function getScriptId(context = {}) {
	const scene = context.scene || {}
	const activeTask = context.activeTask || {}
	return scene.questId || activeTask.id || ''
}

function getSceneScript(context = {}) {
	const scriptId = getScriptId(context)
	return SCENE_SCRIPTS[scriptId] || null
}

function getSceneScriptParticipants(script = {}) {
	return normalizeScriptParticipants(script)
}

function hasSceneScript(context = {}) {
	return Boolean(getSceneScript(context))
}

function applyUnlock(story, unlock) {
	if (!unlock) return
	if (unlock.startsWith('fact:')) {
		story.facts[unlock.slice(5)] = true
		return
	}
	if (unlock.startsWith('item:')) {
		story.items[unlock.slice(5)] = true
		return
	}
	if (unlock.startsWith('callback:')) {
		uniquePush(story.callbacks, unlock.slice(9))
		return
	}
	uniquePush(story.callbacks, unlock)
}

function selectSceneScriptDialogue(identity, story, turn = 0, context = {}) {
	const script = getSceneScript(context)
	if (!script) return null
	const dialogue = story.dialogue
	const participants = getSceneScriptParticipants(script)
	const conversationId = `${context.scene && context.scene.sceneId ? context.scene.sceneId : script.id}::${identity.storyKey}`
	if (!participants.includes(identity.storyKey)) {
		return {
			story,
			line: null,
			lineId: null,
			conversationId,
			followUp: null,
			scriptId: script.id,
			identity,
			sceneScriptOnly: true,
			participants
		}
	}
	const spoken = new Set(Array.isArray(dialogue.spokenLines) ? dialogue.spokenLines : [])
	const beatIndex = script.beats.findIndex((beat, index) => !spoken.has(getSceneLineId(script.id, beat.speaker, index)))
	if (beatIndex < 0) {
		return {
			story,
			line: null,
			lineId: null,
			conversationId,
			followUp: null,
			scriptId: script.id,
			identity,
			sceneScriptOnly: true,
			participants
		}
	}
	const beat = script.beats[beatIndex]
	if (beat.speaker !== identity.storyKey) {
		return {
			story,
			line: null,
			lineId: null,
			conversationId,
			followUp: null,
			scriptId: script.id,
			identity,
			sceneScriptOnly: true,
			participants
		}
	}
	const lineId = getSceneLineId(script.id, identity.storyKey, beatIndex)

	dialogue.spokenLines.push(lineId)
	dialogue.activeConversation = {
		id: conversationId,
		speakerId: identity.storyKey,
		sceneId: context.scene && context.scene.sceneId ? context.scene.sceneId : '',
		questId: script.id,
		beatIndex: beatIndex + 1,
		participants,
		status: 'active'
	}
	dialogue.lastSpeakerId = identity.storyKey
	dialogue.speakerCooldowns[identity.storyKey] = turn
	dialogue.conversationHistory.push({
		id: conversationId,
		speakerId: identity.storyKey,
		sceneId: dialogue.activeConversation.sceneId,
		questId: script.id,
		lineId,
		turn
	})
	story.dialogue = dialogue
	uniquePush(story.callbacks, `scene-script:${script.id}`)
	;(beat.unlocks || []).forEach(unlock => applyUnlock(story, unlock))

	return {
		story,
		line: beat.line,
		lineId,
		conversationId,
		followUp: beat.chatty
			? {
				actor: CHATTY_NAME,
				line: beat.chatty
			}
			: null,
		scriptId: script.id,
		identity,
		participants
	}
}

function getSceneLineId(scriptId, actorKey, index) {
	return `scene-script.${scriptId}.${actorKey}.${index}`
}

function getNarrationPool(snapshot = {}, action = '') {
	const scene = snapshot.story && snapshot.story.scene ? snapshot.story.scene : {}
	if (action === 'inspect') return 'inspect'
	if (action === 'attack' || action === 'cast') return 'combat'
	if (action === 'wait' && scene.sceneType === 'dialogue') return 'listen'
	if (scene.sceneType === 'combat') return 'combat'
	if (scene.sceneType === 'discovery' || scene.sceneType === 'quest') return 'discovery'
	if (scene.sceneType === 'dialogue') return 'listen'
	return 'travel'
}

function getChattyFallbackNarration(snapshot = {}, action = 'move', details = {}) {
	const scene = snapshot.story && snapshot.story.scene ? snapshot.story.scene : {}
	const questId = normalizeQuestId(scene.questId || details.questId || '')
	const targetName = String(details.routeTargetName || details.targetName || '').toLowerCase()
	if (action === 'move' && (questId.includes('find-voice') || targetName.includes('bartender') || targetName.includes('tavern'))) {
		return 'I pad toward the tavern, cloak low and ears open.'
	}
	if (action === 'move' && (questId.includes('ledger') || targetName.includes('ledger'))) {
		return 'I follow the smell of old paper and refuse to be impressed by doors.'
	}
	if (action === 'move' && (questId.includes('hidden-camp') || targetName.includes('camp'))) {
		return 'I follow the lantern road past the point where sensible people stop.'
	}
	const poolKey = getNarrationPool(snapshot, action)
	const pool = CHATTY_NARRATION[poolKey] || CHATTY_NARRATION.travel
	const turn = Number.isInteger(snapshot.turn) ? snapshot.turn : 0
	return pool[Math.abs(turn) % pool.length]
}

function getSceneScriptStats() {
	return {
		scriptCount: Object.keys(SCENE_SCRIPTS).length,
		beatCount: Object.values(SCENE_SCRIPTS).reduce((count, script) => count + script.beats.length, 0),
		narrationCount: Object.values(CHATTY_NARRATION).reduce((count, pool) => count + pool.length, 0)
	}
}

function getSceneScriptCoverage(phases = STORY_PHASES) {
	const taskIds = phases.flatMap(phase => (phase.tasks || []).map(task => task.id))
	const missing = taskIds.filter(taskId => !SCENE_SCRIPTS[taskId] || !Array.isArray(SCENE_SCRIPTS[taskId].beats) || !SCENE_SCRIPTS[taskId].beats.length)
	return {
		taskCount: taskIds.length,
		scriptedCount: taskIds.length - missing.length,
		missing
	}
}

module.exports = {
	CHATTY_NARRATION: clone(CHATTY_NARRATION),
	SCENE_SCRIPTS: clone(SCENE_SCRIPTS),
	getChattyFallbackNarration,
	getSceneScriptCoverage,
	getSceneScriptParticipants,
	getSceneScriptStats,
	hasSceneScript,
	selectSceneScriptDialogue
}
