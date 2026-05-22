const { getNpcIdentityForActor } = require('./characters')
const { cloneEncounterView } = require('./encounters')
const { applyCombatBoardSupport } = require('./encounterDirector')
const { selectSceneScriptDialogue } = require('./sceneScripts')
const { getScriptedDialogueLines } = require('./scriptedDialogue')
const { getCompactNpcSoul } = require('./souls')
const { uniquePush } = require('./taskRules')

const MAX_SPOKEN_LINES = 2000
const MAX_CONVERSATION_HISTORY = 80
const SUPPORT_COOLDOWN_TURNS = 5
const CHATTY_NAME = 'Chatty, the chosen one'

function clone(value) {
	return JSON.parse(JSON.stringify(value))
}

function normalizeObject(input) {
	return input && typeof input === 'object' && !Array.isArray(input) ? clone(input) : {}
}

function normalizeActiveConversation(input) {
	if (!input || typeof input !== 'object' || Array.isArray(input)) return null
	return {
		id: input.id || '',
		speakerId: input.speakerId || '',
		sceneId: input.sceneId || '',
		questId: input.questId || null,
		beatIndex: Number.isInteger(input.beatIndex) ? input.beatIndex : 0,
		participants: Array.isArray(input.participants) ? input.participants.filter(Boolean).slice(0, 8) : [],
		status: input.status === 'complete' ? 'complete' : 'active'
	}
}

function normalizeDialogueState(input = {}) {
	const spokenLines = Array.isArray(input.spokenLines) ? input.spokenLines.filter(Boolean).slice(-MAX_SPOKEN_LINES) : []
	const conversationHistory = Array.isArray(input.conversationHistory)
		? input.conversationHistory
			.filter(entry => entry && typeof entry === 'object')
			.slice(-MAX_CONVERSATION_HISTORY)
			.map(entry => ({
				id: entry.id || '',
				speakerId: entry.speakerId || '',
				sceneId: entry.sceneId || '',
				questId: entry.questId || null,
				lineId: entry.lineId || '',
				turn: Number.isInteger(entry.turn) ? entry.turn : 0
			}))
		: []
	return {
		activeConversation: normalizeActiveConversation(input.activeConversation),
		spokenLines,
		conversationHistory,
		speakerCooldowns: normalizeObject(input.speakerCooldowns),
		supportCooldowns: normalizeObject(input.supportCooldowns),
		lastSpeakerId: input.lastSpeakerId || null
	}
}

function getConversationId(scene, phaseId, actorKey) {
	const sceneId = scene && scene.sceneId ? scene.sceneId : `${phaseId}.free.dialogue`
	return `${sceneId}::${actorKey}`
}

function getLineId(conversationId, index) {
	return `${conversationId}::line-${index}`
}

function lineMatchesQuest(line, task, scene) {
	const text = String(line || '').toLowerCase()
	const haystack = `${task && task.id || ''} ${task && task.title || ''} ${scene && scene.questId || ''}`.toLowerCase()
	if (!haystack.trim()) return true
	if (haystack.includes('ledger')) return /ledger|book|cellar|names|office|paper/.test(text)
	if (haystack.includes('banner')) return /banner|cloth|ink|glass|toast|armory/.test(text)
	if (haystack.includes('road')) return /road|lantern|path|bramble|route/.test(text)
	if (haystack.includes('goblin') || haystack.includes('camp')) return /goblin|camp|hidden|phrase|small/.test(text)
	if (haystack.includes('combat') || haystack.includes('fight') || haystack.includes('defend')) return /hound|rat|mite|scout|fight|hit|hold|wave|guard/.test(text)
	return true
}

function createSoulFollowUp(identity, line, story = {}, turn = 0) {
	const soul = getCompactNpcSoul(identity.storyKey)
	const hooks = Array.isArray(soul.chattyReplyHooks) ? soul.chattyReplyHooks.filter(Boolean) : []
	if (!hooks.length) return null
	const relationship = story.relationships && story.relationships[identity.storyKey] ? story.relationships[identity.storyKey] : {}
	const seed = Math.abs((turn || 0) + (relationship.talks || 0) + String(line || '').length)
	return {
		actor: CHATTY_NAME,
		line: `Chatty: ${hooks[seed % hooks.length]}`
	}
}

