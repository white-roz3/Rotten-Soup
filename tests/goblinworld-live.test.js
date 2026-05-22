const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const zlib = require('zlib')

const {
	createInitialWorld,
	GoblinWorld,
	createEvent,
	createWorldFromTiledMap
} = require('../server/goblinworld/liveWorld')
const {
	DEFAULT_GOBLIN_ACTIONS,
	validateGoblinDecision,
	GOBLIN_DECISION_SCHEMA
} = require('../server/goblinworld/actionSchema')
const { createGoblinWorldApp } = require('../server/goblinworld/app')
const { fallbackDecision, getControllerStatus, requestGoblinDecision, tickGoblin, tickWorld } = require('../server/goblinworld/openaiGoblin')
const { createWorldPersistence } = require('../server/goblinworld/persistence')
const {
	detectMovementLoop,
	findPath,
	getNavigationSnapshot,
	resolveQuestNavigation
} = require('../server/goblinworld/navigation')
const {
	STORY_DAY_TURNS,
	STORY_PHASES,
	STORY_TURNS_PER_PHASE,
	advanceStoryProgress,
	applyNpcCombatSupport,
	applyQuestInteraction,
	applyStoryCombatAction,
	getAllStoryText,
	getContinuationArc,
	getStorySnapshot,
	getExpandedStoryStats,
	getAllNpcSouls,
	getCompactNpcSoul,
	getNpcIdentityForActor,
	getSpeakerLinePools,
	getChattyFallbackNarration,
	getCampaignArcSequence,
	getNextContinuationArcId,
	getSceneScriptCoverage,
	normalizeStoryState,
	selectStoryNpcDialogueLine,
	setUnlock,
	syncDirectorPlan,
	CHARACTER_ARCS
} = require('../server/goblinworld/story')
const {
	CHARACTER_SPRITES,
	CORE_CHARACTER_KEYS,
	getCharacterSpriteForActor
} = require('../server/goblinworld/characterSprites')
const {
	getRegisteredMapIds,
	getMapIdForPortal,
	getPortalLinksForTiledMap,
	getRegisteredMap,
	loadRegisteredTiledMap
} = require('../server/goblinworld/mapRegistry')
const {
	CANONICAL_CLASSIC_MAP_IDS,
	applyClassicAction,
	createClassicStateFromWorld,
	createClassicGameRuntime,
	getClassicRuntimeSnapshot
} = require('../server/goblinworld/classicRuntime')

function readPngInfo(filePath) {
	const data = fs.readFileSync(filePath)
	assert.strictEqual(data.toString('ascii', 1, 4), 'PNG')
	return {
		width: data.readUInt32BE(16),
		height: data.readUInt32BE(20),
		colorType: data.readUInt8(25)
	}
}

function paethPredictor(left, up, upperLeft) {
	const p = left + up - upperLeft
	const pa = Math.abs(p - left)
	const pb = Math.abs(p - up)
	const pc = Math.abs(p - upperLeft)
	if (pa <= pb && pa <= pc) return left
	return pb <= pc ? up : upperLeft
}

function readPngRgba(filePath) {
	const data = fs.readFileSync(filePath)
	let offset = 8
	const idat = []
	let width = 0
	let height = 0
	let colorType = 0
	while (offset < data.length) {
		const length = data.readUInt32BE(offset)
		const type = data.toString('ascii', offset + 4, offset + 8)
		const chunk = data.slice(offset + 8, offset + 8 + length)
		if (type === 'IHDR') {
			width = chunk.readUInt32BE(0)
			height = chunk.readUInt32BE(4)
			colorType = chunk.readUInt8(9)
		}
		if (type === 'IDAT') idat.push(chunk)
		offset += length + 12
	}
	assert.strictEqual(colorType, 6, `${path.basename(filePath)} must be RGBA for frame-diff validation`)
	const inflated = zlib.inflateSync(Buffer.concat(idat))
	const bytesPerPixel = 4
	const stride = width * bytesPerPixel
	const pixels = Buffer.alloc(height * stride)
	let inputOffset = 0
	for (let y = 0; y < height; y++) {
		const filter = inflated[inputOffset++]
		for (let x = 0; x < stride; x++) {
			const raw = inflated[inputOffset++]
			const left = x >= bytesPerPixel ? pixels[y * stride + x - bytesPerPixel] : 0
			const up = y > 0 ? pixels[(y - 1) * stride + x] : 0
			const upperLeft = y > 0 && x >= bytesPerPixel ? pixels[(y - 1) * stride + x - bytesPerPixel] : 0
			let value = raw
			if (filter === 1) value = raw + left
			if (filter === 2) value = raw + up
			if (filter === 3) value = raw + Math.floor((left + up) / 2)
			if (filter === 4) value = raw + paethPredictor(left, up, upperLeft)
			pixels[y * stride + x] = value & 0xff
		}
	}
	return { width, height, pixels }
}

function countFramePixelDiffs(rgba, row, leftColumn, rightColumn) {
	let diffs = 0
	for (let y = 0; y < 32; y++) {
		for (let x = 0; x < 32; x++) {
			const left = ((row * 32 + y) * rgba.width + leftColumn * 32 + x) * 4
			const right = ((row * 32 + y) * rgba.width + rightColumn * 32 + x) * 4
			if (
				rgba.pixels[left] !== rgba.pixels[right] ||
				rgba.pixels[left + 1] !== rgba.pixels[right + 1] ||
				rgba.pixels[left + 2] !== rgba.pixels[right + 2] ||
				rgba.pixels[left + 3] !== rgba.pixels[right + 3]
			) {
				diffs += 1
			}
		}
	}
	return diffs
}

function test(name, fn) {
	Promise.resolve()
		.then(fn)
		.then(() => {
			console.log(`ok - ${name}`)
		})
		.catch(error => {
			console.error(`not ok - ${name}`)
			console.error(error.stack || error.message)
			process.exitCode = 1
		})
}

function waitForListening(server) {
	if (server.listening) return Promise.resolve()
	return new Promise((resolve, reject) => {
		server.once('listening', resolve)
		server.once('error', reject)
	})
}

function getBadFeedEvents(events = []) {
	const banned = new Set(['story', 'quest', 'discovery', 'goblinworld', 'scene', 'narrator', 'battle'])
	return events.filter(event => {
		const speaker = event && event.feed && event.feed.speaker
		return speaker && banned.has(String(speaker).toLowerCase())
	})
}

async function readFirstSseData(url) {
	const response = await fetch(url)
	const reader = response.body.getReader()
	const decoder = new TextDecoder()
	let text = ''
	for (let index = 0; index < 20 && !text.includes('data: '); index += 1) {
		const chunk = await reader.read()
		if (chunk.done) break
		text += decoder.decode(chunk.value, { stream: true })
	}
	await reader.cancel()
	const dataLine = text.split(/\r?\n/).find(line => line.startsWith('data: '))
	assert.ok(dataLine, `Expected SSE data line in ${text}`)
	return JSON.parse(dataLine.slice('data: '.length))
}

test('validates a structured goblin decision and strips hidden reasoning fields', () => {
	const decision = validateGoblinDecision(
		{
			action: 'move',
			target: { x: 11, y: 12 },
			public_rationale: 'The berry scent is strongest east of the well.',
			goblin_utterance: 'I smell snacks. I proceed with dignity.',
			memory_update: 'The well is a useful landmark.',
			chain_of_thought: 'private text that must not be exposed'
		},
		['move', 'wait', 'inspect']
	)

	assert.deepStrictEqual(decision, {
		action: 'move',
		target: { x: 11, y: 12 },
		publicRationale: 'The berry scent is strongest east of the well.',
		goblinUtterance: 'I smell snacks. I proceed with dignity.',
		memoryUpdate: 'The well is a useful landmark.'
	})
	assert.strictEqual(Object.prototype.hasOwnProperty.call(decision, 'chain_of_thought'), false)
	assert.strictEqual(GOBLIN_DECISION_SCHEMA.name, 'goblin_decision')
})

test('validates classic roguelike verbs for autonomous Chatty decisions', () => {
	;['examine', 'climb', 'pickup', 'equip', 'use', 'fire', 'rest', 'flee', 'reposition'].forEach(action => {
		const decision = validateGoblinDecision(
			{
				action,
				target: { name: 'classic target' },
				public_rationale: 'Chatty is playing the classic roguelike verb set.',
				goblin_utterance: 'Old game verb, new goblin feet.',
				memory_update: 'Classic verb accepted.'
			},
			DEFAULT_GOBLIN_ACTIONS
		)
		assert.strictEqual(decision.action, action)
	})
})

test('validates core character sprite manifest and generated sheets', () => {
	assert.deepStrictEqual(CORE_CHARACTER_KEYS, [
		'chatty',
		'bartender',
		'mayor',
		'dwarf',
		'marketTrader',
		'hoodedVillager',
		'forestWanderer',
		'lanternKeeper',
		'stoneGuard'
	])

	CORE_CHARACTER_KEYS.forEach(spriteKey => {
		const sprite = CHARACTER_SPRITES[spriteKey]
		const sheetPath = path.join(__dirname, '..', 'public', sprite.sheet)
		const png = readPngInfo(sheetPath)
		assert.strictEqual(sprite.frameWidth, 32)
		assert.strictEqual(sprite.frameHeight, 32)
		assert.deepStrictEqual(sprite.directions, ['down', 'left', 'right', 'up'])
		assert.deepStrictEqual(sprite.animations.walk.frames, [0, 1, 2, 3])
		assert.strictEqual(png.width, 128)
		assert.strictEqual(png.height, 128)
		assert.ok([4, 6].includes(png.colorType), `${spriteKey} sheet must have alpha`)
		const rgba = readPngRgba(sheetPath)
		for (let row = 0; row < 4; row++) {
			const animatedFrameDiffs = [1, 2, 3].map(column => countFramePixelDiffs(rgba, row, 0, column))
			assert.ok(
				animatedFrameDiffs.some(diff => diff >= 40),
				`${spriteKey} direction row ${row} must contain visible walk-cycle variation`
			)
		}
	})
})

test('rejects invalid actions before they can mutate the shared world', () => {
	assert.throws(
		() =>
			validateGoblinDecision(
				{
					action: 'teleport',
					target: { x: 999, y: 999 },
					public_rationale: 'No walking today.',
					goblin_utterance: 'Blink.',
					memory_update: ''
				},
				['move', 'wait']
			),
		/Unsupported goblin action/
	)
})

test('applies legal movement, records public rationale, and preserves event order', () => {
	const world = new GoblinWorld(
		createInitialWorld({
			map: {
				name: 'Test Burrow',
				width: 4,
				height: 4,
				tiles: [
					[1, 1, 1, 1],
					[1, 1, 1, 1],
					[1, 1, 1, 1],
					[1, 1, 1, 1]
				],
				blocked: []
			},
			goblin: { x: 1, y: 1 }
		})
	)

	const event = world.applyDecision({
		action: 'move',
		target: { x: 2, y: 1 },
		publicRationale: 'A dry tile is safer than a suspicious puddle.',
		goblinUtterance: 'Tiny strategic step.',
		memoryUpdate: 'East is walkable.'
	})

	const snapshot = world.getSnapshot()
	assert.strictEqual(snapshot.turn, 1)
	assert.deepStrictEqual(snapshot.goblin.position, { x: 2, y: 1 })
	assert.strictEqual(snapshot.goblin.name, 'Chatty, the chosen one')
	assert.strictEqual(snapshot.goblin.spriteKey, 'chatty')
	assert.strictEqual(snapshot.goblin.facing, 'right')
	assert.strictEqual(snapshot.goblin.animation, 'walk')
	assert.strictEqual(snapshot.events[0].id, event.id)
	assert.strictEqual(snapshot.events[0].publicRationale, 'A dry tile is safer than a suspicious puddle.')
	assert.strictEqual(snapshot.events[0].controller, 'openai')
	assert.deepStrictEqual(snapshot.events[0].worldDelta.goblin, {
		position: { x: 2, y: 1 },
		facing: 'right',
		animation: 'walk',
		movementState: 'traveling'
	})
	assert.strictEqual(snapshot.events[0].worldDelta.runtime.mode, 'classic-autonomous')
	assert.strictEqual(snapshot.events[0].worldDelta.runtime.currentMapId, snapshot.map.id)
	assert.deepStrictEqual(snapshot.memory, ['East is walkable.'])
	assert.strictEqual(snapshot.events.length, 1)
})

test('non-movement decisions publish an idle movement state for the frontend', () => {
	const world = new GoblinWorld(
		createInitialWorld({
			map: {
				name: 'Still Yard',
				width: 4,
				height: 4,
				tiles: [
					[1, 1, 1, 1],
					[1, 1, 1, 1],
					[1, 1, 1, 1],
					[1, 1, 1, 1]
				],
				blocked: []
			},
			goblin: { x: 1, y: 1 }
		})
	)

	const event = world.applyDecision({
		action: 'wait',
		publicRationale: 'Chatty pauses to listen.',
		goblinUtterance: 'The nearby voice is talking, so I keep the cloak still.',
		controller: 'dialogue-hold'
	})

	assert.strictEqual(event.worldDelta.goblin.animation, 'idle')
	assert.strictEqual(event.worldDelta.goblin.movementState, 'speaking')
	assert.strictEqual(world.getSnapshot().goblin.movementState, 'speaking')
})

test('live decisions apply classic pickup, equipment, and item use to persistent runtime state', () => {
	const world = new GoblinWorld(createInitialWorld({
		map: {
			id: 'classicLiveTest',
			name: 'Classic Live Test',
			width: 6,
			height: 6,
			blocked: [],
			actors: [
				{ id: 'item-sword', name: 'Bronze Sword', entityType: 'SWORD', x: 2, y: 2, spriteId: 35 },
				{ id: 'item-potion', name: 'Health Potion', entityType: 'HEALTH_POTION', x: 2, y: 2, spriteId: 488 }
			]
		},
		goblin: { x: 2, y: 2 }
	}))

	world.applyDecision({
		action: 'pickup',
		target: {},
		publicRationale: 'Useful things belong in pockets.',
		goblinUtterance: '',
		memoryUpdate: ''
	})
	let snapshot = world.getSnapshot()
	assert.strictEqual(snapshot.map.actors.some(actor => actor.id === 'item-sword'), false)
	assert.strictEqual(snapshot.runtime.inventorySummary.some(item => item.id === 'item-sword'), true)
	assert.strictEqual(snapshot.events[0].worldDelta.items.removed.includes('item-sword'), true)

	world.applyDecision({
		action: 'equip',
		target: { id: 'item-sword' },
		publicRationale: 'The blade makes the body less negotiable.',
		goblinUtterance: '',
		memoryUpdate: ''
	})
	snapshot = world.getSnapshot()
	assert.strictEqual(snapshot.runtime.equipmentSummary.weapon.id, 'item-sword')

	world.state.classic.player.hp = 5
	world.applyDecision({
		action: 'use',
		target: { id: 'item-potion', type: 'HEALTH_POTION' },
		publicRationale: 'A chosen body should keep its juice inside.',
		goblinUtterance: '',
		memoryUpdate: ''
	})
	snapshot = world.getSnapshot()
	assert.ok(snapshot.runtime.playerStats.hp > 5)
	assert.strictEqual(snapshot.runtime.inventorySummary.some(item => item.id === 'item-potion'), false)
})

test('derives public tasks for the live task panel', () => {
	const world = new GoblinWorld(
		createInitialWorld({
			map: {
				name: 'Task Yard',
				width: 5,
				height: 5,
				tiles: [
					[1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1]
				],
				actors: [
					{
						id: 'npc-tasker',
						name: 'Task Clerk',
						entityType: 'NPC',
						dialog: 'BARTENDER',
						wanders: false,
						x: 3,
						y: 2,
						home: { x: 3, y: 2 },
						spriteId: 400
					}
				],
				blocked: []
			},
			goblin: { x: 2, y: 2 }
		})
	)

	world.applyDecision({
		action: 'wait',
		publicRationale: 'Listening is useful before moving.',
		goblinUtterance: 'I take inventory of trouble.',
		memoryUpdate: 'Task Clerk is nearby.'
	})

	const tasks = world.getSnapshot().tasks
	assert.deepStrictEqual(tasks.map(task => task.id).slice(0, 5), [
		'phase-1-test-body',
		'phase-1-find-voice',
		'phase-1-learn-name',
		'phase-1-reach-town',
		'phase-1-first-fight'
	])
	assert.ok(tasks.length >= 8)
	assert.strictEqual(tasks[0].status, 'active')
	assert.strictEqual(tasks[0].title, 'Wake up and test movement')
	assert.strictEqual(tasks[0].label, tasks[0].title)
	assert.match(tasks[0].hint, /Move through safe nearby tiles/)
	assert.strictEqual(tasks[1].status, 'locked')
	assert.strictEqual(tasks[4].target.enemy, 'Cellar Rat')
})

test('expanded story bible has dense content, recurring arcs, and no dash glyphs', () => {
	const stats = getExpandedStoryStats()
	assert.strictEqual(STORY_PHASES.length, 8)
	assert.strictEqual(STORY_PHASES[0].title, 'The Body Wakes Up Wrong')
	assert.strictEqual(STORY_PHASES[7].title, 'Dawn Of The Chosen One')
	assert.ok(stats.tasks >= 56)
	assert.ok(stats.lines >= 500)
	assert.ok(stats.characterArcs >= 8)
	;['mayor', 'bartender', 'dwarf', 'marketTrader', 'hoodedVillager', 'forestWanderer', 'lanternKeeper', 'stoneGuard', 'hiddenGoblinOne', 'hiddenGoblinTwo', 'hiddenGoblinThree'].forEach(key => {
		assert.ok(CHARACTER_ARCS[key], `${key} should have a recurring arc`)
		assert.strictEqual(CHARACTER_ARCS[key].beats.length, 8)
	})
	const storyText = getAllStoryText().join('\n')
	assert.strictEqual(/[—–]/.test(storyText), false)
	assert.strictEqual(/Private sympathy needs to become public help|Chatty has earned a little more truth|Trust is thin here|Proof is still owed|Trust makes the guidance braver/.test(storyText), false)
	assert.strictEqual(/Here is the next useful thing|That matters, Chatty|You have my help, Chatty|Chatty, I am with you on this/.test(storyText), false)
	Object.entries(getSpeakerLinePools()).forEach(([poolKey, lines]) => {
		assert.strictEqual(new Set(lines).size, lines.length, `${poolKey} should not duplicate a line`)
		const category = poolKey.split(':').pop()
		lines.forEach(line => {
			assert.strictEqual(
				/Dawn has more roads than the crown remembers\. Private sympathy needs to become public help/.test(line),
				false,
				`${poolKey} should not concatenate unrelated dialogue fragments`
			)
			if (category !== 'arc') {
				assert.match(line, /Chatty/, `${poolKey} should speak directly to Chatty`)
			}
		})
	})
})

test('story state advances by time and task completion gates', () => {
	const world = new GoblinWorld(
		createInitialWorld({
			turn: STORY_TURNS_PER_PHASE - 1,
			goblin: { x: 2, y: 2 }
		})
	)

	const beforeEvents = world.advanceStory()
	assert.strictEqual(world.getSnapshot().story.phaseId, 'phase-1')
	assert.ok(beforeEvents.some(event => event.type === 'phase' && event.action === 'begin'))

	world.state.turn = STORY_TURNS_PER_PHASE
	const afterEvents = world.advanceStory()
	const snapshot = world.getSnapshot()
	assert.strictEqual(snapshot.story.phaseId, 'phase-2')
	assert.ok(snapshot.story.completedTasks.includes('phase-1-first-fight'))
	assert.ok(afterEvents.some(event => event.type === 'phase' && event.action === 'complete'))
	assert.ok(afterEvents.some(event => event.type === 'phase' && event.message === 'Phase 2: The Ledger Of Small Chains'))
})

test('story snapshot exposes a current bridge quest when phase tasks are complete before the time gate', () => {
	const phase = STORY_PHASES.find(candidate => candidate.id === 'phase-5')
	const world = new GoblinWorld(createInitialWorld({
		turn: 16221,
		story: {
			phaseId: 'phase-5',
			phaseStartedTurn: 14400,
			startedTurn: 0,
			completedTasks: phase.tasks.map(task => task.id)
		}
	}))
	const snapshot = world.getSnapshot()

	assert.strictEqual(snapshot.tasks[0].status, 'active')
	assert.strictEqual(snapshot.tasks[0].id, 'phase-5-bridge-objective')
	assert.strictEqual(snapshot.tasks[0].title, 'Keep the banner visible')
	assert.match(snapshot.tasks[0].hint, /town is reacting/i)
	assert.strictEqual(snapshot.story.activeTasks[0].id, 'phase-5-bridge-objective')
	assert.strictEqual(snapshot.story.currentObjective, 'Keep the banner visible')
})

test('story tasks can complete from state predicates before timed fallback', () => {
	const world = new GoblinWorld(
		createInitialWorld({
			turn: 1,
			map: {
				width: 5,
				height: 5,
				tileSize: 32,
				tileLayers: [{ name: 'Ground', data: new Array(25).fill(1) }],
				tiles: new Array(5).fill(null).map(() => new Array(5).fill(1)),
				actors: [],
				blocked: []
			},
			goblin: { x: 2, y: 2 }
		})
	)

	world.applyDecision({
		action: 'move',
		target: { x: 3, y: 2 },
		publicRationale: 'The body must prove it can move.',
		goblinUtterance: 'Feet report for duty.'
	})
	world.advanceStory()

	assert.ok(world.getSnapshot().story.completedTasks.includes('phase-1-test-body'))
})

test('quest interaction applies concrete inspect and item effects only when reached', () => {
	const inspectTask = {
		id: 'phase-1-inspect-well',
		title: 'Inspect the well and the wall scribbles',
		eventType: 'discovery',
		target: { kind: 'inspect', name: 'well-scribbles' }
	}
	const inspected = applyQuestInteraction(normalizeStoryState(), inspectTask, {
		action: 'inspect',
		reached: true,
		turn: 12
	})

	assert.strictEqual(inspected.applied, true)
	assert.strictEqual(inspected.story.facts.wellScribbles, true)
	assert.ok(inspected.story.callbacks.includes('quest-action:phase-1-inspect-well'))
	assert.strictEqual(inspected.eventPatch.type, 'discovery')
	assert.doesNotMatch(inspected.eventPatch.message, /\d+,\d+|phase-1-inspect-well/)

	const itemTask = {
		id: 'phase-2-recover-ledger',
		title: 'Recover the Goblin Ledger from a cellar',
		eventType: 'quest',
		target: { kind: 'item', name: 'Goblin Ledger' }
	}
	const missed = applyQuestInteraction(normalizeStoryState(), itemTask, {
		action: 'pick_up',
		reached: false,
		turn: 13
	})
	const pickedUp = applyQuestInteraction(normalizeStoryState(), itemTask, {
		action: 'pick_up',
		reached: true,
		turn: 14
	})

	assert.strictEqual(missed.applied, false)
	assert.strictEqual(missed.story.items.goblinLedger, undefined)
	assert.strictEqual(pickedUp.story.items.goblinLedger, true)
	assert.ok(pickedUp.eventPatch.worldDelta.story.items.goblinLedger)
})

