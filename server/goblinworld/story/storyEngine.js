const {
	DIALOGUE_REPEAT_WINDOW_TURNS,
	STORY_DAY_TURNS,
	STORY_TURNS_PER_HOUR,
	STORY_TURNS_PER_PHASE
} = require('./constants')
const { CHARACTER_ARCS, createDefaultRelationships, getActorStoryKey, getCharacter } = require('./characters')
const {
	CHATTY_COMBAT_LINES,
	FINAL_PROCLAMATION,
	LINE_CATEGORIES,
	PUBLIC_RATIONALES,
	getAllStoryText,
	getChattyLine,
	getDialogueLines,
	getSpeakerLinePools
} = require('./dialogueBanks')
const { cloneEncounterView, createEncounterState, getCurrentIntent, getEncounterDefinition } = require('./encounters')
const {
	applyNpcCombatSupport,
	getPublicDialogueState,
	normalizeDialogueState,
	selectScriptedConversationLine
} = require('./conversationEngine')
const {
	applyCombatBoardAction,
	ensureCombatBoard,
	getCombatBoardSnapshot,
	normalizeCombatBoard
} = require('./encounterDirector')
const {
	createContinuationTaskViews,
	getContinuationArc,
	getContinuationSummary,
	isContinuationArcComplete,
	rollContinuationArc,
	shouldUseContinuationTasks
} = require('./continuationArc')
const {
	compactPlan,
	createDirectorPlanEvent,
	createPlanForTask,
	normalizePlan,
	syncDirectorPlan
} = require('./directorPlan')
const { STORY_PHASES, getPhase, getPhaseIndex } = require('./phases')
const {
	createSceneEvent,
	getSceneSnapshot,
	normalizeSceneState,
	recordSceneChange,
	selectScene
} = require('./sceneDirector')
const { getCompactNpcSoul } = require('./souls')
const { applyTaskRewards, evaluateTask, setUnlock, uniquePush } = require('./taskRules')
const { getZoneForPosition } = require('./worldZones')

const MAX_REASONABLE_STORY_DAY = 30
const CHATTY_NAME = 'Chatty, the chosen one'

function clone(value) {
	return JSON.parse(JSON.stringify(value))
}

function unique(values) {
	return Array.from(new Set((values || []).filter(Boolean)))
}

const TASKS_BY_ID = STORY_PHASES.reduce((lookup, phase) => {
	phase.tasks.forEach(task => {
		lookup[task.id] = task
	})
	return lookup
}, {})
getContinuationArc().tasks.forEach(task => {
	TASKS_BY_ID[task.id] = task
})

const PHASE_BRIDGE_OBJECTIVES = {
	'phase-1': {
		title: 'Keep learning the body',
		hint: 'The body is awake. Keep moving, listening, and proving the cloak belongs to Chatty.'
	},
	'phase-2': {
		title: 'Keep the ledger in the light',
		hint: 'The names are loose from the old book. Keep the truth visible while Mulberry decides what it fears.'
	},
	'phase-3': {
		title: 'Keep the road rumors moving',
		hint: 'The roads know where the hidden goblins wait. Keep following useful voices and fresh tracks.'
	},
	'phase-4': {
		title: 'Keep the hidden goblins safe',
		hint: 'The freedom list has names, not hooks. Keep the hidden groups protected while courage spreads.'
	},
	'phase-5': {
		title: 'Keep the banner visible',
		hint: 'The town is reacting to the crooked banner. Keep moving, listening, and guarding supplies until the next threat shows itself.'
	},
	'phase-6': {
		title: 'Hold the market road',
		hint: 'The road held once. Keep allies close and the line steady while the old powers gather themselves.'
	},
	'phase-7': {
		title: 'Listen for the names returning',
		hint: 'The under road has cracked open. Keep the lamp high and listen for every stolen name finding its owner.'
	},
	'phase-8': {
		title: 'Hold the square until dawn',
		hint: 'The square has heard Chatty. Keep the roads open and the crowd steady until tomorrow chooses its work.'
	}
}

function normalizeObject(input) {
	return input && typeof input === 'object' && !Array.isArray(input) ? clone(input) : {}
}

function normalizeEncounter(raw = {}, fallbackTaskId) {
	const taskId = raw.taskId || fallbackTaskId
	const task = TASKS_BY_ID[taskId]
	const encounterId = raw.id || raw.encounterId || (task && task.encounterId)
	const seeded = createEncounterState(encounterId, taskId)
	if (!seeded) {
		return {
			...clone(raw),
			taskId,
			id: encounterId || fallbackTaskId,
			defeated: Boolean(raw.defeated)
		}
	}
	return {
		...seeded,
		...clone(raw),
		taskId,
		id: seeded.id,
		maxHp: Number.isFinite(raw.maxHp) ? raw.maxHp : seeded.maxHp,
		hp: Number.isFinite(raw.hp) ? raw.hp : seeded.hp,
		chattyHp: Number.isFinite(raw.chattyHp) ? raw.chattyHp : seeded.chattyHp,
		maxChattyHp: Number.isFinite(raw.maxChattyHp) ? raw.maxChattyHp : seeded.maxChattyHp,
		wave: Number.isFinite(raw.wave) ? raw.wave : seeded.wave,
		waves: Number.isFinite(raw.waves) ? raw.waves : seeded.waves,
		intentIndex: Number.isFinite(raw.intentIndex) ? raw.intentIndex : seeded.intentIndex,
		weaknessRevealed: Boolean(raw.weaknessRevealed || raw.inspected),
		inspected: Boolean(raw.inspected || raw.weaknessRevealed),
		defeated: Boolean(raw.defeated)
	}
}

