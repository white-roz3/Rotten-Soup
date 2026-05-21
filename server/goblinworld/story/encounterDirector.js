const DEFAULT_HOSTILE_SPRITE_ID = 401
const HOSTILE_SPRITES = {
	'cellar-rats': 402,
	'ledger-mites': 403,
	'bramble-crawlers': 404,
	'crown-hounds': 405,
	'pantry-slimes': 406,
	'armor-scraps': 407,
	'thorn-wave': 408,
	'ledger-warden': 409,
	'crown-remnant': 410
}

function clone(value) {
	return JSON.parse(JSON.stringify(value))
}

function normalizePosition(position, fallback = { x: 0, y: 0 }) {
	return {
		x: Number.isInteger(position && position.x) ? position.x : fallback.x,
		y: Number.isInteger(position && position.y) ? position.y : fallback.y
	}
}

function normalizeCombatant(input = {}) {
	const position = normalizePosition(input, { x: 0, y: 0 })
	const hp = Number.isFinite(input.hp) ? input.hp : 1
	const maxHp = Number.isFinite(input.maxHp) ? input.maxHp : hp
	return {
		id: input.id || `hostile-${position.x}-${position.y}`,
		team: input.team || 'hostile',
		name: input.name || 'Hostile',
		hp,
		maxHp,
		armor: Number.isFinite(input.armor) ? input.armor : 0,
		x: position.x,
		y: position.y,
		home: normalizePosition(input.home, position),
		spriteId: Number.isInteger(input.spriteId) ? input.spriteId : DEFAULT_HOSTILE_SPRITE_ID,
		spriteKey: input.spriteKey || null,
		facing: input.facing || 'down',
		animation: input.animation || 'idle',
		defeated: Boolean(input.defeated),
		removed: Boolean(input.removed)
	}
}

function normalizeCombatBoard(input = {}) {
	const status = ['active', 'cleared'].includes(input.status) ? input.status : 'idle'
	return {
		status,
		taskId: input.taskId || null,
		encounterId: input.encounterId || null,
		wave: Number.isInteger(input.wave) ? input.wave : 0,
		objective: input.objective || '',
		combatants: Array.isArray(input.combatants) ? input.combatants.map(normalizeCombatant) : [],
		lastActionTurn: Number.isInteger(input.lastActionTurn) ? input.lastActionTurn : 0
	}
}

function getCombatBoardSnapshot(input = {}) {
	const board = normalizeCombatBoard(input)
	return {
		status: board.status,
		taskId: board.taskId,
		encounterId: board.encounterId,
		wave: board.wave,
		objective: board.objective,
		combatants: board.status === 'active'
			? board.combatants
				.filter(combatant => !combatant.removed)
				.map(combatant => ({
					id: combatant.id,
					team: combatant.team,
					name: combatant.name,
					hp: combatant.hp,
					maxHp: combatant.maxHp,
					x: combatant.x,
					y: combatant.y,
					defeated: combatant.defeated
				}))
			: []
	}
}

function hostileCount(encounter = {}) {
	if (['boss', 'finale'].includes(encounter.enemyType)) return 1
	if ((encounter.waves || 1) > 1) return 2
	return 2
}

function isBlocked(position, map) {
	if (!map) return false
	if (position.x < 0 || position.y < 0 || position.x >= map.width || position.y >= map.height) return true
	return (map.blocked || []).some(blocked => blocked.x === position.x && blocked.y === position.y)
}

function isOccupied(position, occupied) {
	return occupied.has(`${position.x},${position.y}`)
}

function getSpawnPositions(origin, count, context = {}) {
	const map = context.map || null
	const occupied = new Set()
	occupied.add(`${origin.x},${origin.y}`)
	;(context.actors || (map && map.actors) || []).forEach(actor => occupied.add(`${actor.x},${actor.y}`))
	const offsets = [
		{ x: 1, y: 0 },
		{ x: -1, y: 0 },
		{ x: 0, y: 1 },
		{ x: 0, y: -1 },
		{ x: 2, y: 0 },
		{ x: -2, y: 0 },
		{ x: 0, y: 2 },
		{ x: 0, y: -2 },
		{ x: 1, y: 1 },
		{ x: -1, y: 1 },
		{ x: 1, y: -1 },
		{ x: -1, y: -1 }
	]
	const positions = []
	for (const offset of offsets) {
		const position = { x: origin.x + offset.x, y: origin.y + offset.y }
		if (isBlocked(position, map) || isOccupied(position, occupied)) continue
		positions.push(position)
		occupied.add(`${position.x},${position.y}`)
		if (positions.length >= count) break
	}
	while (positions.length < count) {
		const fallback = { x: origin.x + positions.length + 1, y: origin.y }
		positions.push(fallback)
	}
	return positions
}