test('story snapshots include a valid current scene', () => {
	const snapshot = getStorySnapshot({}, 0)

	assert.ok(snapshot.scene)
	assert.strictEqual(snapshot.scene.phaseId, 'phase-1')
	assert.ok(snapshot.scene.sceneId)
	assert.ok(['awakening', 'travel', 'dialogue', 'quest', 'combat', 'discovery', 'rally', 'finale'].includes(snapshot.scene.sceneType))
	assert.strictEqual(Object.prototype.hasOwnProperty.call(snapshot.scene, 'lastSceneId'), false)
})

test('malformed old scene saves migrate into a public-safe travel scene', () => {
	const snapshot = getStorySnapshot({
		scene: {
			sceneId: '',
			sceneType: 'bad-type',
			participants: 'everyone'
		}
	}, 4)

	assert.ok(snapshot.scene.sceneId)
	assert.strictEqual(snapshot.scene.sceneType, 'travel')
	assert.deepStrictEqual(snapshot.scene.participants, ['chatty'])
})

test('scene director selects combat above every other story pressure', () => {
	const result = advanceStoryProgress({
		phaseId: 'phase-1',
		lastPhaseAnnounced: 'phase-1',
		completedTasks: [
			'phase-1-test-body',
			'phase-1-find-voice',
			'phase-1-learn-name',
			'phase-1-reach-town'
		],
		encounters: {
			'phase-1-first-fight': {
				id: 'cellar-rats',
				taskId: 'phase-1-first-fight',
				hp: 3,
				defeated: false
			}
		}
	}, 32, {
		allowAutoProgress: false,
		goblin: { position: { x: 2, y: 2 } },
		nearbyActors: [{ id: 'actor-165', name: 'Bartender', entityType: 'NPC', dialog: 'BARTENDER', x: 3, y: 2 }]
	})

	assert.strictEqual(result.story.scene.sceneType, 'combat')
	assert.strictEqual(result.story.scene.questId, 'phase-1-first-fight')
	assert.ok(result.story.scene.participants.includes('chatty'))
	assert.ok(result.events.some(event => event.type === 'scene' && event.action === 'begin'))
})

test('scene director uses dialogue only when a quest voice is nearby', () => {
	const baseStory = {
		lastPhaseAnnounced: 'phase-1',
		completedTasks: ['phase-1-test-body']
	}
	const nearbyActor = { id: 'actor-165', name: 'Bartender', entityType: 'NPC', dialog: 'BARTENDER', x: 3, y: 2 }
	const nearby = advanceStoryProgress(baseStory, 12, {
		allowAutoProgress: false,
		goblin: { position: { x: 2, y: 2 } },
		nearbyActors: [nearbyActor]
	})
	const far = advanceStoryProgress(baseStory, 12, {
		allowAutoProgress: false,
		goblin: { position: { x: 2, y: 2 } },
		nearbyActors: [{ ...nearbyActor, x: 20, y: 20 }]
	})

	assert.strictEqual(nearby.story.scene.sceneType, 'dialogue')
	assert.strictEqual(nearby.story.scene.questId, 'phase-1-find-voice')
	assert.deepStrictEqual(nearby.story.scene.participants, ['chatty', 'actor-165'])
	assert.strictEqual(far.story.scene.sceneType, 'travel')
	assert.strictEqual(far.story.scene.questId, 'phase-1-find-voice')
})

test('scene events do not duplicate until the active quest changes', () => {
	const context = {
		allowAutoProgress: false,
		goblin: { position: { x: 2, y: 2 } },
		nearbyActors: [{ id: 'actor-165', name: 'Bartender', entityType: 'NPC', dialog: 'BARTENDER', x: 3, y: 2 }]
	}
	const first = advanceStoryProgress({
		lastPhaseAnnounced: 'phase-1',
		completedTasks: ['phase-1-test-body']
	}, 20, context)
	const second = advanceStoryProgress(first.story, 21, context)
	const changed = advanceStoryProgress({
		...second.story,
		completedTasks: ['phase-1-test-body', 'phase-1-find-voice']
	}, 22, context)

	assert.strictEqual(first.events.filter(event => event.type === 'scene').length, 1)
	assert.strictEqual(second.events.filter(event => event.type === 'scene').length, 0)
	assert.strictEqual(changed.events.filter(event => event.type === 'scene').length, 1)
	assert.strictEqual(changed.story.scene.questId, 'phase-1-learn-name')
})

test('optional story tasks can expire without blocking a phase', () => {
	const phase = STORY_PHASES[1]
	const requiredTaskIds = phase.tasks.filter(task => task.required).map(task => task.id)
	const result = advanceStoryProgress(
		{
			phaseId: 'phase-2',
			phaseStartedTurn: STORY_TURNS_PER_PHASE,
			completedTasks: requiredTaskIds
		},
		STORY_TURNS_PER_PHASE * 2 - 100,
		{ allowAutoProgress: false }
	)

	assert.ok(result.story.failedTasks.includes('phase-2-hide-ledger-copy'))
})

test('old story saves migrate into the expanded story schema', () => {
	const migrated = normalizeStoryState({
		phaseId: 'phase-3',
		completedTasks: ['phase-1-test-body'],
		encounters: {
			'phase-3-bramble-crawlers': {
				enemy: 'Bramble Crawler',
				hp: 2,
				defeated: false
			}
		}
	})

	assert.ok(migrated.facts)
	assert.ok(migrated.items)
	assert.ok(migrated.relationships.mayor)
	assert.ok(Array.isArray(migrated.failedTasks))
	assert.ok(Array.isArray(migrated.callbacks))
	assert.strictEqual(migrated.encounters['phase-3-bramble-crawlers'].id, 'bramble-crawlers')
})

test('dialogue picker avoids fast repetition and relationships unlock callbacks', () => {
	const actor = { name: 'Bartender', dialog: 'BARTENDER' }
	const first = selectStoryNpcDialogueLine(actor, normalizeStoryState(), 10)
	const second = selectStoryNpcDialogueLine(actor, first.story, 20)

	assert.notStrictEqual(first.line, second.line)
	assert.ok(second.story.relationships.bartender.trust >= 3)
	assert.ok(second.story.callbacks.includes('ally-bartender'))
})

test('dialogue picker broadens story lines before repeating the same NPC line', () => {
	const actor = { name: 'Forest Wanderer', storyKey: 'forestWanderer' }
	let story = normalizeStoryState({
		phaseId: 'phase-8',
		relationships: {
			forestWanderer: {
				trust: 3,
				suspicion: 0,
				talks: 5,
				stance: 'warm'
			}
		}
	}, 24000)
	const spoken = []

	for (let index = 0; index < 6; index += 1) {
		const result = selectStoryNpcDialogueLine(actor, story, 24000 + index, { category: 'allyRecruitment' })
		story = result.story
		spoken.push(result.line)
	}

	assert.strictEqual(new Set(spoken).size, spoken.length)
})

test('dialogue picker still provides a Chatty follow-up when falling back to rotated dialogue banks', () => {
	const actor = { name: 'NPC', storyKey: 'forestWanderer', spriteKey: 'forestWanderer', entityType: 'NPC' }
	const turn = 500
	const story = normalizeStoryState({
		phaseId: 'phase-1',
		scene: {
			sceneId: 'phase-1.bridge.travel',
			sceneType: 'travel',
			phaseId: 'phase-1',
			questId: 'phase-1-bridge-objective',
			locationZone: 'lower-town',
			title: 'Keep learning the body',
			summary: 'Chatty is scouting.',
			participants: ['chatty'],
			beats: ['route'],
			status: 'active',
			startedTurn: 0,
			updatedTurn: 0
		},
		dialogue: {
			// Exhaust the scripted lines for this conversation id so the picker uses the rotated bank fallback.
			spokenLines: [
				'phase-1.bridge.travel::forestWanderer::line-0',
				'phase-1.bridge.travel::forestWanderer::line-1',
				'phase-1.bridge.travel::forestWanderer::line-2',
				'phase-1.bridge.travel::forestWanderer::line-3',
				'phase-1.bridge.travel::forestWanderer::line-4',
				'phase-1.bridge.travel::forestWanderer::line-5'
			]
		}
	}, turn)

	const result = selectStoryNpcDialogueLine(actor, story, turn, {
		scene: story.scene,
		allowAmbientDialogue: true
	})
	assert.ok(result.line)
	assert.ok(result.followUp)
	assert.strictEqual(result.followUp.actor, 'Chatty, the chosen one')
	assert.match(result.followUp.line, /^Chatty:\s+/)
})

test('maps live actors into named NPC story identities with combat roles', () => {
	const guard = getNpcIdentityForActor({
		name: 'NPC',
		entityType: 'NPC',
		dialog: 'STONE_GUARD',
		spriteKey: 'stoneGuard'
	})
	const trader = getNpcIdentityForActor({
		name: 'Market Trader',
		entityType: 'NPC',
		spriteKey: 'marketTrader'
	})

	assert.deepStrictEqual(guard, {
		storyKey: 'stoneGuard',
		displayName: 'Stone Guard',
		faction: 'mulberry',
		role: 'Law bound skeptic who becomes a defensive ally.',
		homeZone: 'armory',
		combatRole: 'defender',
		combatAction: 'block'
	})
	assert.strictEqual(trader.displayName, 'Market Trader')
	assert.strictEqual(trader.homeZone, 'market')
	assert.strictEqual(trader.combatRole, 'supplier')
})

test('every recurring NPC has a comprehensive SOUL.md file for conversation guidance', () => {
	const souls = getAllNpcSouls()
	const characterKeys = Object.keys(CHARACTER_ARCS).sort()

	assert.deepStrictEqual(Object.keys(souls).sort(), characterKeys)
	characterKeys.forEach(key => {
		const soul = souls[key]
		const character = CHARACTER_ARCS[key]
		assert.ok(soul.path.endsWith(`${key}/SOUL.md`), soul.path)
		assert.ok(soul.markdown.includes(`# ${character.displayName} SOUL`), key)
		;[
			'Runtime summary',
			'Core identity',
			'Inner contradiction',
			'Drives and fears',
			'Personality',
			'Conversation rules',
			'Relationship with Chatty',
			'Relationship ladder',
			'Quest behavior',
			'Scene behavior',
			'Route failure behavior',
			'Emotional triggers',
			'Speech patterns',
			'Chatty reply hooks',
			'Example exchanges',
			'Never say'
		].forEach(section => {
			assert.ok(soul.sections[section], `${key} missing ${section}`)
		})
		assert.ok(soul.compact.summary.length > 40, `${key} compact summary is too thin`)
		assert.ok(soul.compact.innerContradiction.length > 30, `${key} needs an inner contradiction`)
		assert.ok(soul.compact.drivesAndFears.length >= 4, `${key} needs drives and fears`)
		assert.ok(soul.compact.conversationRules.length >= 3, `${key} needs conversation rules`)
		assert.ok(soul.compact.sceneBehavior.length >= 4, `${key} needs scene behavior`)
		assert.ok(soul.compact.relationshipLadder.length >= 4, `${key} needs a relationship ladder`)
		assert.ok(soul.compact.speechPatterns.length >= 3, `${key} needs speech patterns`)
		assert.ok(soul.compact.chattyReplyHooks.length >= 5, `${key} needs enough Chatty reply hooks for real exchanges`)
		assert.ok(soul.compact.exampleExchanges.length >= 2, `${key} needs example exchanges`)
		assert.ok(soul.compact.neverSay.length >= 4, `${key} needs explicit voice guardrails`)
		assert.doesNotMatch(soul.markdown, /[—–]/, `${key} uses forbidden dash glyphs`)
	})
})

test('nearby NPC soul guidance is included in the compact model snapshot', async () => {
	const world = new GoblinWorld(createInitialWorld({
		map: {
			name: 'Soul Market',
			width: 5,
			height: 5,
			tiles: [
				[1, 1, 1, 1, 1],
				[1, 1, 1, 1, 1],
				[1, 1, 1, 1, 1],
				[1, 1, 1, 1, 1],
				[1, 1, 1, 1, 1]
			],
			actors: [
				{
					id: 'market-trader',
					name: 'Market Trader',
					entityType: 'NPC',
					dialog: 'MARKET_TRADER',
					x: 3,
					y: 2,
					spriteId: 400
				}
			],
			blocked: []
		},
		goblin: { x: 2, y: 2 }
	}))

	await requestGoblinDecision(world.getSnapshot(), {
		provider: 'anthropic',
		apiKey: 'test-key',
		model: 'claude-haiku-4-5',
		fetch: async (url, request) => {
			const body = JSON.parse(request.body)
			const visibleWorld = JSON.parse(body.messages[0].content.replace('Current world snapshot:\n', ''))
			const trader = visibleWorld.nearbyActors.find(actor => actor.name === 'Market Trader')
			assert.ok(trader)
			assert.ok(trader.soul)
			assert.match(trader.soul.summary, /profit|logistics|supply/i)
			assert.match(trader.soul.innerContradiction, /profit|help|survival|courage/i)
			assert.ok(Array.isArray(trader.soul.conversationRules))
			assert.ok(Array.isArray(trader.soul.sceneBehavior))
			assert.ok(Array.isArray(trader.soul.relationshipLadder))
			assert.strictEqual(Object.prototype.hasOwnProperty.call(trader.soul, 'markdown'), false)
			return {
				ok: true,
				json: async () => ({
					content: [
						{
							type: 'tool_use',
							name: 'choose_goblin_action',
							input: {
								action: 'wait',
								target: { x: null, y: null, id: null, name: null },
								public_rationale: 'The trader is useful and suspicious.',
								goblin_utterance: 'I count the coins and the lies.',
								memory_update: 'Trader carries logistics in a grin.'
							}
						}
					]
				})
			}
		}
	})
})

test('model prompts explicitly instruct the controller to use soul guidance for real conversations', async () => {
	const world = new GoblinWorld(createInitialWorld({
		map: {
			name: 'Soul Tavern',
			width: 5,
			height: 5,
			tiles: [
				[1, 1, 1, 1, 1],
				[1, 1, 1, 1, 1],
				[1, 1, 1, 1, 1],
				[1, 1, 1, 1, 1],
				[1, 1, 1, 1, 1]
			],
			actors: [
				{
					id: 'bartender',
					name: 'Bartender',
					entityType: 'NPC',
					dialog: 'BARTENDER',
					x: 3,
					y: 2,
					spriteId: 400
				}
			],
			blocked: []
		},
		goblin: { x: 2, y: 2 }
	}))

	await requestGoblinDecision(world.getSnapshot(), {
		provider: 'anthropic',
		apiKey: 'test-key',
		model: 'claude-haiku-4-5',
		fetch: async (url, request) => {
			const body = JSON.parse(request.body)
			assert.match(body.system, /nearbyActors\[\]\.soul|soul guidance/i)
			assert.match(body.system, /back-and-forth|Chatty reply|conversation/i)
			assert.match(body.system, /not random|distinct personality|unique personality/i)
			return {
				ok: true,
				json: async () => ({
					content: [
						{
							type: 'tool_use',
							name: 'choose_goblin_action',
							input: {
								action: 'wait',
								target: { x: null, y: null, id: null, name: null },
								public_rationale: 'The bartender has a distinct voice and a useful clue.',
								goblin_utterance: 'I listen for the joke with a clue hiding inside it.',
								memory_update: 'Bartender hides courage under jokes and soup.'
							}
						}
					]
				})
			}
		}
	})
})

test('scripted conversations consume ordered lines without repeating the same NPC line', () => {
	const actor = { id: 'bar-1', name: 'Bartender', dialog: 'BARTENDER' }
	let story = normalizeStoryState({
		phaseId: 'phase-2',
		lastPhaseAnnounced: 'phase-2'
	}, 100)
	const scene = {
		sceneId: 'phase-2.phase-2-recover-ledger.dialogue',
		sceneType: 'dialogue',
		phaseId: 'phase-2',
		questId: 'phase-2-recover-ledger'
	}
	const spoken = []
	const lineIds = []

	for (let index = 0; index < 4; index += 1) {
		const result = selectStoryNpcDialogueLine(actor, story, 100 + index, {
			scene,
			activeTask: { id: 'phase-2-recover-ledger', title: 'Recover the Goblin Ledger from a cellar' }
		})
		story = result.story
		spoken.push(result.line)
		lineIds.push(result.lineId)
		assert.strictEqual(result.conversationId, 'phase-2.phase-2-recover-ledger.dialogue::bartender')
	}

	assert.strictEqual(new Set(spoken).size, spoken.length)
	assert.strictEqual(new Set(lineIds).size, lineIds.length)
	assert.strictEqual(story.dialogue.activeConversation.speakerId, 'bartender')
	assert.strictEqual(story.dialogue.activeConversation.questId, 'phase-2-recover-ledger')
	assert.ok(story.dialogue.spokenLines.length >= 4)
})

test('dialogue scenes choose quest-relevant scripted lines instead of vague philosophy', () => {
	const result = selectStoryNpcDialogueLine(
		{ id: 'mayor-1', name: 'Mayor Leonard', dialog: 'MAYOR_LEONARD' },
		normalizeStoryState({
			phaseId: 'phase-2',
			lastPhaseAnnounced: 'phase-2'
		}, 120),
		120,
		{
			scene: {
				sceneId: 'phase-2.phase-2-speak-mayor.dialogue',
				sceneType: 'dialogue',
				phaseId: 'phase-2',
				questId: 'phase-2-speak-mayor'
			},
			activeTask: {
				id: 'phase-2-speak-mayor',
				title: 'Speak to Mayor Leonard about the missing ledger'
			}
		}
	)

	assert.match(result.line, /ledger|book|cellar|names|office/i)
	assert.doesNotMatch(result.line, /Dawn has more roads|public help|little more truth/i)
})

test('scene scripts take priority over broad phase dialogue and include Chatty replies', () => {
	const result = selectStoryNpcDialogueLine(
		{ id: 'bar-1', name: 'Bartender', dialog: 'BARTENDER' },
		normalizeStoryState({
			phaseId: 'phase-1',
			lastPhaseAnnounced: 'phase-1'
		}, 140),
		140,
		{
			scene: {
				sceneId: 'phase-1.phase-1-find-voice.dialogue',
				sceneType: 'dialogue',
				phaseId: 'phase-1',
				questId: 'phase-1-find-voice'
			},
			activeTask: {
				id: 'phase-1-find-voice',
				title: 'Find a speaking NPC'
			}
		}
	)

	assert.strictEqual(result.line, 'Bartender: Chatty, start with the easy truth. You woke up, the cloak stayed, and everyone here noticed.')
	assert.deepStrictEqual(result.followUp, {
		actor: 'Chatty, the chosen one',
		line: 'Chatty: I noticed too. The noticing had knees and was me.'
	})
	assert.strictEqual(result.lineId, 'scene-script.phase-1-find-voice.bartender.0')
	assert.ok(result.story.callbacks.includes('scene-script:phase-1-find-voice'))
})

test('scene scripts do not repeat a consumed beat while unused beats remain', () => {
	const actor = { id: 'bar-1', name: 'Bartender', dialog: 'BARTENDER' }
	const scene = {
		sceneId: 'phase-1.phase-1-find-voice.dialogue',
		sceneType: 'dialogue',
		phaseId: 'phase-1',
		questId: 'phase-1-find-voice'
	}
	let story = normalizeStoryState({
		phaseId: 'phase-1',
		lastPhaseAnnounced: 'phase-1'
	}, 160)

	const first = selectStoryNpcDialogueLine(actor, story, 160, {
		scene,
		activeTask: { id: 'phase-1-find-voice', title: 'Find a speaking NPC' }
	})
	story = first.story
	const second = selectStoryNpcDialogueLine(actor, story, 161, {
		scene,
		activeTask: { id: 'phase-1-find-voice', title: 'Find a speaking NPC' }
	})

	assert.notStrictEqual(first.line, second.line)
	assert.notStrictEqual(first.lineId, second.lineId)
	assert.match(second.line, /name|Mayor|alive|answers/i)
})

test('scene scripts preserve authored beat order instead of letting a later speaker jump ahead', () => {
	const story = normalizeStoryState({
		phaseId: 'phase-2',
		lastPhaseAnnounced: 'phase-2'
	}, 170)
	const scene = {
		sceneId: 'phase-2.phase-2-recover-ledger.dialogue',
		sceneType: 'dialogue',
		phaseId: 'phase-2',
		questId: 'phase-2-recover-ledger'
	}

	const earlyDwarf = selectStoryNpcDialogueLine(
		{ id: 'dwarf-1', name: 'Dwarf Bili', dialog: 'DWARF_BILI' },
		story,
		170,
		{
			scene,
			activeTask: { id: 'phase-2-recover-ledger', title: 'Recover the Goblin Ledger from a cellar' }
		}
	)

	assert.strictEqual(earlyDwarf.line, null)
	assert.strictEqual(earlyDwarf.lineId, null)

	let orderedStory = story
	for (let index = 0; index < 4; index += 1) {
		const bartenderBeat = selectStoryNpcDialogueLine(
			{ id: 'bar-1', name: 'Bartender', dialog: 'BARTENDER' },
			orderedStory,
			171 + index,
			{
				scene,
				activeTask: { id: 'phase-2-recover-ledger', title: 'Recover the Goblin Ledger from a cellar' }
			}
		)
		orderedStory = bartenderBeat.story
		assert.ok(bartenderBeat.line, `bartender beat ${index} should play before dwarf beat`)
	}

	const mayorBeat = selectStoryNpcDialogueLine(
		{ id: 'mayor-1', name: 'Mayor Leonard', dialog: 'MAYOR_LEONARD' },
		orderedStory,
		179,
		{
			scene,
			activeTask: { id: 'phase-2-recover-ledger', title: 'Recover the Goblin Ledger from a cellar' }
		}
	)
	orderedStory = mayorBeat.story
	assert.match(mayorBeat.line, /red wax|crates/i)

	const onTimeDwarf = selectStoryNpcDialogueLine(
		{ id: 'dwarf-1', name: 'Dwarf Bili', dialog: 'DWARF_BILI' },
		orderedStory,
		180,
		{
			scene,
			activeTask: { id: 'phase-2-recover-ledger', title: 'Recover the Goblin Ledger from a cellar' }
		}
	)

	assert.match(onTimeDwarf.line, /book whispers names|answer for anyone/i)
})