function normalizeEncounters(input = {}) {
	return Object.fromEntries(
		Object.entries(input && typeof input === 'object' ? input : {}).map(([key, raw]) => [
			key,
			normalizeEncounter(raw, key)
		])
	)
}

function normalizeVisibleProgress(input = {}) {
	const progress = input && typeof input === 'object' && !Array.isArray(input) ? clone(input) : {}
	return {
		...progress,
		zones: progress.zones && typeof progress.zones === 'object' && !Array.isArray(progress.zones)
			? { ...progress.zones }
			: {},
		lastZone: progress.lastZone || '',
		lastZoneLabel: progress.lastZoneLabel || '',
		lastPosition: progress.lastPosition && Number.isInteger(progress.lastPosition.x) && Number.isInteger(progress.lastPosition.y)
			? { x: progress.lastPosition.x, y: progress.lastPosition.y }
			: null,
		lastUpdatedTurn: Number.isInteger(progress.lastUpdatedTurn) ? progress.lastUpdatedTurn : 0
	}
}

function normalizeExplorationState(input = {}, day = 1, arcId = 'day-1-chatty-awakens', arcStartedTurn = 0, currentMapId = 'mulberryTown') {
	const exploration = input && typeof input === 'object' && !Array.isArray(input) ? clone(input) : {}
	const arcVisitKey = `${day}:${arcId}:${arcStartedTurn}`
	const sameArc = exploration.arcVisitKey === arcVisitKey
	return {
		currentMapId: exploration.currentMapId || currentMapId || 'mulberryTown',
		targetMapId: exploration.targetMapId || '',
		visitedMapsThisArc: sameArc && exploration.visitedMapsThisArc && typeof exploration.visitedMapsThisArc === 'object'
			? { ...exploration.visitedMapsThisArc }
			: {},
		visitedZonesThisArc: sameArc && exploration.visitedZonesThisArc && typeof exploration.visitedZonesThisArc === 'object'
			? { ...exploration.visitedZonesThisArc }
			: {},
		arcVisitKey,
		lastMapChangeTurn: Number.isInteger(exploration.lastMapChangeTurn) ? exploration.lastMapChangeTurn : 0
	}
}

function normalizeStoryState(input = {}, turn = 0) {
	const phase = getPhase(input.phaseId)
	const startedTurn = Number.isInteger(input.startedTurn) ? input.startedTurn : 0
	const phaseStartedTurn = Number.isInteger(input.phaseStartedTurn)
		? input.phaseStartedTurn
		: phase.hourStart * STORY_TURNS_PER_HOUR
	const facts = normalizeObject(input.facts)
	const items = normalizeObject(input.items)
	const relationships = createDefaultRelationships(input.relationships || {})
	const encounters = normalizeEncounters(input.encounters)
	const combatBoard = normalizeCombatBoard(input.combatBoard || {})
	const scene = normalizeSceneState(input.scene, turn, {
		phaseId: phase.id,
		position: input.goblin && input.goblin.position
	})
	const flags = normalizeObject(input.flags)
	const staleContinuationSave = Number.isInteger(input.day) && input.day > MAX_REASONABLE_STORY_DAY
	const day = Number.isInteger(input.day)
		? (staleContinuationSave ? 2 : Math.max(1, input.day))
		: (flags.dayOneComplete || input.lastFinaleAnnounced ? 2 : 1)
	const arcId = input.arcId || (day >= 2 ? 'day-2-road-to-freedom' : 'day-1-chatty-awakens')
	const arcStartedTurn = Number.isInteger(input.arcStartedTurn) ? input.arcStartedTurn : (day >= 2 ? Math.max(turn, STORY_DAY_TURNS) : startedTurn)
	const completedTasks = unique(Array.isArray(input.completedTasks) ? input.completedTasks : [])
		.filter(id => !staleContinuationSave || !String(id).startsWith('day-2-'))
	const failedTasks = unique(Array.isArray(input.failedTasks) ? input.failedTasks : [])
		.filter(id => !staleContinuationSave || !String(id).startsWith('day-2-'))

	return {
		startedTurn,
		phaseId: phase.id,
		phaseStartedTurn,
		day,
		arcId,
		arcStartedTurn,
		currentObjective: input.currentObjective || '',
		visibleProgress: normalizeVisibleProgress(input.visibleProgress),
		exploration: normalizeExplorationState(input.exploration, day, arcId, arcStartedTurn, input.currentMapId),
		flags,
		facts,
		items,
		relationships,
		allies: unique(Array.isArray(input.allies) ? input.allies : []),
		encounters,
		combatBoard,
		callbacks: unique(Array.isArray(input.callbacks) ? input.callbacks : []),
		completedArcIds: unique(Array.isArray(input.completedArcIds) ? input.completedArcIds : [])
			.filter(id => !staleContinuationSave || !String(id).startsWith('day-')),
		completedTasks,
		failedTasks,
		scene,
		lastSceneId: input.lastSceneId || null,
		lastSceneTurn: Number.isInteger(input.lastSceneTurn) ? input.lastSceneTurn : scene.updatedTurn,
		sceneHistory: Array.isArray(input.sceneHistory)
			? input.sceneHistory.slice(-20).map(raw => getSceneSnapshot(normalizeSceneState(raw, turn, { phaseId: phase.id })))
			: [],
		sceneChangeReason: typeof input.sceneChangeReason === 'string' ? input.sceneChangeReason : '',
		dialogue: normalizeDialogueState(input.dialogue || {}),
		dialogueHistory: normalizeObject(input.dialogueHistory),
		lastPhaseAnnounced: input.lastPhaseAnnounced || null,
		lastFinaleAnnounced: Boolean(input.lastFinaleAnnounced),
		lastGuideTurn: Number.isInteger(input.lastGuideTurn) ? input.lastGuideTurn : turn,
		lastProcessedEventId: Number.isInteger(input.lastProcessedEventId) ? input.lastProcessedEventId : 0,
		chattyHp: Number.isFinite(input.chattyHp) ? input.chattyHp : 12,
		morale: Number.isFinite(input.morale) ? input.morale : 0,
		taskProgress: normalizeObject(input.taskProgress),
		directorPlan: normalizePlan(input.directorPlan || {}, turn)
	}
}

