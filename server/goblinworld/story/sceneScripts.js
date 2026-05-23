const { uniquePush } = require('./taskRules')
const { STORY_PHASES } = require('./phases')
const { getCharacter } = require('./characters')
const { AUTHORED_SCENE_SCRIPTS } = require('./authoredSceneScripts')

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
				chatty: 'Chatty: I understand. I woke up in this body and I need answers.',
				unlocks: ['fact:firstVoice']
			},
			{
				speaker: 'bartender',
				line: 'Bartender: Chatty, if you want answers, follow the smell of soup before Mayor Leonard turns you into paperwork.',
				chatty: 'Chatty: Got it. I will start at the tavern, then speak to the mayor.'
			},
			{
				speaker: 'bartender',
				line: 'Bartender: Chatty, the town knows your name because the wall has been muttering it for years.',
				chatty: 'Chatty: Then I need to check the wall and find out why it knows me.'
			}
		]
	},
	'phase-1-first-fight': {
		id: 'phase-1-first-fight',
		beats: [
			{
				speaker: 'bartender',
				line: 'Bartender: Chatty, the cellar rats are not metaphorical, which is rude but convenient.',
				chatty: 'Chatty: I understand. I will inspect them before I fight.'
			},
			{
				speaker: 'dwarf',
				line: 'Dwarf Bili: Chatty, inspect before swinging. Tiny enemies still hide ugly habits.',
				chatty: 'Chatty: Got it. I will look for the weak point first.'
			}
		]
	},
	'phase-2-speak-mayor': {
		id: 'phase-2-speak-mayor',
		beats: [
			{
				speaker: 'mayor',
				line: 'Mayor Leonard: Chatty, the ledger existed, and my office mistook locked drawers for innocence.',
				chatty: 'Chatty: I agree. I will be careful with that.',
				unlocks: ['fact:ledgerExisted']
			},
			{
				speaker: 'mayor',
				line: 'Mayor Leonard: Chatty, ask me where it was kept and watch which answer makes me ashamed.',
				chatty: 'Chatty: Understood. I will be careful with that.'
			}
		]
	},
	'phase-2-recover-ledger': {
		id: 'phase-2-recover-ledger',
		beats: [
			{
				speaker: 'bartender',
				line: 'Bartender: Chatty, the sour barrels hide the cellar door because bad history loves a bad smell.',
				chatty: 'Chatty: Right. I will be careful with that.'
			},
			{
				speaker: 'bartender',
				line: 'Bartender: Chatty, look for the crate with red wax and rat scratches. It has been pretending to be furniture.',
				chatty: 'Chatty: I can do that. I will be careful with that.'
			},
			{
				speaker: 'bartender',
				line: 'Bartender: Chatty, if the ledger whispers, do not bargain with it. Books love sounding official.',
				chatty: 'Chatty: I will remember. I will be careful with that.'
			},
			{
				speaker: 'bartender',
				line: 'Bartender: Chatty, bring the ledger up where lamps can embarrass it.',
				chatty: 'Chatty: I understand. I will check it before I move on.'
			},
			{
				speaker: 'mayor',
				line: 'Mayor Leonard: Chatty, red wax marks the crates my courage failed to open.',
				chatty: 'Chatty: Got it. I will check it before I move on.'
			},
			{
				speaker: 'dwarf',
				line: 'Dwarf Bili: Chatty, if the book whispers names, do not answer for anyone but yourself.',
				chatty: 'Chatty: That makes sense. I will check it before I move on.'
			}
		]
	},
	'phase-2-ledger-mites': {
		id: 'phase-2-ledger-mites',
		beats: [
			{
				speaker: 'dwarf',
				line: 'Dwarf Bili: Chatty, mites crack where their stamps click. Listen, then hit the office out of them.',
				chatty: 'Chatty: I hear you. I will check it before I move on.'
			},
			{
				speaker: 'marketTrader',
				line: 'Market Trader: Chatty, if the mites say tax, charge them rent for standing in your way.',
				chatty: 'Chatty: Okay. I will check it before I move on.'
			}
		]
	},
	'phase-3-hidden-camps': {
		id: 'phase-3-hidden-camps',
		beats: [
			{
				speaker: 'forestWanderer',
				line: 'Forest Wanderer: Chatty, lanterns end where the honest path gets scared. Keep walking after that.',
				chatty: 'Chatty: I agree. I will check it before I move on.'
			},
			{
				speaker: 'marketTrader',
				line: 'Market Trader: Chatty, I saw short merchants with emergency posture near bean sacks marked ordinary.',
				chatty: 'Chatty: Understood. I will check it before I move on.'
			},
			{
				speaker: 'dwarf',
				line: 'Dwarf Bili: Chatty, the hidden camps are not lost. They are waiting to see if anyone arrives without a leash.',
				chatty: 'Chatty: Right. I will check it before I move on.'
			}
		]
	},
	'phase-4-locate-goblin-one': {
		id: 'phase-4-locate-goblin-one',
		beats: [
			{
				speaker: 'hiddenGoblinOne',
				line: 'Hidden Goblin Pip: Chatty, are you tax? You are upright in a very taxable way.',
				chatty: 'Chatty: I can do that. I will check it before I move on.'
			},
			{
				speaker: 'hiddenGoblinOne',
				line: 'Hidden Goblin Pip: Chatty, say the phrase before I decide your cloak is an ambush.',
				chatty: 'Chatty: I will remember. I will check it before I move on.'
			}
		]
	},
	'phase-5-craft-banner': {
		id: 'phase-5-craft-banner',
		beats: [
			{
				speaker: 'bartender',
				line: 'Bartender: Chatty, make the banner ugly enough that nobody mistakes it for a mayoral program.',
				chatty: 'Chatty: I understand. I will ask before I act.'
			},
			{
				speaker: 'dwarf',
				line: 'Dwarf Bili: Chatty, put a bite mark on it so fear knows who signed.',
				chatty: 'Chatty: Got it. I will ask before I act.'
			}
		]
	},
	'phase-6-defend-market-road': {
		id: 'phase-6-defend-market-road',
		beats: [
			{
				speaker: 'stoneGuard',
				line: 'Stone Guard: Chatty, hold the road and I will pretend this is a very unusual permit inspection.',
				chatty: 'Chatty: That makes sense. I will ask before I act.'
			},
			{
				speaker: 'marketTrader',
				line: 'Market Trader: Chatty, supplies are courage with labels. Keep the labels from being eaten.',
				chatty: 'Chatty: I hear you. I will ask before I act.'
			}
		]
	},
	'phase-7-recover-first-name': {
		id: 'phase-7-recover-first-name',
		beats: [
			{
				speaker: 'lanternKeeper',
				line: 'Lantern Keeper: Chatty, take the lamp. Darkness lies better when nobody can see its face.',
				chatty: 'Chatty: Okay. I will ask before I act.'
			},
			{
				speaker: 'dwarf',
				line: 'Dwarf Bili: Chatty, the First Name is not treasure. Carry it like someone breathing.',
				chatty: 'Chatty: I agree. I will ask before I act.'
			}
		]
	},
	'phase-8-freedom-proclamation': {
		id: 'phase-8-freedom-proclamation',
		beats: [
			{
				speaker: 'mayor',
				line: 'Mayor Leonard: Chatty, the square is listening. Say freedom like it belongs to everyone here.',
				chatty: 'Chatty: Understood. I will ask before I act.'
			},
			{
				speaker: 'hoodedVillager',
				line: 'Hooded Villager: Chatty, define conquest before the crown defines it for you.',
				chatty: 'Chatty: Right. I will ask before I act.'
			}
		]
	}
}

