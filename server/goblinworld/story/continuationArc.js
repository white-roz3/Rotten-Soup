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
	},
	'day-3-graveyard-names': {
		id: 'day-3-graveyard-names',
		day: 3,
		title: 'Graveyard Of Returned Names',
		summary: 'Chatty carries goblin freedom into Mulberry Graveyard, where old names are buried under polite stone.',
		tasks: [
			task('day-3-reach-graveyard', 'Reach Mulberry Graveyard', {
				target: { kind: 'place', name: 'graveyard gate', zone: 'graveyard', mapId: 'mulberryGraveyard' },
				hint: 'Leave town by the north road and find the stones that remember too much.',
				successLine: 'The graveyard receives Chatty without pretending the dead are neutral.',
				predicate: { type: 'zoneReached', zone: 'graveyard' },
				unlocks: ['callback:graveyard-entered']
			}),
			task('day-3-read-old-stones', 'Read the old goblin stones', {
				target: { kind: 'inspect', name: 'old goblin stones', zone: 'graveyard', mapId: 'mulberryGraveyard' },
				hint: 'Inspect the stones that carry names the ledger tried to erase.',
				successLine: 'The stones give back three names and one warning.',
				predicate: { type: 'callback', key: 'graveyard-stones-read' },
				unlocks: ['fact:graveyardNames']
			}),
			task('day-3-return-name-warning', 'Bring the warning back to Mayor Leonard', {
				target: { kind: 'dialogue', dialog: 'MAYOR_LEONARD', zone: 'mayor-house', mapId: 'mulberryTown' },
				hint: 'Make the mayor hear what the buried names still know.',
				successLine: 'Mayor Leonard stops calling the ledger history and starts calling it evidence.',
				eventType: 'dialogue',
				predicate: { type: 'relationshipKey', key: 'mayor', talks: 2 },
				unlocks: ['callback:mayor-heard-graveyard']
			})
		]
	},
	'day-4-tainted-forest': {
		id: 'day-4-tainted-forest',
		day: 4,
		title: 'Blackroot Mercy',
		summary: 'The forest shows Chatty what happens when fear takes root and learns to bite.',
		tasks: [
			task('day-4-enter-tainted-forest', 'Enter the tainted forest', {
				target: { kind: 'place', name: 'tainted forest', zone: 'tainted-forest', mapId: 'taintedForest' },
				hint: 'Follow the dark tree line beyond the safe road.',
				successLine: 'The tainted forest opens like a wound with leaves.',
				predicate: { type: 'zoneReached', zone: 'tainted-forest' },
				unlocks: ['callback:tainted-forest-entered']
			}),
			task('day-4-find-blackroot-mark', 'Examine the blackroot mark', {
				target: { kind: 'inspect', name: 'blackroot mark', zone: 'tainted-forest', mapId: 'taintedForest' },
				hint: 'Look for the place where the roots learned old law.',
				successLine: 'The mark proves the crown taught the forest how to hold grudges.',
				predicate: { type: 'callback', key: 'blackroot-mark-read' },
				unlocks: ['fact:blackrootLaw']
			}),
			task('day-4-ask-wanderer-about-roots', 'Ask the Forest Wanderer about blackroot law', {
				target: { kind: 'dialogue', name: 'Forest Wanderer', zone: 'forest-edge', mapId: 'mulberryForest' },
				hint: 'The Forest Wanderer knows which trees are merely rude and which are dangerous.',
				successLine: 'The Forest Wanderer gives Chatty a safe route through unsafe green.',
				eventType: 'dialogue',
				predicate: { type: 'relationshipKey', key: 'forestWanderer', talks: 2 },
				unlocks: ['callback:wanderer-blackroot-route']
			})
		]
	},
	'day-5-loot-goblin-lair': {
		id: 'day-5-loot-goblin-lair',
		day: 5,
		title: 'The Lair Of Useful Theft',
		summary: 'Chatty enters the loot goblin lair to turn hoarding into supply lines.',
		tasks: [
			task('day-5-enter-loot-lair', 'Enter the loot goblin lair', {
				target: { kind: 'place', name: 'loot goblin lair', zone: 'loot-lair', mapId: 'lootGoblinLair' },
				hint: 'Find the lair below the forest road and do not admire every shiny thing.',
				successLine: 'The lair smells like coins, mushrooms, and bad priorities.',
				predicate: { type: 'zoneReached', zone: 'loot-lair' },
				unlocks: ['callback:loot-lair-entered']
			}),
			task('day-5-claim-supply-cache', 'Claim the hidden supply cache', {
				target: { kind: 'item', name: 'supply cache', zone: 'loot-lair', mapId: 'lootGoblinLair' },
				hint: 'Search the lair for supplies that can feed free goblins.',
				successLine: 'Chatty converts treasure into breakfast logistics.',
				predicate: { type: 'item', key: 'supplyCache' },
				unlocks: ['callback:supply-cache-claimed']
			}),
			task('day-5-bargain-with-trader', 'Bargain with the Market Trader over lair supplies', {
				target: { kind: 'dialogue', name: 'Market Trader', zone: 'market', mapId: 'mulberryTown' },
				hint: 'Turn found supplies into public help, not private bragging.',
				successLine: 'The Market Trader discovers that rebellion has inventory costs.',
				eventType: 'dialogue',
				predicate: { type: 'relationshipKey', key: 'marketTrader', talks: 2 },
				unlocks: ['callback:trader-supply-route']
			})
		]
	},
	'day-6-orc-castle-pressure': {
		id: 'day-6-orc-castle-pressure',
		day: 6,
		title: 'Castle Teeth',
		summary: 'The orc castle tests whether Chatty can survive organized pressure instead of cellar nonsense.',
		tasks: [
			task('day-6-reach-orc-castle', 'Reach the orc castle road', {
				target: { kind: 'place', name: 'orc castle road', zone: 'orc-castle', mapId: 'orcCastle' },
				hint: 'Cross the kingdom road until the walls start looking offended.',
				successLine: 'The castle road proves that old power has architecture.',
				predicate: { type: 'zoneReached', zone: 'orc-castle' },
				unlocks: ['callback:orc-castle-reached']
			}),
			task('day-6-test-castle-patrol', 'Test the castle patrol line', {
				target: { kind: 'combat', enemy: 'Orc Patrol', zone: 'orc-castle', mapId: 'orcCastle' },
				hint: 'Use spell, steel, or cowardly intelligence to survive the patrol line.',
				successLine: 'The patrol line learns that small does not mean soft.',
				eventType: 'combat',
				predicate: { type: 'callback', key: 'orc-patrol-broken' },
				unlocks: ['callback:castle-patrol-broken']
			}),
			task('day-6-report-to-stone-guard', 'Report castle pressure to the Stone Guard', {
				target: { kind: 'dialogue', name: 'Stone Guard', zone: 'armory', mapId: 'mulberryTown' },
				hint: 'Bring the castle problem to the one person who likes walls too much.',
				successLine: 'The Stone Guard begins planning defenses instead of excuses.',
				eventType: 'dialogue',
				predicate: { type: 'relationshipKey', key: 'stoneGuard', talks: 2 },
				unlocks: ['callback:stone-guard-castle-defense']
			})
		]
	},
	'day-7-kingdom-politics': {
		id: 'day-7-kingdom-politics',
		day: 7,
		title: 'Kingdom Of Polite Knives',
		summary: 'Chatty enters the kingdom and learns that soft voices can still hold chains.',
		tasks: [
			task('day-7-reach-kingdom', 'Reach the kingdom road', {
				target: { kind: 'place', name: 'kingdom road', zone: 'kingdom-road', mapId: 'kingdom' },
				hint: 'Find the place where rules wear clean boots.',
				successLine: 'The kingdom road is swept clean enough to hide a threat.',
				predicate: { type: 'zoneReached', zone: 'kingdom-road' },
				unlocks: ['callback:kingdom-road-reached']
			}),
			task('day-7-find-permit-house', 'Examine the permit house', {
				target: { kind: 'inspect', name: 'permit house', zone: 'kingdom-road', mapId: 'kingdom' },
				hint: 'Look for the office that turns permission into a cage.',
				successLine: 'Chatty finds fresh ink using old cruelty as a recipe.',
				predicate: { type: 'callback', key: 'permit-house-read' },
				unlocks: ['fact:permitHouse']
			}),
			task('day-7-pressure-mayor-reform', 'Force Mayor Leonard to answer the kingdom problem', {
				target: { kind: 'dialogue', dialog: 'MAYOR_LEONARD', zone: 'mayor-house', mapId: 'mulberryTown' },
				hint: 'Make reform mean something while the kingdom is still watching.',
				successLine: 'Mayor Leonard stops negotiating with the old fear in his mouth.',
				eventType: 'dialogue',
				predicate: { type: 'relationshipKey', key: 'mayor', talks: 3 },
				unlocks: ['callback:mayor-kingdom-reversal']
			})
		]
	},
	'day-8-lich-route': {
		id: 'day-8-lich-route',
		day: 8,
		title: 'The Lich Road Opens',
		summary: 'The under-road points Chatty toward the thing that still counts names after death.',
		tasks: [
			task('day-8-enter-lich-lair', 'Enter the lich lair', {
				target: { kind: 'place', name: 'lich lair', zone: 'under-road', mapId: 'lichLair' },
				hint: 'Go below the graveyard and keep the lamp honest.',
				successLine: 'The lair answers with air too old to breathe politely.',
				predicate: { type: 'zoneReached', zone: 'under-road' },
				unlocks: ['callback:lich-lair-entered']
			}),
			task('day-8-light-name-lamps', 'Light the name lamps', {
				target: { kind: 'interact', name: 'name lamps', zone: 'under-road', mapId: 'lichLair' },
				hint: 'Use the Lantern Keeper’s route and light what the ledger wanted dark.',
				successLine: 'Each lamp makes a stolen name heavier and harder to steal again.',
				predicate: { type: 'callback', key: 'name-lamps-lit' },
				unlocks: ['fact:nameLampsLit']
			}),
			task('day-8-ask-lantern-keeper', 'Ask the Lantern Keeper how to face dead law', {
				target: { kind: 'dialogue', name: 'Lantern Keeper', zone: 'under-road', mapId: 'mulberryTown' },
				hint: 'The Lantern Keeper knows which light survives underground.',
				successLine: 'The Lantern Keeper gives Chatty a light that refuses to kneel.',
				eventType: 'dialogue',
				predicate: { type: 'relationshipKey', key: 'lanternKeeper', talks: 2 },
				unlocks: ['callback:keeper-dead-law-light']
			})
		]
	},
	'day-9-lich-boss': {
		id: 'day-9-lich-boss',
		day: 9,
		title: 'The Bone Clerk',
		summary: 'Chatty reaches the lich boss and fights the dead administrator behind the ledger magic.',
		tasks: [
			task('day-9-reach-lich-boss', 'Reach the lich boss chamber', {
				target: { kind: 'place', name: 'lich boss chamber', zone: 'lich-boss', mapId: 'lichBoss' },
				hint: 'Follow the name lamps until the room starts pretending it owns you.',
				successLine: 'The boss chamber has the confidence of paperwork and bones.',
				predicate: { type: 'zoneReached', zone: 'lich-boss' },
				unlocks: ['callback:lich-boss-chamber-reached']
			}),
			task('day-9-break-bone-ledger', 'Break the bone ledger', {
				target: { kind: 'combat', enemy: 'Bone Clerk', zone: 'lich-boss', mapId: 'lichBoss' },
				hint: 'Use every stolen lesson against the clerk that counts goblins after death.',
				successLine: 'The bone ledger cracks, and the numbers inside forget how to own anyone.',
				eventType: 'combat',
				predicate: { type: 'callback', key: 'bone-ledger-broken' },
				unlocks: ['callback:bone-ledger-broken']
			}),
			task('day-9-name-the-victory', 'Name the victory with the hidden goblins', {
				target: { kind: 'dialogue', name: 'Hidden Goblin Pip', zone: 'hidden-camp', mapId: 'mulberryForest' },
				hint: 'Let the hidden goblins say what the victory is called.',
				successLine: 'The hidden goblins name the victory loudly enough to make tomorrow nervous.',
				eventType: 'dialogue',
				predicate: { type: 'relationshipKey', key: 'hiddenGoblinOne', talks: 2 },
				unlocks: ['callback:hidden-goblins-name-victory']
			})
		]
	},
	'day-10-expedition-charter': {
		id: 'day-10-expedition-charter',
		day: 10,
		title: 'The First Free Expedition',
		summary: 'Chatty turns victory into a repeatable expedition charter for goblins who want roads, work, and trouble.',
		tasks: [
			task('day-10-cross-overworld', 'Cross the overworld with a free road charter', {
				target: { kind: 'route', name: 'overworld charter road', zone: 'overworld-road', mapId: 'overworld' },
				hint: 'Walk the open road as proof that goblin feet no longer need permission.',
				successLine: 'The overworld accepts a goblin road because Chatty refuses to ask twice.',
				predicate: { type: 'zoneReached', zone: 'overworld-road' },
				unlocks: ['callback:overworld-charter-crossed']
			}),
			task('day-10-build-expedition-list', 'Build the expedition list at the tavern', {
				target: { kind: 'dialogue', name: 'Bartender', zone: 'tavern', mapId: 'mulberryTown' },
				hint: 'Turn volunteers, soup, and bad ideas into a usable expedition list.',
				successLine: 'The Bartender writes a list that is almost responsible.',
				eventType: 'dialogue',
				predicate: { type: 'relationshipKey', key: 'bartender', talks: 3 },
				unlocks: ['callback:expedition-list-written']
			}),
			task('day-10-choose-next-free-road', 'Choose the next free road', {
				target: { kind: 'choice', name: 'next free road', zone: 'town-square', mapId: 'mulberryTown' },
				hint: 'Pick tomorrow’s road by need, not fear.',
				successLine: 'Chatty chooses tomorrow by usefulness instead of panic.',
				eventType: 'dialogue',
				predicate: { type: 'callback', key: 'next-free-road-chosen' },
				unlocks: ['callback:first-expedition-chartered']
			})
		]
	}
}