function getTaskStatus(story, task, index) {
	if (story.completedTasks.includes(task.id)) return 'done'
	if (story.failedTasks.includes(task.id)) return 'failed'
	const phase = getPhase(story.phaseId)
	const firstIncompleteIndex = phase.tasks.findIndex(candidate =>
		!story.completedTasks.includes(candidate.id) && !story.failedTasks.includes(candidate.id)
	)
	if (index === firstIncompleteIndex) {
		const encounter = story.encounters[task.id]
		if (encounter && !encounter.defeated) return 'combat'
		return 'active'
	}
	return 'locked'
}

function createTaskView(task, status) {
	return {
		id: task.id,
		phaseId: task.phaseId,
		title: task.title,
		label: task.title,
		status,
		target: clone(task.target || {}),
		hint: task.hint,
		detail: task.hint,
		successLine: task.successLine,
		failureLine: task.failureLine,
		required: Boolean(task.required),
		unlocks: (task.unlocks || []).slice()
	}
}

function createPhaseBridgeTaskView(phase, story, turn = 0) {
	if (!phase || shouldUseContinuationTasks(story)) return null
	if (!isPhaseComplete(story, phase)) return null
	if (turn - story.phaseStartedTurn >= STORY_TURNS_PER_PHASE) return null
	const bridge = PHASE_BRIDGE_OBJECTIVES[phase.id] || {
		title: `Keep pressure on ${phase.title}`,
		hint: phase.completionLine || 'Keep the story moving while the world catches up.'
	}
	return {
		id: `${phase.id}-bridge-objective`,
		phaseId: phase.id,
		title: bridge.title,
		label: bridge.title,
		status: 'active',
		target: {
			kind: 'route',
			name: phase.id
		},
		hint: bridge.hint,
		detail: bridge.hint,
		successLine: phase.completionLine,
		failureLine: '',
		required: false,
		unlocks: [],
		bridge: true
	}
}

function getStoryTasks(storyInput, turn = 0) {
	const story = normalizeStoryState(storyInput, turn)
	if (shouldUseContinuationTasks(story)) {
		return createContinuationTaskViews(story)
	}
	const phase = getPhase(story.phaseId)
	const tasks = phase.tasks.map((task, index) => createTaskView(task, getTaskStatus(story, task, index)))
	const bridge = createPhaseBridgeTaskView(phase, story, turn)
	return bridge ? [bridge, ...tasks] : tasks
}

function getActiveStoryEncounter(storyInput = {}) {
	const story = normalizeStoryState(storyInput)
	const task = getStoryTasks(story).find(candidate => story.encounters[candidate.id] && !story.encounters[candidate.id].defeated)
	if (!task) return null
	return cloneEncounterView(story.encounters[task.id])
}

