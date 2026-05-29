const DEFAULT_GOBLIN_ACTIONS = [
	'move',
	'wait',
	'interact',
	'pick_up',
	'pickup',
	'attack',
	'cast',
	'inspect',
	'examine',
	'climb',
	'equip',
	'use',
	'fire',
	'rest',
	'flee',
	'reposition'
]

const GOBLIN_GOAL_TYPES = ['pursue_actor', 'go_to_zone', 'take_portal', 'explore', 'combat', 'wait']

const GOBLIN_COMBAT_ACTIONS = ['inspect', 'attack', 'cast', 'wait', 'interact']

const GOBLIN_DECISION_SCHEMA = {
	name: 'goblin_decision',
	strict: true,
	schema: {
		type: 'object',
		additionalProperties: false,
		required: ['action', 'goal', 'target', 'public_rationale', 'goblin_utterance', 'memory_update'],
		properties: {
			action: {
				type: 'string',
				enum: DEFAULT_GOBLIN_ACTIONS
			},
			goal: {
				type: 'object',
				additionalProperties: false,
				required: ['goal_type', 'actor_id', 'actor_name', 'zone', 'portal_id', 'combat_action'],
				properties: {
					goal_type: { type: ['string', 'null'], enum: [...GOBLIN_GOAL_TYPES, null] },
					actor_id: { type: ['string', 'null'] },
					actor_name: { type: ['string', 'null'] },
					zone: { type: ['string', 'null'] },
					portal_id: { type: ['string', 'null'] },
					combat_action: { type: ['string', 'null'], enum: [...GOBLIN_COMBAT_ACTIONS, null] }
				}
			},
			target: {
				type: 'object',
				additionalProperties: false,
				required: ['x', 'y', 'id', 'name'],
				properties: {
					x: { type: ['integer', 'null'] },
					y: { type: ['integer', 'null'] },
					id: { type: ['string', 'null'] },
					name: { type: ['string', 'null'] }
				}
			},
			public_rationale: {
				type: 'string'
			},
			goblin_utterance: {
				type: 'string'
			},
			memory_update: {
				type: 'string'
			}
		}
	}
}

function assertObject(value, label) {
	if (value === null || typeof value !== 'object' || Array.isArray(value)) {
		throw new Error(`${label} must be an object`)
	}
}

function normalizeText(value, fallback = '') {
	if (typeof value !== 'string') return fallback
	return value.replace(/\s+/g, ' ').trim()
}

function normalizeTarget(target) {
	if (target === undefined || target === null) return {}
	assertObject(target, 'target')

	const normalized = {}
	if (Number.isInteger(target.x)) normalized.x = target.x
	if (Number.isInteger(target.y)) normalized.y = target.y
	if (typeof target.id === 'string') normalized.id = normalizeText(target.id)
	if (typeof target.name === 'string') normalized.name = normalizeText(target.name)
	return normalized
}

function normalizeOptionalText(value) {
	if (typeof value !== 'string') return null
	const text = normalizeText(value)
	return text || null
}

function normalizeGoal(goal) {
	if (goal === undefined || goal === null) return { type: null, actorId: null, actorName: null, zone: null, portalId: null, combatAction: null }
	assertObject(goal, 'goal')
	const rawType = normalizeOptionalText(goal.goal_type)
	const type = rawType && GOBLIN_GOAL_TYPES.includes(rawType) ? rawType : null
	const rawCombat = normalizeOptionalText(goal.combat_action)
	const combatAction = rawCombat && GOBLIN_COMBAT_ACTIONS.includes(rawCombat) ? rawCombat : null
	return {
		type,
		actorId: normalizeOptionalText(goal.actor_id),
		actorName: normalizeOptionalText(goal.actor_name),
		zone: normalizeOptionalText(goal.zone),
		portalId: normalizeOptionalText(goal.portal_id),
		combatAction
	}
}

function validateGoblinDecision(rawDecision, legalActions = DEFAULT_GOBLIN_ACTIONS) {
	assertObject(rawDecision, 'goblin decision')
	if (!Array.isArray(legalActions) || legalActions.length === 0) {
		throw new Error('legalActions must be a non-empty array')
	}

	const action = normalizeText(rawDecision.action)
	if (!legalActions.includes(action)) {
		throw new Error(`Unsupported goblin action: ${action || '(missing)'}`)
	}

	return {
		action,
		goal: normalizeGoal(rawDecision.goal),
		target: normalizeTarget(rawDecision.target),
		publicRationale: normalizeText(rawDecision.public_rationale, 'No public rationale supplied.'),
		goblinUtterance: normalizeText(rawDecision.goblin_utterance),
		memoryUpdate: normalizeText(rawDecision.memory_update)
	}
}

module.exports = {
	DEFAULT_GOBLIN_ACTIONS,
	GOBLIN_GOAL_TYPES,
	GOBLIN_COMBAT_ACTIONS,
	GOBLIN_DECISION_SCHEMA,
	validateGoblinDecision
}