const CAMPAIGN_ARC_SEQUENCE = [
	'day-2-road-to-freedom',
	'day-3-graveyard-names',
	'day-4-tainted-forest',
	'day-5-loot-goblin-lair',
	'day-6-orc-castle-pressure',
	'day-7-kingdom-politics',
	'day-8-lich-route',
	'day-9-lich-boss',
	'day-10-expedition-charter'
]

function getContinuationArc(arcId = 'day-2-road-to-freedom') {
	return CONTINUATION_ARCS[arcId] || CONTINUATION_ARCS['day-2-road-to-freedom']
}

function getCampaignArcSequence() {
	return CAMPAIGN_ARC_SEQUENCE.map(getContinuationArc)
}

function getContinuationTaskIds() {
	return getCampaignArcSequence().flatMap(arc => arc.tasks.map(task => task.id))
}

function getNextContinuationArcId(currentArcId = 'day-2-road-to-freedom', completedArcIds = []) {
	const sequence = CAMPAIGN_ARC_SEQUENCE
	const visited = new Set(completedArcIds || [])
	const currentIndex = Math.max(0, sequence.indexOf(currentArcId))
	for (let offset = 1; offset <= sequence.length; offset += 1) {
		const candidate = sequence[(currentIndex + offset) % sequence.length]
		if (!visited.has(candidate)) return candidate
	}
	return sequence[0]
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
	const completedArcIds = Array.isArray(story.completedArcIds) ? story.completedArcIds.slice() : []
	if (!completedArcIds.includes(currentArc.id)) completedArcIds.push(currentArc.id)
	const nextArcId = getNextContinuationArcId(currentArc.id, completedArcIds)
	const taskIds = new Set(getContinuationTaskIds())
	story.completedTasks = (story.completedTasks || []).filter(id => !taskIds.has(id))
	story.failedTasks = (story.failedTasks || []).filter(id => !taskIds.has(id))
	story.completedArcIds = nextArcId === CAMPAIGN_ARC_SEQUENCE[0] ? [] : completedArcIds
	story.day = Math.max(2, (story.day || 2) + 1)
	story.arcId = nextArcId
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
	getCampaignArcSequence,
	getContinuationArc,
	getContinuationSummary,
	getNextContinuationArcId,
	isContinuationArcComplete,
	rollContinuationArc,
	shouldUseContinuationTasks
}