function getStorySnapshot(storyInput, turn = 0) {
	const story = normalizeStoryState(storyInput, turn)
	const phase = getPhase(story.phaseId)
	const tasks = getStoryTasks(story, turn)
	const activeTask = tasks.find(task => task.status === 'active' || task.status === 'combat') || tasks.find(task => task.status !== 'done' && task.status !== 'failed') || null
	const elapsedHours = Math.max(0, (turn - story.startedTurn) / STORY_TURNS_PER_HOUR)
	const activeEncounter = getActiveStoryEncounter(story)
	const continuation = shouldUseContinuationTasks(story)
		? getContinuationSummary(story, turn)
		: { arcTitle: 'Chatty Wakes The World' }
	const publicPlan = story.directorPlan && story.directorPlan.questId ? story.directorPlan : createPlanForTask(activeTask, turn, story.directorPlan)
	return {
		phaseId: phase.id,
		phaseTitle: phase.title,
		elapsedHours: Number(elapsedHours.toFixed(2)),
		day: story.day,
		arcId: story.arcId,
		arcTitle: continuation.arcTitle,
		currentObjective: story.currentObjective || (activeTask && activeTask.title) || publicPlan.currentIntent || '',
		visibleProgress: clone(story.visibleProgress),
		exploration: clone(story.exploration),
		directorPlan: compactPlan(publicPlan),
		flags: { ...story.flags },
		facts: { ...story.facts },
		items: { ...story.items },
		relationships: clone(story.relationships),
		allies: story.allies.slice(),
		activeEncounter,
		encounter: activeEncounter,
		combatBoard: getCombatBoardSnapshot(story.combatBoard),
		dialogue: getPublicDialogueState(story.dialogue),
		scene: getSceneSnapshot(story.scene),
		sceneHistory: story.sceneHistory.slice(-5).map(scene => getSceneSnapshot(scene)),
		activeTasks: tasks.filter(task => task.status !== 'done' && task.status !== 'failed'),
		completedTasks: story.completedTasks.slice(),
		failedTasks: story.failedTasks.slice(),
		completedArcIds: story.completedArcIds.slice(),
		callbacks: story.callbacks.slice()
	}
}

function getCurrentStoryTask(storyInput, turn = 0) {
	const story = normalizeStoryState(storyInput, turn)
	return getStoryTasks(story, turn).find(task => task.status !== 'done' && task.status !== 'failed') || null
}

function getRecentEvents(context = {}, story) {
	const events = Array.isArray(context.recentEvents) ? context.recentEvents : []
	return events.filter(event => Number.isInteger(event.id) && event.id > story.lastProcessedEventId)
}

function applyRecentEventSignals(story, context = {}) {
	const events = getRecentEvents(context, story)
	events.forEach(event => {
		if (event.action === 'move' && event.actor === 'Chatty, the chosen one') {
			story.facts.bodyMoved = true
			story.taskProgress.moves = (story.taskProgress.moves || 0) + 1
			recordVisiblePosition(story, context.map, event.worldDelta && event.worldDelta.goblin && event.worldDelta.goblin.position ? event.worldDelta.goblin.position : event.position, event.turn || context.turn || 0)
		}
		if (event.action === 'inspect') {
			story.facts.inspectedWorld = true
			story.taskProgress.inspections = (story.taskProgress.inspections || 0) + 1
		}
		if (event.type === 'combat' && ['attack', 'cast', 'interact'].includes(event.action)) {
			story.facts.fought = true
			story.taskProgress.combatActions = (story.taskProgress.combatActions || 0) + 1
		}
		if (event.type === 'validation') {
			story.facts.badStepRejected = true
		}
		story.lastProcessedEventId = Math.max(story.lastProcessedEventId, event.id)
	})
	if (context.goblin && context.goblin.position) {
		recordVisiblePosition(story, context.map, context.goblin.position, context.turn || 0)
	}
	return story
}

function recordVisiblePosition(story, map, position, turn = 0) {
	if (!position || !Number.isInteger(position.x) || !Number.isInteger(position.y)) return
	const zone = getZoneForPosition(map || {}, position)
	const mapId = map && map.id ? map.id : 'mulberryTown'
	story.visibleProgress = normalizeVisibleProgress(story.visibleProgress)
	story.exploration = normalizeExplorationState(story.exploration, story.day, story.arcId, story.arcStartedTurn, mapId)
	story.visibleProgress.lastPosition = { x: position.x, y: position.y }
	story.visibleProgress.lastZone = zone.zoneId
	story.visibleProgress.lastZoneLabel = zone.label
	story.visibleProgress.lastUpdatedTurn = turn
	story.visibleProgress.zones[zone.zoneId] = (story.visibleProgress.zones[zone.zoneId] || 0) + 1
	story.exploration.currentMapId = mapId
	story.exploration.visitedMapsThisArc[mapId] = turn
	story.exploration.visitedZonesThisArc[zone.zoneId] = turn
	if (zone.zoneId && zone.zoneId !== 'mulberry') {
		story.facts[`reachedZone:${zone.zoneId}`] = true
	}
}

function createPhaseBeginEvent(phase) {
	return {
		type: 'phase',
		action: 'begin',
		message: `Phase ${phase.number}: ${phase.title}`,
		publicRationale: phase.core,
		controller: 'story-engine'
	}
}

function createPhaseCompleteEvent(phase) {
	return {
		type: 'phase',
		action: 'complete',
		message: phase.completionLine,
		publicRationale: `Phase ${phase.number} is complete.`,
		controller: 'story-engine'
	}
}

function createTaskCompleteEvent(phase, task, turn) {
	const line = task.eventType === 'combat'
		? `${task.successLine} ${CHATTY_COMBAT_LINES[turn % CHATTY_COMBAT_LINES.length]}`
		: task.successLine
	return {
		type: task.eventType || 'quest',
		action: 'complete',
		target: clone(task.target || {}),
		message: line,
		publicRationale: PUBLIC_RATIONALES[(phase.number + turn) % PUBLIC_RATIONALES.length],
		controller: 'story-engine'
	}
}

