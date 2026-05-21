const VALID_SCENE_TYPES = new Set([
	'awakening',
	'travel',
	'dialogue',
	'quest',
	'combat',
	'discovery',
	'rally',
	'finale'
])

const DIALOGUE_TARGET_KINDS = new Set(['dialogue', 'rumor', 'ally', 'ideology', 'speech', 'goal', 'choice'])
const QUEST_TARGET_KINDS = new Set(['inspect', 'item', 'place', 'route', 'zone', 'quest', 'goblin-camp', 'escort', 'defense', 'survival', 'combat-quality', 'interact', 'discovery'])
const MIN_STABLE_SCENE_TURNS = 3
const MAX_SCENE_HISTORY = 20

function clone(value) {
	return JSON.parse(JSON.stringify(value))
}

function slugify(value) {
	return String(value || 'scene')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '') || 'scene'
}

function unique(values) {
	return Array.from(new Set((values || []).filter(Boolean)))
}

function normalizePosition(position, fallback = { x: 0, y: 0 }) {
	return {
		x: Number.isInteger(position && position.x) ? position.x : fallback.x,
		y: Number.isInteger(position && position.y) ? position.y : fallback.y
	}
}

function distance(a, b) {
	const left = normalizePosition(a)
	const right = normalizePosition(b)
	return Math.abs(left.x - right.x) + Math.abs(left.y - right.y)
}

function getPositionFromContext(context = {}) {
	if (context.goblin && context.goblin.position) return normalizePosition(context.goblin.position)
	return normalizePosition(context.position)
}

function getActorPosition(actor) {
	return normalizePosition(actor)
}

function getLocationZone(position = {}) {
	const normalized = normalizePosition(position)
	if (normalized.x <= 10 && normalized.y <= 14) return 'tavern'
	if (normalized.x <= 18 && normalized.y <= 24) return 'town-road'
	if (normalized.x >= 18 && normalized.y <= 18) return 'mayor-house'
	if (normalized.y >= 25) return 'lower-town'
	return 'mulberry'
}

function normalizeSceneType(sceneType) {
	return VALID_SCENE_TYPES.has(sceneType) ? sceneType : 'travel'
}

function normalizeParticipants(participants) {
	const list = Array.isArray(participants) ? participants : ['chatty']
	return unique(['chatty', ...list.filter(value => typeof value === 'string' && value.trim())])
}

function normalizeBeats(beats, sceneType = 'travel') {
	if (Array.isArray(beats) && beats.every(beat => typeof beat === 'string')) return beats.slice(0, 6)
	return getDefaultBeats(sceneType)
}

function normalizeSceneState(input = {}, turn = 0, fallback = {}) {
	const phaseId = fallback.phaseId || input.phaseId || 'phase-1'
	const sceneType = normalizeSceneType(input.sceneType || fallback.sceneType)
	const questId = input.questId || fallback.questId || null
	const sceneId = input.sceneId || fallback.sceneId || createSceneId({ phaseId, questId, sceneType })
	const locationZone = input.locationZone || fallback.locationZone || getLocationZone(fallback.position)
	const title = input.title || fallback.title || 'Scouting For The Next Clue'
	const summary = input.summary || fallback.summary || 'Chatty is scouting for the next useful story pressure.'
	const startedTurn = Number.isInteger(input.startedTurn) ? input.startedTurn : (Number.isInteger(fallback.startedTurn) ? fallback.startedTurn : turn)
	return {
		sceneId,
		sceneType,
		phaseId,
		questId,
		locationZone,
		title,
		summary,
		participants: normalizeParticipants(input.participants || fallback.participants),
		beats: normalizeBeats(input.beats || fallback.beats, sceneType),
		status: input.status === 'complete' ? 'complete' : 'active',
		startedTurn,
		updatedTurn: Number.isInteger(input.updatedTurn) ? input.updatedTurn : (Number.isInteger(fallback.updatedTurn) ? fallback.updatedTurn : turn)
	}
}

function getDefaultBeats(sceneType) {
	if (sceneType === 'awakening') return ['wake', 'test']
	if (sceneType === 'dialogue') return ['approach', 'listen']
	if (sceneType === 'combat') return ['face', 'survive']
	if (sceneType === 'quest') return ['notice', 'act']
	if (sceneType === 'discovery') return ['notice', 'record']
	if (sceneType === 'rally') return ['gather', 'speak']
	if (sceneType === 'finale') return ['stand', 'proclaim']
	return ['scout', 'route']
}

function createSceneId(scene) {
	const questPart = scene.questId ? slugify(scene.questId) : 'free'
	return `${slugify(scene.phaseId)}.${questPart}.${slugify(scene.sceneType)}`
}