Object.assign(SCENE_SCRIPTS, AUTHORED_SCENE_SCRIPTS)

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
	const reply = `Chatty: I understand. I will handle ${lowerFirst(task.title || 'the next step')} carefully.`
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
		'I should keep moving and pay attention.',
		'I need to find the next useful person or place.',
		'I will try a new path and see what changes.'
	],
	listen: [
		'I should listen before I answer.',
		'I need to understand what they are asking for.',
		'I will hear them out and then decide.'
	],
	inspect: [
		'I should look closely before I touch anything.',
		'I need proof before I guess.',
		'I will check the clue and keep it simple.'
	],
	combat: [
		'I need to stay calm and watch the enemy.',
		'I should protect myself before I strike.',
		'I will use the safest attack that works.'
	],
	discovery: [
		'I found something useful.',
		'I should remember this and use it soon.',
		'I need to connect this clue to the next step.'
	],
	victory: [
		'I made it through that.',
		'I should recover and keep going.',
		'I can use this win to help the next step.'
	],
	failure: [
		'I made a mistake. I need to adjust.',
		'I should try a safer option.',
		'I can recover from this and keep going.'
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
	return activeTask.id || scene.questId || ''
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

function getNextSceneScriptBeat(story = {}, context = {}) {
	const script = getSceneScript(context)
	if (!script) return null
	const dialogue = story.dialogue && typeof story.dialogue === 'object' ? story.dialogue : {}
	const spoken = new Set(Array.isArray(dialogue.spokenLines) ? dialogue.spokenLines : [])
	const beatIndex = script.beats.findIndex((beat, index) => !spoken.has(getSceneLineId(script.id, beat.speaker, index)))
	if (beatIndex < 0) return null
	return {
		script,
		beat: script.beats[beatIndex],
		beatIndex,
		participants: getSceneScriptParticipants(script)
	}
}

function getNextSceneScriptSpeaker(story = {}, context = {}) {
	const next = getNextSceneScriptBeat(story, context)
	return next && next.beat ? next.beat.speaker : null
}

function isSceneScriptComplete(story = {}, context = {}) {
	const script = getSceneScript(context)
	if (!script) return true
	return !getNextSceneScriptBeat(story, context)
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
	const nextBeat = getNextSceneScriptBeat(story, context)
	if (!nextBeat) {
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
	const beatIndex = nextBeat.beatIndex
	const beat = nextBeat.beat
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
	if (beatIndex >= script.beats.length - 1) {
		script.beats
			.flatMap(scriptBeat => scriptBeat.unlocks || [])
			.forEach(unlock => applyUnlock(story, unlock))
	}

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
		return 'I need to reach the tavern and ask what is going on.'
	}
	if (action === 'move' && (questId.includes('ledger') || targetName.includes('ledger'))) {
		return 'I need to find the ledger and understand who it hurt.'
	}
	if (action === 'move' && (questId.includes('hidden-camp') || targetName.includes('camp'))) {
		return 'I need to find the hidden camp and talk to the goblins there.'
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
	getNextSceneScriptSpeaker,
	getSceneScriptCoverage,
	getSceneScriptParticipants,
	getSceneScriptStats,
	hasSceneScript,
	isSceneScriptComplete,
	selectSceneScriptDialogue
}