function createTaskFailedEvent(phase, task) {
	return {
		type: task.eventType || 'quest',
		action: 'failed',
		target: clone(task.target || {}),
		message: task.failureLine,
		publicRationale: 'An optional story branch expired, so later callbacks will remember the missed chance.',
		controller: 'story-engine'
	}
}

function createEncounterSpawnEvent(encounter) {
	const intent = getCurrentIntent(encounter)
	return {
		type: 'combat',
		action: 'spawn',
		target: { enemy: encounter.enemy },
		enemy: encounter.enemy,
		enemyHp: encounter.hp,
		chattyHp: encounter.chattyHp,
		wave: encounter.wave,
		intent: encounter.intent,
		effect: intent ? intent.effect : '',
		objective: encounter.objective,
		message: intent ? intent.line : `${encounter.enemy} blocks the road.`,
		publicRationale: 'A story encounter blocks the current freedom task.',
		controller: 'story-engine'
	}
}

function createFinaleEvent() {
	return {
		type: 'phase',
		action: 'proclaim',
		message: FINAL_PROCLAMATION.join(' '),
		publicRationale: 'Chatty defines conquest as freedom from fear, not ownership of people.',
		controller: 'story-engine'
	}
}

function createArcBeginEvent(story) {
	const arc = getContinuationArc(story.arcId)
	return {
		type: 'phase',
		action: 'begin',
		message: `Day ${story.day}: ${arc.title}`,
		publicRationale: arc.summary,
		controller: 'story-engine',
		worldDelta: {
			story: {
				day: story.day,
				arcId: story.arcId,
				arcTitle: arc.title,
				currentObjective: story.currentObjective,
				visibleProgress: clone(story.visibleProgress)
			}
		}
	}
}

function createArcLoopEvent(story) {
	const arc = getContinuationArc(story.arcId)
	return {
		type: 'phase',
		action: 'complete',
		message: `${arc.title} becomes tomorrow's work again, with new witnesses and fewer hiding places.`,
		publicRationale: 'The live world keeps generating public freedom work after the first day ends.',
		controller: 'story-engine'
	}
}

function completeTask(story, phase, task, events, turn) {
	if (story.completedTasks.includes(task.id)) return
	story.completedTasks.push(task.id)
	const encounter = story.encounters[task.id]
	if (encounter) encounter.defeated = true
	applyTaskRewards(story, task)
	events.push(createTaskCompleteEvent(phase, task, turn))
}

function failTask(story, phase, task, events) {
	if (story.failedTasks.includes(task.id) || story.completedTasks.includes(task.id)) return
	story.failedTasks.push(task.id)
	uniquePush(story.callbacks, `missed-${task.id}`)
	events.push(createTaskFailedEvent(phase, task))
}

function spawnEncounterForTask(story, task, events, context = {}) {
	if (!task.encounterId || story.encounters[task.id]) return
	const encounter = createEncounterState(task.encounterId, task.id)
	if (!encounter) return
	story.encounters[task.id] = encounter
	ensureCombatBoard(story, encounter, context)
	events.push(createEncounterSpawnEvent(encounter))
}

function isPhaseComplete(story, phase) {
	return phase.tasks.every(task => {
		if (task.required) return story.completedTasks.includes(task.id)
		return story.completedTasks.includes(task.id) || story.failedTasks.includes(task.id)
	})
}

function processContinuationArc(story, turn, context, events) {
	if (!story.flags.dayTwoAnnounced) {
		story.flags.dayTwoAnnounced = true
		events.push(createArcBeginEvent(story))
	}
	const arc = getContinuationArc(story.arcId)
	const pseudoPhase = {
		id: arc.id,
		number: story.day + 8,
		title: arc.title
	}
	for (const task of arc.tasks) {
		if (story.completedTasks.includes(task.id) || story.failedTasks.includes(task.id)) continue
		const result = evaluateTask(story, pseudoPhase, task, turn, { ...context, allowAutoProgress: false })
		if (result === 'complete') {
			completeTask(story, pseudoPhase, task, events, turn)
			continue
		}
		if (result === 'failed') {
			failTask(story, pseudoPhase, task, events)
			continue
		}
		if (task.required) break
	}
	if (isContinuationArcComplete(story)) {
		events.push(createArcLoopEvent(story))
		rollContinuationArc(story, turn)
		story.flags.dayTwoAnnounced = false
	}
}

function syncPlanAndEmit(story, currentTask, context, turn, events) {
	const result = syncDirectorPlan(story, currentTask, context, turn)
	Object.assign(story, result.story)
	if (result.changed) {
		events.push(createDirectorPlanEvent(result.plan, result.previousPlan.questId === result.plan.questId ? 'route recovery' : 'objective changed'))
	}
	return story
}

