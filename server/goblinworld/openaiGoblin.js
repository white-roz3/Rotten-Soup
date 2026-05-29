const { DEFAULT_GOBLIN_ACTIONS, GOBLIN_DECISION_SCHEMA, validateGoblinDecision } = require('./actionSchema')
const navigation = require('./navigation')
const { samePosition, distance, getCurrentTask, getRecentGoblinPositions, getAdjacentWalkableTiles } = navigation
const { getActorStoryKey, getCompactNpcSoul } = require('./story')
const { getChattyFallbackNarration } = require('./story/sceneScripts')
const {
	DEFAULT_RECOVERY_BACKOFF_MS,
	getBudgetState,
	recordModelRequest,
	recordModelFailure,
	recordModelUsage,
	getBudgetLimits,
	isBudgetExceeded,
	getBackoffKey,
	callAnthropicModel
} = require('./anthropicClient')

const DEFAULT_INTERVAL_MS = 3000
const DEFAULT_DIALOGUE_HOLD_TURNS = 4
const DEFAULT_DIALOGUE_ACTOR_RADIUS = 6
const DEFAULT_AI_MODE = 'hybrid'
const DEFAULT_MODEL_DIRECTOR_INTERVAL_MS = 45000
const DEFAULT_MODEL_MIN_INTERVAL_MS = 30000
const DEFAULT_PROVIDER = 'anthropic'
const DEFAULT_ANTHROPIC_MODEL = 'claude-haiku-4-5'
const DEFAULT_OPENAI_MODEL = 'gpt-5.5'
const ANTHROPIC_DECISION_TOOL = 'choose_goblin_action'
const CHATTY_NAME = 'Chatty, the chosen one'
const MODEL_SYSTEM_INSTRUCTIONS = [
	'You are a model embodied as a small cloaked goblin in GoblinWorld.',
	'Choose one legal action and expose only public rationale plus in-character speech, never hidden chain-of-thought.',
	'Use nearbyActors[].soul guidance whenever a nearby NPC is involved: preserve that NPCs distinct personality, speech patterns, fears, relationship to Chatty, and quest role.',
	'Make goblin_utterance a short Chatty thought or back-and-forth Chatty reply that answers the current NPC or scene. It must not be random filler, debug text, or generic listening.'
].join(' ')
const INTERACTION_RADIUS = 1
const MAX_RECOVERY_FAILURES = 3
const DIALOGUE_TARGET_KINDS = new Set(['dialogue', 'rumor', 'ally', 'ideology', 'speech', 'goal', 'choice'])
const DECORATIVE_DIALOG_NAMES = new Set(['bar', 'counter', 'table', 'chair', 'bench', 'bed', 'sign', 'chest', 'door'])

function getVisibleWorldSummary(snapshot) {
	const { goblin, map, turn } = snapshot
	const position = goblin.position
	const story = snapshot.story || {}
	const currentTask = getCurrentTask(snapshot)
	return {
		turn,
		controller: snapshot.controller,
		location: {
			map: map.name,
			x: position.x,
			y: position.y
		},
		goal: goblin.goal,
		health: goblin.hp,
		story: {
			phaseId: story.phaseId,
			phaseTitle: story.phaseTitle,
			day: story.day,
			arcId: story.arcId,
			currentObjective: story.currentObjective,
			directorPlan: story.directorPlan ? compactPlanForModel(story.directorPlan) : null,
			elapsedHours: story.elapsedHours,
			scene: story.scene ? compactSceneForModel(story.scene) : null,
			navigation: story.navigation ? compactNavigationForModel(story.navigation) : compactNavigationForModel(navigation.getNavigationSnapshot(snapshot)),
			activeEncounter: story.activeEncounter || story.encounter || null,
			facts: compactStoryKeys(story.facts),
			items: compactStoryKeys(story.items),
			allies: Array.isArray(story.allies) ? story.allies.slice(-5) : [],
			callbacks: Array.isArray(story.callbacks) ? story.callbacks.slice(-5) : []
		},
		currentTask: currentTask ? compactTaskForModel(currentTask) : null,
		activeTasks: (snapshot.tasks || [])
			.filter(task => task.status === 'active' || task.status === 'combat')
			.slice(0, 3)
			.map(compactTaskForModel),
		recentGoblinPositions: getRecentGoblinPositions(snapshot, 10),
		recentEvents: getRecentPublicEvents(snapshot, 3),
		legalActions: snapshot.legalActions,
		legalMoves: snapshot.legalMoves,
		nearbyActors: (snapshot.nearbyActors || []).slice(0, 8).map(actor => ({
			id: actor.id,
			name: actor.name,
			entityType: actor.entityType,
			dialog: actor.dialog,
			spriteKey: actor.spriteKey,
			soul: actor.entityType === 'NPC' ? getCompactNpcSoul(getActorStoryKey(actor)) : null,
			x: actor.x,
			y: actor.y
		})),
		navigation: {
			width: map.width,
			height: map.height,
			nearbyActorCount: (snapshot.nearbyActors || []).length
		}
	}
}

function compactPlanForModel(plan) {
	return {
		questId: plan.questId,
		currentIntent: plan.currentIntent,
		targetName: plan.targetName,
		targetZone: plan.targetZone,
		targetWaypoint: plan.targetWaypoint || null,
		currentStep: plan.currentStep || '',
		routeStatus: plan.routeStatus || '',
		nextAction: plan.nextAction || '',
		status: plan.status,
		failureCount: plan.failureCount
	}
}

function compactStoryKeys(value) {
	if (Array.isArray(value)) return value.slice(-5)
	if (!value || typeof value !== 'object') return []
	return Object.entries(value)
		.filter(([, enabled]) => Boolean(enabled))
		.map(([key]) => key)
		.slice(-5)
}

function compactSceneForModel(scene) {
	return {
		sceneId: scene.sceneId,
		sceneType: scene.sceneType,
		phaseId: scene.phaseId,
		questId: scene.questId,
		locationZone: scene.locationZone,
		title: scene.title,
		summary: scene.summary,
		participants: Array.isArray(scene.participants) ? scene.participants.slice(0, 6) : [],
		beats: Array.isArray(scene.beats) ? scene.beats.slice(0, 4) : []
	}
}

