const { setUnlock, uniquePush } = require('./taskRules')

const ACTIONS_BY_KIND = {
	inspect: new Set(['inspect']),
	item: new Set(['pick_up', 'interact']),
	place: new Set(['interact', 'inspect']),
	route: new Set(['interact', 'inspect']),
	escort: new Set(['interact', 'wait']),
	defense: new Set(['interact', 'wait']),
	speech: new Set(['interact', 'wait']),
	goal: new Set(['interact', 'wait']),
	choice: new Set(['interact', 'wait']),
	ideology: new Set(['interact', 'wait']),
	rumor: new Set(['interact', 'wait']),
	dialogue: new Set(['interact', 'wait']),
	self: new Set(['move', 'wait', 'inspect'])
}

function clone(value) {
	return JSON.parse(JSON.stringify(value))
}

function camelCase(value, fallback = 'questProgress') {
	const words = String(value || fallback)
		.replace(/['"]/g, '')
		.split(/[^A-Za-z0-9]+/)
		.filter(Boolean)
	if (!words.length) return fallback
	return words
		.map((word, index) => {
			const lower = word.toLowerCase()
			if (index === 0) return lower
			return lower.charAt(0).toUpperCase() + lower.slice(1)
		})
		.join('')
}

function getTarget(task = {}) {
	return task.target || { kind: 'story' }
}

function actionAllowed(kind, action) {
	const actions = ACTIONS_BY_KIND[kind] || new Set(['interact'])
	return actions.has(action)
}

function isReached(kind, context = {}) {
	if (kind === 'self') return true
	if (context.reached === true) return true
	if (context.target && context.target.reached === true) return true
	if (context.navigation && context.navigation.reached === true) return true
	return false
}

function effectKeyForTask(task, prefix = '') {
	const target = getTarget(task)
	return camelCase(target.name || target.enemy || target.dialog || task.title || task.id, prefix || 'questProgress')
}

function createPublicMessage(task, kind) {
	const title = task && task.title ? task.title : 'The quest objective'
	if (kind === 'item') return `${title} is now in Chatty's hands.`
	if (kind === 'inspect') return `${title} reveals a usable clue.`
	if (['speech', 'goal', 'choice', 'ideology', 'rumor', 'dialogue'].includes(kind)) {
		return `${title} lands as part of the story.`
	}
	return `${title} moves from plan to action.`
}

function relationshipKeyForTarget(target = {}) {
	const text = `${target.dialog || ''} ${target.name || ''}`.toLowerCase()
	if (text.includes('bartender')) return 'bartender'
	if (text.includes('mayor') || text.includes('leonard')) return 'mayor'
	if (text.includes('dwarf') || text.includes('bili')) return 'dwarf'
	if (text.includes('market') || text.includes('trader')) return 'marketTrader'
	if (text.includes('hood')) return 'hoodedVillager'
	if (text.includes('forest') || text.includes('wander')) return 'forestWanderer'
	if (text.includes('lantern')) return 'lanternKeeper'
	if (text.includes('stone') || text.includes('guard')) return 'stoneGuard'
	if (text.includes('hidden') || text.includes('goblin')) return 'hiddenGoblinOne'
	return ''
}

function updateRelationshipForQuestTalk(story, key, turn = 0) {
	if (!key) return
	story.relationships = story.relationships && typeof story.relationships === 'object' ? story.relationships : {}
	story.allies = Array.isArray(story.allies) ? story.allies : []
	const relationship = story.relationships[key] || { trust: 0, suspicion: 0, talks: 0, stance: 'unmet' }
	relationship.talks = (relationship.talks || 0) + 1
	relationship.trust = (relationship.trust || 0) + 1
	relationship.suspicion = Math.max(0, (relationship.suspicion || 0) - 1)
	relationship.lastTurn = turn
	relationship.stance = relationship.trust >= 3 ? 'warm' : relationship.trust <= -1 ? 'cold' : 'neutral'
	story.relationships[key] = relationship
	if (relationship.trust >= 3) uniquePush(story.allies, key)
}

function applyQuestInteraction(storyInput = {}, task = null, context = {}) {
	const story = clone(storyInput || {})
	story.facts = story.facts && typeof story.facts === 'object' ? story.facts : {}
	story.items = story.items && typeof story.items === 'object' ? story.items : {}
	story.relationships = story.relationships && typeof story.relationships === 'object' ? story.relationships : {}
	story.allies = Array.isArray(story.allies) ? story.allies : []
	story.callbacks = Array.isArray(story.callbacks) ? story.callbacks : []
	if (!task) return { story, applied: false, eventPatch: null }

	const target = getTarget(task)
	const kind = target.kind || 'story'
	const action = context.action || ''
	if (!actionAllowed(kind, action) || !isReached(kind, context)) {
		return { story, applied: false, eventPatch: null }
	}

	const key = effectKeyForTask(task)
	if (kind === 'item') {
		story.items[key] = true
	} else {
		story.facts[key] = true
	}
	if (['dialogue', 'rumor', 'ally'].includes(kind)) {
		updateRelationshipForQuestTalk(story, relationshipKeyForTarget({ ...target, ...(context.target || {}) }), context.turn || 0)
	}
	;(task.unlocks || []).forEach(unlock => setUnlock(story, unlock))
	;(task.callbackFlags || []).forEach(flag => uniquePush(story.callbacks, flag))
	uniquePush(story.callbacks, `quest-action:${task.id}`)

	const publicStory = {
		facts: { ...story.facts },
		items: { ...story.items },
		relationships: clone(story.relationships),
		allies: story.allies.slice(),
		callbacks: story.callbacks.slice()
	}
	return {
		story,
		applied: true,
		eventPatch: {
			type: task.eventType || (kind === 'inspect' ? 'discovery' : 'quest'),
			action,
			target: {
				kind,
				name: target.name || target.enemy || target.dialog || null
			},
			message: createPublicMessage(task, kind),
			publicRationale: 'Chatty acts on the reached quest objective.',
			controller: 'story-engine',
			worldDelta: {
				story: publicStory
			}
		}
	}
}

module.exports = {
	applyQuestInteraction
}