test('scene scripts cover every main story quest', () => {
	const coverage = getSceneScriptCoverage(STORY_PHASES)

	assert.strictEqual(coverage.taskCount, 64)
	assert.strictEqual(coverage.missing.length, 0)
	assert.strictEqual(coverage.scriptedCount, coverage.taskCount)
})

test('every authored scene beat includes a Chatty reply', () => {
	const missing = Object.entries(require('../server/goblinworld/story').SCENE_SCRIPTS)
		.flatMap(([scriptId, script]) => (script.beats || [])
			.map((beat, index) => ({ scriptId, beat, index }))
			.filter(entry => !entry.beat.chatty)
		)

	assert.deepStrictEqual(missing, [])
})

test('dialogue scenes do not fall back to unrelated nearby NPC chatter', () => {
	const result = selectStoryNpcDialogueLine(
		{ id: 'guard-1', name: 'Stone Guard', dialog: 'STONE_GUARD' },
		normalizeStoryState({
			phaseId: 'phase-1',
			lastPhaseAnnounced: 'phase-1'
		}, 180),
		180,
		{
			scene: {
				sceneId: 'phase-1.phase-1-find-voice.dialogue',
				sceneType: 'dialogue',
				phaseId: 'phase-1',
				questId: 'phase-1-find-voice'
			},
			activeTask: {
				id: 'phase-1-find-voice',
				title: 'Find a speaking NPC'
			}
		}
	)

	assert.strictEqual(result.line, null)
	assert.strictEqual(result.lineId, null)
})

test('active task context suppresses broad dialogue banks when no authored beat applies', () => {
	const result = selectStoryNpcDialogueLine(
		{ id: 'trader-1', name: 'Market Trader', dialog: 'MARKET_TRADER', spriteKey: 'marketTrader' },
		normalizeStoryState({
			phaseId: 'phase-1',
			lastPhaseAnnounced: 'phase-1'
		}, 181),
		181,
		{
			scene: {
				sceneId: 'phase-1.phase-1-bridge-objective.travel',
				sceneType: 'travel',
				phaseId: 'phase-1',
				questId: 'phase-1-bridge-objective'
			},
			activeTask: {
				id: 'phase-1-bridge-objective',
				title: 'Keep learning the body',
				target: { kind: 'route', name: 'phase-1' },
				bridge: true
			}
		}
	)

	assert.strictEqual(result.line, null)
	assert.strictEqual(result.followUp, null)
})

test('story snapshot exposes public dialogue state without line history internals', () => {
	const snapshot = getStorySnapshot({
		dialogue: {
			activeConversation: {
				id: 'phase-2.phase-2-recover-ledger.dialogue::bartender',
				speakerId: 'bartender',
				sceneId: 'phase-2.phase-2-recover-ledger.dialogue',
				questId: 'phase-2-recover-ledger',
				beatIndex: 3,
				participants: ['chatty', 'bartender'],
				status: 'active'
			},
			spokenLines: ['bartender:phase-2:0'],
			conversationHistory: [{ id: 'old', speakerId: 'mayor', turn: 10 }],
			lastSpeakerId: 'bartender'
		}
	}, 130)

	assert.ok(snapshot.dialogue)
	assert.strictEqual(snapshot.dialogue.activeConversation.speakerId, 'bartender')
	assert.deepStrictEqual(snapshot.dialogue.activeConversation.participants, ['chatty', 'bartender'])
	assert.strictEqual(snapshot.dialogue.spokenCount, 1)
	assert.deepStrictEqual(snapshot.dialogue.recentSpeakers, ['mayor'])
	assert.strictEqual(Object.prototype.hasOwnProperty.call(snapshot.dialogue, 'spokenLines'), false)
	assert.strictEqual(Object.prototype.hasOwnProperty.call(snapshot.dialogue, 'speakerCooldowns'), false)
})

test('live route marker renders only in debug mode', () => {
	const component = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'GoblinWorldLive.vue'), 'utf8')
	const markerMethod = component.match(/renderRouteMarker\(\) \{[\s\S]*?getEntityTexture\(/)

	assert.ok(markerMethod, 'renderRouteMarker method should exist')
	assert.match(markerMethod[0], /if \(!this\.debugMode\) return/)
})

test('live frontend suppresses legacy dialogue hold feed entries', () => {
	const component = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'GoblinWorldLive.vue'), 'utf8')
	const feedMethod = component.match(/createFeedEntry\(event\) \{[\s\S]*?feedSpeaker\(/)

	assert.ok(feedMethod, 'createFeedEntry method should exist')
	assert.match(feedMethod[0], /event\.controller === 'dialogue-hold'/)
	assert.match(feedMethod[0], /isBlockedFeedText/)
})

test('24 hour story dry run completes all phases with mocked turns', () => {
	const world = new GoblinWorld(createInitialWorld({ goblin: { x: 2, y: 2 } }))

	for (let turn = 0; turn <= STORY_DAY_TURNS; turn += STORY_TURNS_PER_PHASE) {
		world.state.turn = turn
		world.advanceStory()
	}

	const snapshot = world.getSnapshot()
	assert.strictEqual(snapshot.story.phaseId, 'phase-8')
	assert.strictEqual(snapshot.story.flags.dayOneComplete, true)
	assert.strictEqual(snapshot.story.day, 2)
	assert.strictEqual(snapshot.story.arcId, 'day-2-road-to-freedom')
	assert.strictEqual(
		snapshot.story.completedTasks.length + snapshot.story.failedTasks.length,
		STORY_PHASES.reduce((total, phase) => total + phase.tasks.length, 0)
	)
	assert.ok(snapshot.story.activeTasks.length > 0)
	assert.strictEqual(snapshot.story.activeTasks[0].id, getContinuationArc().tasks[0].id)
})

test('old completed day one saves resume with a next-day objective instead of empty tasks', () => {
	const allTaskIds = STORY_PHASES.flatMap(phase => phase.tasks.map(task => task.id))
	const snapshot = getStorySnapshot({
		phaseId: 'phase-8',
		flags: { dayOneComplete: true },
		lastFinaleAnnounced: true,
		completedTasks: allTaskIds
	}, STORY_DAY_TURNS + 30)

	assert.strictEqual(snapshot.day, 2)
	assert.strictEqual(snapshot.arcId, 'day-2-road-to-freedom')
	assert.ok(snapshot.activeTasks.length > 0)
	assert.strictEqual(snapshot.activeTasks[0].title, 'Check the tavern resistance hub')
	assert.ok(snapshot.directorPlan)
	assert.strictEqual(Object.prototype.hasOwnProperty.call(snapshot, 'memory'), false)
})

test('continuation objectives complete from concrete zone progress', () => {
	const allTaskIds = STORY_PHASES.flatMap(phase => phase.tasks.map(task => task.id))
	const result = advanceStoryProgress({
		phaseId: 'phase-8',
		flags: { dayOneComplete: true },
		lastFinaleAnnounced: true,
		completedTasks: allTaskIds,
		exploration: {
			arcVisitKey: '2:day-2-road-to-freedom:28800',
			visitedZonesThisArc: {
				tavern: 42
			},
			visitedMapsThisArc: {
				mulberryTown: 42
			}
		}
	}, STORY_DAY_TURNS + 42, {
		allowAutoProgress: false,
		map: { id: 'mulberryTown', width: 50, height: 40 },
		goblin: { position: { x: 11, y: 15 } }
	})

	assert.ok(result.story.completedTasks.includes('day-2-return-tavern'))
	assert.ok(result.events.some(event => event.type === 'quest' && event.action === 'complete' && /tavern/i.test(event.message)))
	assert.ok(result.events.some(event => event.type === 'quest' && event.action === 'objective'))
})

test('old reached zone facts do not instantly complete new continuation objectives', () => {
	const allTaskIds = STORY_PHASES.flatMap(phase => phase.tasks.map(task => task.id))
	const result = advanceStoryProgress({
		phaseId: 'phase-8',
		flags: { dayOneComplete: true },
		lastFinaleAnnounced: true,
		completedTasks: allTaskIds,
		facts: {
			'reachedZone:tavern': true,
			'reachedZone:market': true,
			'reachedZone:hidden-camp': true
		},
		visibleProgress: {
			lastZone: 'hidden-camp',
			zones: {
				tavern: 9,
				market: 5,
				'hidden-camp': 2
			}
		}
	}, STORY_DAY_TURNS + 50, {
		allowAutoProgress: false,
		map: { id: 'mulberryTown', width: 50, height: 40 },
		goblin: { position: { x: 1, y: 1 } }
	})

	assert.strictEqual(result.story.completedTasks.includes('day-2-return-tavern'), false)
	assert.strictEqual(getStorySnapshot(result.story, STORY_DAY_TURNS + 50).activeTasks[0].id, 'day-2-return-tavern')
})

test('absurd persisted continuation days migrate back to the active day two arc', () => {
	const story = normalizeStoryState({
		day: 40513,
		phaseId: 'phase-8',
		flags: { dayOneComplete: true },
		lastFinaleAnnounced: true,
		arcId: 'day-2-road-to-freedom'
	}, STORY_DAY_TURNS + 60)

	assert.strictEqual(story.day, 2)
	assert.strictEqual(story.arcId, 'day-2-road-to-freedom')
	assert.ok(story.exploration)
	assert.strictEqual(story.exploration.arcVisitKey, `${story.day}:${story.arcId}:${story.arcStartedTurn}`)
})

test('continuation campaign rotates through authored arcs before repeating', () => {
	const sequence = getCampaignArcSequence()
	const ids = sequence.map(arc => arc.id)
	const titles = sequence.map(arc => arc.title)

	assert.ok(sequence.length >= 9)
	assert.strictEqual(new Set(ids).size, ids.length)
	assert.strictEqual(new Set(titles).size, titles.length)
	assert.ok(sequence.some(arc => arc.tasks.some(task => task.target && task.target.mapId === 'orcCastle')))
	assert.ok(sequence.some(arc => arc.tasks.some(task => task.target && task.target.mapId === 'lichBoss')))

	let currentArcId = 'day-2-road-to-freedom'
	const visited = [currentArcId]
	for (let index = 1; index < sequence.length; index += 1) {
		currentArcId = getNextContinuationArcId(currentArcId, visited)
		assert.strictEqual(visited.includes(currentArcId), false)
		visited.push(currentArcId)
	}

	assert.strictEqual(new Set(visited).size, sequence.length)
	assert.strictEqual(getNextContinuationArcId(visited[visited.length - 1], visited), sequence[0].id)
})

test('live map registry loads registered maps and existing portal links', () => {
	const ids = getRegisteredMapIds()
	assert.deepStrictEqual(ids, CANONICAL_CLASSIC_MAP_IDS)
	assert.strictEqual(ids.includes('oldForest'), false)
	assert.strictEqual(ids.includes('oldGraveyard'), false)
	assert.strictEqual(ids.includes('oldlichBoss'), false)
	assert.ok(ids.includes('kingdom'))
	assert.ok(ids.includes('orcCastle'))
	assert.ok(ids.includes('overworld'))
	assert.ok(ids.includes('taintedForest'))
	assert.ok(ids.includes('lichBoss'))
	assert.strictEqual(getMapIdForPortal('Mulberry Forest'), 'mulberryForest')
	assert.strictEqual(getMapIdForPortal('Lich Lair'), 'lichLair')

	const town = loadRegisteredTiledMap(path.join(__dirname, '..'), 'mulberryTown')
	const links = getPortalLinksForTiledMap(town, 'mulberryTown')
	assert.ok(links.some(link => link.portalId === 'Mulberry Forest' && link.targetMapId === 'mulberryForest'))
	assert.ok(links.some(link => link.portalId === 'Mulberry Graveyard' && link.targetMapId === 'mulberryGraveyard'))
})

test('classic runtime loads every canonical map and resolves every campaign portal', () => {
	const runtime = createClassicGameRuntime({ staticRoot: path.join(__dirname, '..') })
	const ids = runtime.getAvailableMapIds()

	assert.deepStrictEqual(ids, CANONICAL_CLASSIC_MAP_IDS)
	ids.forEach(mapId => {
		const map = runtime.loadMap(mapId)
		assert.strictEqual(map.id, mapId)
		assert.ok(map.width > 0)
		assert.ok(map.height > 0)
		runtime.getPortalLinks(mapId).forEach(link => {
			assert.ok(ids.includes(link.targetMapId), `${mapId} portal ${link.portalId} points outside canonical maps`)
		})
	})

	const townToCastle = runtime.findMapRoute('mulberryTown', 'orcCastle')
	assert.strictEqual(townToCastle[0], 'mulberryTown')
	assert.strictEqual(townToCastle[townToCastle.length - 1], 'orcCastle')
	assert.ok(townToCastle.length >= 5)
})

test('classic runtime snapshot exposes roguelike verbs and safe public state', () => {
	const world = new GoblinWorld(createInitialWorld({
		map: {
			id: 'mulberryTown',
			name: 'Mulberry Town',
			width: 12,
			height: 12,
			blocked: [],
			actors: [
				{ id: 'npc-bartender', name: 'Bartender', entityType: 'NPC', dialog: 'BARTENDER', x: 3, y: 2, spriteId: 2480 },
				{ id: 'hostile-rat', name: 'Cellar Rat', entityType: 'HOSTILE', x: 4, y: 2, spriteId: 1234 }
			]
		},
		goblin: { x: 2, y: 2 }
	}))
	const runtime = getClassicRuntimeSnapshot(world.getSnapshot())

	assert.strictEqual(runtime.mode, 'classic-autonomous')
	assert.strictEqual(runtime.currentMapId, 'mulberryTown')
	assert.deepStrictEqual(runtime.availableMapIds, CANONICAL_CLASSIC_MAP_IDS)
	;['move', 'examine', 'interact', 'climb', 'pickup', 'equip', 'use', 'cast', 'fire', 'attack', 'rest', 'flee'].forEach(action => {
		assert.ok(runtime.legalActions.includes(action), `${action} should be available to Chatty`)
	})
	assert.ok(runtime.inventorySummary.some(item => item.name === 'Bronze Sword'))
	assert.ok(runtime.inventorySummary.some(item => item.name === 'Minor Heal'))
	assert.strictEqual(runtime.nearbyNpcs[0].name, 'Bartender')
	assert.strictEqual(runtime.nearbyEnemies[0].name, 'Cellar Rat')
	assert.strictEqual(JSON.stringify(runtime).includes('memory'), false)
	assert.strictEqual(JSON.stringify(runtime).includes('api'), false)
})

test('classic runtime creates serializable player, item, actor, and portal state from the live world', () => {
	const world = new GoblinWorld(createWorldFromTiledMap(loadRegisteredTiledMap(path.join(__dirname, '..'), 'mulberryForest'), {
		staticRoot: path.join(__dirname, '..'),
		mapId: 'mulberryForest'
	}))
	const classic = createClassicStateFromWorld(world.getSnapshot(), { staticRoot: path.join(__dirname, '..') })

	assert.strictEqual(classic.mode, 'classic-autonomous')
	assert.strictEqual(classic.currentMapId, 'mulberryForest')
	assert.ok(classic.player.hp > 0)
	assert.ok(classic.player.maxHp >= classic.player.hp)
	assert.ok(classic.player.inventory.some(item => item.type === 'HEALTH_POTION'))
	assert.ok(classic.player.spellbook.some(spell => spell.action === 'cast'))
	assert.ok(classic.maps.mulberryForest.portals.some(portal => portal.targetMapId === 'overworld' || portal.targetMapId === 'mulberryTown'))
	assert.ok(Object.values(classic.actors).some(actor => actor.hostile && actor.spriteKey === null && Number.isInteger(actor.spriteId)))
	assert.strictEqual(JSON.stringify(classic).includes('function'), false)
})

test('classic runtime applies pickup, equip, use, attack, cast, fire, rest, and flee actions to real state', () => {
	const world = new GoblinWorld(createInitialWorld({
		map: {
			id: 'classicTestMap',
			name: 'Classic Test Map',
			width: 8,
			height: 8,
			blocked: [],
			portalLinks: [],
			actors: [
				{ id: 'item-sword', name: 'Bronze Sword', entityType: 'SWORD', x: 2, y: 2, spriteId: 35 },
				{ id: 'item-potion', name: 'Health Potion', entityType: 'HEALTH_POTION', x: 2, y: 2, spriteId: 488 },
				{ id: 'item-arrow', name: 'Steel Arrow', entityType: 'STEEL_ARROW', x: 2, y: 2, spriteId: 784 },
				{ id: 'hostile-rat', name: 'Cellar Rat', entityType: 'RAT', x: 3, y: 2, spriteId: 2365 }
			]
		},
		goblin: { x: 2, y: 2 }
	}))
	const snapshot = world.getSnapshot()
	let classic = createClassicStateFromWorld(snapshot, { staticRoot: path.join(__dirname, '..') })
	classic.player.hp = 5
	classic.player.mana = 10

	let result = applyClassicAction(classic, snapshot, { action: 'pickup', target: {} }, { seed: 7 })
	classic = result.state
	assert.ok(classic.player.inventory.some(item => item.id === 'item-sword'))
	assert.ok(classic.player.inventory.some(item => item.id === 'item-potion'))
	assert.strictEqual(result.worldDelta.items.removed.includes('item-sword'), true)

	result = applyClassicAction(classic, snapshot, { action: 'equip', target: { id: 'item-sword' } }, { seed: 7 })
	classic = result.state
	assert.strictEqual(classic.player.equipment.weapon.id, 'item-sword')

	result = applyClassicAction(classic, snapshot, { action: 'use', target: { type: 'HEALTH_POTION' } }, { seed: 7 })
	classic = result.state
	assert.ok(classic.player.hp > 5)
	assert.strictEqual(classic.player.inventory.some(item => item.id === 'item-potion'), false)

	result = applyClassicAction(classic, snapshot, { action: 'attack', target: { id: 'hostile-rat' } }, { seed: 7 })
	classic = result.state
	assert.ok(classic.actors['hostile-rat'].hp < classic.actors['hostile-rat'].maxHp)
	assert.ok(result.worldDelta.combat.damage > 0)

	result = applyClassicAction(classic, snapshot, { action: 'cast', target: { id: 'hostile-rat', spell: 'Magic Dart' } }, { seed: 7 })
	classic = result.state
	assert.ok(classic.player.mana < 10)

	result = applyClassicAction(classic, snapshot, { action: 'fire', target: { id: 'hostile-rat' } }, { seed: 7 })
	classic = result.state
	assert.ok(result.eventPatch.message.includes('arrow') || result.eventPatch.message.includes('bow'))

	const beforeRestHp = classic.player.hp
	result = applyClassicAction(classic, snapshot, { action: 'rest', target: {} }, { seed: 7 })
	classic = result.state
	assert.ok(classic.player.hp >= beforeRestHp)

	result = applyClassicAction(classic, snapshot, { action: 'flee', target: { id: 'hostile-rat' } }, { seed: 7 })
	assert.strictEqual(result.eventPatch.action, 'flee')
	assert.ok(result.worldDelta.chatty.position)
})

test('classic runtime opens chests and doors, and uses portal transitions without changing hostile sprites', () => {
	const world = new GoblinWorld(createInitialWorld({
		map: {
			id: 'classicObjectMap',
			name: 'Classic Object Map',
			width: 8,
			height: 8,
			blocked: [{ x: 3, y: 2 }],
			portalLinks: [{ id: 'portal-test', portalId: 'Mulberry Forest', targetMapId: 'mulberryForest', x: 2, y: 3, kind: 'level_transition' }],
			actors: [
				{ id: 'door-1', name: 'Door', entityType: 'DOOR', x: 3, y: 2, spriteId: 98 },
				{ id: 'chest-1', name: 'Chest', entityType: 'CHEST', x: 2, y: 2, spriteId: 552 },
				{ id: 'hostile-orc', name: 'Orc', entityType: 'ORC', x: 5, y: 2, spriteId: 5292 }
			]
		},
		goblin: { x: 2, y: 2 }
	}))
	const snapshot = world.getSnapshot()
	let classic = createClassicStateFromWorld(snapshot, { staticRoot: path.join(__dirname, '..') })

	let result = applyClassicAction(classic, snapshot, { action: 'interact', target: { id: 'chest-1' } }, { seed: 4 })
	classic = result.state
	assert.strictEqual(classic.objects['chest-1'].open, true)
	assert.ok(classic.player.inventory.some(item => item.source === 'chest-1'))

	result = applyClassicAction(classic, snapshot, { action: 'interact', target: { id: 'door-1' } }, { seed: 4 })
	classic = result.state
	assert.strictEqual(classic.objects['door-1'].open, true)
	assert.strictEqual(result.worldDelta.actors['door-1'].blocked, false)

	result = applyClassicAction(classic, snapshot, { action: 'climb', target: { portalId: 'Mulberry Forest' } }, { seed: 4 })
	assert.strictEqual(result.transition.targetMapId, 'mulberryForest')
	assert.strictEqual(classic.actors['hostile-orc'].spriteKey, null)
	assert.strictEqual(classic.actors['hostile-orc'].spriteId, 5292)
})

test('classic hostile turns damage adjacent Chatty or move visible hostiles toward him', () => {
	const world = new GoblinWorld(createInitialWorld({
		map: {
			id: 'classicHostileMap',
			name: 'Classic Hostile Map',
			width: 8,
			height: 8,
			blocked: [],
			actors: [
				{ id: 'hostile-rat', name: 'Cellar Rat', entityType: 'RAT', x: 3, y: 2, spriteId: 2365 },
				{ id: 'hostile-orc', name: 'Orc', entityType: 'ORC', x: 6, y: 2, spriteId: 5292 }
			]
		},
		goblin: { x: 2, y: 2 }
	}))
	const snapshot = world.getSnapshot()
	let classic = createClassicStateFromWorld(snapshot, { staticRoot: path.join(__dirname, '..') })
	const startingHp = classic.player.hp

	const result = applyClassicAction(classic, snapshot, { action: 'rest', target: {} }, { seed: 9 })
	classic = result.state

	assert.ok(classic.player.hp < startingHp || result.worldDelta.combat.incomingDamage > 0)
	assert.ok(classic.actors['hostile-orc'].x < 6, 'visible orc should step toward Chatty')
	assert.strictEqual(classic.actors['hostile-orc'].spriteKey, null)
})