function compactNavigationForModel(route) {
	if (!route) return null
	return {
		mode: route.mode,
		questId: route.questId,
		targetTitle: route.targetTitle,
		targetZone: route.targetZone,
		targetMapId: route.targetMapId,
		targetPortal: route.targetPortal
			? {
				portalId: route.targetPortal.portalId,
				targetMapId: route.targetPortal.targetMapId
			}
			: null,
		targetActorId: route.targetActorId,
		targetActorName: route.targetActorName,
		targetReason: route.targetReason,
		nextStep: route.nextStep,
		distance: route.distance,
		routeStatus: route.routeStatus,
		nextWaypoint: route.nextWaypoint,
		unreachableReason: route.unreachableReason,
		reached: Boolean(route.reached),
		stuck: Boolean(route.stuck)
	}
}

function compactTaskForModel(task) {
	return {
		id: task.id,
		phaseId: task.phaseId,
		title: task.title,
		status: task.status,
		target: task.target,
		hint: task.hint,
		required: task.required
	}
}

function getRecentPublicEvents(snapshot, limit = 3) {
	const events = Array.isArray(snapshot.events) ? snapshot.events : []
	return events.slice(-limit).map(event => ({
		turn: event.turn,
		type: event.type,
		actor: event.actor,
		action: event.action,
		message: event.message
	}))
}

function hasOwn(object, key) {
	return Object.prototype.hasOwnProperty.call(object, key)
}

function normalizeProvider(provider) {
	return provider === 'openai' ? 'openai' : 'anthropic'
}

function getModelProvider(options = {}) {
	return normalizeProvider(options.provider || process.env.GOBLINWORLD_MODEL_PROVIDER || DEFAULT_PROVIDER)
}

function getProviderApiKey(provider, options = {}) {
	if (provider === 'openai') {
		if (hasOwn(options, 'openAIApiKey')) return options.openAIApiKey
		if (hasOwn(options, 'apiKey')) return options.apiKey
		return process.env.OPENAI_API_KEY
	}

	if (hasOwn(options, 'anthropicApiKey')) return options.anthropicApiKey
	if (hasOwn(options, 'apiKey')) return options.apiKey
	return process.env.ANTHROPIC_API_KEY
}

function getProviderModel(provider, options = {}) {
	if (provider === 'openai') {
		return options.model || process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL
	}
	return options.model || process.env.ANTHROPIC_MODEL || process.env.CLAUDE_MODEL || DEFAULT_ANTHROPIC_MODEL
}

function getAiMode(options = {}) {
	const mode = String(options.aiMode || process.env.GOBLINWORLD_AI_MODE || DEFAULT_AI_MODE).toLowerCase()
	if (mode === 'fallback') return 'fallback'
	if (mode === 'direct' || mode === 'provider') return 'direct'
	return 'hybrid'
}

function getControllerState(options = {}) {
	if (!options.__controllerState) options.__controllerState = {}
	return options.__controllerState
}

function getPublicBudgetSnapshot(options = {}) {
	const budget = getBudgetState(options)
	const limits = getBudgetLimits(options)
	return {
		dayKey: budget.dayKey,
		requestCount: budget.requestCount,
		inputTokens: budget.inputTokens,
		outputTokens: budget.outputTokens,
		failures: budget.failures,
		requestCap: limits.requestCap,
		inputTokenCap: limits.inputTokenCap,
		outputTokenCap: limits.outputTokenCap
	}
}

function getTurnIntervalMs(options = {}) {
	return getNumericOption(options, 'intervalMs', 'GOBLINWORLD_TURN_INTERVAL_MS', DEFAULT_INTERVAL_MS) || DEFAULT_INTERVAL_MS
}

function getModelDirectorIntervalMs(options = {}) {
	return getNumericOption(options, 'modelDirectorIntervalMs', 'GOBLINWORLD_MODEL_DIRECTOR_INTERVAL_MS', DEFAULT_MODEL_DIRECTOR_INTERVAL_MS)
}

function getModelMinIntervalMs(options = {}) {
	return getNumericOption(options, 'modelMinIntervalMs', 'GOBLINWORLD_MODEL_MIN_INTERVAL_MS', DEFAULT_MODEL_MIN_INTERVAL_MS)
}

function getDirectorTurnGap(options = {}) {
	return Math.max(1, Math.ceil(getModelDirectorIntervalMs(options) / getTurnIntervalMs(options)))
}

function getMinTurnGap(options = {}) {
	return Math.max(1, Math.ceil(getModelMinIntervalMs(options) / getTurnIntervalMs(options)))
}

function recordSuccessfulModelCall(snapshot, options = {}) {
	const state = getControllerState(options)
	const currentTask = getCurrentTask(snapshot)
	state.lastModelTurn = snapshot.turn
	state.lastModelTaskId = currentTask ? currentTask.id : null
	state.lastModelAt = Date.now()
}

function getControllerStatus(options = {}) {
	const provider = getModelProvider(options)
	const configured = Boolean(getProviderApiKey(provider, options))
	const state = getControllerState(options)
	const aiMode = getAiMode(options)
	const backoffKey = getBackoffKey(provider)
	const inBackoff = Boolean(options[backoffKey] && Date.now() < options[backoffKey])
	const budgetExceeded = configured && isBudgetExceeded(options)
	const mode = !configured
		? 'fallback'
		: budgetExceeded
			? 'budget-fallback'
			: inBackoff
				? 'recovery'
				: aiMode === 'fallback'
					? 'fallback'
					: aiMode === 'hybrid'
					? 'hybrid'
					: provider
	return {
		mode,
		provider,
		configured,
		model: getProviderModel(provider, options),
		budgetMode: budgetExceeded ? 'capped' : 'tracking',
		budget: getPublicBudgetSnapshot(options),
		lastModelTurn: Number.isInteger(state.lastModelTurn) ? state.lastModelTurn : null,
		nextEligibleModelTurn: Number.isInteger(state.lastModelTurn) ? state.lastModelTurn + getDirectorTurnGap(options) : null
	}
}

function hasModelController(options = {}) {
	return getControllerStatus(options).configured
}

function extractResponseText(responseJson) {
	if (typeof responseJson.output_text === 'string') return responseJson.output_text
	if (!Array.isArray(responseJson.output)) return ''

	const textParts = []
	responseJson.output.forEach(item => {
		if (!Array.isArray(item.content)) return
		item.content.forEach(content => {
			if (typeof content.text === 'string') textParts.push(content.text)
		})
	})
	return textParts.join('\n')
}

