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

const GOBLIN_DECISION_SCHEMA = {
	name: 'goblin_decision',
	strict: true,
	schema: {
		type: 'object',
		additionalProperties: false,
		required: ['action', 'target', 'public_rationale', 'goblin_utterance', 'memory_update'],
		properties: {
			action: {
				type: 'string',
				enum: DEFAULT_GOBLIN_ACTIONS
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
		target: normalizeTarget(rawDecision.target),
		publicRationale: normalizeText(rawDecision.public_rationale, 'No public rationale supplied.'),
		goblinUtterance: normalizeText(rawDecision.goblin_utterance),
		memoryUpdate: normalizeText(rawDecision.memory_update)
	}
}

module.exports = {
	DEFAULT_GOBLIN_ACTIONS,
	GOBLIN_DECISION_SCHEMA,
	validateGoblinDecision
}