test('Railway Docker image builds frontend from source instead of stale railway_dist', () => {
	const dockerfile = fs.readFileSync(path.join(__dirname, '..', 'Dockerfile'), 'utf8')
	const dockerignore = fs.readFileSync(path.join(__dirname, '..', '.dockerignore'), 'utf8')

	assert.match(dockerfile, /npm\s+run\s+build/)
	assert.match(dockerfile, /npm\s+install\s+express@4\.17\.1/)
	assert.doesNotMatch(dockerfile, /npm\s+ci\s+--omit=dev/)
	assert.match(dockerfile, /COPY\s+--from=frontend-build\s+\/app\/dist\s+\.\/dist/)
	assert.doesNotMatch(dockerfile, /COPY\s+railway_dist\s+\.\/dist/)
	assert.match(dockerignore, /^dist\/$/m)
	assert.match(dockerignore, /^railway_dist\/$/m)
})

test('Railway healthcheck uses the lightweight health endpoint', () => {
	const railwayConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'railway.json'), 'utf8'))

	assert.strictEqual(railwayConfig.deploy.healthcheckPath, '/api/live/health')
	assert.notStrictEqual(railwayConfig.deploy.healthcheckPath, '/api/live/state')
})

test('director plan tracks current intent and recovers when position repeats', () => {
	const task = {
		id: 'day-2-secure-market-road',
		title: 'Secure the market road for goblin travel',
		target: { kind: 'place', name: 'market road', zone: 'market' }
	}
	const first = syncDirectorPlan(normalizeStoryState(), task, {
		goblin: { position: { x: 2, y: 2 } }
	}, 10)
	let story = first.story
	for (let turn = 11; turn <= 17; turn += 1) {
		story = syncDirectorPlan(story, task, {
			goblin: { position: { x: 2, y: 2 } }
		}, turn).story
	}

	assert.strictEqual(first.plan.targetZone, 'market')
	assert.match(first.plan.currentIntent, /Reach Market/)
	assert.strictEqual(story.directorPlan.status, 'recovering')
	assert.ok(story.directorPlan.failureCount >= 1)
	assert.notStrictEqual(story.directorPlan.targetZone, 'market')
})

test('story combat encounter can be resolved by Chatty attack actions', () => {
	const world = new GoblinWorld(
		createInitialWorld({
			turn: 100,
			story: {
				completedTasks: [
					'phase-1-test-body',
					'phase-1-find-voice',
					'phase-1-learn-name',
					'phase-1-reach-town'
				]
			},
			goblin: { x: 2, y: 2 }
		})
	)
	world.advanceStory()
	assert.strictEqual(world.getSnapshot().story.encounter.enemy, 'Cellar Rat')

	const firstHit = world.applyDecision({
		action: 'attack',
		target: { enemy: 'Cellar Rat' },
		publicRationale: 'The enemy blocks a freedom task.',
		goblinUtterance: 'Your knees have entered negotiations.'
	})
	const secondHit = world.applyDecision({
		action: 'attack',
		target: { enemy: 'Cellar Rat' },
		publicRationale: 'The enemy still blocks a freedom task.',
		goblinUtterance: 'I swing with historic inconvenience.'
	})
	const completionEvents = world.advanceStory()

	assert.strictEqual(firstHit.type, 'combat')
	assert.strictEqual(secondHit.type, 'combat')
	assert.ok(completionEvents.some(event => event.type === 'combat' && event.action === 'complete'))
	assert.ok(world.getSnapshot().story.completedTasks.includes('phase-1-first-fight'))
})

test('encounter spawn creates a public combat board with visible hostile combatants', () => {
	const world = new GoblinWorld(
		createInitialWorld({
			turn: 20,
			story: {
				completedTasks: [
					'phase-1-test-body',
					'phase-1-find-voice',
					'phase-1-learn-name',
					'phase-1-reach-town'
				]
			},
			goblin: { x: 8, y: 6 }
		})
	)

	world.advanceStory()
	const snapshot = world.getSnapshot()
	const hostileActors = snapshot.map.actors.filter(actor => actor.entityType === 'HOSTILE')

	assert.ok(snapshot.story.combatBoard)
	assert.strictEqual(snapshot.story.combatBoard.status, 'active')
	assert.strictEqual(snapshot.story.combatBoard.encounterId, 'cellar-rats')
	assert.ok(snapshot.story.combatBoard.combatants.some(combatant => combatant.team === 'hostile' && combatant.hp > 0))
	assert.ok(hostileActors.length > 0)
	hostileActors.forEach(actor => {
		assert.strictEqual(actor.wanders, false)
		assert.ok(Number.isInteger(actor.spriteId))
		assert.ok(Number.isInteger(actor.x))
		assert.ok(Number.isInteger(actor.y))
		assert.ok(actor.home)
	})
})

test('combat attacks target visible hostiles and remove defeated combatants from the map', () => {
	const world = new GoblinWorld(
		createInitialWorld({
			turn: 20,
			story: {
				completedTasks: [
					'phase-1-test-body',
					'phase-1-find-voice',
					'phase-1-learn-name',
					'phase-1-reach-town'
				]
			},
			goblin: { x: 8, y: 6 }
		})
	)
	world.advanceStory()
	const hostileId = world.getSnapshot().story.combatBoard.combatants.find(combatant => combatant.team === 'hostile').id
	world.state.story.combatBoard.combatants.find(combatant => combatant.id === hostileId).hp = 1

	const event = world.applyDecision({
		action: 'attack',
		publicRationale: 'Chatty hits the visible enemy blocking the quest.',
		goblinUtterance: 'The small problem receives a larger problem.'
	})
	const snapshot = world.getSnapshot()

	assert.strictEqual(event.type, 'combat')
	assert.strictEqual(event.target.id, hostileId)
	assert.strictEqual(event.worldDelta.actors[hostileId].removed, true)
	assert.strictEqual(snapshot.map.actors.some(actor => actor.id === hostileId), false)
})

test('story combat actions expose weakness, damage, waves, and branch callbacks', () => {
	const base = normalizeStoryState({
		phaseId: 'phase-6',
		phaseStartedTurn: STORY_TURNS_PER_PHASE * 5,
		encounters: {
			'phase-6-defend-market-road': {
				taskId: 'phase-6-defend-market-road',
				id: 'thorn-wave'
			}
		}
	})

	const inspected = applyStoryCombatAction(base, 'inspect', 1)
	assert.strictEqual(inspected.encounter.weaknessRevealed, true)
	assert.ok(inspected.story.callbacks.includes('weakness-thorn-wave'))
	assert.strictEqual(inspected.eventPatch.enemyHp, inspected.encounter.maxHp)

	const struck = applyStoryCombatAction(inspected.story, 'cast', 2)
	assert.ok(struck.eventPatch.damage > 3)
	assert.ok(struck.story.callbacks.includes('careful-fighter'))

	let waveStory = struck.story
	while (applyStoryCombatAction(waveStory, 'cast', 3).encounter.wave === 1) {
		waveStory = applyStoryCombatAction(waveStory, 'cast', 3).story
	}
	const nextWave = applyStoryCombatAction(waveStory, 'cast', 4)
	assert.ok(nextWave.encounter.wave >= 2)
	assert.strictEqual(nextWave.encounter.defeated, false)

	const hesitant = applyStoryCombatAction(base, 'wait', 5)
	assert.ok(hesitant.story.callbacks.includes('hesitated-in-combat'))
	assert.ok(hesitant.eventPatch.chattyHp < hesitant.encounter.maxChattyHp)
})

test('multi-wave combat refreshes visible combatants and clears the board after victory', () => {
	const story = normalizeStoryState({
		phaseId: 'phase-6',
		phaseStartedTurn: STORY_TURNS_PER_PHASE * 5,
		encounters: {
			'phase-6-defend-market-road': {
				taskId: 'phase-6-defend-market-road',
				id: 'thorn-wave',
				hp: 1,
				wave: 1,
				waves: 3,
				weaknessRevealed: true
			}
		}
	}, STORY_TURNS_PER_PHASE * 5)

	const nextWave = applyStoryCombatAction(story, 'cast', STORY_TURNS_PER_PHASE * 5 + 1)

	assert.strictEqual(nextWave.encounter.wave, 2)
	assert.strictEqual(nextWave.story.combatBoard.status, 'active')
	assert.strictEqual(nextWave.story.combatBoard.wave, 2)
	assert.ok(nextWave.story.combatBoard.combatants.some(combatant => combatant.team === 'hostile' && combatant.hp > 0))

	const finalStory = normalizeStoryState({
		phaseId: 'phase-8',
		phaseStartedTurn: STORY_TURNS_PER_PHASE * 7,
		encounters: {
			'phase-8-crown-remnant': {
				taskId: 'phase-8-crown-remnant',
				id: 'crown-remnant',
				hp: 1,
				wave: 3,
				waves: 3,
				weaknessRevealed: true
			}
		}
	}, STORY_TURNS_PER_PHASE * 7)
	const victory = applyStoryCombatAction(finalStory, 'cast', STORY_TURNS_PER_PHASE * 7 + 1)

	assert.strictEqual(victory.encounter.defeated, true)
	assert.strictEqual(victory.story.combatBoard.status, 'cleared')
	assert.ok(victory.eventPatch.worldDelta.actors)
})

test('named NPC combat support changes encounter state and emits public action text', () => {
	const base = normalizeStoryState({
		phaseId: 'phase-6',
		phaseStartedTurn: STORY_TURNS_PER_PHASE * 5,
		relationships: {
			dwarf: { trust: 3, talks: 3, suspicion: 0, stance: 'warm' }
		},
		encounters: {
			'phase-6-defend-market-road': {
				taskId: 'phase-6-defend-market-road',
				id: 'thorn-wave',
				weaknessRevealed: false,
				hp: 7
			}
		}
	}, STORY_TURNS_PER_PHASE * 5)

	const result = applyNpcCombatSupport(base, {
		id: 'dwarf-1',
		name: 'Dwarf Bili',
		entityType: 'NPC',
		dialog: 'DWARF_BILI',
		spriteKey: 'dwarf'
	}, STORY_TURNS_PER_PHASE * 5 + 1)

	assert.ok(result.eventPatch)
	assert.strictEqual(result.eventPatch.type, 'combat')
	assert.strictEqual(result.eventPatch.action, 'support')
	assert.strictEqual(result.eventPatch.actor, 'Dwarf Bili')
	assert.strictEqual(result.encounter.weaknessRevealed, true)
	assert.ok(result.story.callbacks.includes('support-dwarf'))
	assert.doesNotMatch(result.eventPatch.message, /actor-|npc-\d+|\d+,\d+/i)
})

test('named NPC combat support can affect a visible hostile combatant', () => {
	const base = normalizeStoryState({
		phaseId: 'phase-6',
		phaseStartedTurn: STORY_TURNS_PER_PHASE * 5,
		encounters: {
			'phase-6-defend-market-road': {
				taskId: 'phase-6-defend-market-road',
				id: 'thorn-wave',
				hp: 7
			}
		},
		combatBoard: {
			status: 'active',
			taskId: 'phase-6-defend-market-road',
			encounterId: 'thorn-wave',
			wave: 1,
			objective: 'Hold the market road through three waves.',
			combatants: [
				{
					id: 'hostile-phase-6-defend-market-road-1-0',
					team: 'hostile',
					name: 'Thorn Scout',
					hp: 1,
					maxHp: 3,
					x: 6,
					y: 6,
					spriteId: 401
				}
			]
		}
	}, STORY_TURNS_PER_PHASE * 5)

	const result = applyNpcCombatSupport(base, {
		id: 'trader-1',
		name: 'Market Trader',
		entityType: 'NPC',
		spriteKey: 'marketTrader'
	}, STORY_TURNS_PER_PHASE * 5 + 2)

	assert.strictEqual(result.eventPatch.target.id, 'hostile-phase-6-defend-market-road-1-0')
	assert.strictEqual(result.story.combatBoard.combatants[0].defeated, true)
	assert.strictEqual(result.eventPatch.worldDelta.actors['hostile-phase-6-defend-market-road-1-0'].removed, true)
})

test('final boss victory emits the crown callback only after the encounter resolves', () => {
	const story = normalizeStoryState({
		phaseId: 'phase-8',
		phaseStartedTurn: STORY_TURNS_PER_PHASE * 7,
		encounters: {
			'phase-8-crown-remnant': {
				taskId: 'phase-8-crown-remnant',
				id: 'crown-remnant',
				hp: 1,
				wave: 3,
				waves: 3,
				weaknessRevealed: true
			}
		}
	})

	const result = applyStoryCombatAction(story, 'cast', 1)
	assert.strictEqual(result.encounter.defeated, true)
	assert.ok(result.story.callbacks.includes('crown-remnant-defeated'))
})

test('rejects non-adjacent movement so model output cannot teleport the body', () => {
	const world = new GoblinWorld(
		createInitialWorld({
			map: {
				name: 'Test Burrow',
				width: 6,
				height: 6,
				tiles: [
					[1, 1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1, 1]
				],
				blocked: []
			},
			goblin: { x: 1, y: 1 }
		})
	)

	const event = world.applyDecision({
		action: 'move',
		target: { x: 4, y: 4 },
		publicRationale: 'The far corner looks interesting.',
		goblinUtterance: 'Long legs, theoretically.',
		memoryUpdate: '',
		controller: 'openai'
	})

	assert.strictEqual(event.type, 'validation')
	assert.strictEqual(event.controller, 'openai')
	assert.deepStrictEqual(world.getSnapshot().goblin.position, { x: 1, y: 1 })
})

test('converts blocked or out-of-bounds movement into a visible validation event', () => {
	const world = new GoblinWorld(
		createInitialWorld({
			map: {
				name: 'Test Burrow',
				width: 3,
				height: 3,
				tiles: [
					[1, 1, 1],
					[1, 1, 1],
					[1, 1, 1]
				],
				blocked: [{ x: 2, y: 1 }]
			},
			goblin: { x: 1, y: 1 }
		})
	)

	const event = world.applyDecision({
		action: 'move',
		target: { x: 2, y: 1 },
		publicRationale: 'This wall looks negotiable.',
		goblinUtterance: 'I challenge masonry.',
		memoryUpdate: ''
	})

	assert.strictEqual(event.type, 'validation')
	assert.deepStrictEqual(world.getSnapshot().goblin.position, { x: 1, y: 1 })
})

test('live non-combat actions can complete concrete quest interactions', () => {
	const world = new GoblinWorld(
		createInitialWorld({
			turn: STORY_TURNS_PER_PHASE,
			story: {
				phaseId: 'phase-2',
				phaseStartedTurn: STORY_TURNS_PER_PHASE,
				lastPhaseAnnounced: 'phase-2',
				completedTasks: [
					'phase-2-speak-mayor',
					'phase-2-inspect-town'
				]
			},
			goblin: { x: 2, y: 2 }
		})
	)

	const event = world.applyDecision({
		action: 'pick_up',
		target: { questId: 'phase-2-recover-ledger', reached: true },
		publicRationale: 'The ledger is the current object of the quest.',
		goblinUtterance: 'I take the rude book.'
	})
	const snapshot = world.getSnapshot()

	assert.strictEqual(snapshot.story.items.goblinLedger, true)
	assert.ok(snapshot.story.callbacks.includes('quest-action:phase-2-recover-ledger'))
	assert.strictEqual(event.worldDelta.story.items.goblinLedger, true)
	assert.strictEqual(event.type, 'quest')
})

test('serializes server-sent events with ordered ids and JSON payloads', () => {
	const event = createEvent({
		id: 7,
		turn: 3,
		type: 'speech',
		action: 'wait',
		position: { x: 5, y: 6 },
		message: 'Listening to mushrooms.',
		publicRationale: 'The map is quiet.',
		worldDelta: { goblin: { position: { x: 5, y: 6 } } }
	})

	const wire = event.toSse()
	assert.ok(wire.startsWith('id: 7\nevent: goblinworld\n'))
	assert.ok(wire.endsWith('\n\n'))
	assert.deepStrictEqual(JSON.parse(wire.split('data: ')[1]), event.toJSON())
})

test('feed narrator hides raw debug movement instead of trying to make it public', () => {
	const event = createEvent({
		id: 70,
		turn: 8,
		type: 'action',
		actor: 'Chatty, the chosen one',
		action: 'move',
		position: { x: 13, y: 13 },
		message: '[ACTION] #1021 npc / move NPC wanders to 13,13.',
		publicRationale: 'The route points east.'
	})
	const json = event.toJSON()

	assert.strictEqual(json.feed, null)
})

test('feed narrator hides validation and background NPC wandering events', () => {
	const validation = createEvent({
		id: 71,
		turn: 8,
		type: 'validation',
		actor: 'Chatty, the chosen one',
		action: 'move',
		message: 'The goblin rejects an illegal move and stays put.'
	}).toJSON()
	const npcMove = createEvent({
		id: 72,
		turn: 8,
		type: 'action',
		actor: 'NPC',
		action: 'move',
		message: 'NPC wanders to 13,13.',
		position: { x: 13, y: 13 }
	}).toJSON()

	assert.strictEqual(validation.feed, null)
	assert.strictEqual(npcMove.feed, null)
})

test('feed narrator keeps NPC dialogue and hides combat category text', () => {
	const dialogue = createEvent({
		id: 73,
		turn: 8,
		type: 'dialogue',
		actor: 'Stone Guard',
		action: 'speak',
		message: 'Stone Guard: Chatty, roads have rules, and dramatic fabric does not count as a permit.'
	}).toJSON()
	const combat = createEvent({
		id: 74,
		turn: 9,
		type: 'combat',
		actor: 'Dwarf Bili',
		action: 'support',
		enemy: 'Thorn Scout',
		message: 'Dwarf Bili calls out the weak point in Thorn Scout.',
		target: { id: 'hostile-phase-6-defend-market-road-1-0' }
	}).toJSON()

	assert.deepStrictEqual(dialogue.feed, {
		speaker: 'Stone Guard',
		text: 'Chatty, roads have rules, and dramatic fabric does not count as a permit.',
		tone: 'speech',
		priority: 'high',
		visible: true
	})
	assert.strictEqual(combat.feed, null)
})

test('feed narrator hides system story events from the adventure feed', () => {
	const discovery = createEvent({
		id: 740,
		turn: 9,
		type: 'discovery',
		actor: 'GoblinWorld',
		action: 'complete',
		message: 'The hidden camp answers back, suspicious but still standing.'
	}).toJSON()
	const phase = createEvent({
		id: 743,
		turn: 10,
		type: 'phase',
		actor: 'GoblinWorld',
		action: 'begin',
		message: 'Phase 3: Mud Road Diplomacy'
	}).toJSON()
	const scene = createEvent({
		id: 744,
		turn: 11,
		type: 'scene',
		actor: 'GoblinWorld',
		action: 'begin',
		message: 'Scene: Face Cellar Rat'
	}).toJSON()

	for (const event of [discovery, phase, scene]) {
		assert.strictEqual(event.feed, null)
	}
})

test('feed narrator rejects curated feed objects with system event types or debug text', () => {
	const systemSpeaker = createEvent({
		id: 745,
		turn: 11,
		type: 'discovery',
		actor: 'GoblinWorld',
		message: 'The under-road lamps make the old dark blink first.',
		feed: {
			speaker: 'Discovery',
			text: 'The under-road lamps make the old dark blink first.',
			tone: 'story',
			visible: true
		}
	}).toJSON()
	const debugText = createEvent({
		id: 746,
		turn: 12,
		type: 'phase',
		actor: 'GoblinWorld',
		message: 'Objective changed.',
		feed: {
			speaker: 'Narrator',
			text: 'Route recovery: objective changed.',
			tone: 'story',
			visible: true
		}
	}).toJSON()

	assert.strictEqual(systemSpeaker.feed, null)
	assert.strictEqual(debugText.feed, null)
})

test('feed narrator rejects legacy uppercase system speakers on nonstandard event types', () => {
	const banned = ['STORY', 'QUEST', 'DISCOVERY', 'GOBLINWORLD', 'Story', 'Quest', 'Discovery', 'GoblinWorld']
	for (const speaker of banned) {
		const event = createEvent({
			id: 749,
			turn: 12,
			type: speaker.toLowerCase(),
			actor: speaker,
			message: `${speaker}: Day 45727: Roads After Dawn`,
			feed: {
				speaker,
				text: 'Day 45727: Roads After Dawn',
				tone: 'story',
				visible: true
			}
		}).toJSON()

		assert.strictEqual(event.feed, null, speaker)
	}
})

test('persisted legacy feed entries are sanitized when the world is loaded', () => {
	const world = new GoblinWorld(createInitialWorld({
		events: [
			{
				id: 900,
				turn: 44,
				type: 'story',
				actor: 'Story',
				action: 'begin',
				message: 'Day 45727: Roads After Dawn',
				feed: {
					speaker: 'STORY',
					text: 'Day 45727: Roads After Dawn',
					tone: 'story',
					visible: true
				}
			},
			{
				id: 901,
				turn: 45,
				type: 'dialogue',
				actor: 'Market Trader',
				action: 'speak',
				message: 'Market Trader: Chatty, cloth costs less than fear today.',
				feed: {
					speaker: 'Market Trader',
					text: 'Chatty, cloth costs less than fear today.',
					tone: 'speech',
					visible: true
				}
			}
		],
		nextEventId: 902
	}))

	const events = world.getSnapshot().events
	assert.strictEqual(events[0].feed, null)
	assert.strictEqual(events[1].feed.speaker, 'Market Trader')
	assert.strictEqual(events[1].feed.text, 'Chatty, cloth costs less than fear today.')
})

test('feed narrator keeps quest tracker updates out of the adventure feed', () => {
	const objective = createEvent({
		id: 741,
		turn: 9,
		type: 'quest',
		action: 'objective',
		actor: 'GoblinWorld',
		message: 'Next lead: Under Road. Break the route loop toward Under Road.',
		controller: 'director-plan'
	}).toJSON()
	const complete = createEvent({
		id: 742,
		turn: 10,
		type: 'quest',
		action: 'complete',
		actor: 'GoblinWorld',
		message: 'Gather cloth for the goblin banner.',
		controller: 'story-engine'
	}).toJSON()

	assert.strictEqual(objective.feed, null)
	assert.strictEqual(complete.feed, null)
})

test('feed narrator hides dialogue hold waits because they are internal pacing', () => {
	const event = createEvent({
		id: 75,
		turn: 10,
		type: 'thought',
		actor: 'Chatty, the chosen one',
		action: 'wait',
		controller: 'dialogue-hold',
		message: 'I stay put and listen to Villager.'
	}).toJSON()

	assert.strictEqual(event.feed, null)
})