function extractAnthropicDecision(responseJson) {
	if (!Array.isArray(responseJson.content)) return null
	const toolUse = responseJson.content.find(item => item.type === 'tool_use' && item.name === ANTHROPIC_DECISION_TOOL)
	if (toolUse && toolUse.input) return toolUse.input

	const text = responseJson.content
		.filter(item => item.type === 'text' && typeof item.text === 'string')
		.map(item => item.text)
		.join('\n')
		.trim()
	return text ? JSON.parse(text) : null
}

function getDialogueActors(snapshot) {
	return ((snapshot.map && snapshot.map.actors) || []).filter(actor => {
		const entityType = String(actor.entityType || '').toUpperCase()
		const name = String(actor.name || '').toLowerCase()
		if (DECORATIVE_DIALOG_NAMES.has(name)) return false
		return entityType === 'NPC' || Boolean(actor.dialog)
	})
}

function actorText(actor) {
	return `${actor.name || ''} ${actor.dialog || ''} ${actor.spriteKey || ''}`.toLowerCase()
}

function actorMatchesName(actor, name) {
	const target = String(name || '').toLowerCase()
	const text = actorText(actor)
	if (!target) return false
	if (target === 'tavern-or-mayor') return actor.dialog === 'BARTENDER' || actor.dialog === 'MAYOR_LEONARD'
	if (target.includes('bartender')) return actor.dialog === 'BARTENDER' || text.includes('bartender')
	if (target.includes('mayor') || target.includes('leonard')) return actor.dialog === 'MAYOR_LEONARD' || text.includes('mayor') || text.includes('leonard')
	if (target.includes('dwarf') || target.includes('bili')) return actor.dialog === 'DWARF_BILI' || text.includes('dwarf') || text.includes('bili')
	if (target.includes('stone') || target.includes('guard')) return text.includes('stone') || text.includes('guard') || actor.spriteKey === 'stoneGuard'
	if (target.includes('forest') || target.includes('wander')) return text.includes('forest') || text.includes('wander') || actor.spriteKey === 'forestWanderer'
	if (target.includes('lantern')) return text.includes('lantern') || actor.spriteKey === 'lanternKeeper'
	if (target.includes('market') || target.includes('trader')) return text.includes('market') || text.includes('trader') || actor.spriteKey === 'marketTrader'
	if (target.includes('hood')) return text.includes('hood') || actor.spriteKey === 'hoodedVillager'
	if (target.includes('goblin')) return text.includes('goblin') || ['nib', 'muck', 'skrit'].some(part => text.includes(part))
	return text.includes(target)
}

function getActorDisplayName(actor) {
	if (!actor) return 'nearby voice'
	if (actor.name && actor.name !== 'NPC') return actor.name
	if (actor.dialog === 'BARTENDER') return 'Bartender'
	if (actor.dialog === 'MAYOR_LEONARD') return 'Mayor Leonard'
	if (actor.dialog === 'DWARF_BILI') return 'Dwarf Bili'
	if (actor.dialog === 'STONE_GUARD') return 'Stone Guard'
	if (actor.spriteKey === 'marketTrader') return 'Market Trader'
	if (actor.spriteKey === 'forestWanderer') return 'Forest Wanderer'
	if (actor.spriteKey === 'lanternKeeper') return 'Lantern Keeper'
	return actor.name || 'nearby voice'
}

function getTaskActors(snapshot, task) {
	const target = (task && task.target) || {}
	const actors = getDialogueActors(snapshot)
	let matches = []
	if (target.dialog) {
		matches = actors.filter(actor => actor.dialog === target.dialog)
	}
	if (!matches.length && target.name) {
		matches = actors.filter(actor => actorMatchesName(actor, target.name))
	}
	if (!matches.length && !target.dialog && !target.name && ['dialogue', 'rumor', 'ally', 'ideology', 'speech', 'goal', 'choice'].includes(target.kind)) {
		matches = actors
	}
	const goblin = snapshot.goblin.position
	return matches.slice().sort((a, b) => distance(goblin, a) - distance(goblin, b))
}

function getNearbyDialogueActor(snapshot, task) {
	const goblin = snapshot.goblin.position
	const taskActors = getTaskActors(snapshot, task)
	const candidates = taskActors.length ? taskActors : getDialogueActors(snapshot)
	return candidates
		.filter(actor => distance(goblin, actor) <= INTERACTION_RADIUS)
		.sort((a, b) => distance(goblin, a) - distance(goblin, b))[0]
}

function getTaskDestinations(snapshot, task) {
	return getTaskActors(snapshot, task)
		.flatMap(actor => getAdjacentWalkableTiles(snapshot, actor))
		.filter((position, index, list) => list.findIndex(candidate => samePosition(candidate, position)) === index)
}

function getCombatFallbackDecision(snapshot, encounter, overrides = {}) {
	const shouldInspect = !encounter.weaknessRevealed && !encounter.inspected
	const action = shouldInspect ? 'inspect' : (snapshot.turn % 3 === 0 ? 'cast' : 'attack')
	const enemy = encounter.enemy || 'the thing blocking the road'
	return {
		action,
		target: { enemy },
		publicRationale: overrides.publicRationale || (shouldInspect
			? `The current quest is blocked by ${enemy}, so Chatty studies it before swinging.`
			: `The current quest is blocked by ${enemy}, so Chatty presses the fight instead of pacing.`),
		goblinUtterance: overrides.goblinUtterance || (shouldInspect
			? `${enemy}, show me the weak bit.`
			: `No more circle walking. ${enemy} gets handled.`),
		memoryUpdate: overrides.memoryUpdate || `Turn ${snapshot.turn}: fallback combat chose ${action} against ${enemy}.`,
		controller: overrides.controller || 'fallback'
	}
}

function getDirectTaskDecision(snapshot, task, overrides = {}) {
	if (!task) return null
	const target = task.target || {}
	if (target.kind === 'inspect') {
		return {
			action: 'inspect',
			target: { name: target.name || task.title },
			publicRationale: overrides.publicRationale || `The quest asks for inspection, so Chatty studies ${target.name || 'the clue'} instead of pacing.`,
			goblinUtterance: overrides.goblinUtterance || 'I look with my actual goblin eyes.',
			memoryUpdate: overrides.memoryUpdate || `Turn ${snapshot.turn}: fallback inspected ${target.name || task.id}.`,
			controller: overrides.controller || 'fallback'
		}
	}
	const shouldUseNearbyVoice = Boolean(target.dialog || target.actorId || DIALOGUE_TARGET_KINDS.has(target.kind))
	if (!shouldUseNearbyVoice) return null
	const actor = getNearbyDialogueActor(snapshot, task)
	if (actor) {
		const actorName = getActorDisplayName(actor)
		return {
			action: 'interact',
			target: { id: actor.id, name: actorName, x: actor.x, y: actor.y },
			publicRationale: overrides.publicRationale || `The quest needs a voice, and ${actorName} is close enough to answer.`,
			goblinUtterance: overrides.goblinUtterance || `${actorName}, give me the useful part before my cloak gets dramatic.`,
			memoryUpdate: overrides.memoryUpdate || `Turn ${snapshot.turn}: fallback spoke with ${actorName}.`,
			controller: overrides.controller || 'fallback'
		}
	}
	return null
}

