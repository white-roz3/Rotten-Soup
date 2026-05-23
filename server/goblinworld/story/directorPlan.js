const { getZoneLabel, inferZoneFromText } = require('./worldZones')

const RECOVERY_ZONES = [
	'tavern',
	'market',
	'town-square',
	'hidden-camp',
	'under-road',
	'armory',
	'mayor-house',
	'forest-edge'
]
const MAX_RECOVERY_FAILURES = 3
const CONVERSATION_TARGET_KINDS = new Set([
	'dialogue',
	'rumor',
	'ally',
	'speech',
	'goal',
	'choice',
	'ideology'
])

function clone(value) {
	return JSON.parse(JSON.stringify(value))
}

function normalizePlan(input = {}, turn = 0) {
	const plan = input && typeof input === 'object' ? input : {}
	return {
		questId: plan.questId || null,
		currentIntent: plan.currentIntent || 'Scout for the next useful lead',
		targetName: plan.targetName || '',
		targetZone: plan.targetZone || '',
		targetMapId: plan.targetMapId || '',
		finalTargetMapId: plan.finalTargetMapId || plan.targetMapId || '',
		nextMapId: plan.nextMapId || '',
		mapRoute: Array.isArray(plan.mapRoute) ? plan.mapRoute.slice(0, 10) : [],
		targetPortal: plan.targetPortal || null,
		targetActorId: plan.targetActorId || null,
		targetWaypoint: plan.targetWaypoint || null,
		plannedSteps: Array.isArray(plan.plannedSteps) ? plan.plannedSteps.slice(0, 5) : [],
		currentStepIndex: Number.isInteger(plan.currentStepIndex) ? plan.currentStepIndex : 0,
		currentStep: plan.currentStep || '',
		routeStatus: plan.routeStatus || 'idle',
		nextAction: plan.nextAction || '',
		lastProgressTurn: Number.isInteger(plan.lastProgressTurn) ? plan.lastProgressTurn : turn,
		status: plan.status || 'idle',
		failureCount: Number.isInteger(plan.failureCount) ? plan.failureCount : 0,
		timeoutTurn: Number.isInteger(plan.timeoutTurn) ? plan.timeoutTurn : turn + 80,
		startedTurn: Number.isInteger(plan.startedTurn) ? plan.startedTurn : turn,
		updatedTurn: Number.isInteger(plan.updatedTurn) ? plan.updatedTurn : turn,
		lastPositionKey: plan.lastPositionKey || '',
		repeatedPositionTurns: Number.isInteger(plan.repeatedPositionTurns) ? plan.repeatedPositionTurns : 0,
		recoveryIndex: Number.isInteger(plan.recoveryIndex) ? plan.recoveryIndex : 0
	}
}

function compactPlan(planInput = {}) {
	const plan = normalizePlan(planInput)
	return {
		questId: plan.questId,
		currentIntent: plan.currentIntent,
		targetName: plan.targetName,
		targetZone: plan.targetZone,
		targetMapId: plan.targetMapId,
		finalTargetMapId: plan.finalTargetMapId,
		nextMapId: plan.nextMapId,
		mapRoute: plan.mapRoute.slice(),
		targetPortal: plan.targetPortal,
		targetActorId: plan.targetActorId,
		targetWaypoint: plan.targetWaypoint,
		plannedSteps: plan.plannedSteps.slice(),
		currentStepIndex: plan.currentStepIndex,
		currentStep: plan.currentStep || plan.plannedSteps[plan.currentStepIndex] || plan.plannedSteps[0] || '',
		routeStatus: plan.routeStatus,
		nextAction: plan.nextAction,
		lastProgressTurn: plan.lastProgressTurn,
		status: plan.status,
		failureCount: plan.failureCount,
		timeoutTurn: plan.timeoutTurn,
		startedTurn: plan.startedTurn,
		updatedTurn: plan.updatedTurn
	}
}

function targetText(task = {}) {
	const target = task.target || {}
	return `${target.zone || ''} ${target.name || ''} ${target.dialog || ''} ${target.enemy || ''} ${target.kind || ''} ${task.title || ''}`
}