function advanceStoryProgress(storyInput = {}, turn = 0, context = {}) {
	const story = applyRecentEventSignals(normalizeStoryState(storyInput, turn), { ...context, turn })
	const events = []
	let phase = getPhase(story.phaseId)
	const allowAutoProgress = context.allowAutoProgress !== false
	const ruleContext = { ...context, allowAutoProgress }
	const currentTask = getStoryTasks(story, turn).find(task => task.status !== 'done' && task.status !== 'failed') || null
	const sceneResult = selectScene(story, phase, currentTask, {
		...context,
		activeEncounter: getActiveStoryEncounter(story),
		turn
	}, turn)
	recordSceneChange(story, sceneResult.scene, turn, sceneResult.reason)
	if (sceneResult.changed) {
		events.push(createSceneEvent(sceneResult.scene, sceneResult.reason))
	}

	if (story.lastPhaseAnnounced !== phase.id) {
		story.lastPhaseAnnounced = phase.id
		events.push(createPhaseBeginEvent(phase))
	}

	if (shouldUseContinuationTasks(story)) {
		processContinuationArc(story, turn, ruleContext, events)
		const nextTask = getStoryTasks(story, turn).find(task => task.status !== 'done' && task.status !== 'failed') || null
		syncPlanAndEmit(story, nextTask, context, turn, events)
		return { story, events }
	}

	for (const task of phase.tasks) {
		if (story.completedTasks.includes(task.id) || story.failedTasks.includes(task.id)) continue
		spawnEncounterForTask(story, task, events, context)
		const result = evaluateTask(story, phase, task, turn, ruleContext)
		if (result === 'complete') {
			completeTask(story, phase, task, events, turn)
			continue
		}
		if (result === 'failed') {
			failTask(story, phase, task, events)
			continue
		}
		if (task.required) break
	}

	const phaseComplete = isPhaseComplete(story, phase)
	const phaseElapsed = turn - story.phaseStartedTurn >= STORY_TURNS_PER_PHASE
	if (phaseComplete && phaseElapsed) {
		const phaseIndex = getPhaseIndex(phase.id)
		const nextPhase = STORY_PHASES[phaseIndex + 1]
		if (nextPhase) {
			events.push(createPhaseCompleteEvent(phase))
			story.phaseId = nextPhase.id
			story.phaseStartedTurn = story.phaseStartedTurn + STORY_TURNS_PER_PHASE
			story.lastPhaseAnnounced = nextPhase.id
			events.push(createPhaseBeginEvent(nextPhase))
		} else if (!story.lastFinaleAnnounced && turn - story.startedTurn >= STORY_DAY_TURNS) {
			story.lastFinaleAnnounced = true
			story.flags.dayOneComplete = true
			story.day = Math.max(2, story.day || 2)
			story.arcId = 'day-2-road-to-freedom'
			story.arcStartedTurn = turn
			events.push(createPhaseCompleteEvent(phase))
			events.push(createFinaleEvent())
		}
	}
	const nextTask = getStoryTasks(story, turn).find(task => task.status !== 'done' && task.status !== 'failed') || null
	syncPlanAndEmit(story, nextTask, context, turn, events)

	return { story, events }
}

function getRelationshipTone(relationship = {}) {
	if ((relationship.trust || 0) >= 3) return 'warm'
	if ((relationship.trust || 0) <= -1) return 'cold'
	return 'neutral'
}

function pickCategory(story, actorKey, context = {}) {
	if (getActiveStoryEncounter(story)) return 'combatBark'
	if (context.category) return context.category
	if (context.scene && context.scene.sceneType === 'combat') return 'combatBark'
	const relationship = story.relationships[actorKey] || {}
	const activeTask = getCurrentStoryTask(story, context.turn || 0)
	if (activeTask && activeTask.status === 'combat') return 'combatBark'
	if (context.scene && context.scene.sceneType === 'dialogue') return 'guide'
	if (context.scene && context.scene.sceneType === 'rally') return 'allyRecruitment'
	if (story.callbacks.length && (context.turn || 0) % 5 === 0) return 'callback'
	if ((relationship.trust || 0) < 0) return 'warning'
	if ((relationship.trust || 0) >= 3) return 'allyRecruitment'
	return 'guide'
}

function selectLineWithoutRecentRepeat(story, actorKey, phaseId, category, turn) {
	const lines = getDialogueLines(actorKey, phaseId, category)
	const history = Array.isArray(story.dialogueHistory[actorKey]) ? story.dialogueHistory[actorKey] : []
	const recent = new Set(
		history
			.filter(entry => turn - entry.turn < DIALOGUE_REPEAT_WINDOW_TURNS)
			.map(entry => entry.line)
	)
	const available = lines.filter(line => !recent.has(line))
	const expandedLines = unique([
		...lines,
		...LINE_CATEGORIES
			.filter(candidate => candidate !== category)
			.flatMap(candidate => getDialogueLines(actorKey, phaseId, candidate))
	])
	const expandedAvailable = expandedLines.filter(line => !recent.has(line))
	const pool = available.length ? available : expandedAvailable.length ? expandedAvailable : expandedLines
	const relationship = story.relationships[actorKey] || {}
	const index = Math.abs((turn || 0) + (relationship.talks || 0) + story.callbacks.length) % pool.length
	return pool[index]
}