function fallbackDecision(snapshot, overrides = {}) {
	const activeEncounter = snapshot.story && (snapshot.story.activeEncounter || snapshot.story.encounter)
	if (activeEncounter) return getCombatFallbackDecision(snapshot, activeEncounter, overrides)

	const currentTask = getCurrentTask(snapshot)
	const directTaskDecision = getDirectTaskDecision(snapshot, currentTask, overrides)
	if (directTaskDecision) return directTaskDecision

	const { x, y } = snapshot.goblin.position
	const plan = snapshot.story && snapshot.story.directorPlan ? snapshot.story.directorPlan : null
	const currentMapId = snapshot.map && snapshot.map.id ? snapshot.map.id : ''
	const planTargetMapId = plan && (plan.finalTargetMapId || plan.targetMapId)
	const usingRecoveryRoute = plan && plan.status === 'recovering' && plan.targetZone && (plan.failureCount || 0) <= MAX_RECOVERY_FAILURES && (!planTargetMapId || planTargetMapId === currentMapId)
	const routeTask = usingRecoveryRoute
		? {
			id: plan.questId || 'director-recovery',
			title: plan.currentIntent || `Reach ${plan.targetName || plan.targetZone}`,
			status: 'active',
			target: { kind: 'place', zone: plan.targetZone, name: plan.targetName || plan.targetZone }
		}
		: currentTask
	const route = routeTask ? navigation.resolveQuestNavigation(snapshot, routeTask) : null
	const routeKind = routeTask && routeTask.target ? routeTask.target.kind : ''
	const dialogueRouteNeedsActor = ['dialogue', 'rumor', 'ally', 'ideology', 'speech', 'goal', 'choice'].includes(routeKind)
	const canActAtReachedRoute = route && routeTask && route.reached && routeKind !== 'self' && !(dialogueRouteNeedsActor && !route.targetActorId)
	if (canActAtReachedRoute) {
		const targetName = route.targetActorName || (route.targetPortal && route.targetPortal.portalId) || route.targetZone || routeTask.title || 'the next lead'
		const routeTarget = routeTask.target || {}
		return {
			action: 'interact',
			target: {
				id: route.targetActorId || null,
				name: targetName,
				dialog: routeTarget.dialog || null,
				zone: route.targetZone || routeTarget.zone || null,
				portalId: route.targetPortal ? route.targetPortal.portalId : null,
				targetMapId: route.targetMapId || routeTarget.mapId || null,
				finalTargetMapId: route.finalTargetMapId || routeTarget.mapId || null,
				reached: true,
				proxyReached: Boolean(route.proxyReached),
				questId: routeTask.id
			},
			publicRationale: overrides.publicRationale || `${targetName} is close enough to turn the route into a real story beat.`,
			goblinUtterance: overrides.goblinUtterance || getChattyFallbackNarration(snapshot, 'listen', {
				routeTargetName: targetName,
				questId: routeTask.id
			}),
			memoryUpdate: overrides.memoryUpdate || `Turn ${snapshot.turn}: fallback interacted with ${targetName}.`,
			controller: overrides.controller || 'fallback'
		}
	}
	const firstStep = route && route.nextStep ? route.nextStep : null
	const target = firstStep
		? firstStep
		: navigation.chooseExplorationMove(snapshot, snapshot.navCoverage) || { x: x + 1, y }
	const fallbackRationale = firstStep
		? (usingRecoveryRoute
			? `Chatty is breaking a route loop by heading toward ${plan.targetName || plan.targetZone}.`
			: route.targetActorName
			? `The current quest points Chatty toward ${route.targetActorName} because ${(currentTask || routeTask).title} needs a real conversation.`
			: `Chatty follows ${(currentTask || routeTask).title} toward ${route.targetZone}.`)
		: 'Chatty routes toward fresh map space instead of pacing.'
	const routeTargetName = (plan && (plan.targetName || plan.targetZone)) || (route && (route.targetActorName || route.targetZone))
	return {
		action: 'move',
		target,
		publicRationale: overrides.publicRationale || fallbackRationale,
		goblinUtterance: overrides.goblinUtterance || (firstStep
			? getChattyFallbackNarration(snapshot, 'move', { routeTargetName, questId: currentTask && currentTask.id })
			: getChattyFallbackNarration(snapshot, 'move', { routeTargetName: 'fresh map space' })),
		memoryUpdate: overrides.memoryUpdate || `Turn ${snapshot.turn}: fallback movement chose ${target.x},${target.y}.`,
		controller: overrides.controller || 'fallback'
	}
}

function findGoalActor(snapshot, goal) {
	const actors = ((snapshot.nearbyActors || []).concat((snapshot.map && snapshot.map.actors) || [])).filter(actor => actor && actor.name)
	if (goal.actorId) {
		const byId = actors.find(actor => actor.id === goal.actorId)
		if (byId) return byId
	}
	if (goal.actorName) {
		const exact = actors.find(actor => actor.name === goal.actorName)
		if (exact) return exact
		const lower = goal.actorName.toLowerCase()
		return actors.find(actor => actor.name.toLowerCase().includes(lower)) || null
	}
	return null
}