test('visible feed speakers stay limited to Chatty and named NPCs', () => {
	const visibleEvents = [
		createEvent({
			id: 751,
			turn: 12,
			type: 'dialogue',
			actor: 'Bartender',
			message: 'Bartender: Chatty, the cellar has opinions and none of them pay rent.'
		}).toJSON(),
		createEvent({
			id: 752,
			turn: 13,
			type: 'combat',
			actor: 'GoblinWorld',
			enemy: 'Crown Hound',
			message: 'The Crown Hound snaps at Chatty’s cloak.'
		}).toJSON()
	]
	const allowed = new Set([
		'Chatty',
		'Mayor Leonard',
		'Bartender',
		'Dwarf Bili',
		'Market Trader',
		'Hooded Villager',
		'Forest Wanderer',
		'Lantern Keeper',
		'Stone Guard',
		'Hidden Goblin'
	])

	assert.ok(visibleEvents[0].feed)
	assert.ok(allowed.has(visibleEvents[0].feed.speaker), visibleEvents[0].feed.speaker)
	assert.strictEqual(visibleEvents[1].feed, null)
})

test('live frontend suppresses legacy quest feed entries', () => {
	const component = fs.readFileSync(path.join(__dirname, '..', 'src/components/GoblinWorldLive.vue'), 'utf8')
	const feedMethod = component.match(/createFeedEntry\(event\) \{[\s\S]*?if \(!event \|\| !event\.message\)/)

	assert.ok(feedMethod, 'createFeedEntry method should exist')
	assert.match(feedMethod[0], /isSystemFeedEvent/)
	assert.match(feedMethod[0], /cleanFeedSpeaker/)
	assert.match(component, /next lead/i)
})

test('live frontend rewrites legacy system speakers before rendering feed entries', () => {
	const component = fs.readFileSync(path.join(__dirname, '..', 'src/components/GoblinWorldLive.vue'), 'utf8')
	const feedMethod = component.match(/createFeedEntry\(event\) \{[\s\S]*?feedSpeaker\(/)

	assert.ok(feedMethod, 'createFeedEntry method should exist')
	assert.match(feedMethod[0], /isSystemFeedEvent/)
	assert.match(component, /Discovery/)
	assert.match(component, /GoblinWorld/)
	assert.match(component, /Narrator/)
})

test('live frontend suppresses legacy meta story wording in feed text', () => {
	const component = fs.readFileSync(path.join(__dirname, '..', 'src/components/GoblinWorldLive.vue'), 'utf8')

	assert.match(component, /story clue/)
	assert.match(component, /story is speaking/)
	assert.match(component, /piece of the story/)
	assert.match(component, /sky-thought/)
	assert.match(component, /feet choose anyway/)
})

test('feed narrator rewrites generic fallback movement into adventure narration', () => {
	const event = createEvent({
		id: 77,
		turn: 11,
		type: 'action',
		actor: 'Chatty, the chosen one',
		action: 'move',
		controller: 'fallback',
		target: { x: 14, y: 19 },
		message: 'Quest points. Feet obey.',
		publicRationale: 'The current quest points Chatty toward Bartender because Find a speaking NPC needs a real conversation.'
	}).toJSON()

	assert.strictEqual(event.feed, null)
})

test('feed narrator suppresses legacy meta story wording', () => {
	const event = createEvent({
		id: 771,
		turn: 11,
		type: 'thought',
		actor: 'Chatty, the chosen one',
		message: 'Chatty follows the next story clue with suspicious feet.'
	}).toJSON()

	assert.strictEqual(event.feed, null)
})

test('visible feed entries include display priority without debug labels', () => {
	const event = createEvent({
		id: 770,
		turn: 11,
		type: 'dialogue',
		actor: 'Bartender',
		action: 'speak',
		message: 'Bartender: Chatty, the tavern has answers and absolutely no liability.'
	}).toJSON()

	assert.strictEqual(event.feed.speaker, 'Bartender')
	assert.strictEqual(event.feed.priority, 'high')
	assert.doesNotMatch(event.feed.text, /controller|fallback|ACTION|actor-|\\d+,\\d+/i)
})

test('feed narrator hides routine movement between authored story beats', () => {
	const event = createEvent({
		id: 79,
		turn: 12,
		type: 'action',
		actor: 'Chatty, the chosen one',
		action: 'move',
		controller: 'fallback',
		target: { x: 15, y: 19 },
		message: 'No more little square dance. New dirt.',
		publicRationale: 'Chatty routes toward fresh map space instead of pacing.'
	}).toJSON()

	assert.strictEqual(event.feed, null)
})

test('feed narrator hides deterministic travel narration so it does not repeat every turn', () => {
	const fallbackEvent = createEvent({
		id: 790,
		turn: 13,
		type: 'action',
		actor: 'Chatty, the chosen one',
		action: 'move',
		controller: 'fallback',
		target: { x: 16, y: 19 },
		message: 'Chatty pads toward the tavern, cloak low and ears open.',
		publicRationale: 'The current quest already points toward Find a speaking NPC, so Chatty keeps following it.'
	}).toJSON()
	const hybridEvent = createEvent({
		id: 791,
		turn: 14,
		type: 'action',
		actor: 'Chatty, the chosen one',
		action: 'move',
		controller: 'hybrid',
		target: { x: 17, y: 19 },
		message: 'Chatty pads toward the tavern, cloak low and ears open.',
		publicRationale: 'The current quest already points toward Find a speaking NPC, so Chatty keeps following it.'
	}).toJSON()

	assert.strictEqual(fallbackEvent.feed, null)
	assert.strictEqual(hybridEvent.feed, null)
})

test('feed narrator rejects programmer and controller text instead of displaying it', () => {
	const event = createEvent({
		id: 78,
		turn: 12,
		type: 'thought',
		actor: 'Chatty, the chosen one',
		action: 'wait',
		controller: 'fallback',
		message: '[ACTION] #1021 actor-23 controller=fallback npc / move NPC wanders to 13,13.'
	}).toJSON()

	assert.strictEqual(event.feed, null)
})

test('feed narrator suppresses old recovery weirdness from buffered Chatty thoughts', () => {
	const event = createEvent({
		id: 781,
		turn: 12,
		type: 'thought',
		actor: 'Chatty, the chosen one',
		action: 'wait',
		message: 'The sky-thought stuttered. Feet choose anyway.'
	}).toJSON()

	assert.strictEqual(event.feed, null)
})

test('Chatty fallback narration is keyed to scene pressure instead of API state', () => {
	const travel = getChattyFallbackNarration({
		story: {
			scene: {
				sceneType: 'travel',
				questId: 'phase-2-recover-ledger'
			}
		}
	}, 'move', { routeTargetName: 'Goblin Ledger' })
	const listen = getChattyFallbackNarration({
		story: {
			scene: {
				sceneType: 'dialogue',
				questId: 'phase-1-find-voice'
			}
		}
	}, 'wait')

	assert.strictEqual(travel, 'I follow the smell of old paper and refuse to be impressed by doors.')
	assert.strictEqual(listen, 'I plant both feet and let the nearby voice become useful.')
	assert.doesNotMatch(`${travel} ${listen}`, /fallback|api|model|controller/i)
	assert.doesNotMatch(`${travel} ${listen}`, /^Chatty\b|\bChatty follows\b|\bChatty plants\b/i)
})

test('feed narrator hides provider recovery movement so the feed does not become fallback travel chatter', () => {
	const event = createEvent({
		id: 792,
		turn: 15,
		type: 'action',
		actor: 'Chatty, the chosen one',
		action: 'move',
		controller: 'anthropic-recovery',
		target: { x: 18, y: 19 },
		message: 'The path is still there, so I trust my feet and keep going.',
		publicRationale: 'The path is still clear, so Chatty keeps moving through the story rather than freezing.'
	}).toJSON()

	assert.strictEqual(event.feed, null)
})

test('fallback dialogue requests use first-person Chatty speech instead of referring to Chatty from outside', () => {
	const world = new GoblinWorld(createInitialWorld({
		map: {
			name: 'Direct Dialogue',
			width: 5,
			height: 5,
			tiles: [
				[1, 1, 1, 1, 1],
				[1, 1, 1, 1, 1],
				[1, 1, 1, 1, 1],
				[1, 1, 1, 1, 1],
				[1, 1, 1, 1, 1]
			],
			actors: [
				{
					id: 'bartender',
					name: 'Bartender',
					entityType: 'NPC',
					dialog: 'BARTENDER',
					x: 3,
					y: 2,
					spriteId: 400
				}
			],
			blocked: []
		},
		goblin: { x: 2, y: 2 },
		story: { phaseId: 'phase-1' }
	}))
	const decision = fallbackDecision(world.getSnapshot())

	assert.strictEqual(decision.action, 'interact')
	assert.doesNotMatch(decision.goblinUtterance, /tell Chatty|Chatty follows|I stop and listen/i)
	assert.match(decision.goblinUtterance, /^Bartender, /)
})

test('feed narrator hides scene labels instead of rendering narrator text', () => {
	const event = createEvent({
		id: 76,
		turn: 10,
		type: 'scene',
		actor: 'GoblinWorld',
		action: 'begin',
		message: 'Scene: Face Cellar Rat'
	}).toJSON()

	assert.strictEqual(event.feed, null)
})

test('feed narrator allows only Chatty thoughts and named NPC speech', () => {
	const chattyThought = createEvent({
		id: 761,
		turn: 20,
		type: 'thought',
		actor: 'Chatty, the chosen one',
		action: 'wait',
		message: 'I think the forest road smells like wet bark and unpaid prophecy.'
	}).toJSON()
	const npcSpeech = createEvent({
		id: 762,
		turn: 21,
		type: 'dialogue',
		actor: 'Lantern Keeper',
		action: 'speak',
		message: 'Lantern Keeper: Chatty, the old road opens where the lamps stop pretending.'
	}).toJSON()
	const narrator = createEvent({
		id: 763,
		turn: 22,
		type: 'thought',
		actor: 'GoblinWorld',
		message: 'The route changes.'
	}).toJSON()

	assert.deepStrictEqual(chattyThought.feed, {
		speaker: 'Chatty',
		text: 'I think the forest road smells like wet bark and unpaid prophecy.',
		tone: 'thought',
		priority: 'normal',
		visible: true
	})
	assert.strictEqual(npcSpeech.feed.speaker, 'Lantern Keeper')
	assert.match(npcSpeech.feed.text, /old road/)
	assert.strictEqual(narrator.feed, null)
})

test('feed narrator keeps individual hidden goblin names instead of collapsing them into a generic speaker', () => {
	const pip = createEvent({
		id: 764,
		turn: 23,
		type: 'dialogue',
		actor: 'Hidden Goblin Pip',
		action: 'speak',
		message: 'Hidden Goblin Pip: Chatty, are you tax? You are upright in a very taxable way.'
	}).toJSON()
	const muck = createEvent({
		id: 765,
		turn: 24,
		type: 'dialogue',
		actor: 'Hidden Goblin Muck',
		action: 'speak',
		message: 'Hidden Goblin Muck: Chatty, turn left at the stump that looks judgmental.'
	}).toJSON()
	const nib = createEvent({
		id: 766,
		turn: 25,
		type: 'dialogue',
		actor: 'Hidden Goblin Nib',
		action: 'speak',
		message: 'Hidden Goblin Nib: Chatty, make the new list a promise, not a leash.'
	}).toJSON()

	assert.strictEqual(pip.feed.speaker, 'Hidden Goblin Pip')
	assert.match(pip.feed.text, /taxable/)
	assert.strictEqual(muck.feed.speaker, 'Hidden Goblin Muck')
	assert.match(muck.feed.text, /judgmental/)
	assert.strictEqual(nib.feed.speaker, 'Hidden Goblin Nib')
	assert.match(nib.feed.text, /promise/)
})

test('live frontend allows named hidden goblins as public feed speakers', () => {
	const component = fs.readFileSync(path.join(__dirname, '..', 'src/components/GoblinWorldLive.vue'), 'utf8')

	assert.match(component, /Hidden Goblin Pip/)
	assert.match(component, /Hidden Goblin Muck/)
	assert.match(component, /Hidden Goblin Nib/)
	assert.doesNotMatch(component, /hiddenGoblinOne:\s*'Hidden Goblin'[\s,]/)
})

test('serializes actor world deltas for live NPC updates', () => {
	const event = createEvent({
		id: 9,
		turn: 4,
		type: 'action',
		actor: 'Moss Clerk',
		action: 'move',
		position: { x: 3, y: 2 },
		worldDelta: {
			actors: {
				'npc-moss-clerk': {
					position: { x: 3, y: 2 }
				}
			}
		}
	})

	assert.deepStrictEqual(event.toJSON().worldDelta.actors['npc-moss-clerk'].position, { x: 3, y: 2 })
})

test('serves a shared live state snapshot without exposing server secrets', async () => {
	const world = new GoblinWorld(createInitialWorld({ goblin: { x: 2, y: 3 } }))
	const app = createGoblinWorldApp({ world, startLoop: false, loop: { apiKey: '' } })
	const server = app.listen(0)
	await waitForListening(server)

	try {
		const { port } = server.address()
		const response = await fetch(`http://127.0.0.1:${port}/api/live/state`)
		const snapshot = await response.json()

		assert.strictEqual(response.status, 200)
		assert.strictEqual(snapshot.model, 'claude-haiku-4-5')
		assert.ok(snapshot.map.id)
		assert.ok(Array.isArray(snapshot.map.portalLinks))
		assert.deepStrictEqual(snapshot.goblin.position, { x: 2, y: 3 })
		assert.strictEqual(Object.prototype.hasOwnProperty.call(snapshot, 'memory'), false)
		assert.ok(Array.isArray(snapshot.tasks))
		assert.strictEqual(snapshot.story.phaseId, 'phase-1')
		assert.ok(Array.isArray(snapshot.story.activeTasks))
		assert.ok(snapshot.story.facts)
		assert.ok(snapshot.story.items)
		assert.ok(snapshot.story.relationships.mayor)
		assert.ok(Array.isArray(snapshot.story.allies))
		assert.ok(Array.isArray(snapshot.story.failedTasks))
		assert.ok(Array.isArray(snapshot.story.callbacks))
		assert.ok(snapshot.story.scene)
		assert.ok(snapshot.story.scene.sceneId)
		assert.strictEqual(snapshot.story.scene.phaseId, 'phase-1')
		assert.ok(snapshot.story.exploration)
		assert.strictEqual(snapshot.story.exploration.currentMapId, snapshot.map.id)
		assert.strictEqual(snapshot.controller.mode, 'fallback')
		assert.strictEqual(snapshot.controller.provider, 'anthropic')
		assert.strictEqual(snapshot.controller.configured, false)
		assert.strictEqual(snapshot.controller.model, 'claude-haiku-4-5')
		assert.ok(snapshot.controller.plan)
		assert.strictEqual(Object.prototype.hasOwnProperty.call(snapshot.controller.plan, 'targetMapId'), true)
		assert.strictEqual(snapshot.controller.plan.currentIntent, snapshot.story.directorPlan.currentIntent)
		assert.strictEqual(snapshot.controller.budget.requestCount, 0)
		assert.strictEqual(snapshot.runtime.mode, 'classic-autonomous')
		assert.strictEqual(snapshot.runtime.currentMapId, snapshot.map.id)
		assert.deepStrictEqual(snapshot.runtime.availableMapIds, CANONICAL_CLASSIC_MAP_IDS)
		assert.ok(snapshot.runtime.legalActions.includes('fire'))
		assert.ok(Array.isArray(snapshot.runtime.inventorySummary))
		assert.ok(Array.isArray(snapshot.runtime.nearbyEnemies))
		assert.ok(Array.isArray(snapshot.runtime.nearbyNpcs))
		assert.ok(snapshot.build)
		assert.ok(snapshot.build.gitSha)
		assert.ok(snapshot.build.startedAt)
		assert.strictEqual(snapshot.build.eventSanitizerVersion, 'strict-character-feed-v3')
		assert.strictEqual(snapshot.build.runtime.mode, 'classic-autonomous')
		assert.strictEqual(JSON.stringify(snapshot).includes('OPENAI_API_KEY'), false)
		assert.strictEqual(JSON.stringify(snapshot).includes('ANTHROPIC_API_KEY'), false)
	} finally {
		await new Promise(resolve => server.close(resolve))
	}
})

test('live state response sanitizes poisoned persisted feed speakers at the final boundary', async () => {
	const world = new GoblinWorld(createInitialWorld({ goblin: { x: 2, y: 3 } }))
	world.state.events.push({
		id: 901,
		turn: 7,
		type: 'phase',
		actor: 'GoblinWorld',
		action: 'begin',
		position: { x: 2, y: 3 },
		message: 'Day 74709: Roads After Dawn',
		feed: {
			speaker: 'STORY',
			text: 'Day 74709: Roads After Dawn',
			tone: 'story',
			visible: true
		}
	})
	const app = createGoblinWorldApp({ world, startLoop: false, persistence: false, loop: { apiKey: '' } })
	const server = app.listen(0)
	await waitForListening(server)

	try {
		const { port } = server.address()
		const response = await fetch(`http://127.0.0.1:${port}/api/live/state`)
		const snapshot = await response.json()
		const poisoned = snapshot.events.find(event => event.id === 901)

		assert.strictEqual(response.status, 200)
		assert.ok(poisoned)
		assert.strictEqual(poisoned.feed, null)
		assert.strictEqual(getBadFeedEvents(snapshot.events).length, 0)
	} finally {
		await new Promise(resolve => server.close(resolve))
	}
})

test('SSE replay sanitizes poisoned legacy quest and world feed speakers', async () => {
	const world = new GoblinWorld(createInitialWorld({ goblin: { x: 2, y: 3 } }))
	world.state.events.push({
		id: 902,
		turn: 8,
		type: 'quest',
		actor: 'GoblinWorld',
		action: 'complete',
		position: { x: 2, y: 3 },
		message: 'Next lead: Market. Break the route loop toward Market.',
		feed: {
			speaker: 'Quest',
			text: 'Next lead: Market. Break the route loop toward Market.',
			tone: 'story',
			visible: true
		}
	})
	const app = createGoblinWorldApp({ world, startLoop: false, persistence: false, loop: { apiKey: '' } })
	const server = app.listen(0)
	await waitForListening(server)

	try {
		const { port } = server.address()
		const event = await readFirstSseData(`http://127.0.0.1:${port}/api/live/events`)

		assert.strictEqual(event.id, 902)
		assert.strictEqual(event.feed, null)
	} finally {
		await new Promise(resolve => server.close(resolve))
	}
})

test('serves a safe live health status without secrets or memory', async () => {
	const world = new GoblinWorld(createInitialWorld({ goblin: { x: 2, y: 3 }, turn: 9 }))
	const app = createGoblinWorldApp({ world, startLoop: false, persistence: false, loop: { apiKey: '' } })
	const server = app.listen(0)
	await waitForListening(server)

	try {
		const { port } = server.address()
		const response = await fetch(`http://127.0.0.1:${port}/api/live/health`)
		const health = await response.json()
		const serialized = JSON.stringify(health)

		assert.strictEqual(response.status, 200)
		assert.strictEqual(health.ok, true)
		assert.strictEqual(health.status, 'live')
		assert.strictEqual(health.turn, 9)
		assert.strictEqual(health.clients, 0)
		assert.strictEqual(health.persistence.enabled, false)
		assert.strictEqual(health.controller.mode, 'fallback')
		assert.ok(health.controller.plan)
		assert.ok(Number.isFinite(health.uptimeSeconds))
		assert.ok(health.build)
		assert.ok(health.build.gitSha)
		assert.ok(health.build.startedAt)
		assert.strictEqual(health.build.eventSanitizerVersion, 'strict-character-feed-v3')
		assert.strictEqual(health.runtime.mode, 'classic-autonomous')
		assert.strictEqual(health.events.badFeedCount, 0)
		assert.strictEqual(serialized.includes('ANTHROPIC_API_KEY'), false)
		assert.strictEqual(serialized.includes('OPENAI_API_KEY'), false)
		assert.strictEqual(serialized.includes('sk-'), false)
		assert.strictEqual(serialized.includes('memory'), false)
	} finally {
		await new Promise(resolve => server.close(resolve))
	}
})

test('live health build stamp can read a packaged BUILD_COMMIT file', async () => {
	const staticRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'goblinworld-build-stamp-'))
	fs.writeFileSync(path.join(staticRoot, 'BUILD_COMMIT'), 'abc1234packaged\n')
	const world = new GoblinWorld(createInitialWorld({ turn: 1 }))
	const app = createGoblinWorldApp({ world, staticRoot, startLoop: false, persistence: false, loop: { apiKey: '' } })
	const server = app.listen(0)
	await waitForListening(server)

	try {
		const { port } = server.address()
		const response = await fetch(`http://127.0.0.1:${port}/api/live/health`)
		const health = await response.json()

		assert.strictEqual(response.status, 200)
		assert.strictEqual(health.build.gitSha, 'abc1234packaged')
	} finally {
		await new Promise(resolve => server.close(resolve))
	}
})

test('admin reset is token guarded and replaces the shared live world', async () => {
	const world = new GoblinWorld(createInitialWorld({ goblin: { x: 4, y: 4 }, turn: 37 }))
	const persistence = createWorldPersistence(fs.mkdtempSync(path.join(os.tmpdir(), 'goblinworld-reset-')))
	persistence.saveSnapshot(world.getSnapshot())
	const app = createGoblinWorldApp({
		world,
		startLoop: false,
		persistence,
		adminToken: 'reset-secret',
		loop: { apiKey: '' }
	})
	const server = app.listen(0)
	await waitForListening(server)

	try {
		const { port } = server.address()
		const missing = await fetch(`http://127.0.0.1:${port}/api/live/admin/reset`, { method: 'POST' })
		const wrong = await fetch(`http://127.0.0.1:${port}/api/live/admin/reset`, {
			method: 'POST',
			headers: { Authorization: 'Bearer wrong' }
		})
		const good = await fetch(`http://127.0.0.1:${port}/api/live/admin/reset`, {
			method: 'POST',
			headers: { Authorization: 'Bearer reset-secret' }
		})
		const reset = await good.json()
		const state = await (await fetch(`http://127.0.0.1:${port}/api/live/state`)).json()

		assert.strictEqual(missing.status, 403)
		assert.strictEqual(wrong.status, 403)
		assert.strictEqual(good.status, 200)
		assert.strictEqual(reset.ok, true)
		assert.strictEqual(reset.snapshot.turn, 0)
		assert.strictEqual(state.turn, 0)
		assert.strictEqual(fs.existsSync(persistence.paths.snapshotPath), false)
		assert.strictEqual(JSON.stringify(reset).includes('reset-secret'), false)
	} finally {
		await new Promise(resolve => server.close(resolve))
	}
})

test('admin backup-reset backs up poisoned persistence and returns a clean snapshot', async () => {
	const world = new GoblinWorld(createInitialWorld({ goblin: { x: 4, y: 4 }, turn: 37 }))
	world.state.events.push({
		id: 903,
		turn: 37,
		type: 'phase',
		actor: 'GoblinWorld',
		message: 'Day 75039: Roads After Dawn',
		feed: {
			speaker: 'Story',
			text: 'Day 75039: Roads After Dawn',
			tone: 'story',
			visible: true
		}
	})
	const persistence = createWorldPersistence(fs.mkdtempSync(path.join(os.tmpdir(), 'goblinworld-backup-reset-')))
	persistence.saveSnapshot(world.getSnapshot())
	persistence.appendEvent(world.state.events[world.state.events.length - 1])
	const app = createGoblinWorldApp({
		world,
		startLoop: false,
		persistence,
		adminToken: 'backup-secret',
		loop: { apiKey: '' }
	})
	const server = app.listen(0)
	await waitForListening(server)

	try {
		const { port } = server.address()
		const missing = await fetch(`http://127.0.0.1:${port}/api/live/admin/backup-reset`, { method: 'POST' })
		const good = await fetch(`http://127.0.0.1:${port}/api/live/admin/backup-reset`, {
			method: 'POST',
			headers: { Authorization: 'Bearer backup-secret' }
		})
		const reset = await good.json()
		const state = await (await fetch(`http://127.0.0.1:${port}/api/live/state`)).json()

		assert.strictEqual(missing.status, 403)
		assert.strictEqual(good.status, 200)
		assert.strictEqual(reset.ok, true)
		assert.strictEqual(reset.snapshotTurn, 0)
		assert.strictEqual(reset.badFeedCount, 0)
		assert.ok(reset.backups.snapshot.startsWith('snapshot.json.backup-'))
		assert.ok(reset.backups.events.startsWith('events.jsonl.backup-'))
		assert.strictEqual(fs.existsSync(path.join(persistence.paths.root, reset.backups.snapshot)), true)
		assert.strictEqual(fs.existsSync(path.join(persistence.paths.root, reset.backups.events)), true)
		assert.strictEqual(state.turn, 0)
		assert.strictEqual(getBadFeedEvents(state.events).length, 0)
		assert.strictEqual(JSON.stringify(reset).includes('backup-secret'), false)
	} finally {
		await new Promise(resolve => server.close(resolve))
	}
})

test('marks fallback decisions when no model API key is configured', async () => {
	const world = new GoblinWorld(createInitialWorld({ goblin: { x: 2, y: 2 } }))
	const decision = await requestGoblinDecision(world.getSnapshot(), { apiKey: '' })

	assert.strictEqual(decision.controller, 'fallback')
	assert.strictEqual(decision.action, 'move')
})

test('fallback movement heads toward the current quest instead of looping in place', async () => {
	const world = new GoblinWorld(
		createInitialWorld({
			map: {
				name: 'Quest Road',
				width: 6,
				height: 5,
				tiles: [
					[1, 1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1, 1]
				],
				blocked: [],
				actors: [
					{
						id: 'bartender',
						name: 'Bartender',
						entityType: 'NPC',
						dialog: 'BARTENDER',
						wanders: false,
						x: 4,
						y: 2,
						home: { x: 4, y: 2 },
						spriteId: 400
					}
				]
			},
			goblin: { x: 2, y: 2 },
			story: {
				completedTasks: ['phase-1-test-body']
			}
		})
	)
	const decision = await requestGoblinDecision(world.getSnapshot(), { apiKey: '' })

	assert.strictEqual(decision.controller, 'fallback')
	assert.strictEqual(decision.action, 'move')
	assert.deepStrictEqual(decision.target, { direction: 'east', x: 3, y: 2 })
	assert.match(decision.publicRationale, /current quest/)
})

test('quest navigation resolves a dialogue target and routes around blocked tiles', () => {
	const snapshot = {
		turn: 12,
		goblin: { position: { x: 1, y: 2 } },
		map: {
			name: 'Blocked Tavern Road',
			width: 7,
			height: 5,
			blocked: [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 }],
			actors: [
				{
					id: 'bartender',
					name: 'Bartender',
					entityType: 'NPC',
					dialog: 'BARTENDER',
					x: 5,
					y: 2,
					spriteKey: 'bartender'
				},
				{
					id: 'crate',
					name: 'Crate',
					entityType: 'CHEST',
					x: 5,
					y: 1
				}
			]
		},
		events: [],
		legalMoves: [
			{ direction: 'south', x: 1, y: 3 },
			{ direction: 'north', x: 1, y: 1 }
		],
		tasks: [
			{
				id: 'phase-1-find-voice',
				title: 'Find a speaking NPC',
				status: 'active',
				target: { kind: 'dialogue', dialog: 'BARTENDER' },
				hint: 'Find the bartender.'
			}
		],
		story: { scene: { sceneType: 'travel', questId: 'phase-1-find-voice' } },
		nearbyActors: [],
		visibleTiles: [],
		legalActions: []
	}

	const route = resolveQuestNavigation(snapshot, snapshot.tasks[0])
	const path = findPath(snapshot, snapshot.goblin.position, route.destinations)

	assert.strictEqual(route.targetActorId, 'bartender')
	assert.strictEqual(route.targetZone, 'tavern')
	assert.deepStrictEqual(route.nextStep, { direction: 'south', x: 1, y: 3 })
	assert.ok(path.length > 4)
	assert.strictEqual(path.some(position => snapshot.map.blocked.some(blocked => blocked.x === position.x && blocked.y === position.y)), false)
	assert.strictEqual(path.some(position => position.x === 5 && position.y === 1), false)
})

