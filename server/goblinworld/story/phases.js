const { STORY_TURNS_PER_PHASE } = require('./constants')

function task(id, title, details = {}) {
	return {
		id,
		title,
		label: title,
		target: details.target || { kind: 'story' },
		hint: details.hint || 'Follow the current story pressure and look for the next public clue.',
		detail: details.hint || 'Follow the current story pressure and look for the next public clue.',
		successLine: details.successLine || `${title} is complete.`,
		failureLine: details.failureLine || `${title} becomes harder because the old fear was left alone too long.`,
		required: details.required !== false,
		eventType: details.eventType || 'quest',
		encounterId: details.encounterId || null,
		unlocks: details.unlocks || [],
		callbackFlags: details.callbackFlags || [],
		predicate: details.predicate || { type: 'auto' },
		autoAfterTurns: details.autoAfterTurns,
		expireAfterTurns: details.expireAfterTurns || null
	}
}

const PHASE_BLUEPRINTS = [
	{
		id: 'phase-1',
		number: 1,
		title: 'The Body Wakes Up Wrong',
		hourStart: 0,
		core: 'Chatty realizes the body is real, the cloak is real, and the town has opinions.',
		completionLine: 'The town has named Chatty. The body has learned roads, doors, and the insult of furniture.',
		tasks: [
			task('phase-1-test-body', 'Wake up and test movement', {
				target: { kind: 'self' },
				hint: 'Move through safe nearby tiles and prove the body answers.',
				successLine: 'Chatty learns that feet are real and mostly cooperative.',
				eventType: 'discovery',
				predicate: { type: 'fact', key: 'bodyMoved' },
				unlocks: ['fact:bodyMoved']
			}),
			task('phase-1-find-voice', 'Find a speaking NPC', {
				target: { kind: 'dialogue', dialog: 'BARTENDER' },
				hint: 'Look for a tavern voice, mayor voice, or any villager with opinions.',
				successLine: 'A nearby voice confirms that Chatty is not imagining the world.',
				eventType: 'dialogue',
				predicate: { type: 'relationshipTalks', count: 1 },
				unlocks: ['fact:firstVoice']
			}),
			task('phase-1-learn-name', 'Learn the name Chatty, the chosen one', {
				target: { kind: 'identity' },
				hint: 'Listen until someone says the name out loud.',
				successLine: 'The name lands on Chatty like a cloak pin.',
				eventType: 'discovery',
				predicate: { type: 'fact', key: 'firstVoice' },
				unlocks: ['fact:chosenName']
			}),
			task('phase-1-reach-town', 'Reach the tavern or Mayor Leonard', {
				target: { kind: 'place', name: 'tavern-or-mayor' },
				hint: 'Follow floorboards, lanterns, and suspicious furniture.',
				successLine: 'Chatty reaches the first seat of local power, or at least the first counter.',
				eventType: 'quest',
				predicate: { type: 'fact', key: 'bodyMoved' },
				unlocks: ['fact:townReached']
			}),
			task('phase-1-first-fight', 'Survive the first nuisance encounter', {
				target: { kind: 'combat', enemy: 'Cellar Rat' },
				hint: 'Cellar rats and bitey weeds are the world checking if prophecy bruises.',
				successLine: 'Chatty survives the first tiny violence and keeps the cloak.',
				eventType: 'combat',
				encounterId: 'cellar-rats',
				predicate: { type: 'encounterDefeated', encounterId: 'cellar-rats' },
				callbackFlags: ['survived-first-nuisance']
			}),
			task('phase-1-inspect-well', 'Inspect the well and the wall scribbles', {
				target: { kind: 'inspect', name: 'well-scribbles' },
				hint: 'The old wall scribbles know the name before Chatty likes it.',
				successLine: 'The scribbles confirm prophecy had terrible handwriting.',
				eventType: 'discovery',
				predicate: { type: 'fact', key: 'inspectedWorld' },
				unlocks: ['fact:wallScribbles']
			}),
			task('phase-1-find-snack-law', 'Learn the first town rule about snacks', {
				target: { kind: 'dialogue', dialog: 'BARTENDER' },
				hint: 'Ask why every rule in Mulberry sounds like a warning label.',
				successLine: 'Chatty learns that snack law is mostly fear wearing an apron.',
				eventType: 'dialogue',
				predicate: { type: 'relationshipKey', key: 'bartender', trust: 2 },
				unlocks: ['callback:snack-law']
			}),
			task('phase-1-choose-first-goal', 'Choose the first public goal', {
				target: { kind: 'goal', name: 'survive-and-listen' },
				hint: 'The body is awake, so the next task is to learn why the town is nervous.',
				successLine: 'Chatty chooses survival, listening, and controlled inconvenience.',
				eventType: 'quest',
				predicate: { type: 'allOfFacts', keys: ['bodyMoved', 'chosenName'] },
				unlocks: ['callback:first-goal']
			})
		]
	},
	{
		id: 'phase-2',
		number: 2,
		title: 'The Ledger Of Small Chains',
		hourStart: 3,
		core: 'Chatty learns goblins are tracked, taxed, chased, and blamed by an old town ledger.',
		completionLine: 'Chatty finds the ledger and learns the first enemy is not a monster. It is a list.',
		tasks: [
			task('phase-2-speak-mayor', 'Speak to Mayor Leonard about the missing ledger', {
				target: { kind: 'dialogue', dialog: 'MAYOR_LEONARD' },
				hint: 'Mayor Leonard knows which records still bite.',
				successLine: 'Mayor Leonard admits the ledger existed and cowardice kept it safe.',
				eventType: 'dialogue',
				predicate: { type: 'relationshipKey', key: 'mayor', talks: 1 },
				unlocks: ['fact:ledgerExisted']
			}),
			task('phase-2-inspect-town', 'Inspect tavern, market, and old storage', {
				target: { kind: 'inspect', name: 'town-storage' },
				hint: 'Search where old paper would hide from sunlight.',
				successLine: 'The trail points down, toward cellar dust and rat law.',
				eventType: 'discovery',
				predicate: { type: 'fact', key: 'inspectedWorld' },
				unlocks: ['fact:cellarTrail']
			}),
			task('phase-2-recover-ledger', 'Recover the Goblin Ledger from a cellar', {
				target: { kind: 'item', name: 'Goblin Ledger' },
				hint: 'Find the old book before it remembers another name wrong.',
				successLine: 'The Goblin Ledger comes free with a cough of old dust.',
				eventType: 'quest',
				predicate: { type: 'fact', key: 'cellarTrail' },
				unlocks: ['item:goblinLedger']
			}),
			task('phase-2-ledger-mites', 'Battle cellar rats and ledger mites', {
				target: { kind: 'combat', enemy: 'Ledger Mite' },
				hint: 'The ledger has mites, and the mites have politics.',
				successLine: 'The ledger mites scatter, still whispering tax at the walls.',
				eventType: 'combat',
				encounterId: 'ledger-mites',
				predicate: { type: 'encounterDefeated', encounterId: 'ledger-mites' },
				callbackFlags: ['ledger-mites-broken']
			}),
			task('phase-2-hidden-goblins', 'Learn that goblins outside town are hiding', {
				target: { kind: 'rumor', name: 'hidden-goblins' },
				hint: 'Listen for the part people lower their voices to say.',
				successLine: 'Chatty learns the names in the ledger are not gone. They are hiding.',
				eventType: 'discovery',
				predicate: { type: 'item', key: 'goblinLedger' },
				unlocks: ['fact:hiddenGoblinsExist']
			}),
			task('phase-2-mark-names', 'Mark names that must be freed', {
				target: { kind: 'item', name: 'ledger-names' },
				hint: 'Separate people from punishments before the ledger can pretend they are the same.',
				successLine: 'The names become people again in Chatty thoughts before they become public.',
				eventType: 'discovery',
				predicate: { type: 'item', key: 'goblinLedger' },
				unlocks: ['fact:namesArePeople']
			}),
			task('phase-2-challenge-paper-law', 'Challenge paper law out loud', {
				target: { kind: 'speech', name: 'paper-law' },
				hint: 'Say that a written cage is still a cage.',
				successLine: 'The room hears that paper law is not the same as justice.',
				eventType: 'dialogue',
				predicate: { type: 'fact', key: 'ledgerExisted' },
				unlocks: ['callback:paper-law-challenged']
			}),
			task('phase-2-hide-ledger-copy', 'Hide a copy of the freed names', {
				target: { kind: 'ally', name: 'trusted-witness' },
				hint: 'Give the truth a second place to live.',
				successLine: 'The freed names survive outside the ledger mouth.',
				eventType: 'quest',
				required: false,
				predicate: { type: 'relationshipTalks', count: 3 },
				unlocks: ['callback:truth-backed-up'],
				expireAfterTurns: STORY_TURNS_PER_PHASE - 300
			})
		]
	},
	{
		id: 'phase-3',
		number: 3,
		title: 'Mud Road Diplomacy',
		hourStart: 6,
		core: 'Chatty needs allies. The wandering NPCs become rumor carriers and reluctant guides.',
		completionLine: 'The roads begin carrying Chatty\'s name ahead of Chatty\'s feet.',
		tasks: [
			task('phase-3-three-villagers', 'Follow lantern roads to three wandering villagers', {
				target: { kind: 'dialogue', count: 3 },
				hint: 'The road knows things because everyone complains on it.',
				successLine: 'Three wandering villagers become three moving rumors.',
				eventType: 'dialogue',
				predicate: { type: 'relationshipTalks', count: 3 },
				unlocks: ['fact:roadRumors']
			}),
			task('phase-3-hidden-camps', 'Ask about hidden goblin camps', {
				target: { kind: 'rumor', name: 'hidden-camps' },
				hint: 'Ask the people who pretend not to see short merchants with emergency posture.',
				successLine: 'The hidden camps are real enough to make people nervous.',
				eventType: 'discovery',
				predicate: { type: 'fact', key: 'roadRumors' },
				unlocks: ['fact:hiddenCamps']
			}),
			task('phase-3-dwarf-charm', 'Help Dwarf Bili recover a stolen charm', {
				target: { kind: 'dialogue', dialog: 'DWARF_BILI' },
				hint: 'Dwarf Bili has a problem shaped like a side quest.',
				successLine: 'Dwarf Bili gets the charm back and respect becomes slightly less reluctant.',
				eventType: 'quest',
				predicate: { type: 'relationshipKey', key: 'dwarf', talks: 1 },
				unlocks: ['item:biliCharm', 'callback:bili-trust']
			}),
			task('phase-3-bramble-crawlers', 'Battle bramble crawlers on the road', {
				target: { kind: 'combat', enemy: 'Bramble Crawler' },
				hint: 'The brambles have voted for violence. Respect the process, then win.',
				successLine: 'The road stops crawling long enough for diplomacy.',
				eventType: 'combat',
				encounterId: 'bramble-crawlers',
				predicate: { type: 'encounterDefeated', encounterId: 'bramble-crawlers' },
				callbackFlags: ['roads-opened']
			}),
			task('phase-3-freedom-task', 'Unlock the first freedom task', {
				target: { kind: 'quest', name: 'Find the tucked-away goblins' },
				hint: 'A rumor becomes a task once Chatty decides to be inconvenient.',
				successLine: 'Find the tucked-away goblins becomes the work ahead.',
				eventType: 'quest',
				predicate: { type: 'fact', key: 'hiddenCamps' },
				unlocks: ['callback:first-freedom-task']
			}),
			task('phase-3-recruit-pathfinder', 'Recruit the Forest Wanderer as pathfinder', {
				target: { kind: 'ally', name: 'Forest Wanderer' },
				hint: 'The hidden path needs a witness who knows where lamps stop.',
				successLine: 'The Forest Wanderer becomes a guide instead of a warning.',
				eventType: 'dialogue',
				predicate: { type: 'relationshipKey', key: 'forestWanderer', talks: 1 },
				unlocks: ['ally:forestWanderer']
			}),
			task('phase-3-confront-revenge-question', 'Answer the revenge question', {
				target: { kind: 'ideology', name: 'revenge-question' },
				hint: 'Someone must ask whether freedom means revenge.',
				successLine: 'Chatty says fear gets conquered before people do.',
				eventType: 'dialogue',
				predicate: { type: 'relationshipTalks', count: 4 },
				unlocks: ['callback:conquest-defined-early']
			}),
			task('phase-3-save-road-cache', 'Save a road cache for later defense', {
				target: { kind: 'item', name: 'road-cache' },
				hint: 'A future battle needs rope, beans, and one thing nobody should ask about.',
				successLine: 'The road cache waits where panic will need it.',
				eventType: 'quest',
				required: false,
				predicate: { type: 'fact', key: 'roadRumors' },
				unlocks: ['item:roadCache'],
				expireAfterTurns: STORY_TURNS_PER_PHASE - 300
			})
		]
	},
	{
		id: 'phase-4',
		number: 4,
		title: 'The Hidden Goblin Census',
		hourStart: 9,
		core: 'Chatty finds scattered goblins and starts turning survival into a movement.',
		completionLine: 'The old ledger loses power as goblins write their own names.',
		tasks: [
			task('phase-4-find-group-one', 'Locate the first hidden goblin group', {
				target: { kind: 'goblin-camp', name: 'root-shed' },
				hint: 'Look where roots, sheds, and fear overlap.',
				successLine: 'The first hidden group stops being rumor.',
				eventType: 'discovery',
				predicate: { type: 'fact', key: 'hiddenCamps' },
				unlocks: ['ally:hiddenGoblinOne']
			}),
			task('phase-4-find-group-two', 'Locate the second hidden goblin group', {
				target: { kind: 'goblin-camp', name: 'ditch-door' },
				hint: 'Follow bad jokes and short footprints.',
				successLine: 'The second hidden group answers with insults, which is promising.',
				eventType: 'discovery',
				predicate: { type: 'allyCount', count: 1 },
				unlocks: ['ally:hiddenGoblinTwo']
			}),
			task('phase-4-find-group-three', 'Locate the third hidden goblin group', {
				target: { kind: 'goblin-camp', name: 'lamp-smoke' },
				hint: 'Search for the camp that hides under light instead of dark.',
				successLine: 'The third hidden group chooses conversation over running.',
				eventType: 'discovery',
				predicate: { type: 'allyCount', count: 2 },
				unlocks: ['ally:hiddenGoblinThree']
			}),
			task('phase-4-say-phrase', 'Speak the phrase small does not mean owned', {
				target: { kind: 'speech', name: 'small-does-not-mean-owned' },
				hint: 'Say the movement in words that fit inside scared bones.',
				successLine: 'The phrase lands harder than a threat because it belongs to everyone.',
				eventType: 'dialogue',
				predicate: { type: 'allyCount', count: 3 },
				unlocks: ['callback:freedom-phrase']
			}),
			task('phase-4-crown-hounds', 'Defeat hound patrols protecting the old census', {
				target: { kind: 'combat', enemy: 'Crown Hound' },
				hint: 'The hounds want every hidden goblin counted backward.',
				successLine: 'The hounds break formation and the hidden goblins keep their names.',
				eventType: 'combat',
				encounterId: 'crown-hounds',
				predicate: { type: 'encounterDefeated', encounterId: 'crown-hounds' },
				callbackFlags: ['hidden-goblins-protected']
			}),
			task('phase-4-escort-group', 'Escort one goblin group to a safe landmark', {
				target: { kind: 'escort', name: 'safe-landmark' },
				hint: 'Protection matters most when someone else chooses the destination.',
				successLine: 'One group reaches the landmark without being treated like cargo.',
				eventType: 'quest',
				predicate: { type: 'callback', key: 'hidden-goblins-protected' },
				unlocks: ['callback:escort-success']
			}),
			task('phase-4-create-freedom-list', 'Create the Goblin Freedom List', {
				target: { kind: 'item', name: 'Goblin Freedom List' },
				hint: 'Replace the ledger with a promise instead of another cage.',
				successLine: 'The Goblin Freedom List begins as consent, not ownership.',
				eventType: 'quest',
				predicate: { type: 'callback', key: 'freedom-phrase' },
				unlocks: ['item:goblinFreedomList']
			}),
			task('phase-4-let-goblins-refuse', 'Let one goblin refuse the plan', {
				target: { kind: 'choice', name: 'consent-test' },
				hint: 'Freedom must allow no, even when no is inconvenient.',
				successLine: 'Chatty proves the list is not a leash by accepting refusal.',
				eventType: 'dialogue',
				required: false,
				predicate: { type: 'relationshipKey', key: 'hiddenGoblinThree', trust: 1 },
				unlocks: ['callback:consent-honored'],
				expireAfterTurns: STORY_TURNS_PER_PHASE - 200
			})
		]
	},
	{
		id: 'phase-5',
		number: 5,
		title: 'The Banner Of Bad Ideas',
		hourStart: 12,
		core: 'Chatty needs a symbol. The town starts reacting. Some NPCs help, some panic.',
		completionLine: 'The banner rises. It is crooked, damp, and impossible to ignore.',
		tasks: [
			task('phase-5-gather-cloth', 'Gather cloth for the goblin banner', {
				target: { kind: 'item', name: 'cloth' },
				hint: 'The Market Trader sells cloth and plausible regret.',
				successLine: 'The cloth is acquired with only moderate economic suspicion.',
				eventType: 'quest',
				predicate: { type: 'relationshipKey', key: 'marketTrader', talks: 1 },
				unlocks: ['item:bannerCloth']
			}),
			task('phase-5-gather-glass', 'Gather lantern glass for the banner signal', {
				target: { kind: 'item', name: 'lantern-glass' },
				hint: 'The Lantern Keeper knows which broken glass still carries light.',
				successLine: 'Lantern glass catches a future signal.',
				eventType: 'quest',
				predicate: { type: 'relationshipKey', key: 'lanternKeeper', talks: 1 },
				unlocks: ['item:lanternGlass']
			}),
			task('phase-5-gather-ink', 'Gather blackroot ink', {
				target: { kind: 'item', name: 'blackroot-ink' },
				hint: 'The Forest Wanderer knows where ink grows with bad manners.',
				successLine: 'Blackroot ink stains the plan into visibility.',
				eventType: 'quest',
				predicate: { type: 'relationshipKey', key: 'forestWanderer', talks: 1 },
				unlocks: ['item:blackrootInk']
			}),
			task('phase-5-rebel-toast', 'Ask the Bartender for a rebel toast', {
				target: { kind: 'dialogue', dialog: 'BARTENDER' },
				hint: 'A rebellion needs a sentence people can shout without choking.',
				successLine: 'The toast is short, suspicious, and useful.',
				eventType: 'dialogue',
				predicate: { type: 'relationshipKey', key: 'bartender', trust: 3 },
				unlocks: ['callback:rebel-toast']
			}),
			task('phase-5-armory-route', 'Ask the Stone Guard where the old road armory is', {
				target: { kind: 'dialogue', dialog: 'STONE_GUARD' },
				hint: 'The guard knows the armory and hates how helpful that is.',
				successLine: 'The armory route opens with official reluctance.',
				eventType: 'dialogue',
				predicate: { type: 'relationshipKey', key: 'stoneGuard', talks: 1 },
				unlocks: ['fact:armoryRoute']
			}),
			task('phase-5-pantry-slime', 'Defeat pantry slimes threatening supplies', {
				target: { kind: 'combat', enemy: 'Pantry Slime' },
				hint: 'The pantry slime has chosen a poor side of history.',
				successLine: 'The supplies survive the slime and the cloak keeps its dignity.',
				eventType: 'combat',
				encounterId: 'pantry-slimes',
				predicate: { type: 'encounterDefeated', encounterId: 'pantry-slimes' },
				callbackFlags: ['banner-supplies-defended']
			}),
			task('phase-5-armor-scraps', 'Win armor scraps from the old road armory', {
				target: { kind: 'combat', enemy: 'Armor Scrap' },
				hint: 'The old armory must give something back to the people it frightened.',
				successLine: 'Armor scraps become defense instead of decoration for old law.',
				eventType: 'combat',
				encounterId: 'armor-scraps',
				predicate: { type: 'encounterDefeated', encounterId: 'armor-scraps' },
				callbackFlags: ['armory-scraps-claimed']
			}),
			task('phase-5-craft-banner', 'Craft the goblin banner', {
				target: { kind: 'item', name: 'goblin-banner' },
				hint: 'Combine cloth, glass, ink, and the terrible confidence of a chosen goblin.',
				successLine: 'The banner rises crooked, damp, and impossible to ignore.',
				eventType: 'quest',
				predicate: { type: 'allOfItems', keys: ['bannerCloth', 'lanternGlass', 'blackrootInk'] },
				unlocks: ['item:goblinBanner', 'callback:banner-raised']
			})
		]
	},
	{
		id: 'phase-6',
		number: 6,
		title: 'The Small War Begins',
		hourStart: 15,
		core: 'The old powers respond. The story becomes active combat and defense.',
		completionLine: 'The town learns that small bodies can hold a line.',
		tasks: [
			task('phase-6-defend-market-road', 'Defend the market road', {
				target: { kind: 'combat', enemy: 'Thorn Scout' },
				hint: 'The banner has been seen and the road must not fold.',
				successLine: 'The market road holds long enough for courage to spread.',
				eventType: 'combat',
				encounterId: 'thorn-wave',
				predicate: { type: 'encounterDefeated', encounterId: 'thorn-wave' },
				callbackFlags: ['market-road-held']
			}),
			task('phase-6-protect-wanderers', 'Protect wandering NPCs from patrol creatures', {
				target: { kind: 'defense', name: 'wanderers' },
				hint: 'The movement cannot ask witnesses to stand alone.',
				successLine: 'Wanderers survive to become messengers instead of warnings.',
				eventType: 'quest',
				predicate: { type: 'callback', key: 'market-road-held' },
				unlocks: ['callback:wanderers-protected']
			}),
			task('phase-6-rally-bartender', 'Rally the Bartender to close the tavern for resistance', {
				target: { kind: 'ally', name: 'Bartender' },
				hint: 'Comic cowardice becomes useful courage when the door locks for the right reason.',
				successLine: 'The tavern becomes a resistance hub with mugs.',
				eventType: 'dialogue',
				predicate: { type: 'relationshipKey', key: 'bartender', trust: 4 },
				unlocks: ['ally:bartender', 'callback:tavern-resistance']
			}),
			task('phase-6-rally-bili', 'Rally Dwarf Bili to the line', {
				target: { kind: 'ally', name: 'Dwarf Bili' },
				hint: 'Bili has old shame to spend on new defense.',
				successLine: 'Bili stands where the road needs a stubborn body.',
				eventType: 'dialogue',
				predicate: { type: 'relationshipKey', key: 'dwarf', trust: 2 },
				unlocks: ['ally:dwarf']
			}),
			task('phase-6-rally-guard', 'Rally the Stone Guard to defend the small fool', {
				target: { kind: 'ally', name: 'Stone Guard' },
				hint: 'The guard must choose people over old law.',
				successLine: 'The Stone Guard changes what guarding means.',
				eventType: 'dialogue',
				predicate: { type: 'relationshipKey', key: 'stoneGuard', trust: 1 },
				unlocks: ['ally:stoneGuard']
			}),
			task('phase-6-keep-chatty-alive', 'Keep Chatty alive through the longer combat loop', {
				target: { kind: 'survival', name: 'chatty-hp' },
				hint: 'A chosen one still has hit points and bad luck.',
				successLine: 'Chatty stays upright with heroic inconvenience.',
				eventType: 'quest',
				predicate: { type: 'chattyAlive' },
				unlocks: ['callback:chatty-survived-war']
			}),
			task('phase-6-count-clean-fights', 'Win clean fights to raise morale', {
				target: { kind: 'combat-quality', name: 'clean-fights' },
				hint: 'Inspection before violence turns fear into tactics.',
				successLine: 'The crowd sees strategy, not just panic with a cloak.',
				eventType: 'combat',
				required: false,
				predicate: { type: 'callback', key: 'careful-fighter' },
				unlocks: ['callback:morale-high'],
				expireAfterTurns: STORY_TURNS_PER_PHASE - 200
			}),
			task('phase-6-open-relief-route', 'Open a relief route behind the market', {
				target: { kind: 'route', name: 'relief-route' },
				hint: 'A good defense has an exit that does not brag.',
				successLine: 'The relief route carries bandages, beans, and survivors.',
				eventType: 'quest',
				predicate: { type: 'anyAlly', keys: ['marketTrader', 'forestWanderer', 'lanternKeeper'] },
				unlocks: ['callback:relief-route']
			})
		]
	},
	{
		id: 'phase-7',
		number: 7,
		title: 'The Crown Below',
		hourStart: 18,
		core: 'Chatty descends into the under road to break the source of the ledger magic.',
		completionLine: 'The binding stone cracks. Every hidden goblin feels their name return.',
		tasks: [
			task('phase-7-find-stair', 'Find the stair or sealed door', {
				target: { kind: 'place', name: 'sealed-door' },
				hint: 'Bad laws like basements and there is a stair under the fear.',
				successLine: 'The sealed door stops being a rumor.',
				eventType: 'discovery',
				predicate: { type: 'callback', key: 'market-road-held' },
				unlocks: ['fact:sealedDoor']
			}),
			task('phase-7-take-lamp', 'Take a lamp from the Lantern Keeper', {
				target: { kind: 'item', name: 'under-road-lamp' },
				hint: 'Darkness lies better when no one can see its face.',
				successLine: 'The lamp joins the descent and refuses ledger dark.',
				eventType: 'quest',
				predicate: { type: 'relationshipKey', key: 'lanternKeeper', talks: 1 },
				unlocks: ['item:underRoadLamp']
			}),
			task('phase-7-enter-under-road', 'Enter the under road', {
				target: { kind: 'place', name: 'under-road' },
				hint: 'The old path waits under town with bad opinions.',
				successLine: 'Chatty enters the under road with a lamp and several objections.',
				eventType: 'discovery',
				predicate: { type: 'allOfItems', keys: ['underRoadLamp'] },
				unlocks: ['fact:underRoadEntered']
			}),
			task('phase-7-recover-first-name', 'Recover the First Goblin Name', {
				target: { kind: 'item', name: 'First Goblin Name' },
				hint: 'The first stolen name is warm, angry, and under guard.',
				successLine: 'The First Goblin Name returns to living hands.',
				eventType: 'quest',
				predicate: { type: 'fact', key: 'underRoadEntered' },
				unlocks: ['item:firstGoblinName']
			}),
			task('phase-7-ledger-warden', 'Battle the Ledger Warden', {
				target: { kind: 'combat', enemy: 'Ledger Warden' },
				hint: 'The warden fights with hooks, debt, and old grammar.',
				successLine: 'The Ledger Warden loses the authority to alphabetize souls.',
				eventType: 'combat',
				encounterId: 'ledger-warden',
				predicate: { type: 'encounterDefeated', encounterId: 'ledger-warden' },
				callbackFlags: ['first-name-returned']
			}),
			task('phase-7-break-binding-stone', 'Destroy or rewrite the binding stone', {
				target: { kind: 'interact', name: 'binding-stone' },
				hint: 'The stone must be broken or taught to record consent.',
				successLine: 'The binding stone cracks and old ownership loses its root.',
				eventType: 'quest',
				predicate: { type: 'callback', key: 'first-name-returned' },
				unlocks: ['callback:binding-stone-cracked']
			}),
			task('phase-7-hear-names-return', 'Hear the hidden names return', {
				target: { kind: 'discovery', name: 'returned-names' },
				hint: 'Listen for goblins becoming heavier in their own bones.',
				successLine: 'Every hidden goblin feels the stolen name come home.',
				eventType: 'discovery',
				predicate: { type: 'callback', key: 'binding-stone-cracked' },
				unlocks: ['callback:names-returned']
			}),
			task('phase-7-refuse-ledger-crown', 'Refuse the ledger crown', {
				target: { kind: 'choice', name: 'ledger-crown' },
				hint: 'The old magic offers control because it does not understand freedom.',
				successLine: 'Chatty refuses to become the newest owner of old chains.',
				eventType: 'dialogue',
				required: false,
				predicate: { type: 'callback', key: 'conquest-defined-early' },
				unlocks: ['callback:refused-ledger-crown'],
				expireAfterTurns: STORY_TURNS_PER_PHASE - 200
			})
		]
	},
	{
		id: 'phase-8',
		number: 8,
		title: 'Dawn Of The Chosen One',
		hourStart: 21,
		core: 'Chatty leads liberated goblins and allies in a final confrontation, then defines conquest as freedom from fear.',
		completionLine: 'At dawn, Chatty does not become a tyrant. Chatty becomes a problem that belongs to the people.',
		tasks: [
			task('phase-8-return-square', 'Return to town square with the First Name', {
				target: { kind: 'place', name: 'town-square' },
				hint: 'Bring the name back where old law can hear it lose.',
				successLine: 'The square receives the First Name and stops feeling neutral.',
				eventType: 'quest',
				predicate: { type: 'item', key: 'firstGoblinName' },
				unlocks: ['fact:firstNameInSquare']
			}),
			task('phase-8-rally-goblins', 'Rally the liberated goblins', {
				target: { kind: 'ally', name: 'liberated-goblins' },
				hint: 'Ask goblins to stand because they choose it, not because prophecy orders it.',
				successLine: 'The liberated goblins stand up in several rude shapes.',
				eventType: 'dialogue',
				predicate: { type: 'allyCount', count: 3 },
				unlocks: ['callback:goblins-rallied']
			}),
			task('phase-8-rally-townsfolk', 'Rally villagers and reluctant allies', {
				target: { kind: 'ally', name: 'townsfolk' },
				hint: 'Freedom needs bystanders to stop practicing bystanding.',
				successLine: 'Townsfolk stop being scenery and become witnesses.',
				eventType: 'dialogue',
				predicate: { type: 'relationshipTalks', count: 8 },
				unlocks: ['callback:townsfolk-rallied']
			}),
			task('phase-8-crown-remnant', 'Survive the final battle against the Crown Remnant', {
				target: { kind: 'combat', enemy: 'Crown Remnant' },
				hint: 'The old order arrives to call freedom an accounting error.',
				successLine: 'The Crown Remnant loses the square and its voice.',
				eventType: 'combat',
				encounterId: 'crown-remnant',
				predicate: { type: 'encounterDefeated', encounterId: 'crown-remnant' },
				callbackFlags: ['crown-remnant-defeated']
			}),
			task('phase-8-speak-proclamation', 'Speak the freedom proclamation', {
				target: { kind: 'speech', name: 'freedom-proclamation' },
				hint: 'Define conquest as conquering fear, not owning people.',
				successLine: 'Chatty speaks freedom as a public fact that cannot be returned to the ledger.',
				eventType: 'phase',
				predicate: { type: 'callback', key: 'crown-remnant-defeated' },
				unlocks: ['callback:freedom-proclaimed']
			}),
			task('phase-8-set-next-goal', 'Set the next 24 hour loop goal', {
				target: { kind: 'goal', name: 'tomorrow' },
				hint: 'A liberated day still needs roads, soup, guards, and arguments.',
				successLine: 'Tomorrow becomes a task instead of a threat.',
				eventType: 'quest',
				predicate: { type: 'callback', key: 'freedom-proclaimed' },
				unlocks: ['callback:tomorrow-begins']
			}),
			task('phase-8-avoid-tyrant-choice', 'Refuse to become the new tyrant', {
				target: { kind: 'choice', name: 'no-new-cage' },
				hint: 'The crowd must hear that Chatty will not own the freedom Chatty helped win.',
				successLine: 'The chosen one chooses not to own the choosing.',
				eventType: 'dialogue',
				required: false,
				predicate: { type: 'callback', key: 'refused-ledger-crown' },
				unlocks: ['callback:no-new-tyrant'],
				expireAfterTurns: STORY_TURNS_PER_PHASE - 100
			}),
			task('phase-8-open-roads', 'Open the dawn roads', {
				target: { kind: 'route', name: 'dawn-roads' },
				hint: 'The first free dawn needs somewhere to go.',
				successLine: 'The dawn roads open for anyone done hiding.',
				eventType: 'quest',
				predicate: { type: 'callback', key: 'tomorrow-begins' },
				unlocks: ['callback:dawn-roads-open']
			})
		]
	}
]

const STORY_PHASES = PHASE_BLUEPRINTS.map(phase => {
	const taskWindow = STORY_TURNS_PER_PHASE / phase.tasks.length
	return {
		...phase,
		tasks: phase.tasks.map((phaseTask, index) => ({
			...phaseTask,
			phaseId: phase.id,
			autoAfterTurns: Number.isFinite(phaseTask.autoAfterTurns)
				? phaseTask.autoAfterTurns
				: Math.ceil((index + 1) * taskWindow)
		}))
	}
})

function getPhaseIndex(phaseId) {
	const index = STORY_PHASES.findIndex(phase => phase.id === phaseId)
	return index >= 0 ? index : 0
}

function getPhase(phaseId) {
	return STORY_PHASES[getPhaseIndex(phaseId)]
}

module.exports = {
	STORY_PHASES,
	getPhase,
	getPhaseIndex
}