// Resolve a task target to a concrete actor. Unlike findGoalActor (which only
// knows actorId/actorName), task targets frequently carry only a `dialog` tag
// (e.g. { kind: 'dialogue', dialog: 'BARTENDER' }), so match on that too.
function findActorForTarget(snapshot, target) {
	if (!target) return null
	const actors = ((snapshot.nearbyActors || []).concat((snapshot.map && snapshot.map.actors) || [])).filter(actor => actor && actor.name)
	if (target.actorId) {
		const byId = actors.find(actor => actor.id === target.actorId)
		if (byId) return byId
	}
	if (target.dialog) {
		const want = String(target.dialog).toUpperCase()
		const byDialog = actors.find(actor => actor.dialog && String(actor.dialog).toUpperCase() === want)
		if (byDialog) return byDialog
	}
	if (target.name) {
		const want = String(target.name).toLowerCase()
		const exact = actors.find(actor => actor.name.toLowerCase() === want)
		if (exact) return exact
		return actors.find(actor => actor.name.toLowerCase().includes(want) || want.includes(actor.name.toLowerCase())) || null
	}
	return null
}

function findGoalPortal(snapshot, goal) {
	const links = (snapshot.map && snapshot.map.portalLinks) || []
	if (!links.length || !goal.portalId) return null
	return links.find(link => link.portalId === goal.portalId) || null
}

function goalDecision(snapshot, fields, overrides = {}) {
	return {
		action: fields.action,
		target: fields.target || {},
		publicRationale: overrides.publicRationale || fields.publicRationale,
		goblinUtterance: overrides.goblinUtterance || fields.goblinUtterance,
		memoryUpdate: overrides.memoryUpdate || fields.memoryUpdate,
		controller: overrides.controller || 'goal-resolver'
	}
}

function goalExploreDecision(snapshot, overrides = {}) {
	const step = navigation.chooseExplorationMove(snapshot, snapshot.navCoverage)
	if (!step) {
		return goalDecision(snapshot, {
			action: 'wait',
			target: {},
			publicRationale: 'Chatty has charted the reachable ground here and waits for a fresh lead.',
			goblinUtterance: getChattyFallbackNarration(snapshot, 'wait', {}),
			memoryUpdate: `Turn ${snapshot.turn}: explore goal found no fresh tile, holding.`
		}, overrides)
	}
	return goalDecision(snapshot, {
		action: 'move',
		target: step,
		publicRationale: 'Chatty routes toward unexplored ground to widen the map.',
		goblinUtterance: getChattyFallbackNarration(snapshot, 'move', { routeTargetName: 'fresh map space' }),
		memoryUpdate: `Turn ${snapshot.turn}: explore goal stepped to ${step.x},${step.y}.`
	}, overrides)
}

function goalMoveDecision(snapshot, step, targetName, overrides = {}) {
	return goalDecision(snapshot, {
		action: 'move',
		target: step,
		publicRationale: `Chatty advances toward ${targetName}.`,
		goblinUtterance: getChattyFallbackNarration(snapshot, 'move', { routeTargetName: targetName }),
		memoryUpdate: `Turn ${snapshot.turn}: goal step toward ${targetName} at ${step.x},${step.y}.`
	}, overrides)
}

function resolveGoalToDecision(snapshot, goal, overrides = {}) {
	const safeGoal = goal || {}
	const type = safeGoal.type

	if (hasActiveEncounter(snapshot)) {
		const combatAction = safeGoal.combatAction || (type === 'combat' ? 'attack' : 'inspect')
		return goalDecision(snapshot, {
			action: combatAction,
			target: {},
			publicRationale: 'An enemy blocks the road, so Chatty answers with a legal combat action.',
			goblinUtterance: getChattyFallbackNarration(snapshot, combatAction, {}),
			memoryUpdate: `Turn ${snapshot.turn}: combat goal chose ${combatAction}.`
		}, overrides)
	}

	if (type === 'wait') {
		return goalDecision(snapshot, {
			action: 'wait',
			target: {},
			publicRationale: 'Chatty holds position to let the scene breathe.',
			goblinUtterance: getChattyFallbackNarration(snapshot, 'wait', {}),
			memoryUpdate: `Turn ${snapshot.turn}: wait goal.`
		}, overrides)
	}

	if (type === 'pursue_actor') {
		const actor = findGoalActor(snapshot, safeGoal)
		if (!actor) return goalExploreDecision(snapshot, overrides)
		const task = { id: 'goal-actor', title: `Reach ${actor.name}`, status: 'active', target: { kind: 'dialogue', name: actor.name, dialog: actor.dialog || undefined } }
		const route = navigation.resolveQuestNavigation(snapshot, task)
		if (route.reached) {
			return goalDecision(snapshot, {
				action: 'interact',
				target: { id: actor.id || null, name: actor.name || null, dialog: actor.dialog || null, zone: route.targetZone || null, reached: true },
				publicRationale: `${actor.name} is close enough to speak with.`,
				goblinUtterance: getChattyFallbackNarration(snapshot, 'listen', { routeTargetName: actor.name }),
				memoryUpdate: `Turn ${snapshot.turn}: reached ${actor.name}, opening dialogue.`
			}, overrides)
		}
		if (route.nextStep) return goalMoveDecision(snapshot, route.nextStep, actor.name, overrides)
		return goalExploreDecision(snapshot, overrides)
	}

	if (type === 'go_to_zone') {
		const zone = safeGoal.zone
		if (!zone) return goalExploreDecision(snapshot, overrides)
		const task = { id: 'goal-zone', title: `Reach ${zone}`, status: 'active', target: { kind: 'place', zone } }
		const route = navigation.resolveQuestNavigation(snapshot, task)
		if (route.nextStep) return goalMoveDecision(snapshot, route.nextStep, route.targetZone || zone, overrides)
		if (route.reached) {
			if (route.targetActorId) {
				const name = route.targetActorName || 'the local'
				return goalDecision(snapshot, {
					action: 'interact',
					target: { id: route.targetActorId, name, zone: route.targetZone || zone, reached: true },
					publicRationale: `${name} stands in ${route.targetZone || zone}; Chatty speaks.`,
					goblinUtterance: getChattyFallbackNarration(snapshot, 'listen', { routeTargetName: name }),
					memoryUpdate: `Turn ${snapshot.turn}: reached zone ${zone}, met ${name}.`
				}, overrides)
			}
			return goalDecision(snapshot, {
				action: 'wait',
				target: { zone },
				publicRationale: `Chatty has reached ${zone} and takes stock.`,
				goblinUtterance: getChattyFallbackNarration(snapshot, 'wait', { routeTargetName: zone }),
				memoryUpdate: `Turn ${snapshot.turn}: reached zone ${zone}.`
			}, overrides)
		}
		return goalExploreDecision(snapshot, overrides)
	}

	if (type === 'take_portal') {
		const portal = findGoalPortal(snapshot, safeGoal)
		if (!portal) return goalExploreDecision(snapshot, overrides)
		const task = { id: 'goal-portal', title: `Take the ${portal.portalId} road`, status: 'active', target: { kind: 'portal', mapId: portal.targetMapId } }
		const route = navigation.resolveQuestNavigation(snapshot, task)
		if (route.reached) {
			const reachedPortal = route.targetPortal || portal
			return goalDecision(snapshot, {
				action: 'interact',
				target: { portalId: reachedPortal.portalId || portal.portalId, targetMapId: reachedPortal.targetMapId || portal.targetMapId, reached: true },
				publicRationale: `Chatty steps onto the ${portal.portalId} road.`,
				goblinUtterance: `The ${portal.portalId} road is right here, so I take it.`,
				memoryUpdate: `Turn ${snapshot.turn}: took portal ${portal.portalId} -> ${portal.targetMapId}.`
			}, overrides)
		}
		if (route.nextStep) return goalMoveDecision(snapshot, route.nextStep, `the ${portal.portalId} road`, overrides)
		return goalExploreDecision(snapshot, overrides)
	}

	return goalExploreDecision(snapshot, overrides)
}