test('quest navigation ignores decorative bar objects when selecting dialogue actors', () => {
	const snapshot = {
		turn: 12,
		goblin: { position: { x: 1, y: 1 } },
		map: {
			name: 'Tavern Confusion',
			width: 8,
			height: 5,
			blocked: [],
			actors: [
				{
					id: 'decorative-bar',
					name: 'Bar',
					entityType: 'NPC',
					dialog: 'BARTENDER',
					x: 2,
					y: 2,
					spriteKey: null
				},
				{
					id: 'real-bartender',
					name: 'Bartender',
					entityType: 'NPC',
					dialog: 'BARTENDER',
					x: 5,
					y: 1,
					spriteKey: 'bartender'
				}
			]
		},
		events: [],
		legalMoves: [
			{ direction: 'east', x: 2, y: 1 },
			{ direction: 'south', x: 1, y: 2 }
		],
		tasks: [
			{
				id: 'phase-1-find-voice',
				title: 'Find a speaking NPC',
				status: 'active',
				target: { kind: 'dialogue', dialog: 'BARTENDER' }
			}
		],
		story: {},
		nearbyActors: [],
		visibleTiles: [],
		legalActions: []
	}

	const route = resolveQuestNavigation(snapshot, snapshot.tasks[0])

	assert.strictEqual(route.targetActorId, 'real-bartender')
	assert.strictEqual(route.targetActorName, 'Bartender')
	assert.deepStrictEqual(route.nextStep, { direction: 'east', x: 2, y: 1 })
	assert.strictEqual(route.routeStatus, 'ready')
})

test('quest navigation routes to a portal when the target map is not the current map', () => {
	const snapshot = {
		turn: 20,
		goblin: { position: { x: 1, y: 1 } },
		map: {
			id: 'mulberryTown',
			name: 'Mulberry Town',
			width: 8,
			height: 6,
			blocked: [],
			actors: [],
			portalLinks: [
				{
					id: 'portal-forest',
					portalId: 'Mulberry Forest',
					targetMapId: 'mulberryForest',
					x: 6,
					y: 1
				}
			]
		},
		events: [],
		legalMoves: [
			{ direction: 'east', x: 2, y: 1 },
			{ direction: 'south', x: 1, y: 2 }
		],
		tasks: [
			{
				id: 'day-2-check-hidden-camp',
				title: 'Check the hidden camp for holdouts',
				status: 'active',
				target: { kind: 'place', zone: 'hidden-camp', mapId: 'mulberryForest', name: 'hidden camp' }
			}
		],
		story: {},
		nearbyActors: [],
		visibleTiles: [],
		legalActions: []
	}

	const route = resolveQuestNavigation(snapshot, snapshot.tasks[0])

	assert.strictEqual(route.targetMapId, 'mulberryForest')
	assert.strictEqual(route.targetPortal.portalId, 'Mulberry Forest')
	assert.deepStrictEqual(route.nextStep, { direction: 'east', x: 2, y: 1 })
	assert.match(route.targetReason, /portal/i)
})

test('interacting with a reached portal swaps the live map and keeps original map art', () => {
	const town = loadRegisteredTiledMap(path.join(__dirname, '..'), 'mulberryTown')
	const world = new GoblinWorld(
		createWorldFromTiledMap(town, {
			staticRoot: path.join(__dirname, '..'),
			mapId: 'mulberryTown',
			name: 'Mulberry Town',
			goblin: { x: 41, y: 45 }
		}),
		{ staticRoot: path.join(__dirname, '..') }
	)
	const event = world.applyDecision({
		action: 'interact',
		target: {
			kind: 'portal',
			portalId: 'Mulberry Forest',
			targetMapId: 'mulberryForest',
			reached: true
		},
		goblinUtterance: 'I take the forest road before the road changes its mind.'
	})
	const snapshot = world.getSnapshot()

	assert.strictEqual(snapshot.map.id, 'mulberryForest')
	assert.ok(snapshot.map.portalLinks.some(link => link.targetMapId === 'mulberryTown'))
	assert.strictEqual(event.worldDelta.map.id, 'mulberryForest')
	assert.strictEqual(event.feed.speaker, 'Chatty')
	assert.match(event.feed.text, /forest road/)
})

test('quest navigation falls back to a reachable zone waypoint when a target actor is sealed off', () => {
	const snapshot = {
		turn: 18,
		goblin: { position: { x: 1, y: 1 } },
		map: {
			name: 'Sealed Tavern',
			width: 8,
			height: 5,
			blocked: [
				{ x: 4, y: 0 },
				{ x: 4, y: 1 },
				{ x: 4, y: 2 },
				{ x: 4, y: 3 },
				{ x: 4, y: 4 }
			],
			actors: [
				{
					id: 'real-bartender',
					name: 'Bartender',
					entityType: 'NPC',
					dialog: 'BARTENDER',
					x: 6,
					y: 1,
					spriteKey: 'bartender'
				}
			]
		},
		events: [],
		legalMoves: [
			{ direction: 'east', x: 2, y: 1 },
			{ direction: 'south', x: 1, y: 2 }
		],
		tasks: [
			{
				id: 'phase-1-find-voice',
				title: 'Find a speaking NPC',
				status: 'active',
				target: { kind: 'dialogue', dialog: 'BARTENDER' }
			}
		],
		story: {},
		nearbyActors: [],
		visibleTiles: [],
		legalActions: []
	}

	const route = resolveQuestNavigation(snapshot, snapshot.tasks[0])

	assert.strictEqual(route.targetActorId, 'real-bartender')
	assert.strictEqual(route.routeStatus, 'recovering')
	assert.strictEqual(route.unreachableReason, 'target-actor-unreachable')
	assert.deepStrictEqual(route.nextStep, { direction: 'east', x: 2, y: 1 })
	assert.strictEqual(route.nextWaypoint.id, 'tavern-exterior')
})

test('waypoint recovery accepts a near blocked waypoint as a proxy stop', () => {
	const snapshot = {
		turn: 24,
		goblin: { position: { x: 6, y: 9 } },
		map: {
			name: 'Near Tavern Exterior',
			width: 20,
			height: 20,
			blocked: [
				{ x: 6, y: 7 },
				{ x: 17, y: 18 },
				{ x: 18, y: 17 },
				{ x: 19, y: 18 },
				{ x: 18, y: 19 }
			],
			actors: [
				{
					id: 'sealed-bartender',
					name: 'Bartender',
					entityType: 'NPC',
					dialog: 'BARTENDER',
					x: 18,
					y: 18,
					spriteKey: 'bartender'
				}
			]
		},
		events: [],
		legalMoves: [
			{ direction: 'east', x: 7, y: 9 },
			{ direction: 'south', x: 6, y: 10 },
			{ direction: 'west', x: 5, y: 9 },
			{ direction: 'north', x: 6, y: 8 }
		],
		tasks: [
			{
				id: 'day-2-talk-bartender',
				title: 'Get the next supply lead from the Bartender',
				status: 'active',
				target: { kind: 'dialogue', dialog: 'BARTENDER' }
			}
		],
		story: {},
		nearbyActors: [],
		visibleTiles: [],
		legalActions: []
	}

	const route = resolveQuestNavigation(snapshot, snapshot.tasks[0])

	assert.strictEqual(route.routeStatus, 'proxy-reached')
	assert.strictEqual(route.proxyReached, true)
	assert.strictEqual(route.nextStep, null)
})

test('waypoint recovery accepts an expanded proxy tile instead of bouncing back out', () => {
	const snapshot = {
		turn: 24,
		goblin: { position: { x: 13, y: 19 } },
		map: {
			name: 'Blocked Tavern Door',
			width: 42,
			height: 56,
			blocked: [
				{ x: 6, y: 9 },
				{ x: 8, y: 9 },
				{ x: 13, y: 21 },
				{ x: 12, y: 21 },
				{ x: 14, y: 21 },
				{ x: 13, y: 20 },
				{ x: 13, y: 22 },
				{ x: 7, y: 8 },
				{ x: 7, y: 10 }
			],
			actors: [
				{
					id: 'sealed-bartender',
					name: 'Bartender',
					entityType: 'NPC',
					dialog: 'BARTENDER',
					x: 7,
					y: 9,
					spriteKey: 'bartender'
				}
			]
		},
		events: [
			{ id: 1, turn: 21, actor: 'Chatty, the chosen one', action: 'move', position: { x: 12, y: 19 }, worldDelta: { goblin: { position: { x: 12, y: 19 } } } },
			{ id: 2, turn: 22, actor: 'Chatty, the chosen one', action: 'move', position: { x: 13, y: 19 }, worldDelta: { goblin: { position: { x: 13, y: 19 } } } }
		],
		legalMoves: [
			{ direction: 'west', x: 12, y: 19 },
			{ direction: 'east', x: 14, y: 19 }
		],
		tasks: [
			{
				id: 'day-2-talk-bartender',
				title: 'Get the next supply lead from the Bartender',
				status: 'active',
				target: { kind: 'dialogue', dialog: 'BARTENDER', zone: 'tavern' }
			}
		],
		story: {},
		nearbyActors: [],
		visibleTiles: [],
		legalActions: []
	}

	const route = resolveQuestNavigation(snapshot, snapshot.tasks[0])
	const decision = fallbackDecision(snapshot)

	assert.strictEqual(route.routeStatus, 'proxy-reached')
	assert.strictEqual(route.proxyReached, true)
	assert.strictEqual(route.reached, true)
	assert.strictEqual(route.nextStep, null)
	assert.strictEqual(decision.action, 'interact')
	assert.strictEqual(decision.target.name, 'Bartender')
	assert.strictEqual(decision.target.reached, true)
})

test('dialogue quest interaction increments the target relationship so dialogue predicates progress', () => {
	const story = normalizeStoryState({}, 10)
	const task = {
		id: 'day-2-talk-bartender',
		title: 'Get the next supply lead from the Bartender',
		status: 'active',
		target: { kind: 'dialogue', dialog: 'BARTENDER', zone: 'tavern' },
		unlocks: ['fact:dayTwoSupplyLead']
	}

	const result = applyQuestInteraction(story, task, {
		action: 'interact',
		target: { dialog: 'BARTENDER', name: 'Bartender', reached: true },
		reached: true,
		turn: 10
	})

	assert.strictEqual(result.applied, true)
	assert.strictEqual(result.story.relationships.bartender.talks, 1)
	assert.ok(result.story.relationships.bartender.trust >= 1)
	assert.strictEqual(result.story.facts.dayTwoSupplyLead, true)
})

test('live story snapshot exposes current quest navigation without raw path spam', () => {
	const world = new GoblinWorld(
		createInitialWorld({
			map: {
				name: 'Quest Town',
				width: 8,
				height: 5,
				tiles: [
					[1, 1, 1, 1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1, 1, 1, 1]
				],
				blocked: [],
				actors: [
					{
						id: 'bartender',
						name: 'Bartender',
						entityType: 'NPC',
						dialog: 'BARTENDER',
						wanders: false,
						x: 6,
						y: 2,
						home: { x: 6, y: 2 },
						spriteId: 400
					}
				]
			},
			goblin: { x: 2, y: 2 },
			story: {
				completedTasks: ['phase-1-test-body']
			}
		})
	)

	const snapshot = world.getSnapshot()
	const navigation = getNavigationSnapshot(snapshot)

	assert.strictEqual(snapshot.story.navigation.questId, 'phase-1-find-voice')
	assert.strictEqual(snapshot.story.navigation.targetActorId, 'bartender')
	assert.strictEqual(snapshot.story.navigation.targetZone, 'tavern')
	assert.deepStrictEqual(snapshot.story.navigation.nextStep, { direction: 'east', x: 3, y: 2 })
	assert.strictEqual(Object.prototype.hasOwnProperty.call(snapshot.story.navigation, 'path'), false)
	assert.deepStrictEqual(snapshot.story.navigation, navigation)
})

test('movement events include refreshed public navigation so the frontend route marker does not lag', () => {
	const world = new GoblinWorld(
		createInitialWorld({
			map: {
				name: 'Route Sync Town',
				width: 7,
				height: 5,
				tiles: [
					[1, 1, 1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1, 1, 1]
				],
				blocked: [],
				actors: [
					{
						id: 'bartender',
						name: 'Bartender',
						entityType: 'NPC',
						dialog: 'BARTENDER',
						x: 5,
						y: 2,
						home: { x: 5, y: 2 },
						spriteId: 400
					}
				]
			},
			goblin: { x: 2, y: 2 },
			story: {
				completedTasks: ['phase-1-test-body']
			}
		})
	)

	const event = world.applyDecision({
		action: 'move',
		target: { x: 3, y: 2 },
		publicRationale: 'Chatty follows the current route.',
		goblinUtterance: 'I keep moving.'
	})

	assert.strictEqual(event.worldDelta.story.navigation.questId, 'phase-1-find-voice')
	assert.deepStrictEqual(event.worldDelta.story.navigation.nextStep, { direction: 'east', x: 4, y: 2 })
	assert.deepStrictEqual(event.worldDelta.story.directorPlan, {
		...event.worldDelta.story.directorPlan,
		routeStatus: 'ready',
		nextAction: 'move'
	})
})

test('public navigation follows the recovering director plan instead of the stale quest target', () => {
	const snapshot = {
		turn: 40,
		goblin: { position: { x: 1, y: 1 } },
		map: {
			name: 'Recovery Choice',
			width: 10,
			height: 10,
			blocked: [],
			actors: [
				{
					id: 'bartender',
					name: 'Bartender',
					entityType: 'NPC',
					dialog: 'BARTENDER',
					x: 8,
					y: 1,
					spriteKey: 'bartender'
				}
			]
		},
		events: [],
		legalMoves: [
			{ direction: 'east', x: 2, y: 1 },
			{ direction: 'south', x: 1, y: 2 }
		],
		tasks: [
			{
				id: 'day-2-talk-bartender',
				title: 'Get the next supply lead from the Bartender',
				status: 'active',
				target: { kind: 'dialogue', dialog: 'BARTENDER' }
			}
		],
		story: {
			directorPlan: {
				questId: 'day-2-talk-bartender',
				currentIntent: 'Break the route loop toward Market',
				targetName: 'Market',
				targetZone: 'market',
				status: 'recovering',
				failureCount: 1
			}
		},
		nearbyActors: [],
		visibleTiles: [],
		legalActions: []
	}

	const navigation = getNavigationSnapshot(snapshot)

	assert.strictEqual(navigation.targetZone, 'market')
	assert.strictEqual(navigation.targetActorId, null)
	assert.match(navigation.targetTitle, /Market/)
})

test('public navigation ignores stale high-failure recovery plans and returns to the active quest', () => {
	const snapshot = {
		turn: 41,
		goblin: { position: { x: 1, y: 1 } },
		map: {
			name: 'Stale Recovery Choice',
			width: 10,
			height: 10,
			blocked: [],
			actors: [
				{
					id: 'bartender',
					name: 'Bartender',
					entityType: 'NPC',
					dialog: 'BARTENDER',
					x: 8,
					y: 1,
					spriteKey: 'bartender'
				}
			]
		},
		events: [],
		legalMoves: [
			{ direction: 'east', x: 2, y: 1 },
			{ direction: 'south', x: 1, y: 2 }
		],
		tasks: [
			{
				id: 'day-2-talk-bartender',
				title: 'Get the next supply lead from the Bartender',
				status: 'active',
				target: { kind: 'dialogue', dialog: 'BARTENDER', zone: 'tavern' }
			}
		],
		story: {
			directorPlan: {
				questId: 'day-2-talk-bartender',
				currentIntent: 'Break the route loop toward Armory',
				targetName: 'Armory',
				targetZone: 'armory',
				status: 'recovering',
				failureCount: 99
			}
		},
		nearbyActors: [],
		visibleTiles: [],
		legalActions: []
	}

	const navigation = getNavigationSnapshot(snapshot)
	const decision = fallbackDecision(snapshot)

	assert.strictEqual(navigation.targetZone, 'tavern')
	assert.strictEqual(navigation.targetActorId, 'bartender')
	assert.deepStrictEqual(decision.target, { direction: 'east', x: 2, y: 1 })
	assert.match(decision.publicRationale, /Bartender/)
})

test('fallback movement follows the navigation route toward a quest actor', () => {
	const snapshot = {
		turn: 22,
		goblin: { position: { x: 1, y: 1 } },
		map: {
			name: 'Quest Corridor',
			width: 6,
			height: 4,
			blocked: [{ x: 2, y: 1 }],
			actors: [
				{
					id: 'mayor',
					name: 'Mayor Leonard',
					entityType: 'NPC',
					dialog: 'MAYOR_LEONARD',
					x: 4,
					y: 1,
					spriteKey: 'mayor'
				}
			]
		},
		events: [],
		legalMoves: [
			{ direction: 'south', x: 1, y: 2 },
			{ direction: 'west', x: 0, y: 1 }
		],
		tasks: [
			{
				id: 'phase-2-speak-mayor',
				title: 'Speak to Mayor Leonard about the missing ledger',
				status: 'active',
				target: { kind: 'dialogue', dialog: 'MAYOR_LEONARD' },
				hint: 'Find Mayor Leonard.'
			}
		],
		story: {},
		nearbyActors: [],
		visibleTiles: [],
		legalActions: []
	}

	const decision = fallbackDecision(snapshot)

	assert.strictEqual(decision.action, 'move')
	assert.deepStrictEqual(decision.target, { direction: 'south', x: 1, y: 2 })
	assert.match(decision.publicRationale, /Mayor Leonard/)
	assert.doesNotMatch(decision.publicRationale, /\d+,\d+/)
})

