function uniquePush(list, value) {
	if (!value || list.includes(value)) return
	list.push(value)
}

function setUnlock(story, unlock) {
	if (!unlock || typeof unlock !== 'string') return
	const [type, key] = unlock.split(':')
	if (!type || !key) return
	if (type === 'fact') story.facts[key] = true
	if (type === 'item') story.items[key] = true
	if (type === 'ally') uniquePush(story.allies, key)
	if (type === 'callback') uniquePush(story.callbacks, key)
}

function applyTaskRewards(story, task) {
	;(task.unlocks || []).forEach(unlock => setUnlock(story, unlock))
	;(task.callbackFlags || []).forEach(flag => uniquePush(story.callbacks, flag))
}

function getRelationship(story, key) {
	return story.relationships && story.relationships[key] ? story.relationships[key] : {}
}

function totalRelationshipTalks(story) {
	return Object.values(story.relationships || {}).reduce((total, relationship) => total + (relationship.talks || 0), 0)
}

function anyRelationshipMeets(story, keys, minimumTrust = 1) {
	return keys.some(key => (getRelationship(story, key).trust || 0) >= minimumTrust || story.allies.includes(key))
}

function predicateMatches(story, task, context = {}) {
	const predicate = task.predicate || { type: 'auto' }
	switch (predicate.type) {
		case 'fact':
			return Boolean(story.facts[predicate.key])
		case 'item':
			return Boolean(story.items[predicate.key])
		case 'callback':
			return story.callbacks.includes(predicate.key)
		case 'allOfFacts':
			return (predicate.keys || []).every(key => story.facts[key])
		case 'allOfItems':
			return (predicate.keys || []).every(key => story.items[key])
		case 'relationshipTalks':
			return totalRelationshipTalks(story) >= (predicate.count || 1)
		case 'relationshipKey': {
			const relationship = getRelationship(story, predicate.key)
			if (Number.isFinite(predicate.talks) && (relationship.talks || 0) < predicate.talks) return false
			if (Number.isFinite(predicate.trust) && (relationship.trust || 0) < predicate.trust) return false
			return Number.isFinite(predicate.talks) || Number.isFinite(predicate.trust)
		}
		case 'allyCount':
			return story.allies.length >= (predicate.count || 1)
		case 'anyAlly':
			return anyRelationshipMeets(story, predicate.keys || [], predicate.trust || 1)
		case 'encounterDefeated':
			return Object.values(story.encounters || {}).some(encounter => encounter.id === predicate.encounterId && encounter.defeated)
		case 'zoneReached': {
			if (task.phaseId === 'day-2') {
				const exploration = story.exploration || {}
				const zonesThisArc = exploration.visitedZonesThisArc || {}
				return Boolean(zonesThisArc[predicate.zone])
			}
			const progress = story.visibleProgress || {}
			const zones = progress.zones || {}
			return progress.lastZone === predicate.zone || Boolean(zones[predicate.zone]) || Boolean(story.facts && story.facts[`reachedZone:${predicate.zone}`])
		}
		case 'progressAtLeast': {
			const progress = story.taskProgress || {}
			const value = progress[predicate.key] || 0
			return value >= (predicate.count || 1)
		}
		case 'chattyAlive':
			return (story.chattyHp || 12) > 0
		case 'auto':
			return Boolean(context.allowAutoProgress)
		default:
			return false
	}
}

function taskShouldAutoComplete(story, task, turn, context = {}) {
	if (context.allowAutoProgress === false) return false
	if (!Number.isFinite(task.autoAfterTurns)) return false
	return turn - story.phaseStartedTurn >= task.autoAfterTurns
}

function taskShouldFail(story, task, turn) {
	if (task.required) return false
	if (!Number.isFinite(task.expireAfterTurns)) return false
	if (story.completedTasks.includes(task.id) || story.failedTasks.includes(task.id)) return false
	return turn - story.phaseStartedTurn >= task.expireAfterTurns
}

function evaluateTask(story, phase, task, turn, context = {}) {
	if (story.completedTasks.includes(task.id)) return 'complete'
	if (story.failedTasks.includes(task.id)) return 'failed'
	if (taskShouldFail(story, task, turn)) return 'failed'
	if (predicateMatches(story, task, context)) return 'complete'
	if (taskShouldAutoComplete(story, task, turn, context)) return 'complete'
	return 'pending'
}

module.exports = {
	applyTaskRewards,
	evaluateTask,
	predicateMatches,
	setUnlock,
	taskShouldAutoComplete,
	taskShouldFail,
	totalRelationshipTalks,
	uniquePush
}