function fullGoal(partial = {}) {
	return {
		type: partial.type || null,
		actorId: partial.actorId || null,
		actorName: partial.actorName || null,
		zone: partial.zone || null,
		portalId: partial.portalId || null,
		combatAction: partial.combatAction || null
	}
}

function getPersistedGoal(snapshot) {
	const goal = snapshot && snapshot.story && snapshot.story.exploration && snapshot.story.exploration.goal
	return goal && typeof goal === 'object' && goal.type ? goal : null
}

// A goal is "valid" when its target still exists on the current map and is worth resolving.
// Whether the goal is reached is decided by the resolver (reached -> terminal interact), so it is
// not computed here; the gate keeps resolving a valid goal until it stalls into a wait.
function isGoalValid(snapshot, goal) {
	if (!goal || !goal.type) return false
	if (hasActiveEncounter(snapshot)) return goal.type === 'combat'
	if (goal.type === 'combat') return false
	if (goal.type === 'wait') return true
	if (goal.type === 'explore') return true
	if (goal.type === 'pursue_actor') return Boolean(findGoalActor(snapshot, goal))
	if (goal.type === 'go_to_zone') return Boolean(goal.zone)
	if (goal.type === 'take_portal') return Boolean(findGoalPortal(snapshot, goal))
	return false
}

function deriveDefaultGoal(snapshot) {
	if (hasActiveEncounter(snapshot)) return fullGoal({ type: 'combat', combatAction: 'attack' })
	const task = getCurrentTask(snapshot)
	const target = task && task.target ? task.target : null
	if (target) {
		if (target.dialog || target.actorId || DIALOGUE_TARGET_KINDS.has(target.kind)) {
			const actor = findActorForTarget(snapshot, target)
			if (actor) return fullGoal({ type: 'pursue_actor', actorId: actor.id || null, actorName: actor.name || null })
			return fullGoal({ type: 'explore' })
		}
		if (target.kind === 'portal') {
			const links = (snapshot.map && snapshot.map.portalLinks) || []
			const link = links.find(entry => entry.targetMapId === target.mapId) || links[0]
			if (link) return fullGoal({ type: 'take_portal', portalId: link.portalId })
			return fullGoal({ type: 'explore' })
		}
		if (target.zone) {
			const route = navigation.resolveQuestNavigation(snapshot, {
				id: 'derive-zone',
				title: `Reach ${target.zone}`,
				status: 'active',
				target: { kind: 'place', zone: target.zone }
			})
			if (route.reached && !route.targetActorId) return fullGoal({ type: 'explore' })
			return fullGoal({ type: 'go_to_zone', zone: target.zone })
		}
	}
	return fullGoal({ type: 'explore' })
}

function resolveGoalDecision(snapshot, goal, overrides = {}) {
	const decision = resolveGoalToDecision(snapshot, goal, overrides)
	decision.goal = goal
	return decision
}

function getNumericOption(options, optionName, envName, fallback) {
	const value = Object.prototype.hasOwnProperty.call(options, optionName) ? options[optionName] : process.env[envName]
	const number = Number(value)
	return Number.isFinite(number) && number >= 0 ? number : fallback
}

function actorDistance(position, actor) {
	return Math.abs(actor.x - position.x) + Math.abs(actor.y - position.y)
}

function isDialogueActor(actor) {
	const entityType = String(actor.entityType || '').toUpperCase()
	const name = String(actor.name || '').toLowerCase()
	if (DECORATIVE_DIALOG_NAMES.has(name)) return false
	if (entityType === 'NPC') return true
	if (!actor.dialog) return false
	return Boolean(actor.spriteKey)
}

function getClosestDialogueActor(snapshot, options = {}) {
	const radius = getNumericOption(options, 'dialogueActorRadius', 'GOBLINWORLD_DIALOGUE_ACTOR_RADIUS', DEFAULT_DIALOGUE_ACTOR_RADIUS)
	const position = snapshot.goblin.position
	return (snapshot.nearbyActors || [])
		.map(actor => ({
			...actor,
			distance: actorDistance(position, actor)
		}))
		.filter(actor => actor.distance <= radius && isDialogueActor(actor))
		.sort((a, b) => a.distance - b.distance)[0]
}

function targetMatchesActor(target, actor) {
	if (!target || !actor) return false
	if (typeof target.name === 'string' && target.name && target.name === actor.name) return true
	if (typeof target.id === 'string' && target.id && target.id === actor.id) return true
	if (Number.isInteger(target.x) && Number.isInteger(target.y) && target.x === actor.x && target.y === actor.y) return true
	return false
}

function interactionMentionsDialogueActor(event, actor) {
	const text = `${event.message || ''} ${event.publicRationale || ''}`.toLowerCase()
	const actorName = String(actor.name || '').toLowerCase()
	return text.includes('npc') || text.includes('speaks') || text.includes('talk') || text.includes('conversation') || (actorName && actorName !== 'npc' && text.includes(actorName))
}