test('movement loop detection recognizes tiny repeated routes and navigation can break out', () => {
	const snapshot = {
		turn: 50,
		goblin: { position: { x: 2, y: 2 } },
		map: {
			name: 'Loop Field',
			width: 7,
			height: 5,
			blocked: [],
			actors: [
				{
					id: 'trader',
					name: 'Market Trader',
					entityType: 'NPC',
					dialog: '',
					spriteKey: 'marketTrader',
					x: 5,
					y: 2
				}
			]
		},
		events: [
			{ id: 1, turn: 1, actor: 'Chatty, the chosen one', action: 'move', position: { x: 2, y: 2 }, worldDelta: { goblin: { position: { x: 2, y: 2 } } } },
			{ id: 2, turn: 2, actor: 'Chatty, the chosen one', action: 'move', position: { x: 2, y: 1 }, worldDelta: { goblin: { position: { x: 2, y: 1 } } } },
			{ id: 3, turn: 3, actor: 'Chatty, the chosen one', action: 'move', position: { x: 2, y: 2 }, worldDelta: { goblin: { position: { x: 2, y: 2 } } } },
			{ id: 4, turn: 4, actor: 'Chatty, the chosen one', action: 'move', position: { x: 2, y: 1 }, worldDelta: { goblin: { position: { x: 2, y: 1 } } } },
			{ id: 5, turn: 5, actor: 'Chatty, the chosen one', action: 'move', position: { x: 2, y: 2 }, worldDelta: { goblin: { position: { x: 2, y: 2 } } } },
			{ id: 6, turn: 6, actor: 'Chatty, the chosen one', action: 'move', position: { x: 2, y: 1 }, worldDelta: { goblin: { position: { x: 2, y: 1 } } } }
		],
		legalMoves: [
			{ direction: 'east', x: 3, y: 2 },
			{ direction: 'north', x: 2, y: 1 },
			{ direction: 'west', x: 1, y: 2 }
		],
		tasks: [
			{
				id: 'phase-5-gather-cloth',
				title: 'Gather cloth for the goblin banner',
				status: 'active',
				target: { kind: 'ally', name: 'Market Trader' },
				hint: 'Find the trader.'
			}
		],
		story: {},
		nearbyActors: [],
		visibleTiles: [],
		legalActions: []
	}

	const navigation = resolveQuestNavigation(snapshot, snapshot.tasks[0])
	const decision = fallbackDecision(snapshot)

	assert.strictEqual(detectMovementLoop(snapshot), true)
	assert.deepStrictEqual(navigation.nextStep, { direction: 'east', x: 3, y: 2 })
	assert.deepStrictEqual(decision.target, { direction: 'east', x: 3, y: 2 })
})

test('fallback exploration chooses a route toward fresh map space instead of a local bounce', () => {
	const blocked = []
	for (let x = 0; x < 5; x += 1) {
		blocked.push({ x, y: 0 }, { x, y: 2 })
	}
	const recentPositions = [
		{ x: 1, y: 1 },
		{ x: 2, y: 1 },
		{ x: 1, y: 1 },
		{ x: 0, y: 1 },
		{ x: 1, y: 1 },
		{ x: 0, y: 1 },
		{ x: 1, y: 1 },
		{ x: 2, y: 1 }
	]
	const snapshot = {
		turn: 99,
		goblin: { position: { x: 1, y: 1 } },
		map: {
			name: 'Doorway Corridor',
			width: 5,
			height: 3,
			blocked,
			actors: []
		},
		events: recentPositions.map((position, index) => ({
			id: index + 1,
			turn: index + 1,
			actor: 'Chatty, the chosen one',
			action: 'move',
			position,
			worldDelta: { goblin: { position } }
		})),
		legalMoves: [
			{ direction: 'east', x: 2, y: 1 },
			{ direction: 'west', x: 0, y: 1 }
		],
		tasks: [],
		story: {},
		nearbyActors: [],
		visibleTiles: [],
		legalActions: []
	}

	const decision = fallbackDecision(snapshot)

	assert.strictEqual(decision.action, 'move')
	assert.deepStrictEqual(decision.target, { direction: 'east', x: 2, y: 1 })
	assert.match(decision.publicRationale, /fresh map space/)
})

test('fallback exploration does not magnet back to generic NPCs when no quest is active', () => {
	const recentPositions = [
		{ x: 2, y: 2 },
		{ x: 2, y: 1 },
		{ x: 2, y: 2 },
		{ x: 2, y: 1 }
	]
	const snapshot = {
		turn: 120,
		goblin: { position: { x: 2, y: 2 } },
		map: {
			name: 'Open Square',
			width: 5,
			height: 5,
			blocked: [],
			actors: [
				{
					id: 'wanderer',
					name: 'Forest Wanderer',
					entityType: 'NPC',
					dialog: '',
					spriteKey: 'forestWanderer',
					x: 2,
					y: 0
				}
			]
		},
		events: recentPositions.map((position, index) => ({
			id: index + 1,
			turn: index + 1,
			actor: 'Chatty, the chosen one',
			action: 'move',
			position,
			worldDelta: { goblin: { position } }
		})),
		legalMoves: [
			{ direction: 'east', x: 3, y: 2 },
			{ direction: 'south', x: 2, y: 3 },
			{ direction: 'west', x: 1, y: 2 },
			{ direction: 'north', x: 2, y: 1 }
		],
		tasks: [],
		story: {},
		nearbyActors: [],
		visibleTiles: [],
		legalActions: []
	}

	const decision = fallbackDecision(snapshot)

	assert.strictEqual(decision.action, 'move')
	assert.notStrictEqual(decision.target.direction, 'north')
	assert.match(decision.publicRationale, /fresh map space/)
})

test('fallback exploration avoids immediate reversal when another route reaches fresh space', () => {
	const walkable = new Set(['2,0', '2,1', '2,2', '2,3', '2,4', '2,5', '2,6', '3,2'])
	const blocked = []
	for (let y = 0; y < 7; y += 1) {
		for (let x = 0; x < 5; x += 1) {
			if (!walkable.has(`${x},${y}`)) blocked.push({ x, y })
		}
	}
	const recentPositions = [
		{ x: 2, y: 2 },
		{ x: 2, y: 3 },
		{ x: 2, y: 2 },
		{ x: 2, y: 1 },
		{ x: 2, y: 2 },
		{ x: 2, y: 3 },
		{ x: 2, y: 2 }
	]
	const snapshot = {
		turn: 140,
		goblin: { position: { x: 2, y: 2 } },
		map: {
			name: 'Branch Corridor',
			width: 5,
			height: 7,
			blocked,
			actors: []
		},
		events: recentPositions.map((position, index) => ({
			id: index + 1,
			turn: index + 1,
			actor: 'Chatty, the chosen one',
			action: 'move',
			position,
			worldDelta: { goblin: { position } }
		})),
		legalMoves: [
			{ direction: 'east', x: 3, y: 2 },
			{ direction: 'south', x: 2, y: 3 },
			{ direction: 'north', x: 2, y: 1 }
		],
		tasks: [],
		story: {},
		nearbyActors: [],
		visibleTiles: [],
		legalActions: []
	}

	const decision = fallbackDecision(snapshot)

	assert.strictEqual(decision.action, 'move')
	assert.notStrictEqual(decision.target.direction, 'south')
	assert.match(decision.publicRationale, /fresh map space/)
})

test('live frontend keeps walk timing close to the three second server turn', () => {
	const source = fs.readFileSync(path.join(__dirname, '..', 'src/components/GoblinWorldLive.vue'), 'utf8')
	const tweenMatch = source.match(/const MOVE_TWEEN_MS = (\d+)/)
	const staleMatch = source.match(/const MOVEMENT_STALE_MS = (\d+)/)

	assert.ok(tweenMatch, 'MOVE_TWEEN_MS should be explicit')
	assert.ok(staleMatch, 'MOVEMENT_STALE_MS should be explicit')
	assert.ok(Number(tweenMatch[1]) >= 3000, 'walk tween should overlap the 3 second server turn')
	assert.ok(Number(staleMatch[1]) >= 6000, 'walk reset should wait for more than one missed movement event')
	assert.strictEqual(/if \(delta\.animation === 'walk'\) this\.scheduleAnimationReset/.test(source), false)
	assert.ok(/movementState/.test(source), 'frontend should use movementState instead of isolated walk events')
})

test('requests Claude Haiku decisions through Anthropic tool use', async () => {
	const world = new GoblinWorld(createInitialWorld({ goblin: { x: 2, y: 2 } }))
	const decision = await requestGoblinDecision(world.getSnapshot(), {
		provider: 'anthropic',
		apiKey: 'test-key',
		model: 'claude-haiku-4-5',
		fetch: async (url, request) => {
			assert.strictEqual(url, 'https://api.anthropic.com/v1/messages')
			assert.strictEqual(request.headers['x-api-key'], 'test-key')
			assert.strictEqual(request.headers['anthropic-version'], '2023-06-01')
			const body = JSON.parse(request.body)
			assert.strictEqual(body.model, 'claude-haiku-4-5')
			assert.strictEqual(body.tools[0].name, 'choose_goblin_action')
			assert.deepStrictEqual(body.tool_choice, { type: 'tool', name: 'choose_goblin_action' })
			const visibleWorld = JSON.parse(body.messages[0].content.replace('Current world snapshot:\n', ''))
			assert.strictEqual(visibleWorld.story.phaseId, 'phase-1')
			assert.ok(visibleWorld.story.scene)
			assert.ok(visibleWorld.story.scene.sceneId)
			assert.ok(visibleWorld.story.navigation)
			assert.strictEqual(Object.prototype.hasOwnProperty.call(visibleWorld.story.navigation, 'path'), false)
			assert.strictEqual(visibleWorld.currentTask.id, 'phase-1-test-body')
			assert.strictEqual(JSON.stringify(visibleWorld).includes('chain_of_thought'), false)
			assert.strictEqual(JSON.stringify(visibleWorld).includes('visibleTiles'), false)
			assert.strictEqual(JSON.stringify(visibleWorld).includes('recentMemory'), false)
			assert.ok(body.messages[0].content.length < 12000)
			return {
				ok: true,
				json: async () => ({
					content: [
						{
							type: 'tool_use',
							name: 'choose_goblin_action',
							input: {
								action: 'wait',
								target: { x: null, y: null, id: null, name: null },
								public_rationale: 'The moss is saying something suspicious.',
								goblin_utterance: 'I listen with all available ears.',
								memory_update: 'Moss sounds are not legally binding.'
							}
						}
					]
				})
			}
		}
	})

	assert.strictEqual(decision.controller, 'anthropic')
	assert.strictEqual(decision.action, 'wait')
	assert.strictEqual(decision.publicRationale, 'The moss is saying something suspicious.')
})

test('hybrid mode skips model calls between director turns while Chatty keeps moving', async () => {
	const world = new GoblinWorld(
		createInitialWorld({
			map: {
				name: 'Cheap Field',
				width: 5,
				height: 5,
				tiles: [
					[1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1]
				],
				blocked: []
			},
			goblin: { x: 2, y: 2 }
		})
	)
	let calls = 0
	const options = {
		aiMode: 'hybrid',
		provider: 'anthropic',
		apiKey: 'test-key',
		model: 'claude-haiku-4-5',
		modelDirectorIntervalMs: 45000,
		intervalMs: 3000,
		fetch: async () => {
			calls += 1
			return {
				ok: true,
				json: async () => ({
					usage: { input_tokens: 111, output_tokens: 22 },
					content: [
						{
							type: 'tool_use',
							name: 'choose_goblin_action',
							input: {
								action: 'move',
								target: { x: 3, y: 2 },
								public_rationale: 'Fresh ground is useful.',
								goblin_utterance: 'I step where the moss has not judged me.',
								memory_update: 'Chatty tested a fresh step.'
							}
						}
					]
				})
			}
		}
	}

	const firstEvent = await tickGoblin(world, options)
	const secondEvent = await tickGoblin(world, options)

	assert.strictEqual(calls, 1)
	assert.strictEqual(firstEvent.controller, 'anthropic')
	assert.strictEqual(secondEvent.controller, 'hybrid')
	assert.strictEqual(secondEvent.action, 'move')
})

test('hybrid mode calls the model immediately for active combat', async () => {
	const world = new GoblinWorld(createInitialWorld({ goblin: { x: 2, y: 2 } }))
	const options = {
		aiMode: 'hybrid',
		provider: 'anthropic',
		apiKey: 'test-key',
		model: 'claude-haiku-4-5',
		modelDirectorIntervalMs: 45000,
		intervalMs: 3000,
		__controllerState: {
			lastModelTurn: world.getSnapshot().turn,
			lastModelTaskId: 'phase-1-test-body'
		},
		fetch: async () => ({
			ok: true,
			json: async () => ({
				content: [
					{
						type: 'tool_use',
						name: 'choose_goblin_action',
						input: {
							action: 'inspect',
							target: { enemy: 'Ledger Mite' },
							public_rationale: 'Combat needs a real decision.',
							goblin_utterance: 'Show me the weak paper bit.',
							memory_update: 'Chatty inspected the combat blocker.'
						}
					}
				]
			})
		})
	}
	const snapshot = world.getSnapshot()
	snapshot.story.activeEncounter = { enemy: 'Ledger Mite', hp: 4 }

	const decision = await requestGoblinDecision(snapshot, options)

	assert.strictEqual(decision.controller, 'anthropic')
	assert.strictEqual(decision.action, 'inspect')
})

test('hybrid mode respects minimum interval for non-combat quest changes', async () => {
	const world = new GoblinWorld(createInitialWorld({ goblin: { x: 2, y: 2 } }))
	let calls = 0
	const snapshot = world.getSnapshot()
	snapshot.turn = 4
	const options = {
		aiMode: 'hybrid',
		provider: 'anthropic',
		apiKey: 'test-key',
		model: 'claude-haiku-4-5',
		modelMinIntervalMs: 30000,
		intervalMs: 3000,
		__controllerState: {
			lastModelTurn: 0,
			lastModelTaskId: 'older-task'
		},
		fetch: async () => {
			calls += 1
			throw new Error('should not call model before minimum interval')
		}
	}

	const decision = await requestGoblinDecision(snapshot, options)

	assert.strictEqual(calls, 0)
	assert.strictEqual(decision.controller, 'hybrid')
	assert.strictEqual(decision.action, 'move')
})

test('budget cap forces scripted fallback without calling the model', async () => {
	const world = new GoblinWorld(createInitialWorld({ goblin: { x: 2, y: 2 } }))
	let calls = 0
	const options = {
		aiMode: 'hybrid',
		provider: 'anthropic',
		apiKey: 'test-key',
		model: 'claude-haiku-4-5',
		dailyModelRequestCap: 0,
		fetch: async () => {
			calls += 1
			throw new Error('should not call model')
		}
	}

	const decision = await requestGoblinDecision(world.getSnapshot(), options)
	const status = getControllerStatus(options)

	assert.strictEqual(calls, 0)
	assert.strictEqual(decision.controller, 'budget-fallback')
	assert.strictEqual(status.mode, 'budget-fallback')
	assert.strictEqual(status.budget.requestCount, 0)
})

test('Anthropic usage updates public budget counters without exposing secrets', async () => {
	const world = new GoblinWorld(createInitialWorld({ goblin: { x: 2, y: 2 } }))
	const options = {
		aiMode: 'hybrid',
		provider: 'anthropic',
		apiKey: 'test-secret-key',
		model: 'claude-haiku-4-5',
		fetch: async () => ({
			ok: true,
			json: async () => ({
				usage: { input_tokens: 321, output_tokens: 45 },
				content: [
					{
						type: 'tool_use',
						name: 'choose_goblin_action',
						input: {
							action: 'wait',
							target: {},
							public_rationale: 'Counting coins while standing still.',
							goblin_utterance: 'Budget goblin pauses.',
							memory_update: 'Budget usage was counted.'
						}
					}
				]
			})
		})
	}

	await requestGoblinDecision(world.getSnapshot(), options)
	const statusJson = JSON.stringify(getControllerStatus(options))

	assert.strictEqual(getControllerStatus(options).budget.requestCount, 1)
	assert.strictEqual(getControllerStatus(options).budget.inputTokens, 321)
	assert.strictEqual(getControllerStatus(options).budget.outputTokens, 45)
	assert.strictEqual(statusJson.includes('test-secret-key'), false)
})

test('keeps moving on OpenAI recovery instead of freezing the body', async () => {
	const world = new GoblinWorld(
		createInitialWorld({
			map: {
				name: 'Recovery Field',
				width: 5,
				height: 5,
				tiles: [
					[1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1]
				],
				blocked: []
			},
			goblin: { x: 2, y: 2 }
		})
	)

	const event = await tickGoblin(world, {
		provider: 'openai',
		apiKey: 'test-key',
		recoveryBackoffMs: 1000,
		fetch: async () => ({
			ok: false,
			status: 429,
			text: async () => '{"error":{"message":"quota"}}'
		})
	})

	assert.strictEqual(event.controller, 'openai-recovery')
	assert.strictEqual(event.action, 'move')
	assert.notDeepStrictEqual(world.getSnapshot().goblin.position, { x: 2, y: 2 })
	assert.doesNotMatch(`${event.message} ${event.publicRationale}`, /api|model|recovery|link|sky-thought/i)
})

test('reports configured Claude Haiku controller without exposing secrets', () => {
	const status = getControllerStatus({
		provider: 'anthropic',
		apiKey: 'test-key',
		model: 'claude-haiku-4-5'
	})
	assert.strictEqual(status.mode, 'hybrid')
	assert.strictEqual(status.provider, 'anthropic')
	assert.strictEqual(status.configured, true)
	assert.strictEqual(status.model, 'claude-haiku-4-5')
	assert.strictEqual(status.budget.requestCount, 0)
	assert.strictEqual(JSON.stringify(status).includes('test-key'), false)
})

test('reports forced fallback mode even when a provider key exists', () => {
	const status = getControllerStatus({
		aiMode: 'fallback',
		provider: 'anthropic',
		apiKey: 'test-key',
		model: 'claude-haiku-4-5'
	})

	assert.strictEqual(status.mode, 'fallback')
	assert.strictEqual(status.configured, true)
	assert.strictEqual(JSON.stringify(status).includes('test-key'), false)
})

test('holds position after speaking to a nearby NPC', async () => {
	const world = new GoblinWorld(
		createInitialWorld({
			map: {
				name: 'Dialogue Clearing',
				width: 5,
				height: 5,
				tiles: [
					[1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1]
				],
				actors: [
					{
						name: 'Moss Clerk',
						entityType: 'NPC',
						x: 3,
						y: 2,
						spriteId: 400
					}
				],
				blocked: []
			},
			goblin: { x: 2, y: 2 }
		})
	)

	world.applyDecision({
		action: 'interact',
		target: { name: 'Moss Clerk' },
		publicRationale: 'The goblin asks the nearby clerk about shelter.',
		goblinUtterance: 'Do you know a dry corner?',
		memoryUpdate: 'Moss Clerk may know where to sleep.'
	})

	const event = await tickGoblin(world, {
		apiKey: '',
		dialogueHoldTurns: 4,
		dialogueActorRadius: 2
	})

	assert.strictEqual(event.controller, 'dialogue-hold')
	assert.strictEqual(event.action, 'wait')
	assert.deepStrictEqual(world.getSnapshot().goblin.position, { x: 2, y: 2 })
	assert.match(event.publicRationale, /speaking with Moss Clerk/)
})

test('nearby NPC initiates dialogue once and then respects cooldown', () => {
	const world = new GoblinWorld(
		createInitialWorld({
			map: {
				name: 'Dialogue Clearing',
				width: 5,
				height: 5,
				tiles: [
					[1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1]
				],
				actors: [
					{
						id: 'npc-moss-clerk',
						name: 'Moss Clerk',
						entityType: 'NPC',
						dialog: 'BARTENDER',
						wanders: false,
						x: 3,
						y: 2,
						home: { x: 3, y: 2 },
						spriteId: 400
					}
				],
				blocked: []
			},
			goblin: { x: 2, y: 2 },
			story: {
				completedTasks: ['phase-1-test-body']
			},
			turn: 5
		})
	)

	const firstEvents = world.advanceNpcs({
		dialogueRadius: 2,
		dialogueCooldownTurns: 6
	})
	const secondEvents = world.advanceNpcs({
		dialogueRadius: 2,
		dialogueCooldownTurns: 6
	})

	assert.strictEqual(firstEvents.length, 2)
	assert.strictEqual(firstEvents[0].type, 'dialogue')
	assert.strictEqual(firstEvents[0].actor, 'Moss Clerk')
	assert.strictEqual(firstEvents[0].action, 'speak')
	assert.deepStrictEqual(firstEvents[0].target, { actor: 'Chatty, the chosen one', x: 2, y: 2 })
	assert.strictEqual(firstEvents[1].actor, 'Chatty, the chosen one')
	assert.strictEqual(firstEvents[1].action, 'reply')
	assert.strictEqual(secondEvents.length, 0)
})

test('fallback NPC dialogue produces a Chatty reply so feed reads as conversation', () => {
	const world = new GoblinWorld(
		createInitialWorld({
			map: {
				name: 'Market Conversation',
				width: 5,
				height: 5,
				tiles: [
					[1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1]
				],
				actors: [
					{
						id: 'market-trader',
						name: 'Market Trader',
						entityType: 'NPC',
						dialog: 'MARKET_TRADER',
						wanders: false,
						x: 3,
						y: 2,
						home: { x: 3, y: 2 },
						spriteId: 400,
						spriteKey: 'marketTrader'
					}
				],
				blocked: []
			},
			goblin: { x: 2, y: 2 },
			turn: STORY_DAY_TURNS + 20,
			story: {
				day: 2,
				arcId: 'day-2-road-to-freedom',
				arcStartedTurn: STORY_DAY_TURNS,
				phaseId: 'phase-8',
				flags: { dayOneComplete: true }
			}
		})
	)

	const events = world.advanceNpcs({
		dialogueRadius: 2,
		dialogueCooldownTurns: 6,
		maxNpcSpeechEventsPerTurn: 1,
		allowAmbientNpcDialogue: true
	})
	const dialogue = events.filter(event => event.type === 'dialogue')

	assert.strictEqual(dialogue.length, 2)
	assert.strictEqual(dialogue[0].actor, 'Market Trader')
	assert.strictEqual(dialogue[0].action, 'speak')
	assert.strictEqual(dialogue[1].actor, 'Chatty, the chosen one')
	assert.strictEqual(dialogue[1].action, 'reply')
	assert.doesNotMatch(dialogue[1].message, /tell Chatty the useful part|I stop and listen|stay put/i)
})