function createCombatBoardForEncounter(encounter, context = {}) {
	const origin = normalizePosition(
		context.goblin && context.goblin.position ? context.goblin.position : context.goblin,
		{ x: 8, y: 6 }
	)
	const count = hostileCount(encounter)
	const positions = getSpawnPositions(origin, count, context)
	const perHostileHp = Math.max(1, Math.ceil((encounter.maxHp || encounter.hp || count) / count))
	const combatants = positions.map((position, index) => normalizeCombatant({
		id: `hostile-${encounter.taskId}-${encounter.wave || 1}-${index}`,
		team: 'hostile',
		name: encounter.enemy,
		hp: perHostileHp,
		maxHp: perHostileHp,
		armor: encounter.armor || 0,
		x: position.x,
		y: position.y,
		home: position,
		spriteId: HOSTILE_SPRITES[encounter.id] || DEFAULT_HOSTILE_SPRITE_ID,
		facing: 'down',
		animation: 'idle'
	}))
	return normalizeCombatBoard({
		status: 'active',
		taskId: encounter.taskId,
		encounterId: encounter.id,
		wave: encounter.wave || 1,
		objective: encounter.objective,
		combatants
	})
}

function ensureCombatBoard(story, encounter, context = {}) {
	const board = normalizeCombatBoard(story.combatBoard || {})
	if (!encounter || encounter.defeated) {
		story.combatBoard = {
			...board,
			status: 'cleared',
			combatants: board.combatants.map(combatant => ({ ...combatant, defeated: true, removed: true }))
		}
		return story.combatBoard
	}
	if (
		board.status !== 'active' ||
		board.taskId !== encounter.taskId ||
		board.encounterId !== encounter.id ||
		board.wave !== encounter.wave ||
		!board.combatants.some(combatant => combatant.team === 'hostile' && !combatant.defeated)
	) {
		story.combatBoard = createCombatBoardForEncounter(encounter, context)
		return story.combatBoard
	}
	story.combatBoard = board
	return story.combatBoard
}

function getLeadHostile(board) {
	return (board.combatants || []).find(combatant => combatant.team === 'hostile' && !combatant.defeated && combatant.hp > 0)
}

function createRemovedActorDelta(combatants) {
	return combatants.reduce((actors, combatant) => {
		actors[combatant.id] = { removed: true }
		return actors
	}, {})
}

function applyCombatBoardAction(story, encounter, action, damage = 0, turn = 0, context = {}) {
	const previousBoard = normalizeCombatBoard(story.combatBoard || {})
	let board = ensureCombatBoard(story, encounter, context)
	const removed = []
	let target = null

	if (action === 'inspect') {
		board.lastActionTurn = turn
		story.combatBoard = board
		return { story, target, worldDelta: { actors: {} } }
	}

	if (damage > 0) {
		const lead = getLeadHostile(board)
		if (lead) {
			target = { id: lead.id, name: lead.name, team: lead.team }
			lead.hp = Math.max(0, lead.hp - damage)
			lead.animation = 'idle'
			if (lead.hp === 0) {
				lead.defeated = true
				lead.removed = true
				removed.push(lead)
			}
		}
	}

	if (encounter.defeated) {
		board.status = 'cleared'
		board.combatants.forEach(combatant => {
			if (!combatant.removed) removed.push(combatant)
			combatant.hp = 0
			combatant.defeated = true
			combatant.removed = true
		})
	} else if (previousBoard.wave && previousBoard.wave !== encounter.wave) {
		board.combatants.forEach(combatant => {
			if (!combatant.removed) removed.push(combatant)
			combatant.defeated = true
			combatant.removed = true
		})
		story.combatBoard = createCombatBoardForEncounter(encounter, context)
		board = story.combatBoard
	} else {
		story.combatBoard = board
	}

	board.lastActionTurn = turn
	const actors = createRemovedActorDelta(removed)
	if (story.combatBoard.status === 'active') {
		story.combatBoard.combatants
			.filter(combatant => !combatant.defeated && !combatant.removed)
			.forEach(combatant => {
				if (actors[combatant.id]) return
				actors[combatant.id] = {
					entityType: 'HOSTILE',
					position: { x: combatant.x, y: combatant.y },
					facing: combatant.facing,
					animation: combatant.animation,
					spriteId: combatant.spriteId,
					name: combatant.name
				}
			})
	}

	return {
		story,
		target,
		worldDelta: { actors }
	}
}

function applyCombatBoardSupport(story, damage = 0) {
	const board = normalizeCombatBoard(story.combatBoard || {})
	const lead = getLeadHostile(board)
	if (!lead || damage <= 0) {
		story.combatBoard = board
		return { target: lead ? { id: lead.id, name: lead.name, team: lead.team } : null, worldDelta: { actors: {} } }
	}
	lead.hp = Math.max(0, lead.hp - damage)
	const actors = {}
	if (lead.hp === 0) {
		lead.defeated = true
		lead.removed = true
		actors[lead.id] = { removed: true }
	}
	story.combatBoard = board
	return {
		target: { id: lead.id, name: lead.name, team: lead.team },
		worldDelta: { actors }
	}
}

module.exports = {
	applyCombatBoardAction,
	applyCombatBoardSupport,
	createCombatBoardForEncounter,
	ensureCombatBoard,
	getCombatBoardSnapshot,
	normalizeCombatBoard
}