function getInteractedDialogueActor(snapshot, event, options = {}) {
	const radius = getNumericOption(options, 'dialogueActorRadius', 'GOBLINWORLD_DIALOGUE_ACTOR_RADIUS', DEFAULT_DIALOGUE_ACTOR_RADIUS)
	const position = snapshot.goblin.position
	const candidates = (snapshot.nearbyActors || [])
		.map(actor => ({
			...actor,
			distance: actorDistance(position, actor)
		}))
		.filter(actor => actor.distance <= radius && isDialogueActor(actor))
		.sort((a, b) => a.distance - b.distance)
	return candidates.find(actor => event.actor && event.actor === actor.name) || candidates.find(actor => targetMatchesActor(event.target, actor)) || candidates.find(actor => interactionMentionsDialogueActor(event, actor))
}

function findLatestEvent(snapshot, predicate) {
	const events = snapshot.events || []
	for (let index = events.length - 1; index >= 0; index -= 1) {
		if (predicate(events[index])) return events[index]
	}
	return null
}

function shouldHoldForDialogue(snapshot, options = {}) {
	const holdTurns = getNumericOption(options, 'dialogueHoldTurns', 'GOBLINWORLD_DIALOGUE_HOLD_TURNS', DEFAULT_DIALOGUE_HOLD_TURNS)
	if (holdTurns === 0 || !getClosestDialogueActor(snapshot, options)) return false

	const latestInteract = findLatestEvent(snapshot, event => event.action === 'interact' || event.action === 'speak')
	if (!latestInteract) return false
	if (!getInteractedDialogueActor(snapshot, latestInteract, options)) return false

	const latestMove = findLatestEvent(snapshot, event => event.action === 'move')
	if (latestMove && latestMove.turn > latestInteract.turn) return false

	return snapshot.turn - latestInteract.turn < holdTurns
}

function dialogueHoldDecision(snapshot, options = {}) {
	const actor = getClosestDialogueActor(snapshot, options)
	const actorName = actor ? actor.name : 'the nearby voice'
	return {
		action: 'wait',
		target: actor ? { name: actor.name, x: actor.x, y: actor.y } : {},
		publicRationale: `The goblin is speaking with ${actorName}, so it keeps its feet planted until the exchange finishes.`,
		goblinUtterance: `${actorName} is talking, so I keep the cloak still.`,
		memoryUpdate: `Turn ${snapshot.turn}: paused movement while speaking with ${actorName}.`,
		controller: 'dialogue-hold'
	}
}

function hasActiveEncounter(snapshot) {
	return Boolean(snapshot.story && (snapshot.story.activeEncounter || snapshot.story.encounter))
}

function getLatestEventAfterTurn(snapshot, predicate, turn) {
	return findLatestEvent(snapshot, event => event.turn > turn && predicate(event))
}

function isLikelyStuck(snapshot) {
	return navigation.detectMovementLoop(snapshot)
}

function shouldCallModelNow(snapshot, options = {}) {
	if (getAiMode(options) === 'fallback') return { call: false, reason: 'forced-fallback' }
	if (getAiMode(options) !== 'hybrid') return { call: true, reason: 'direct' }

	const state = getControllerState(options)
	const currentTask = getCurrentTask(snapshot)
	if (!Number.isInteger(state.lastModelTurn)) return { call: true, reason: 'initial' }
	if (hasActiveEncounter(snapshot)) return { call: true, reason: 'combat' }

	const lastTurn = state.lastModelTurn
	const turnGap = snapshot.turn - lastTurn
	if (turnGap < getMinTurnGap(options)) return { call: false, reason: 'min-interval' }
	if (currentTask && currentTask.id && currentTask.id !== state.lastModelTaskId) return { call: true, reason: 'quest' }
	const latestPhase = getLatestEventAfterTurn(snapshot, event => event.type === 'phase', lastTurn)
	if (latestPhase) return { call: true, reason: 'phase' }
	const latestDialogue = getLatestEventAfterTurn(snapshot, event => event.type === 'dialogue' || event.action === 'speak', lastTurn)
	if (latestDialogue) return { call: true, reason: 'dialogue' }
	if (turnGap >= getMinTurnGap(options) && isLikelyStuck(snapshot)) return { call: true, reason: 'stuck' }
	if (turnGap >= getDirectorTurnGap(options)) return { call: true, reason: 'director' }

	return { call: false, reason: 'cadence' }
}

async function requestGoblinDecision(snapshot, options = {}) {
	const provider = getModelProvider(options)
	const apiKey = getProviderApiKey(provider, options)
	const mode = getAiMode(options)
	const backoffKey = getBackoffKey(provider)
	const inBackoff = Boolean(options[backoffKey] && Date.now() < options[backoffKey])
	const budgetExceeded = isBudgetExceeded(options)
	const modelAvailable = Boolean(apiKey) && mode !== 'fallback' && !budgetExceeded && !inBackoff

	const persistedGoal = getPersistedGoal(snapshot)
	const persistedValid = isGoalValid(snapshot, persistedGoal)
	const gate = shouldCallModelNow(snapshot, options)

	// (Re)select a goal with the model when it is allowed and the gate says it is time
	// (initial / combat / quest / phase / dialogue / stuck / director cadence).
	if (modelAvailable && gate.call) {
		const modelDecision =
			provider === 'openai' ? await requestOpenAIDecision(snapshot, apiKey, options) : await requestAnthropicDecision(snapshot, apiKey, options)
		const goal = modelDecision && modelDecision.goal && modelDecision.goal.type ? fullGoal(modelDecision.goal) : deriveDefaultGoal(snapshot)
		return resolveGoalDecision(snapshot, goal, {
			controller: (modelDecision && modelDecision.controller) || `${provider}-goal`,
			publicRationale: modelDecision && modelDecision.publicRationale,
			goblinUtterance: modelDecision && modelDecision.goblinUtterance,
			memoryUpdate: modelDecision && modelDecision.memoryUpdate
		})
	}

	// No model this tick: keep resolving the active goal deterministically only while it still makes
	// forward progress (a move). The moment it reaches its target (a terminal interact/combat action) or
	// stalls (wait), abandon it and re-derive a fresh goal from the current task — otherwise a *reached*
	// pursue/zone goal stays "valid" and loops on interact forever, pinning the goblin at the first NPC
	// it meets instead of advancing to the next objective.
	if (persistedGoal && persistedValid) {
		const probe = resolveGoalToDecision(snapshot, persistedGoal, { controller: 'goal-cadence' })
		if (probe.action === 'move') {
			probe.goal = persistedGoal
			return probe
		}
	}

	const goal = deriveDefaultGoal(snapshot)
	const controller = budgetExceeded ? 'goal-budget' : inBackoff ? 'goal-recovery' : mode === 'fallback' || !apiKey ? 'goal-fallback' : 'goal-cadence'
	return resolveGoalDecision(snapshot, goal, { controller })
}