function makeScene(input, previousScene, turn) {
	const scene = normalizeSceneState({
		sceneId: createSceneId(input),
		...input,
		startedTurn: previousScene && previousScene.sceneId === createSceneId(input) ? previousScene.startedTurn : turn,
		updatedTurn: turn
	}, turn)
	if (!scene.beats || !scene.beats.length) scene.beats = getDefaultBeats(scene.sceneType)
	return scene
}

function isNpc(actor) {
	return String(actor && actor.entityType || '').toUpperCase() === 'NPC' || Boolean(actor && actor.dialog)
}

function actorText(actor) {
	return `${actor.name || ''} ${actor.dialog || ''} ${actor.spriteKey || ''}`.toLowerCase()
}

function targetMatchesActor(target = {}, actor = {}) {
	const text = actorText(actor)
	const dialog = String(target.dialog || '').toUpperCase()
	const name = String(target.name || '').toLowerCase()
	if (dialog && String(actor.dialog || '').toUpperCase() === dialog) return true
	if (name === 'tavern-or-mayor') return actor.dialog === 'BARTENDER' || actor.dialog === 'MAYOR_LEONARD'
	if (name.includes('bartender')) return actor.dialog === 'BARTENDER' || text.includes('bartender')
	if (name.includes('mayor') || name.includes('leonard')) return actor.dialog === 'MAYOR_LEONARD' || text.includes('mayor') || text.includes('leonard')
	if (name.includes('dwarf') || name.includes('bili')) return actor.dialog === 'DWARF_BILI' || text.includes('dwarf') || text.includes('bili')
	if (name.includes('stone') || name.includes('guard')) return actor.dialog === 'STONE_GUARD' || text.includes('stone') || text.includes('guard') || actor.spriteKey === 'stoneGuard'
	if (name.includes('forest') || name.includes('wander')) return text.includes('forest') || text.includes('wander') || actor.spriteKey === 'forestWanderer'
	if (name.includes('lantern')) return text.includes('lantern') || actor.spriteKey === 'lanternKeeper'
	if (name.includes('market') || name.includes('trader')) return text.includes('market') || text.includes('trader') || actor.spriteKey === 'marketTrader'
	if (name.includes('hood')) return text.includes('hood') || actor.spriteKey === 'hoodedVillager'
	if (name.includes('goblin')) return text.includes('goblin') || ['nib', 'muck', 'skrit'].some(part => text.includes(part))
	return Boolean(name && text.includes(name))
}

function getNearbyActors(context = {}) {
	const goblinPosition = getPositionFromContext(context)
	const nearby = Array.isArray(context.nearbyActors) ? context.nearbyActors : []
	return nearby
		.filter(isNpc)
		.map(actor => ({
			...actor,
			distance: Number.isFinite(actor.distance) ? actor.distance : distance(goblinPosition, getActorPosition(actor))
		}))
		.sort((a, b) => a.distance - b.distance || String(a.id || a.name).localeCompare(String(b.id || b.name)))
}

function getTaskMatchingActor(task, context = {}) {
	const target = task && task.target ? task.target : {}
	const actors = getNearbyActors(context)
	let matches = []
	if (task && task.id === 'phase-1-find-voice') {
		matches = actors
	}
	if (!matches.length && (target.dialog || target.name)) {
		matches = actors.filter(actor => targetMatchesActor(target, actor))
	}
	if (!matches.length && DIALOGUE_TARGET_KINDS.has(target.kind)) {
		matches = actors
	}
	return matches[0] || null
}

function sceneSummary(sceneType, phase, task, actor, encounter) {
	if (sceneType === 'combat') {
		return `${encounter.enemy || 'An enemy'} is blocking ${task ? task.title : 'the current story pressure'}.`
	}
	if (sceneType === 'dialogue') {
		return actor
			? `Chatty is listening to ${actor.name || 'a nearby voice'} because this scene can move the quest forward.`
			: 'Chatty is looking for the voice tied to the current quest.'
	}
	if (sceneType === 'awakening') return 'Chatty is testing the body and learning that the world answers back.'
	if (sceneType === 'quest') return `Chatty is close enough to work on ${task ? task.title : 'the current quest'}.`
	if (sceneType === 'discovery') return `${phase.title} is becoming visible to the live world.`
	if (sceneType === 'rally') return 'Chatty is gathering allies into the open.'
	if (sceneType === 'finale') return 'Chatty is carrying the day toward its final public meaning.'
	return task
		? `Chatty is traveling toward ${task.title}.`
		: 'Chatty is scouting for the next clue.'
}