test('route bridge objectives do not emit random nearby NPC advice as conversation', () => {
	const phaseOneTaskIds = STORY_PHASES.find(phase => phase.id === 'phase-1').tasks.map(task => task.id)
	const world = new GoblinWorld(
		createInitialWorld({
			map: {
				name: 'Market Road',
				width: 6,
				height: 5,
				tiles: [
					[1, 1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1, 1]
				],
				actors: [
					{
						id: 'market-trader',
						name: 'Market Trader',
						entityType: 'NPC',
						dialog: 'MARKET_TRADER',
						wanders: false,
						x: 3,
						y: 2,
						home: { x: 3, y: 2 },
						spriteId: 400,
						spriteKey: 'marketTrader'
					},
					{
						id: 'forest-wanderer',
						name: 'Forest Wanderer',
						entityType: 'NPC',
						dialog: 'FOREST_WANDERER',
						wanders: false,
						x: 2,
						y: 3,
						home: { x: 2, y: 3 },
						spriteId: 401,
						spriteKey: 'forestWanderer'
					}
				],
				blocked: []
			},
			goblin: { x: 2, y: 2 },
			turn: 12,
			story: {
				phaseId: 'phase-1',
				completedTasks: phaseOneTaskIds
			}
		})
	)

	const activeTask = world.getTasks().find(task => task.status === 'active' || task.status === 'combat')
	assert.strictEqual(activeTask.id, 'phase-1-bridge-objective')
	assert.strictEqual(activeTask.target.kind, 'route')

	const events = world.advanceNpcs({
		dialogueRadius: 2,
		dialogueCooldownTurns: 1,
		maxNpcSpeechEventsPerTurn: 1
	})

	assert.deepStrictEqual(events.filter(event => event.type === 'dialogue'), [])
})

test('routine Chatty movement does not enter the public feed as pseudo conversation', () => {
	const event = createEvent({
		id: 'move-1',
		turn: 1,
		type: 'action',
		actor: 'Chatty, the chosen one',
		action: 'move',
		message: 'I leave the familiar steps behind and test new ground.',
		publicRationale: 'Chatty explores a nearby route.',
		controller: 'fallback'
	}).toJSON()

	assert.strictEqual(event.feed, null)
})

test('nearby named NPC supports active combat before wandering', () => {
	const world = new GoblinWorld(
		createInitialWorld({
			map: {
				name: 'Support Clearing',
				width: 5,
				height: 5,
				tiles: [
					[1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1]
				],
				actors: [
					{
						id: 'stone-guard',
						name: 'Stone Guard',
						entityType: 'NPC',
						dialog: 'STONE_GUARD',
						wanders: true,
						x: 3,
						y: 2,
						home: { x: 3, y: 2 },
						spriteId: 402,
						spriteKey: 'stoneGuard'
					}
				],
				blocked: []
			},
			goblin: { x: 2, y: 2 },
			turn: 200,
			story: {
				phaseId: 'phase-6',
				phaseStartedTurn: STORY_TURNS_PER_PHASE * 5,
				relationships: {
					stoneGuard: { trust: 2, talks: 2, suspicion: 0, stance: 'warm' }
				},
				encounters: {
					'phase-6-defend-market-road': {
						taskId: 'phase-6-defend-market-road',
						id: 'thorn-wave',
						hp: 7,
						defeated: false
					}
				}
			}
		})
	)

	const events = world.advanceNpcs({
		dialogueRadius: 0,
		maxNpcMovesPerTurn: 1
	})

	assert.strictEqual(events[0].type, 'combat')
	assert.strictEqual(events[0].action, 'support')
	assert.strictEqual(events[0].actor, 'Stone Guard')
	assert.ok(events[0].effect)
	assert.strictEqual(world.getSnapshot().story.dialogue.activeConversation.speakerId, 'stoneGuard')
})

test('wandering NPC moves one legal step without overlapping the goblin or other actors', () => {
	const world = new GoblinWorld(
		createInitialWorld({
			map: {
				name: 'Wander Yard',
				width: 5,
				height: 5,
				tiles: [
					[1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1]
				],
				actors: [
					{
						id: 'npc-wanderer',
						name: 'Wanderer',
						entityType: 'NPC',
						wanders: true,
						x: 2,
						y: 2,
						home: { x: 2, y: 2 },
						spriteId: 401
					},
					{
						id: 'npc-blocker',
						name: 'Blocker',
						entityType: 'NPC',
						wanders: false,
						x: 3,
						y: 2,
						home: { x: 3, y: 2 },
						spriteId: 402
					}
				],
				blocked: [{ x: 2, y: 1 }]
			},
			goblin: { x: 1, y: 2 },
			turn: 8
		})
	)

	const events = world.advanceNpcs({
		dialogueRadius: 0,
		maxNpcMovesPerTurn: 1,
		npcHomeRadius: 2,
		directionPicker: () => ['north', 'east', 'west', 'south']
	})
	const actor = world.getSnapshot().map.actors.find(candidate => candidate.id === 'npc-wanderer')

	assert.strictEqual(events.length, 1)
	assert.strictEqual(events[0].type, 'action')
	assert.strictEqual(events[0].action, 'move')
	assert.deepStrictEqual(actor.position || { x: actor.x, y: actor.y }, { x: 2, y: 3 })
	assert.deepStrictEqual(events[0].worldDelta.actors['npc-wanderer'], {
		position: { x: 2, y: 3 },
		facing: 'down',
		animation: 'walk',
		movementState: 'traveling'
	})
})

test('maps old NPC sprite ids to the generated core cast sprite keys', () => {
	assert.strictEqual(getCharacterSpriteForActor({ entityType: 'NPC', dialog: 'BARTENDER', spriteId: 4815 }), 'bartender')
	assert.strictEqual(getCharacterSpriteForActor({ entityType: 'NPC', dialog: 'MAYOR_LEONARD', spriteId: 2480 }), 'mayor')
	assert.strictEqual(getCharacterSpriteForActor({ entityType: 'NPC', dialog: 'DWARF_BILI', spriteId: 5173 }), 'dwarf')
	assert.strictEqual(getCharacterSpriteForActor({ entityType: 'NPC', spriteId: 8040 }), 'forestWanderer')
	assert.strictEqual(getCharacterSpriteForActor({ entityType: 'CHEST', spriteId: 500 }), null)
})

test('wandering NPC turn selection rotates so more villagers become active', () => {
	function createRotatingWorld(turn) {
		return new GoblinWorld(
			createInitialWorld({
				map: {
					name: 'Rotation Yard',
					width: 8,
					height: 5,
					tiles: [
						[1, 1, 1, 1, 1, 1, 1, 1],
						[1, 1, 1, 1, 1, 1, 1, 1],
						[1, 1, 1, 1, 1, 1, 1, 1],
						[1, 1, 1, 1, 1, 1, 1, 1],
						[1, 1, 1, 1, 1, 1, 1, 1]
					],
					actors: [
						{ id: 'npc-a', name: 'A', entityType: 'NPC', wanders: true, x: 2, y: 2, home: { x: 2, y: 2 }, spriteId: 401 },
						{ id: 'npc-b', name: 'B', entityType: 'NPC', wanders: true, x: 4, y: 2, home: { x: 4, y: 2 }, spriteId: 402 },
						{ id: 'npc-c', name: 'C', entityType: 'NPC', wanders: true, x: 6, y: 2, home: { x: 6, y: 2 }, spriteId: 403 }
					],
					blocked: []
				},
				goblin: { x: 0, y: 0 },
				turn
			})
		)
	}

	const firstActor = createRotatingWorld(1).advanceNpcs({ dialogueRadius: 0, maxNpcMovesPerTurn: 1 })[0].actor
	const secondActor = createRotatingWorld(2).advanceNpcs({ dialogueRadius: 0, maxNpcMovesPerTurn: 1 })[0].actor

	assert.notStrictEqual(firstActor, secondActor)
})

test('non-NPC actors neither wander nor speak', () => {
	const world = new GoblinWorld(
		createInitialWorld({
			map: {
				name: 'Chest Yard',
				width: 4,
				height: 4,
				tiles: [
					[1, 1, 1, 1],
					[1, 1, 1, 1],
					[1, 1, 1, 1],
					[1, 1, 1, 1]
				],
				actors: [
					{
						id: 'chest-1',
						name: 'Chest',
						entityType: 'CHEST',
						wanders: true,
						dialog: 'BARTENDER',
						x: 2,
						y: 1,
						home: { x: 2, y: 1 },
						spriteId: 500
					}
				],
				blocked: []
			},
			goblin: { x: 1, y: 1 },
			turn: 3
		})
	)

	assert.deepStrictEqual(world.advanceNpcs({ dialogueRadius: 3, maxNpcMovesPerTurn: 1 }), [])
	assert.deepStrictEqual(world.getSnapshot().map.actors[0].position || { x: world.getSnapshot().map.actors[0].x, y: world.getSnapshot().map.actors[0].y }, { x: 2, y: 1 })
})

test('does not hold position after interacting with a non-NPC object', async () => {
	const world = new GoblinWorld(
		createInitialWorld({
			map: {
				name: 'Chest Clearing',
				width: 5,
				height: 5,
				tiles: [
					[1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1]
				],
				actors: [
					{
						name: 'Chest',
						entityType: 'CHEST',
						x: 3,
						y: 2,
						spriteId: 500
					},
					{
						name: 'NPC',
						entityType: 'NPC',
						x: 4,
						y: 2,
						spriteId: 501
					}
				],
				blocked: []
			},
			goblin: { x: 2, y: 2 },
			story: {
				completedTasks: ['phase-1-test-body']
			}
		})
	)

	world.applyDecision({
		action: 'interact',
		target: { name: 'Chest' },
		publicRationale: 'The goblin checks whether the chest is edible.',
		goblinUtterance: 'Box? Snack?',
		memoryUpdate: 'Chest is probably not an NPC.'
	})

	const event = await tickGoblin(world, {
		apiKey: '',
		dialogueHoldTurns: 4,
		dialogueActorRadius: 2
	})

	assert.strictEqual(event.controller, 'fallback')
	assert.strictEqual(event.action, 'move')
	assert.notDeepStrictEqual(world.getSnapshot().goblin.position, { x: 2, y: 2 })
})

test('world tick broadcasts goblin and NPC events in turn order', async () => {
	const world = new GoblinWorld(
		createInitialWorld({
			map: {
				name: 'Busy Clearing',
				width: 6,
				height: 5,
				tiles: [
					[1, 1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1, 1]
				],
				actors: [
					{
						id: 'npc-greeter',
						name: 'Greeter',
						entityType: 'NPC',
						dialog: 'BARTENDER',
						wanders: false,
						x: 4,
						y: 2,
						home: { x: 4, y: 2 },
						spriteId: 400
					}
				],
				blocked: []
			},
			goblin: { x: 2, y: 2 },
			story: {
				completedTasks: ['phase-1-test-body']
			}
		})
	)

	const events = await tickWorld(world, {
		apiKey: '',
		dialogueRadius: 2,
		dialogueCooldownTurns: 6
	})

	assert.ok(events.length >= 3)
	const sceneEvent = events.find(event => event.type === 'scene')
	const phaseEvent = events.find(event => event.type === 'phase' && event.action === 'begin')
	const goblinMove = events.find(event => event.actor === 'Chatty, the chosen one' && event.action === 'move')
	const npcDialogue = events.find(event => event.actor === 'Greeter' && event.type === 'dialogue')
	assert.ok(sceneEvent)
	assert.ok(phaseEvent)
	assert.ok(goblinMove)
	assert.ok(npcDialogue)
	assert.ok(sceneEvent.id < phaseEvent.id)
	assert.ok(phaseEvent.id < goblinMove.id)
	assert.ok(goblinMove.id < npcDialogue.id)
})

test('creates a backend-safe live world from Tiled map data', () => {
	const worldState = createWorldFromTiledMap(
		{
			width: 2,
			height: 2,
			tilewidth: 32,
			tileheight: 32,
			layers: [
				{
					name: 'Ground',
					type: 'tilelayer',
					width: 2,
					height: 2,
					opacity: 1,
					data: [11, 0, 13, 14]
				},
				{
					name: 'Actors',
					type: 'objectgroup',
					objects: [
						{
							name: 'Player',
							gid: 77,
							x: 64,
							y: 64,
							properties: [{ name: 'entity_type', value: 'PLAYER' }]
						},
						{ name: 'Watcher', gid: 99, x: 32, y: 64 }
					]
				}
			]
		},
		{ name: 'Tiny Town' }
	)

	assert.strictEqual(worldState.map.name, 'Tiny Town')
	assert.deepStrictEqual(worldState.map.tileLayers[0].data, [10, 0, 12, 13])
	assert.deepStrictEqual(worldState.map.actors[0], {
		id: 'actor-watcher-1-1-98',
		name: 'Watcher',
		entityType: '',
		dialog: '',
		wanders: false,
		dialogBubbleEnabled: false,
		bubbleData: null,
		spriteKey: null,
		facing: 'down',
		animation: 'idle',
		movementState: 'idle',
		spriteId: 98,
		x: 1,
		y: 1,
		home: { x: 1, y: 1 }
	})
	assert.deepStrictEqual(worldState.goblin.position, { x: 2, y: 1 })
})

test('non-NPC map creatures preserve original tile sprites instead of generated character sheets', () => {
	const forest = createWorldFromTiledMap(loadRegisteredTiledMap(path.join(__dirname, '..'), 'mulberryForest'), {
		staticRoot: path.join(__dirname, '..'),
		mapId: 'mulberryForest'
	})
	const graveyard = createWorldFromTiledMap(loadRegisteredTiledMap(path.join(__dirname, '..'), 'mulberryGraveyard'), {
		staticRoot: path.join(__dirname, '..'),
		mapId: 'mulberryGraveyard'
	})
	const creatures = forest.map.actors
		.concat(graveyard.map.actors)
		.filter(actor => ['GOBLIN', 'ORC', 'LICH', 'SKELETON', 'GHOST'].includes(String(actor.entityType || '').toUpperCase()))

	assert.ok(creatures.length >= 5)
	creatures.forEach(actor => {
		assert.strictEqual(actor.spriteKey, null, `${actor.entityType} ${actor.name} should keep its original tile sprite`)
		assert.ok(Number.isInteger(actor.spriteId), `${actor.entityType} ${actor.name} should keep a tile sprite id`)
		assert.strictEqual(getCharacterSpriteForActor(actor), null)
	})
})

test('scripted hostile combatants keep original tile sprites and no generated sprite keys', () => {
	const world = new GoblinWorld(
		createInitialWorld({
			turn: 20,
			story: {
				completedTasks: [
					'phase-1-test-body',
					'phase-1-find-voice',
					'phase-1-learn-name',
					'phase-1-reach-town'
				]
			},
			goblin: { x: 8, y: 6 }
		})
	)

	world.advanceStory()
	const hostiles = world.getSnapshot().map.actors.filter(actor => actor.entityType === 'HOSTILE')
	assert.ok(hostiles.length > 0)
	hostiles.forEach(actor => {
		assert.strictEqual(actor.spriteKey, null)
		assert.ok(Number.isInteger(actor.spriteId))
	})
})

test('derives live collision boundaries from Tiled tileset metadata', () => {
	const worldState = createWorldFromTiledMap(
		{
			width: 3,
			height: 3,
			tilewidth: 32,
			tileheight: 32,
			tilesets: [
				{
					firstgid: 1,
					tiles: [
						{
							id: 1,
							properties: [{ name: 'blocked', value: true }]
						}
					]
				}
			],
			layers: [
				{
					name: 'Ground',
					type: 'tilelayer',
					width: 3,
					height: 3,
					opacity: 1,
					properties: [{ name: 'obstacles', value: true }],
					data: [
						1, 2, 1,
						1, 2, 1,
						1, 1, 1
					]
				},
				{
					name: 'Actors',
					type: 'objectgroup',
					objects: [
						{
							id: 1,
							name: 'Walker',
							gid: 401,
							x: 32,
							y: 96,
							properties: [
								{ name: 'entity_type', value: 'NPC' },
								{ name: 'wanders', value: true }
							]
						}
					]
				}
			]
		},
		{
			name: 'Collision Test',
			goblin: { x: 0, y: 0 }
		}
	)
	const world = new GoblinWorld(worldState)
	const actor = world.getSnapshot().map.actors[0]

	assert.deepStrictEqual(worldState.map.blocked, [{ x: 1, y: 0 }, { x: 1, y: 1 }])
	assert.strictEqual(world.isBlocked({ x: 1, y: 0 }), true)
	assert.strictEqual(world.getNpcMoveTarget(actor, { directionPicker: () => ['north'] }), null)

	const event = world.applyDecision({
		action: 'move',
		target: { x: 1, y: 0 },
		publicRationale: 'Try the blocked tile.',
		goblinUtterance: 'Thunk.',
		memoryUpdate: 'Walls remain rude.'
	})

	assert.strictEqual(event.type, 'validation')
	assert.deepStrictEqual(world.getSnapshot().goblin.position, { x: 0, y: 0 })
})

test('loads real Mulberry Town collision from external tileset metadata', () => {
	const tiledMap = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public/maps/mulberryTown.json'), 'utf8'))
	const worldState = createWorldFromTiledMap(tiledMap, {
		name: 'Mulberry Collision',
		staticRoot: path.join(__dirname, '..')
	})

	assert.ok(worldState.map.blocked.length > 500)
	assert.ok(worldState.map.blocked.some(position => position.x === 6 && position.y === 10))
	assert.strictEqual(new GoblinWorld(worldState).isBlocked({ x: 6, y: 10 }), true)
})

test('treats Mulberry Town garden crop rows as blocked', () => {
	const tiledMap = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public/maps/mulberryTown.json'), 'utf8'))
	const worldState = createWorldFromTiledMap(tiledMap, {
		name: 'Mulberry Garden Collision',
		staticRoot: path.join(__dirname, '..')
	})
	const world = new GoblinWorld(worldState)

	assert.strictEqual(world.isBlocked({ x: 7, y: 49 }), true)
	assert.strictEqual(world.isBlocked({ x: 11, y: 51 }), true)
	assert.strictEqual(world.isBlocked({ x: 5, y: 49 }), false)
	assert.strictEqual(world.isBlocked({ x: 9, y: 49 }), false)
})

test('preserves Tiled NPC metadata for live-world actor behavior', () => {
	const worldState = createWorldFromTiledMap(
		{
			width: 3,
			height: 3,
			tilewidth: 32,
			tileheight: 32,
			layers: [
				{
					name: 'Ground',
					type: 'tilelayer',
					width: 3,
					height: 3,
					opacity: 1,
					data: [1, 1, 1, 1, 1, 1, 1, 1, 1]
				},
				{
					name: 'Actors',
					type: 'objectgroup',
					objects: [
						{
							id: 42,
							name: 'Moss Clerk',
							gid: 401,
							x: 64,
							y: 96,
							properties: [
								{ name: 'entity_type', value: 'NPC' },
								{ name: 'dialog', value: 'BARTENDER' },
								{ name: 'wanders', value: true },
								{ name: 'dialogBubbleEnabled', value: true },
								{ name: 'bubbleData', value: '8623,9463' }
							]
						}
					]
				}
			]
		},
		{ name: 'Metadata Grove' }
	)

	assert.deepStrictEqual(worldState.map.actors[0], {
		id: 'actor-42',
		name: 'Moss Clerk',
		entityType: 'NPC',
		dialog: 'BARTENDER',
		wanders: true,
		dialogBubbleEnabled: true,
		bubbleData: { id: 8623, animatedId: 9463 },
		spriteKey: 'bartender',
		facing: 'down',
		animation: 'idle',
		movementState: 'idle',
		spriteId: 400,
		x: 2,
		y: 2,
		home: { x: 2, y: 2 }
	})
})

test('persists snapshots and appends live events as JSONL', () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'goblinworld-'))
	const persistence = createWorldPersistence(dir)
	const world = new GoblinWorld(createInitialWorld({ goblin: { x: 1, y: 1 } }))
	const event = world.applyDecision({
		action: 'wait',
		target: {},
		publicRationale: 'Waiting is a valid survival technique.',
		goblinUtterance: 'I become furniture.',
		memoryUpdate: 'Stillness can be strategy.'
	})

	persistence.saveSnapshot(world.getSnapshot())
	persistence.appendEvent(event)

	const restored = persistence.loadSnapshot()
	const jsonl = fs.readFileSync(path.join(dir, 'events.jsonl'), 'utf8').trim().split('\n')

	assert.deepStrictEqual(restored.goblin.position, { x: 1, y: 1 })
	assert.strictEqual(restored.memory[0], 'Stillness can be strategy.')
	assert.strictEqual(JSON.parse(jsonl[0]).message, 'I become furniture.')
})

test('persistence compacts oversized event logs while preserving newest events', () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'goblinworld-compact-'))
	const persistence = createWorldPersistence(dir, { maxEventLogLines: 3 })

	for (let id = 1; id <= 8; id += 1) {
		persistence.appendEvent({ id, message: `event-${id}` })
	}

	const lines = fs.readFileSync(persistence.paths.eventsPath, 'utf8').trim().split('\n')
	const ids = lines.map(line => JSON.parse(line).id)

	assert.deepStrictEqual(ids, [6, 7, 8])
})

test('persistence ignores corrupt snapshots and preserves a backup copy', () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'goblinworld-corrupt-'))
	const persistence = createWorldPersistence(dir)
	fs.mkdirSync(dir, { recursive: true })
	fs.writeFileSync(persistence.paths.snapshotPath, '{ this is not json')

	const restored = persistence.loadSnapshot()
	const backups = fs.readdirSync(dir).filter(file => file.startsWith('snapshot.json.corrupt-'))

	assert.strictEqual(restored, null)
	assert.strictEqual(backups.length, 1)
	assert.strictEqual(fs.readFileSync(path.join(dir, backups[0]), 'utf8'), '{ this is not json')
})