function inferTargetZone(task = {}) {
	const target = task.target || {}
	return target.zone || inferZoneFromText(targetText(task)) || 'mulberry'
}

function inferTargetMapId(task = {}) {
	return task && task.target && task.target.mapId ? task.target.mapId : ''
}

function inferTargetName(task = {}) {
	const target = task.target || {}
	if (target.name) return target.name
	if (target.enemy) return target.enemy
	if (target.dialog === 'BARTENDER') return 'Bartender'
	if (target.dialog === 'MAYOR_LEONARD') return 'Mayor Leonard'
	if (target.dialog === 'DWARF_BILI') return 'Dwarf Bili'
	if (target.dialog === 'STONE_GUARD') return 'Stone Guard'
	return getZoneLabel(inferTargetZone(task))
}

function intentForTask(task = {}) {
	const kind = task.target && task.target.kind
	if (kind === 'dialogue' || kind === 'rumor') return `Speak with ${inferTargetName(task)}`
	if (kind === 'combat') return `Defeat ${inferTargetName(task)}`
	if (kind === 'inspect') return `Inspect ${inferTargetName(task)}`
	if (kind === 'item') return `Recover ${inferTargetName(task)}`
	if (kind === 'ally') return `Recruit ${inferTargetName(task)}`
	if (kind === 'speech' || kind === 'goal' || kind === 'choice' || kind === 'ideology') return `Make ${task.title || 'the choice'} public`
	if (kind === 'place' || kind === 'route' || kind === 'zone') return `Reach ${getZoneLabel(inferTargetZone(task))}`
	if (kind === 'self') return 'Test the goblin body'
	return task.title || 'Follow the next story lead'
}

function stepsForTask(task = {}) {
	const targetName = inferTargetName(task)
	const zone = inferTargetZone(task)
	const kind = task.target && task.target.kind
	const steps = [`Travel toward ${targetName || getZoneLabel(zone)}`]
	if (kind === 'dialogue' || kind === 'rumor') steps.push('Stop beside the right voice', 'Listen for the next lead')
	else if (kind === 'combat') steps.push('Inspect the threat', 'Attack until the route is clear')
	else if (kind === 'inspect') steps.push('Use inspect at the clue', 'Carry the clue into the next quest')
	else if (kind === 'item') steps.push('Pick up the object', 'Confirm it changed the story')
	else steps.push('Act at the objective', 'Watch for the quest completion')
	return steps
}

function createPlanForTask(task, turn = 0, previous = {}) {
	if (!task) {
		return normalizePlan({
			currentIntent: 'Scout for the next useful lead',
			targetName: 'fresh ground',
			targetZone: 'mulberry',
			status: 'scouting',
			startedTurn: turn,
			updatedTurn: turn,
			timeoutTurn: turn + 80
		}, turn)
	}
	const previousFailureCount = previous.questId === task.id ? previous.failureCount : 0
	return normalizePlan({
		questId: task.id,
		currentIntent: intentForTask(task),
		targetName: inferTargetName(task),
		targetZone: inferTargetZone(task),
		targetMapId: inferTargetMapId(task),
		finalTargetMapId: inferTargetMapId(task),
		nextMapId: '',
		mapRoute: [],
		targetPortal: null,
		targetActorId: null,
		plannedSteps: stepsForTask(task),
		currentStepIndex: 0,
		currentStep: stepsForTask(task)[0],
		routeStatus: 'planning',
		nextAction: 'move',
		lastProgressTurn: turn,
		status: 'active',
		failureCount: previousFailureCount,
		startedTurn: turn,
		updatedTurn: turn,
		timeoutTurn: turn + 80,
		recoveryIndex: previous.questId === task.id ? previous.recoveryIndex : 0
	}, turn)
}

function isConversationTask(task = {}) {
	const kind = task.target && task.target.kind
	return CONVERSATION_TARGET_KINDS.has(kind)
}

function positionKey(position) {
	if (!position || !Number.isInteger(position.x) || !Number.isInteger(position.y)) return ''
	return `${position.x},${position.y}`
}