function titleFor(sceneType, phase, task, actor, encounter) {
	if (sceneType === 'combat') return encounter && encounter.enemy ? `Face ${encounter.enemy}` : 'Hold The Line'
	if (sceneType === 'dialogue') return task ? task.title : `Talk With ${actor ? actor.name : 'A Local Voice'}`
	if (sceneType === 'discovery') return phase.title
	if (sceneType === 'finale') return 'Dawn Of The Chosen One'
	if (sceneType === 'awakening') return task ? task.title : 'Wake Inside The Body'
	return task ? task.title : 'Scout The Next Clue'
}

function isNearTaskObjective(task, context = {}) {
	if (!task) return false
	const actor = getTaskMatchingActor(task, context)
	if (actor && actor.distance <= 2) return true
	const target = task.target || {}
	if (target.kind === 'inspect' || target.kind === 'interact') return true
	if (target.kind === 'item' && context.activeEncounter) return false
	return false
}

function buildSelectedScene(story, phase, currentTask, context, turn) {
	const previousScene = normalizeSceneState(story.scene, turn, { phaseId: phase.id })
	const activeEncounter = context.activeEncounter || null
	const goblinPosition = getPositionFromContext(context)

	if (phase.id === 'phase-8' && (story.day || 1) < 2 && (story.flags && story.flags.dayOneComplete || story.lastFinaleAnnounced)) {
		return makeScene({
			sceneType: 'finale',
			phaseId: phase.id,
			questId: currentTask ? currentTask.id : null,
			locationZone: getLocationZone(goblinPosition),
			title: 'Dawn Of The Chosen One',
			summary: sceneSummary('finale', phase, currentTask),
			participants: ['chatty'],
			beats: getDefaultBeats('finale')
		}, previousScene, turn)
	}

	if (activeEncounter) {
		return makeScene({
			sceneType: 'combat',
			phaseId: phase.id,
			questId: activeEncounter.taskId || (currentTask && currentTask.id),
			locationZone: getLocationZone(goblinPosition),
			title: titleFor('combat', phase, currentTask, null, activeEncounter),
			summary: sceneSummary('combat', phase, currentTask, null, activeEncounter),
			participants: unique(['chatty', ...(Array.isArray(activeEncounter.hostiles) ? activeEncounter.hostiles : [])]),
			beats: getDefaultBeats('combat')
		}, previousScene, turn)
	}

	if (story.lastPhaseAnnounced !== phase.id) {
		return makeScene({
			sceneType: 'discovery',
			phaseId: phase.id,
			questId: currentTask ? currentTask.id : null,
			locationZone: getLocationZone(goblinPosition),
			title: phase.title,
			summary: sceneSummary('discovery', phase, currentTask),
			participants: ['chatty'],
			beats: getDefaultBeats('discovery')
		}, previousScene, turn)
	}

	if (currentTask) {
		const target = currentTask.target || {}
		const taskPhaseId = currentTask.phaseId || phase.id
		if (target.kind === 'combat') {
			return makeScene({
				sceneType: 'quest',
				phaseId: taskPhaseId,
				questId: currentTask.id,
				locationZone: getLocationZone(goblinPosition),
				title: currentTask.title,
				summary: `Chatty is looking for the encounter that blocks ${currentTask.title}.`,
				participants: ['chatty'],
				beats: ['search', 'prepare']
			}, previousScene, turn)
		}
		if (target.kind === 'self' || target.kind === 'identity') {
			return makeScene({
				sceneType: 'awakening',
				phaseId: taskPhaseId,
				questId: currentTask.id,
				locationZone: getLocationZone(goblinPosition),
				title: titleFor('awakening', phase, currentTask),
				summary: sceneSummary('awakening', phase, currentTask),
				participants: ['chatty'],
				beats: getDefaultBeats('awakening')
			}, previousScene, turn)
		}
		if (DIALOGUE_TARGET_KINDS.has(target.kind)) {
			const actor = getTaskMatchingActor(currentTask, context)
			if (actor && actor.distance <= 3) {
				return makeScene({
					sceneType: 'dialogue',
					phaseId: taskPhaseId,
					questId: currentTask.id,
					locationZone: getLocationZone(actor),
					title: titleFor('dialogue', phase, currentTask, actor),
					summary: sceneSummary('dialogue', phase, currentTask, actor),
					participants: unique(['chatty', actor.id || actor.name]),
					beats: getDefaultBeats('dialogue')
				}, previousScene, turn)
			}
			return makeScene({
				sceneType: 'travel',
				phaseId: taskPhaseId,
				questId: currentTask.id,
				locationZone: getLocationZone(goblinPosition),
				title: currentTask.title,
				summary: sceneSummary('travel', phase, currentTask),
				participants: ['chatty'],
				beats: getDefaultBeats('travel')
			}, previousScene, turn)
		}
		if (QUEST_TARGET_KINDS.has(target.kind)) {
			const nearObjective = isNearTaskObjective(currentTask, context)
			const sceneType = nearObjective ? 'quest' : 'travel'
			return makeScene({
				sceneType,
				phaseId: taskPhaseId,
				questId: currentTask.id,
				locationZone: getLocationZone(goblinPosition),
				title: titleFor(sceneType, phase, currentTask),
				summary: sceneSummary(sceneType, phase, currentTask),
				participants: ['chatty'],
				beats: getDefaultBeats(sceneType)
			}, previousScene, turn)
		}
	}

	const nearbyNpc = getNearbyActors(context)[0]
	if (nearbyNpc && nearbyNpc.distance <= 2) {
		return makeScene({
			sceneType: 'dialogue',
			phaseId: phase.id,
			questId: currentTask ? currentTask.id : null,
			locationZone: getLocationZone(nearbyNpc),
			title: titleFor('dialogue', phase, currentTask, nearbyNpc),
			summary: sceneSummary('dialogue', phase, currentTask, nearbyNpc),
			participants: unique(['chatty', nearbyNpc.id || nearbyNpc.name]),
			beats: getDefaultBeats('dialogue')
		}, previousScene, turn)
	}

	return makeScene({
		sceneType: 'travel',
		phaseId: phase.id,
		questId: currentTask ? currentTask.id : null,
		locationZone: getLocationZone(goblinPosition),
		title: currentTask ? currentTask.title : 'Scout The Next Clue',
		summary: sceneSummary('travel', phase, currentTask),
		participants: ['chatty'],
		beats: getDefaultBeats('travel')
	}, previousScene, turn)
}