function selectScriptedConversationLine(actor, story, turn = 0, context = {}) {
	const identity = getNpcIdentityForActor(actor)
	const phaseId = story.phaseId || (context.scene && context.scene.phaseId) || 'phase-1'
	const scene = context.scene || story.scene || {}
	const activeTask = context.activeTask || null
	const dialogue = normalizeDialogueState(story.dialogue || {})
	story.dialogue = dialogue
	const shouldUseSceneScript = Boolean(context.requireSceneScript)
	const sceneScript = shouldUseSceneScript
		? selectSceneScriptDialogue(identity, story, turn, {
			...context,
			scene,
			activeTask
		})
		: null
	if (shouldUseSceneScript && !sceneScript) {
		return {
			story,
			line: null,
			lineId: null,
			conversationId: getConversationId(scene, phaseId, identity.storyKey),
			followUp: null,
			identity,
			sceneScriptOnly: true,
			participants: []
		}
	}
	if (sceneScript && sceneScript.line) {
		sceneScript.story.dialogue.spokenLines = sceneScript.story.dialogue.spokenLines.slice(-MAX_SPOKEN_LINES)
		sceneScript.story.dialogue.conversationHistory = sceneScript.story.dialogue.conversationHistory.slice(-MAX_CONVERSATION_HISTORY)
		return {
			...sceneScript,
			identity
		}
	}
	if (sceneScript && sceneScript.sceneScriptOnly) {
		return {
			...sceneScript,
			identity
		}
	}
	const conversationId = getConversationId(scene, phaseId, identity.storyKey)
	const lines = getScriptedDialogueLines(identity.storyKey, phaseId)
	const spoken = new Set(dialogue.spokenLines)
	const indexed = lines.map((line, index) => ({
		line,
		index,
		lineId: getLineId(conversationId, index)
	}))
	const questRelevant = indexed.filter(entry => lineMatchesQuest(entry.line, activeTask, scene))
	const preferred = questRelevant.length ? questRelevant : indexed
	const selected = preferred.find(entry => !spoken.has(entry.lineId)) || indexed.find(entry => !spoken.has(entry.lineId))
	if (!selected) {
		return {
			story,
			line: null,
			lineId: null,
			conversationId,
			identity
		}
	}

	dialogue.spokenLines.push(selected.lineId)
	dialogue.spokenLines = dialogue.spokenLines.slice(-MAX_SPOKEN_LINES)
	dialogue.activeConversation = {
		id: conversationId,
		speakerId: identity.storyKey,
		sceneId: scene.sceneId || '',
		questId: scene.questId || (activeTask && activeTask.id) || null,
		beatIndex: selected.index + 1,
		participants: ['chatty', identity.storyKey],
		status: 'active'
	}
	dialogue.lastSpeakerId = identity.storyKey
	dialogue.speakerCooldowns[identity.storyKey] = turn
	dialogue.conversationHistory.push({
		id: conversationId,
		speakerId: identity.storyKey,
		sceneId: scene.sceneId || '',
		questId: scene.questId || (activeTask && activeTask.id) || null,
		lineId: selected.lineId,
		turn
	})
	dialogue.conversationHistory = dialogue.conversationHistory.slice(-MAX_CONVERSATION_HISTORY)
	story.dialogue = dialogue
	return {
		story,
		line: selected.line,
		lineId: selected.lineId,
		conversationId,
		followUp: createSoulFollowUp(identity, selected.line, story, turn),
		identity
	}
}

function getPublicDialogueState(input = {}) {
	const dialogue = normalizeDialogueState(input)
	const recentSpeakers = []
	dialogue.conversationHistory.slice(-8).forEach(entry => {
		if (entry.speakerId && !recentSpeakers.includes(entry.speakerId)) recentSpeakers.push(entry.speakerId)
	})
	return {
		activeConversation: dialogue.activeConversation ? { ...dialogue.activeConversation } : null,
		recentSpeakers,
		conversationCount: dialogue.conversationHistory.length,
		spokenCount: dialogue.spokenLines.length,
		lastSpeakerId: dialogue.lastSpeakerId
	}
}

function findActiveEncounter(story) {
	const entry = Object.entries(story.encounters || {}).find(([, encounter]) => encounter && !encounter.defeated)
	if (!entry) return null
	return {
		taskId: entry[0],
		encounter: entry[1]
	}
}