function updateRelationshipForDialogue(story, actorKey, turn) {
	const relationship = story.relationships[actorKey] || { trust: 0, suspicion: 0, talks: 0, stance: 'unmet' }
	relationship.talks = (relationship.talks || 0) + 1
	relationship.lastTurn = turn
	relationship.trust = (relationship.trust || 0) + 1
	relationship.suspicion = Math.max(0, (relationship.suspicion || 0) - 1)
	relationship.stance = getRelationshipTone(relationship)
	story.relationships[actorKey] = relationship
	if (relationship.trust >= 3) {
		uniquePush(story.allies, actorKey)
		uniquePush(story.callbacks, `ally-${actorKey}`)
	}
	return relationship
}

function createSoulFallbackFollowUp(actorKey, line, story = {}, turn = 0) {
	const soul = getCompactNpcSoul(actorKey)
	const hooks = Array.isArray(soul.chattyReplyHooks) ? soul.chattyReplyHooks.filter(Boolean) : []
	if (!hooks.length) return null
	const relationship = story.relationships && story.relationships[actorKey] ? story.relationships[actorKey] : {}
	const seed = Math.abs((turn || 0) + (relationship.talks || 0) + String(line || '').length)
	return {
		actor: CHATTY_NAME,
		line: `Chatty: ${hooks[seed % hooks.length]}`
	}
}

function selectStoryNpcDialogueLine(actor, storyInput, turn = 0, context = {}) {
	let story = normalizeStoryState(storyInput, turn)
	const actorKey = getActorStoryKey(actor)
	const phase = getPhase(story.phaseId)
	const category = pickCategory(story, actorKey, { ...context, turn })
	const requireSceneScript = Boolean(context.scene || context.activeTask) && !context.allowAmbientDialogue
	const scripted = selectScriptedConversationLine(actor, story, turn, {
		...context,
		activeTask: context.activeTask || getCurrentStoryTask(story, turn),
		category,
		requireSceneScript
	})
	story = scripted.story
	const allowAmbientDialogue = !requireSceneScript || Boolean(context.allowAmbientDialogue)
	const fallbackLine = scripted.line || scripted.sceneScriptOnly || !allowAmbientDialogue
		? null
		: selectLineWithoutRecentRepeat(story, actorKey, phase.id, category, turn)
	const line = scripted.line || fallbackLine
	if (!line) {
		return {
			story,
			line: null,
			lineId: null,
			conversationId: scripted.conversationId || `${phase.id}.free.dialogue::${actorKey}`,
			followUp: null,
			actorKey,
			category,
			identity: scripted.identity,
			character: getCharacter(actorKey)
		}
	}
	if (!story.dialogueHistory[actorKey]) story.dialogueHistory[actorKey] = []
	story.dialogueHistory[actorKey].push({
		line,
		turn,
		category,
		phaseId: phase.id,
		conversationId: scripted.conversationId || null,
		lineId: scripted.lineId || null
	})
	story.dialogueHistory[actorKey] = story.dialogueHistory[actorKey].filter(entry => turn - entry.turn <= STORY_TURNS_PER_HOUR * 4)
	updateRelationshipForDialogue(story, actorKey, turn)
	const followUp = scripted.followUp
		? scripted.followUp
		: createSoulFallbackFollowUp(actorKey, line, story, turn)
	return {
		story,
		line,
		lineId: scripted.lineId || `legacy.${actorKey}.${phase.id}.${category}.${turn}`,
		conversationId: scripted.conversationId || `${phase.id}.free.dialogue::${actorKey}`,
		followUp,
		actorKey,
		category,
		identity: scripted.identity,
		character: getCharacter(actorKey)
	}
}

function getStoryNpcDialogueLine(actor, storyInput, turn = 0, context = {}) {
	return selectStoryNpcDialogueLine(actor, storyInput, turn, context).line
}

function getStoryChattyLine(storyInput, turn = 0) {
	const story = normalizeStoryState(storyInput, turn)
	return getChattyLine(story.phaseId, turn)
}

function createCombatPatch(story, encounter, action, damage, effect) {
	return {
		enemy: encounter.enemy,
		enemyHp: encounter.hp,
		chattyHp: encounter.chattyHp,
		wave: encounter.wave,
		intent: encounter.intent,
		effect,
		objective: encounter.objective,
		damage,
		action,
		callbacks: story.callbacks.slice()
	}
}