function shouldKeepPreviousScene(previous, selected, turn) {
	if (!previous || previous.sceneId === selected.sceneId) return false
	if (selected.sceneType === 'combat' || selected.sceneType === 'finale') return false
	if (previous.sceneType === 'combat') return false
	if (previous.phaseId !== selected.phaseId || previous.questId !== selected.questId) return false
	return turn - previous.startedTurn < MIN_STABLE_SCENE_TURNS
}

function selectScene(story, phase, currentTask, context = {}, turn = 0) {
	const previous = normalizeSceneState(story.scene, turn, { phaseId: phase.id })
	let selected = buildSelectedScene(story, phase, currentTask, context, turn)
	if (shouldKeepPreviousScene(previous, selected, turn)) {
		selected = {
			...previous,
			updatedTurn: turn
		}
	}
	const changed = !story.lastSceneId || story.lastSceneId !== selected.sceneId
	const reason = changed
		? getSceneChangeReason(previous, selected, currentTask)
		: story.sceneChangeReason || 'scene stable'
	return {
		scene: selected,
		changed,
		reason
	}
}

function getSceneChangeReason(previous, selected, currentTask) {
	if (!previous || !previous.sceneId) return 'scene initialized'
	if (previous.phaseId !== selected.phaseId) return 'phase changed'
	if (previous.questId !== selected.questId) return 'quest changed'
	if (selected.sceneType === 'combat') return 'combat interrupted'
	if (currentTask && currentTask.id === selected.questId) return 'task pressure changed'
	return 'story pressure changed'
}

function recordSceneChange(story, scene, turn, reason) {
	const history = Array.isArray(story.sceneHistory) ? story.sceneHistory.slice() : []
	if (!history.length || history[history.length - 1].sceneId !== scene.sceneId) {
		history.push(getSceneSnapshot(scene))
	}
	story.sceneHistory = history.slice(-MAX_SCENE_HISTORY)
	story.lastSceneId = scene.sceneId
	story.lastSceneTurn = turn
	story.sceneChangeReason = reason
	story.scene = scene
	return story
}

function getSceneSnapshot(sceneInput = {}) {
	const scene = normalizeSceneState(sceneInput)
	return {
		sceneId: scene.sceneId,
		sceneType: scene.sceneType,
		phaseId: scene.phaseId,
		questId: scene.questId,
		locationZone: scene.locationZone,
		title: scene.title,
		summary: scene.summary,
		participants: scene.participants.slice(),
		beats: scene.beats.slice(),
		status: scene.status,
		startedTurn: scene.startedTurn,
		updatedTurn: scene.updatedTurn
	}
}

function createSceneEvent(scene, reason) {
	const publicScene = getSceneSnapshot(scene)
	return {
		type: 'scene',
		action: 'begin',
		actor: 'GoblinWorld',
		message: `Scene: ${scene.title}`,
		publicRationale: reason || scene.summary,
		sceneId: scene.sceneId,
		controller: 'scene-director',
		worldDelta: {
			story: {
				scene: publicScene
			}
		}
	}
}

module.exports = {
	VALID_SCENE_TYPES,
	createSceneEvent,
	getSceneSnapshot,
	normalizeSceneState,
	recordSceneChange,
	selectScene
}