function resolveLegalActions(snapshot) {
	return Array.isArray(snapshot.legalActions) && snapshot.legalActions.length ? snapshot.legalActions : DEFAULT_GOBLIN_ACTIONS
}

// The model's top-level action is advisory now — the goal resolver picks the executed action — so an
// out-of-context action (e.g. attack with no encounter) must not crash goal selection. Coerce it to a
// universally-legal 'wait' before validation; the resolver overrides it from the chosen goal anyway.
function coerceAdvisoryAction(rawDecision, legalActions) {
	const action = String(rawDecision && rawDecision.action ? rawDecision.action : '').replace(/\s+/g, ' ').trim()
	if (!legalActions.includes(action)) rawDecision.action = 'wait'
}

async function requestOpenAIDecision(snapshot, apiKey, options = {}) {
	const model = getProviderModel('openai', options)
	const visibleWorld = getVisibleWorldSummary(snapshot)
	const httpFetch = options.fetch || fetch
	const requestBody = JSON.stringify({
		model,
		store: false,
		reasoning: {
			effort: 'low'
		},
		input: [
			{
				role: 'system',
				content: MODEL_SYSTEM_INSTRUCTIONS
			},
			{
				role: 'user',
				content: `Current world snapshot:\n${JSON.stringify(visibleWorld, null, 2)}`
			}
		],
		text: {
			format: {
				type: 'json_schema',
				...GOBLIN_DECISION_SCHEMA
			}
		}
	})
	recordModelRequest(options)
	const response = await httpFetch('https://api.openai.com/v1/responses', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json'
		},
		body: requestBody
	})

	if (!response.ok) {
		const text = await response.text()
		recordModelFailure(options)
		if (response.status === 429) {
			options[getBackoffKey('openai')] = Date.now() + (options.recoveryBackoffMs || Number(process.env.GOBLINWORLD_RECOVERY_BACKOFF_MS) || DEFAULT_RECOVERY_BACKOFF_MS)
		}
		throw new Error(`OpenAI decision request failed (${response.status}): ${text.slice(0, 400)}`)
	}

	const responseJson = await response.json()
	recordModelUsage(options, responseJson.usage)
	const text = extractResponseText(responseJson)
	const rawDecision = JSON.parse(text)
	recordSuccessfulModelCall(snapshot, options)
	const legalActions = resolveLegalActions(snapshot)
	coerceAdvisoryAction(rawDecision, legalActions)
	return {
		...validateGoblinDecision(rawDecision, legalActions),
		controller: 'openai'
	}
}

async function requestAnthropicDecision(snapshot, apiKey, options = {}) {
	const visibleWorld = getVisibleWorldSummary(snapshot)
	const responseJson = await callAnthropicModel({
		apiKey,
		model: getProviderModel('anthropic', options),
		system: MODEL_SYSTEM_INSTRUCTIONS,
		messages: [
			{
				role: 'user',
				content: `Current world snapshot:\n${JSON.stringify(visibleWorld, null, 2)}`
			}
		],
		tools: [
			{
				name: ANTHROPIC_DECISION_TOOL,
				description: 'Choose the next legal GoblinWorld action and public log text.',
				input_schema: GOBLIN_DECISION_SCHEMA.schema
			}
		],
		toolChoice: { type: 'tool', name: ANTHROPIC_DECISION_TOOL },
		fetch: options.fetch,
		options
	})
	const rawDecision = extractAnthropicDecision(responseJson)
	if (!rawDecision) throw new Error('Anthropic decision response did not include a tool decision.')
	recordSuccessfulModelCall(snapshot, options)
	const legalActions = resolveLegalActions(snapshot)
	coerceAdvisoryAction(rawDecision, legalActions)
	return {
		...validateGoblinDecision(rawDecision, legalActions),
		controller: 'anthropic'
	}
}

async function tickGoblin(world, options = {}) {
	const snapshot = world.getSnapshot()
	if (typeof world.getCoverageForCurrentMap === 'function') {
		snapshot.navCoverage = world.getCoverageForCurrentMap()
	}
	if (shouldHoldForDialogue(snapshot, options)) {
		return world.applyDecision(dialogueHoldDecision(snapshot, options))
	}
	try {
		const decision = await requestGoblinDecision(snapshot, options)
		if (typeof world.setExplorationGoal === 'function') world.setExplorationGoal(decision.goal || null)
		return world.applyDecision(decision)
	} catch (error) {
		const provider = getModelProvider(options)
		return world.applyDecision(fallbackDecision(snapshot, {
			controller: `${provider}-recovery`,
			publicRationale: 'The path is still clear, so Chatty keeps moving through the story rather than freezing.',
			goblinUtterance: 'The path is still there, so I trust my feet and keep going.',
			memoryUpdate: `Controller issue: ${error.message.slice(0, 160)}`,
		}))
	}
}

async function tickWorld(world, options = {}) {
	const storyOptions = {
		...options,
		requireScriptCompletion: options.requireScriptCompletion !== false
	}
	const openingStoryEvents = typeof world.advanceStory === 'function' ? world.advanceStory(storyOptions) : []
	const goblinEvent = await tickGoblin(world, options)
	const npcEvents = typeof world.advanceNpcs === 'function' ? await world.advanceNpcs(options) : []
	const storyEvents = typeof world.advanceStory === 'function' ? world.advanceStory(storyOptions) : []
	return [...openingStoryEvents, goblinEvent, ...npcEvents, ...storyEvents]
}

function startGoblinLoop(world, onEvent, options = {}) {
	const intervalMs = options.intervalMs || Number(process.env.GOBLINWORLD_TURN_INTERVAL_MS) || DEFAULT_INTERVAL_MS
	let running = false

	const run = async () => {
		if (running) return
		running = true
		try {
			const events = await tickWorld(world, options)
			if (typeof onEvent === 'function') events.forEach(event => onEvent(event))
		} finally {
			running = false
		}
	}

	const timer = setInterval(run, intervalMs)
	if (timer.unref) timer.unref()
	run()
	return () => clearInterval(timer)
}

module.exports = {
	fallbackDecision,
	getControllerStatus,
	hasModelController,
	hasOpenAIController: hasModelController,
	requestGoblinDecision,
	resolveGoalToDecision,
	startGoblinLoop,
	tickGoblin,
	tickWorld
}