function supportMessage(identity, encounter) {
	if (identity.combatAction === 'block') {
		return `${identity.displayName} plants a shield line between Chatty and ${encounter.enemy}.`
	}
	if (identity.combatAction === 'reveal') {
		return `${identity.displayName} calls out the weak point in ${encounter.enemy}.`
	}
	if (identity.combatAction === 'supply') {
		return `${identity.displayName} shoves useful supplies into the fight.`
	}
	if (identity.combatAction === 'warn') {
		return `${identity.displayName} warns Chatty before ${encounter.enemy} can lunge.`
	}
	if (identity.combatAction === 'distract') {
		return `${identity.displayName} distracts ${encounter.enemy} long enough for Chatty to press forward.`
	}
	return `${identity.displayName} rallies the line around Chatty.`
}

function applyNpcCombatSupport(story, actor, turn = 0) {
	const dialogue = normalizeDialogueState(story.dialogue || {})
	const identity = getNpcIdentityForActor(actor)
	const active = findActiveEncounter(story)
	if (!active) return { story, encounter: null, eventPatch: null }
	const supportKey = `${active.taskId}:${identity.storyKey}`
	if (Number.isInteger(dialogue.supportCooldowns[supportKey]) && turn - dialogue.supportCooldowns[supportKey] < SUPPORT_COOLDOWN_TURNS) {
		story.dialogue = dialogue
		return { story, encounter: cloneEncounterView(active.encounter), eventPatch: null }
	}

	const encounter = active.encounter
	let effect = ''
	let damage = 0
	if (identity.combatAction === 'block' || identity.combatAction === 'warn') {
		encounter.chattyHp = Math.min(encounter.maxChattyHp || 12, (encounter.chattyHp || 12) + 1)
		story.chattyHp = encounter.chattyHp
		effect = `${identity.displayName} reduces pressure on Chatty.`
	} else if (identity.combatAction === 'reveal') {
		encounter.inspected = true
		encounter.weaknessRevealed = true
		effect = `${identity.displayName} reveals the tactical weakness.`
	} else if (identity.combatAction === 'supply') {
		damage = 1
		encounter.hp = Math.max(0, encounter.hp - damage)
		encounter.chattyHp = Math.min(encounter.maxChattyHp || 12, (encounter.chattyHp || 12) + 1)
		story.chattyHp = encounter.chattyHp
		effect = `${identity.displayName} turns supplies into momentum.`
	} else {
		damage = 1
		encounter.hp = Math.max(0, encounter.hp - damage)
		effect = `${identity.displayName} creates an opening.`
	}

	if (encounter.hp === 0) {
		encounter.defeated = true
	}
	const boardSupport = applyCombatBoardSupport(story, damage)
	dialogue.supportCooldowns[supportKey] = turn
	dialogue.activeConversation = {
		id: `combat.${active.taskId}::${identity.storyKey}`,
		speakerId: identity.storyKey,
		sceneId: story.scene && story.scene.sceneId ? story.scene.sceneId : '',
		questId: active.taskId,
		beatIndex: 1,
		participants: ['chatty', identity.storyKey],
		status: 'active'
	}
	dialogue.lastSpeakerId = identity.storyKey
	dialogue.conversationHistory.push({
		id: dialogue.activeConversation.id,
		speakerId: identity.storyKey,
		sceneId: dialogue.activeConversation.sceneId,
		questId: active.taskId,
		lineId: `support.${supportKey}.${turn}`,
		turn
	})
	dialogue.conversationHistory = dialogue.conversationHistory.slice(-MAX_CONVERSATION_HISTORY)
	story.dialogue = dialogue
	story.encounters[active.taskId] = encounter
	uniquePush(story.callbacks, `support-${identity.storyKey}`)

	return {
		story,
		encounter: cloneEncounterView(encounter),
		eventPatch: {
			type: 'combat',
			action: 'support',
			actor: identity.displayName,
			enemy: encounter.enemy,
			enemyHp: encounter.hp,
			chattyHp: encounter.chattyHp,
			wave: encounter.wave,
			intent: encounter.intent,
			effect,
			objective: encounter.objective,
			damage,
			target: boardSupport.target || undefined,
			message: supportMessage(identity, encounter),
			publicRationale: `${identity.displayName} supports Chatty in the current fight.`,
			controller: 'npc-sim',
			worldDelta: boardSupport.worldDelta
		}
	}
}

module.exports = {
	applyNpcCombatSupport,
	getPublicDialogueState,
	normalizeDialogueState,
	selectScriptedConversationLine
}