function recoverPlan(plan, turn = 0) {
	let nextIndex = (plan.recoveryIndex + 1) % RECOVERY_ZONES.length
	if (RECOVERY_ZONES[nextIndex] === plan.targetZone) {
		nextIndex = (nextIndex + 1) % RECOVERY_ZONES.length
	}
	const targetZone = RECOVERY_ZONES[nextIndex]
	return normalizePlan({
		...plan,
		currentIntent: `Break the route loop toward ${getZoneLabel(targetZone)}`,
		targetName: getZoneLabel(targetZone),
		targetZone,
		targetMapId: '',
		targetPortal: null,
		targetWaypoint: null,
		status: 'recovering',
		routeStatus: 'recovering',
		nextAction: 'move',
		failureCount: plan.failureCount + 1,
		recoveryIndex: nextIndex,
		repeatedPositionTurns: 0,
		timeoutTurn: turn + 50,
		updatedTurn: turn
	}, turn)
}

function syncDirectorPlan(story = {}, currentTask = null, context = {}, turn = 0) {
	const previous = normalizePlan(story.directorPlan || {}, turn)
	let plan = previous
	let changed = false
	let forcedTaskPlan = false
	if (!previous.questId && currentTask || currentTask && previous.questId !== currentTask.id) {
		plan = createPlanForTask(currentTask, turn, previous)
		changed = true
		forcedTaskPlan = true
	} else if (currentTask && isConversationTask(currentTask) && previous.status === 'recovering') {
		plan = createPlanForTask(currentTask, turn, { ...previous, questId: null, failureCount: previous.failureCount })
		changed = true
		forcedTaskPlan = true
	} else if (currentTask && previous.status === 'recovering' && (previous.failureCount || 0) > MAX_RECOVERY_FAILURES) {
		plan = createPlanForTask(currentTask, turn, { ...previous, questId: null, failureCount: 0, recoveryIndex: 0 })
		changed = true
		forcedTaskPlan = true
	} else if (!currentTask && previous.status === 'idle') {
		plan = createPlanForTask(null, turn, previous)
		changed = true
		forcedTaskPlan = true
	}

	const key = positionKey(context.goblin && context.goblin.position)
	if (key) {
		plan.repeatedPositionTurns = key === previous.lastPositionKey ? previous.repeatedPositionTurns + 1 : 0
		plan.lastPositionKey = key
	}
	if (!forcedTaskPlan && isConversationTask(currentTask) && (plan.repeatedPositionTurns >= 6 || turn >= plan.timeoutTurn)) {
		plan = createPlanForTask(currentTask, turn, { ...previous, questId: null, failureCount: previous.failureCount + 1, recoveryIndex: previous.recoveryIndex })
		changed = true
	} else if (!forcedTaskPlan && currentTask && inferTargetMapId(currentTask) && (plan.repeatedPositionTurns >= 6 || turn >= plan.timeoutTurn)) {
		plan = createPlanForTask(currentTask, turn, { ...previous, questId: null, failureCount: previous.failureCount + 1, recoveryIndex: previous.recoveryIndex })
		changed = true
	} else if (!forcedTaskPlan && (plan.repeatedPositionTurns >= 6 || turn >= plan.timeoutTurn)) {
		plan = recoverPlan(plan, turn)
		changed = true
	} else {
		plan.updatedTurn = turn
	}

	const currentObjective = currentTask ? currentTask.title : plan.currentIntent
	return {
		story: {
			...story,
			directorPlan: plan,
			currentObjective
		},
		plan,
		changed,
		previousPlan: previous
	}
}

function createDirectorPlanEvent(planInput = {}, reason = 'objective changed') {
	const plan = normalizePlan(planInput)
	const target = plan.targetName || getZoneLabel(plan.targetZone)
	return {
		type: 'quest',
		action: 'objective',
		actor: 'GoblinWorld',
		target: {
			questId: plan.questId,
			zone: plan.targetZone,
			name: target
		},
		message: `Next lead: ${target}. ${plan.currentIntent}.`,
		publicRationale: reason,
		controller: 'director-plan',
		worldDelta: {
			story: {
				directorPlan: compactPlan(plan),
				currentObjective: plan.currentIntent
			}
		}
	}
}

module.exports = {
	compactPlan,
	createDirectorPlanEvent,
	createPlanForTask,
	inferTargetZone,
	normalizePlan,
	syncDirectorPlan
}
