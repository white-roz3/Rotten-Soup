const { STORY_TURNS_PER_PHASE } = require('./constants')

function task(id, title, details = {}) {
	return {
		id,
		phaseId: details.phaseId || 'day-2',
		title,
		label: title,
		target: details.target || { kind: 'story' },
		hint: details.hint || 'Follow the next free-road lead.',
		detail: details.hint || 'Follow the next free-road lead.',
		successLine: details.successLine || `${title} is complete.`,
		failureLine: details.failureLine || `${title} slips into tomorrow's trouble.`,
		required: details.required !== false,
		eventType: details.eventType || 'quest',
		encounterId: details.encounterId || null,
		unlocks: details.unlocks || [],
		callbackFlags: details.callbackFlags || [],
		predicate: details.predicate || { type: 'auto' },
		autoAfterTurns: Number.isFinite(details.autoAfterTurns) ? details.autoAfterTurns : null,
		expireAfterTurns: Number.isFinite(details.expireAfterTurns) ? details.expireAfterTurns : null
	}
}

const CONTINUATION_ARCS = {
	'day-2-road-to-freedom': {
		id: 'day-2-road-to-freedom',
		day: 2,
		title: 'Roads After Dawn',
		summary: 'Chatty turns victory into working freedom by checking allies, roads, camps, lamps, and the square.',
		tasks: [
			task('day-2-return-tavern', 'Check the tavern resistance hub', {
				target: { kind: 'place', name: 'tavern', zone: 'tavern', mapId: 'mulberryTown' },
				hint: 'Return to the tavern and make sure the rebel toast became logistics.',
				successLine: 'The tavern is still loud, which means the resistance is alive.',
				predicate: { type: 'zoneReached', zone: 'tavern' },
				unlocks: ['callback:day-two-tavern-secure']
			}),
			task('day-2-talk-bartender', 'Get the next supply lead from the Bartender', {
				target: { kind: 'dialogue', dialog: 'BARTENDER', zone: 'tavern', mapId: 'mulberryTown' },
				hint: 'Ask the Bartender what free goblins need before everyone gets poetic and hungry.',
				successLine: 'The Bartender turns celebration into a list of useful trouble.',
				eventType: 'dialogue',
				predicate: { type: 'relationshipKey', key: 'bartender', talks: 1 },
				unlocks: ['fact:dayTwoSupplyLead']
			}),
			task('day-2-secure-market-road', 'Secure the market road for goblin travel', {
				target: { kind: 'place', name: 'market road', zone: 'market', mapId: 'mulberryTown' },
				hint: 'Walk the market road so free feet have somewhere public to go.',
				successLine: 'The market road becomes a route instead of a dare.',
				predicate: { type: 'zoneReached', zone: 'market' },
				unlocks: ['callback:market-road-secured']
			}),
			task('day-2-check-hidden-camp', 'Check the hidden camp for holdouts', {
				target: { kind: 'place', name: 'hidden camp', zone: 'hidden-camp', mapId: 'mulberryForest' },
				hint: 'Find the tucked-away goblins who do not yet believe dawn is real.',
				successLine: 'The hidden camp answers back, suspicious but still standing.',
				eventType: 'discovery',
				predicate: { type: 'zoneReached', zone: 'hidden-camp' },
				unlocks: ['callback:hidden-camp-checked']
			}),
			task('day-2-light-under-road', 'Light the under-road watch lamps', {
				target: { kind: 'place', name: 'under-road lamps', zone: 'under-road', mapId: 'lichLair' },
				hint: 'Go below the road and make darkness less useful to old law.',
				successLine: 'The under-road lamps make the old dark blink first.',
				eventType: 'discovery',
				predicate: { type: 'zoneReached', zone: 'under-road' },
				unlocks: ['callback:under-road-lit']
			}),
			task('day-2-return-square', 'Report back to the town square', {
				target: { kind: 'speech', name: 'town square report', zone: 'town-square', mapId: 'mulberryTown' },
				hint: 'Bring the day back to the square so freedom can be witnessed.',
				successLine: 'Chatty returns to the square with proof that dawn has errands.',
				eventType: 'dialogue',
				predicate: { type: 'zoneReached', zone: 'town-square' },
				unlocks: ['callback:day-two-report']
			})
		]
	}
}

function getContinuationArc(arcId = 'day-2-road-to-freedom') {
	return CONTINUATION_ARCS[arcId] || CONTINUATION_ARCS['day-2-road-to-freedom']
}

function shouldUseContinuationTasks(story = {}) {
	return (story.day || 1) >= 2 || Boolean(story.flags && story.flags.dayOneComplete)
}

function getContinuationTaskStatus(story, task, index) {
	if ((story.completedTasks || []).includes(task.id)) return 'done'
	if ((story.failedTasks || []).includes(task.id)) return 'failed'
	const tasks = getContinuationArc(story.arcId).tasks
	const firstIncompleteIndex = tasks.findIndex(candidate =>
		!(story.completedTasks || []).includes(candidate.id) && !(story.failedTasks || []).includes(candidate.id)
	)
	return index === firstIncompleteIndex ? 'active' : 'locked'
}

function createContinuationTaskViews(story) {
	return getContinuationArc(story.arcId).tasks.map((arcTask, index) => ({
		...arcTask,
		status: getContinuationTaskStatus(story, arcTask, index),
		target: { ...(arcTask.target || {}) },
		unlocks: (arcTask.unlocks || []).slice()
	}))
}

function isContinuationArcComplete(story) {
	const tasks = getContinuationArc(story.arcId).tasks
	return tasks.every(task => (story.completedTasks || []).includes(task.id) || (story.failedTasks || []).includes(task.id))
}

function rollContinuationArc(story, turn = 0) {
	const currentArc = getContinuationArc(story.arcId)
	currentArc.tasks.forEach(task => {
		story.completedTasks = (story.completedTasks || []).filter(id => id !== task.id)
		story.failedTasks = (story.failedTasks || []).filter(id => id !== task.id)
	})
	story.day = Math.max(2, (story.day || 2) + 1)
	story.arcStartedTurn = turn
	story.currentObjective = ''
	story.exploration = {
		currentMapId: story.exploration && story.exploration.currentMapId || 'mulberryTown',
		targetMapId: '',
		visitedMapsThisArc: {},
		visitedZonesThisArc: {},
		arcVisitKey: `${story.day}:${story.arcId}:${story.arcStartedTurn}`,
		lastMapChangeTurn: turn
	}
	story.visibleProgress = {
		...(story.visibleProgress || {}),
		lastArcCompletedTurn: turn
	}
	return story
}

function getArcElapsedTurns(story, turn = 0) {
	return Math.max(0, turn - (Number.isInteger(story.arcStartedTurn) ? story.arcStartedTurn : 0))
}

function getContinuationSummary(story, turn = 0) {
	const arc = getContinuationArc(story.arcId)
	return {
		day: Math.max(2, story.day || arc.day),
		arcId: arc.id,
		arcTitle: arc.title,
		elapsedTurns: getArcElapsedTurns(story, turn),
		elapsedPhaseShare: Math.min(1, getArcElapsedTurns(story, turn) / STORY_TURNS_PER_PHASE)
	}
}

module.exports = {
	CONTINUATION_ARCS,
	createContinuationTaskViews,
	getContinuationArc,
	getContinuationSummary,
	isContinuationArcComplete,
	rollContinuationArc,
	shouldUseContinuationTasks
}