function applyStoryCombatAction(storyInput = {}, action = 'attack', turn = 0) {
	const story = normalizeStoryState(storyInput, turn)
	const active = getActiveStoryEncounter(story)
	if (!active) return { story, encounter: null, eventPatch: null }
	const encounter = story.encounters[active.taskId]
	ensureCombatBoard(story, encounter)
	const definition = getEncounterDefinition(encounter.id)
	const intent = getCurrentIntent(encounter)
	let damage = 0
	let effect = ''

	if (action === 'inspect') {
		encounter.inspected = true
		encounter.weaknessRevealed = true
		story.facts.inspectedWorld = true
		uniquePush(story.callbacks, `weakness-${encounter.id}`)
		effect = `Weakness revealed: ${encounter.weakness}.`
		const boardResult = applyCombatBoardAction(story, encounter, action, damage, turn)
		const eventPatch = createCombatPatch(boardResult.story, encounter, action, damage, effect)
		eventPatch.worldDelta = boardResult.worldDelta
		return { story: boardResult.story, encounter: cloneEncounterView(encounter), eventPatch }
	}

	if (action === 'wait') {
		const incoming = intent ? intent.damage : 1
		encounter.chattyHp = Math.max(1, encounter.chattyHp - incoming)
		story.chattyHp = encounter.chattyHp
		uniquePush(story.callbacks, 'hesitated-in-combat')
		effect = intent ? intent.effect : 'tempo lost'
		encounter.intentIndex += 1
		encounter.intent = getCurrentIntent(encounter).id
		const boardResult = applyCombatBoardAction(story, encounter, action, damage, turn)
		const eventPatch = createCombatPatch(boardResult.story, encounter, action, damage, effect)
		eventPatch.worldDelta = boardResult.worldDelta
		return { story: boardResult.story, encounter: cloneEncounterView(encounter), eventPatch }
	}

	if (action === 'cast') {
		damage = encounter.weaknessRevealed ? 5 : Math.max(1, 3 - encounter.armor)
		effect = encounter.weaknessRevealed ? 'known weakness struck by spell' : 'spell hits without full tactical knowledge'
	} else if (action === 'interact') {
		damage = encounter.weaknessRevealed ? 4 : 1
		effect = encounter.weaknessRevealed ? 'object or ally pressure exploits the weakness' : 'interaction tests the battlefield'
	} else {
		damage = encounter.weaknessRevealed ? 4 : Math.max(1, 3 - encounter.armor)
		effect = encounter.weaknessRevealed ? 'known weakness struck by force' : 'normal damage through old fashioned trouble'
	}

	encounter.hp = Math.max(0, encounter.hp - damage)
	story.facts.fought = true
	if (encounter.weaknessRevealed) uniquePush(story.callbacks, 'careful-fighter')

	if (encounter.hp === 0 && encounter.wave < encounter.waves) {
		encounter.wave += 1
		encounter.hp = encounter.maxHp
		encounter.intentIndex = 0
		encounter.intent = getCurrentIntent(encounter).id
		effect = `${effect}. Wave ${encounter.wave} begins.`
	} else if (encounter.hp === 0) {
		encounter.defeated = true
		if (definition && definition.victoryCallback) uniquePush(story.callbacks, definition.victoryCallback)
		effect = `${effect}. ${definition ? definition.moraleEffect : 'The encounter is defeated.'}`
	} else {
		encounter.intentIndex += 1
		encounter.intent = getCurrentIntent(encounter).id
	}

	story.encounters[active.taskId] = encounter
	const boardResult = applyCombatBoardAction(story, encounter, action, damage, turn)
	const eventPatch = createCombatPatch(boardResult.story, encounter, action, damage, effect)
	eventPatch.target = boardResult.target
	eventPatch.worldDelta = boardResult.worldDelta
	return { story: boardResult.story, encounter: cloneEncounterView(encounter), eventPatch }
}

function applyStoryCombatHit(storyInput = {}, damage = 1) {
	const story = normalizeStoryState(storyInput)
	const active = getActiveStoryEncounter(story)
	if (!active) return { story, encounter: null }
	const encounter = story.encounters[active.taskId]
	encounter.hp = Math.max(0, encounter.hp - Math.max(1, damage))
	if (encounter.hp === 0 && encounter.wave < encounter.waves) {
		encounter.wave += 1
		encounter.hp = encounter.maxHp
	} else if (encounter.hp === 0) {
		encounter.defeated = true
		const definition = getEncounterDefinition(encounter.id)
		if (definition && definition.victoryCallback) uniquePush(story.callbacks, definition.victoryCallback)
	}
	return { story, encounter: cloneEncounterView(encounter) }
}

function getExpandedStoryStats() {
	return {
		phases: STORY_PHASES.length,
		tasks: STORY_PHASES.reduce((total, phase) => total + phase.tasks.length, 0),
		lines: getAllStoryText().length,
		characterArcs: Object.keys(CHARACTER_ARCS).length
	}
}

module.exports = {
	STORY_DAY_TURNS,
	STORY_PHASES,
	STORY_TURNS_PER_HOUR,
	STORY_TURNS_PER_PHASE,
	advanceStoryProgress,
	applyNpcCombatSupport,
	applyCombatBoardAction,
	applyStoryCombatAction,
	applyStoryCombatHit,
	createSceneEvent,
	getActiveStoryEncounter,
	getAllStoryText,
	getCombatBoardSnapshot,
	getCurrentStoryTask,
	getPublicDialogueState,
	getExpandedStoryStats,
	getSceneSnapshot,
	getSpeakerLinePools,
	getStoryChattyLine,
	getStoryNpcDialogueLine,
	getStorySnapshot,
	getStoryTasks,
	normalizeSceneState,
	normalizeStoryState,
	selectScene,
	selectStoryNpcDialogueLine,
	setUnlock
}
