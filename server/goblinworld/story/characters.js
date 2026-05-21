const FACTIONS = {
	goblins: {
		id: 'goblins',
		name: 'Hidden goblins',
		role: 'Taxed, hunted, funny, angry, and ready to become more than a rumor.',
		ideology: 'Names belong to the named. Small bodies still own their roads.'
	},
	mulberry: {
		id: 'mulberry',
		name: 'Mulberry townsfolk',
		role: 'Complicit, scared, useful, and persuadable when history knocks loudly enough.',
		ideology: 'Rules feel safer than truth until the rules start biting children.'
	},
	ledger: {
		id: 'ledger',
		name: 'Ledger powers',
		role: 'Legalistic magic that turns names into hooks and debt into obedience.',
		ideology: 'If it is written down by power, it thinks it owns the living.'
	},
	crown: {
		id: 'crown',
		name: 'Crown remnants',
		role: 'Old order, punishment, ownership, and fear wearing a crown shaped hole.',
		ideology: 'Order means every small thing kneels and thanks the hand that records it.'
	}
}

const CHARACTER_ARCS = {
	mayor: {
		key: 'mayor',
		displayName: 'Mayor Leonard',
		faction: 'mulberry',
		role: 'Guilty reformer with a spine that arrives late.',
		startingTrust: -1,
		arc: 'He begins afraid of goblin freedom, admits his cowardice, then publicly breaks with the ledger law.',
		beats: [
			'Leonard tells Chatty the rules were written after fear learned ink.',
			'Leonard admits he knew the ledger survived and did not burn it.',
			'Leonard points toward roads he was too afraid to walk.',
			'Leonard warns that a freedom list must become a promise, not a cage.',
			'Leonard fears the banner will turn reform into revenge.',
			'Leonard chooses the market defense over polite delay.',
			'Leonard confesses the ledger root is under town hall stones.',
			'Leonard gives the square to Chatty and asks for fewer cages.'
		],
		voice: [
			'I was elected to manage fear and called it law.',
			'Paper has a long memory when cowards protect it.',
			'The road knows what my office avoided.',
			'A new list can heal or trap, depending on the hand.',
			'A banner frightens old men because it answers paperwork with weather.',
			'Reform has teeth today, and I appear to be standing near them.',
			'Bad laws like basements because light asks questions.',
			'Mulberry needs rules that do not bite the small.'
		]
	},
	bartender: {
		key: 'bartender',
		displayName: 'Bartender',
		faction: 'mulberry',
		role: 'Comic coward, tavern resistance hub, keeper of rebel toasts.',
		startingTrust: 1,
		arc: 'The bartender starts ducking trouble, hides messages in cups, and ends by opening the tavern as a rebel hall.',
		beats: [
			'The bartender recognizes prophecy and immediately worries about furniture damage.',
			'The bartender sends Chatty toward the cellar and pretends it was a drink order.',
			'The bartender turns tavern gossip into road intelligence.',
			'The bartender shelters hidden goblins under the excuse of late soup.',
			'The bartender writes the rebel toast and denies authorship twice.',
			'The bartender closes the tavern to open the resistance.',
			'The bartender passes lamps and bread to the under road scouts.',
			'The bartender makes the first free round a public political act.'
		],
		voice: [
			'Cup down, ears up, because prophecy stains wood.',
			'Cellars keep secrets and rats keep minutes.',
			'Gossip is just a map with more spit in it.',
			'Soup can hide a person if the pot is large and everyone is polite.',
			'A rebellion needs a toast short enough to yell while running.',
			'I am closing the tavern, which means I am opening the revolution.',
			'Take bread, take a lamp, and do not mention my heroic cowardice.',
			'First round is free for anyone who helped history trip over itself.'
		]
	},
	dwarf: {
		key: 'dwarf',
		displayName: 'Dwarf Bili',
		faction: 'mulberry',
		role: 'Reluctant mentor carrying shame over a past failed rescue.',
		startingTrust: 0,
		arc: 'Bili mocked goblin trouble once, lost people to the ledger road, then teaches Chatty how to survive it.',
		beats: [
			'Bili studies the cloak and measures whether Chatty can live through a bad idea.',
			'Bili names paper chains and remembers cutting too late.',
			'Bili sends Chatty after a stolen charm that proves trust can be repaired.',
			'Bili admits hidden goblins asked him for help once and he froze.',
			'Bili insists the banner needs a bite mark because shame needs a witness.',
			'Bili teaches battlefield knees and stays on the line.',
			'Bili guides the under road and apologizes to the walls before insulting them.',
			'Bili tells Chatty to avoid becoming king in the annoying way.'
		],
		voice: [
			'Keep the cloak low. The woods notice shiny things.',
			'Paper chains are still chains. Easier to cut, harder to notice.',
			'My charm went missing where the road starts lying.',
			'I heard goblins once and answered with silence. That sound followed me.',
			'Put a bite mark on the banner. Makes it official.',
			'Aim for knees. Everything important has knees or regrets.',
			'Below town is older than town. Do not insult the walls unless they start it.',
			'You did it, little cloak. Try not to become king in the annoying way.'
		]
	},
	marketTrader: {
		key: 'marketTrader',
		displayName: 'Market Trader',
		faction: 'mulberry',
		role: 'Profit first, then practical rebellion logistics.',
		startingTrust: 0,
		arc: 'The trader begins by selling safety as a product, then learns supply lines can be a kind of courage.',
		beats: [
			'The trader prices Chatty as a problem with ears.',
			'The trader knows where ledger paper moved because someone paid badly.',
			'The trader denies seeing goblins while describing them perfectly.',
			'The trader hides camp supplies under boring invoices.',
			'The trader sells cloth and accidentally funds a banner.',
			'The trader raises prices on cowardice and discounts bandages.',
			'The trader smuggles blue oil toward the under road.',
			'The trader calls freedom bad for ledgers and excellent for market foot traffic.'
		],
		voice: [
			'I sell cloth, turnips, rope, and selective memory.',
			'Old records changed hands near the cracked crates.',
			'I did not see goblins. I saw short merchants with emergency posture.',
			'Nothing suspicious in this invoice except the heroic amount of beans.',
			'I can sell cloth. I cannot sell plausible deniability.',
			'If we survive, rebellion prices go up.',
			'Blue oil is expensive because fear made it necessary.',
			'Free people buy more bread than frightened ones.'
		]
	},
	hoodedVillager: {
		key: 'hoodedVillager',
		displayName: 'Hooded Villager',
		faction: 'mulberry',
		role: 'Secret sympathizer, rumor broker, and moral pressure.',
		startingTrust: 1,
		arc: 'They push Chatty past snack sized rebellion and keep asking what freedom must refuse to become.',
		beats: [
			'The hooded villager recognizes the cloak as a question.',
			'The hooded villager explains that silence helped the ledger last.',
			'The hooded villager turns rumor into a moral test.',
			'The hooded villager challenges Chatty not to rescue goblins as trophies.',
			'The hooded villager warns that banners can gather anger and hunger.',
			'The hooded villager recruits frightened townsfolk with direct shame.',
			'The hooded villager names conquest as the fight against fear.',
			'The hooded villager repeats the phrase and makes the crowd answer.'
		],
		voice: [
			'That hood means wizard, thief, or weather problem. Choose carefully.',
			'If silence were innocent, it would not hide so well.',
			'If you free them, do it quietly. If not quietly, do it memorably.',
			'Do not collect people like proof. Ask what they want.',
			'A banner tells frightened people where to run and angry people where to gather.',
			'Neutrality is just fear wearing clean boots.',
			'Conquer fear first. Anything else starts smelling like crown law.',
			'Say it again so the square cannot pretend it misheard.'
		]
	},
	forestWanderer: {
		key: 'forestWanderer',
		displayName: 'Forest Wanderer',
		faction: 'mulberry',
		role: 'Pathfinder, hidden camp guide, and danger witness.',
		startingTrust: 0,
		arc: 'The wanderer knows where paths end, then chooses to make paths that old law cannot follow.',
		beats: [
			'The wanderer says lanterns stop where honest paths become useful.',
			'The wanderer remembers ledger riders entering the woods.',
			'The wanderer guides Chatty through bramble pressure.',
			'The wanderer finds root tucked goblins and stays to watch the hounds.',
			'The wanderer gathers blackroot ink from places that dislike visitors.',
			'The wanderer scouts patrol waves and returns with scratches.',
			'The wanderer marks under road turns with harmless lies.',
			'The wanderer opens the dawn road for anyone done hiding.'
		],
		voice: [
			'Lanterns end where the honest path ends. Try there.',
			'I saw ledger riders and even the birds held their tongues.',
			'Bramble crawlers own the road until someone disagrees.',
			'Roots can hide goblins, but roots cannot promise tomorrow.',
			'Blackroot ink stains hands and intentions.',
			'Three patrol waves. Four if fear learns to count.',
			'Follow the wrong mark twice, then the right one appears.',
			'Dawn has more roads than the crown remembers.'
		]
	},
	lanternKeeper: {
		key: 'lanternKeeper',
		displayName: 'Lantern Keeper',
		faction: 'mulberry',
		role: 'Keeper of light, secrecy, routes, and under road courage.',
		startingTrust: 0,
		arc: 'The keeper begins hiding routes inside lamp work and ends lighting the path openly.',
		beats: [
			'The keeper notices the cloak in lamplight and pretends not to.',
			'The keeper reveals blue oil can hide a trail.',
			'The keeper teaches how to read shadows that are not loyal to the crown.',
			'The keeper masks the hidden goblin escort with lamp smoke.',
			'The keeper gives lantern glass for the banner signal.',
			'The keeper turns market lamps into warning drums of light.',
			'The keeper leads Chatty below with a lamp that refuses ledger dark.',
			'The keeper lights the square and makes hiding unnecessary.'
		],
		voice: [
			'Light can betray or protect. Depends who trims the wick.',
			'The lamps can hide a trail if you feed them blue oil.',
			'Some shadows work for fear. Some are just tired.',
			'Walk when the lamp coughs and stop when it sings.',
			'Lantern glass catches courage better after it breaks once.',
			'When the market lamps blink twice, run toward the banner.',
			'Take a lamp. Darkness lies better when no one can see its face.',
			'Today the lights stay on because hiding has retired.'
		]
	},
	stoneGuard: {
		key: 'stoneGuard',
		displayName: 'Stone Guard',
		faction: 'mulberry',
		role: 'Law bound skeptic who becomes a defensive ally.',
		startingTrust: -1,
		arc: 'The guard trusts stone and rules, then learns the small fool with a banner is worth guarding.',
		beats: [
			'The guard warns Chatty not to mistake movement for permission.',
			'The guard calls the ledger old law and hates how that sounds.',
			'The guard remembers armory locks and refuses to enjoy helping.',
			'The guard blocks hounds from hidden goblins while denying sentiment.',
			'The guard names the armory key rules and looks away at the right second.',
			'The guard chooses the market line over the courthouse line.',
			'The guard waits at the sealed door with a spear and one feeling.',
			'The guard grants one speech and pretends it is procedure.'
		],
		voice: [
			'Roads have rules, even when goblins have dramatic fabric.',
			'Old law is still law, which is sometimes the problem.',
			'The armory lock respects keys, force, and embarrassing persistence.',
			'I guard stone. Today, I suppose, I guard the small fool with the banner.',
			'If a key falls near your feet, I saw nothing with great discipline.',
			'The courthouse can guard itself. The road cannot.',
			'If you do not return, I will deny being emotionally invested.',
			'The square is yours for one speech. Make it short enough to survive.'
		]
	},
	hiddenGoblinOne: {
		key: 'hiddenGoblinOne',
		displayName: 'Hidden Goblin Pip',
		faction: 'goblins',
		role: 'Fearful scout who trusts proof before prophecy.',
		startingTrust: -2,
		arc: 'Pip starts suspicious, tests Chatty, then becomes a watch captain for goblins who hate titles.',
		beats: [
			'Pip asks if Chatty is tax because all trouble arrives upright.',
			'Pip remembers names taken before snacks could be packed.',
			'Pip follows from a distance and counts exits.',
			'Pip repeats the phrase only after Chatty stops performing rescue.',
			'Pip bites the banner corner and calls it standards work.',
			'Pip warns of hounds before the road defense.',
			'Pip hears the First Name return like a stomach growl.',
			'Pip stands in the square and asks for tomorrow with a hat.'
		],
		voice: [
			'Are you tax? You have tax posture.',
			'My name got written down and my feet started running.',
			'I follow because trusting is heavy and I am small.',
			'Small does not mean owned. Say it like you know the cost.',
			'The banner is ugly. That is how I know it is ours.',
			'Hounds coming. I smelled law breath.',
			'My name came back and now my bones weigh more.',
			'If we are free now, I would like a hat.'
		]
	},
	hiddenGoblinTwo: {
		key: 'hiddenGoblinTwo',
		displayName: 'Hidden Goblin Muck',
		faction: 'goblins',
		role: 'Comic skeptic who becomes loyal because loyalty can still complain.',
		startingTrust: -1,
		arc: 'Muck mocks Chatty, then treats mockery as a sacred duty inside the movement.',
		beats: [
			'Muck says chosen ones are usually taller and less damp.',
			'Muck steals snacks for morale and denies politics.',
			'Muck guides Chatty to the tucked away camp through insulting landmarks.',
			'Muck demands freedom include the right to complain.',
			'Muck ties knots in the banner and names each knot after an enemy.',
			'Muck fights pantry slime because it insulted the cloak first.',
			'Muck carries a stolen ledger page as proof that paper can lose.',
			'Muck starts a chant too early and somehow makes it work.'
		],
		voice: [
			'Chosen ones are usually taller in songs.',
			'I stole snacks for morale, which is basically government.',
			'Turn left at the stump that looks judgmental.',
			'Freedom must include complaining or it is just chores.',
			'This knot is for tax. This knot is for wet boots.',
			'Pantry slime, release the cloak or face municipal violence.',
			'Paper loses when small hands stop treating it like weather.',
			'I started the chant because silence was taking too long.'
		]
	},
	hiddenGoblinThree: {
		key: 'hiddenGoblinThree',
		displayName: 'Hidden Goblin Nib',
		faction: 'goblins',
		role: 'Gentle believer who asks what freedom should build after it bites.',
		startingTrust: -1,
		arc: 'Nib wants rescue but fears revenge, then helps define conquest as ending fear.',
		beats: [
			'Nib asks Chatty to blink twice and stop looking rescue shaped.',
			'Nib remembers lullabies changed into counting debts.',
			'Nib asks whether liberated goblins must become an army.',
			'Nib helps write the Goblin Freedom List as a promise.',
			'Nib stitches the banner edge with names instead of orders.',
			'Nib keeps children behind the market stones during the waves.',
			'Nib says the First Name sounds like a door opening.',
			'Nib repeats that freedom is not permission from old fear.'
		],
		voice: [
			'If you are here to rescue us, blink twice and stop looking so rescue shaped.',
			'They turned our lullabies into numbers. I still hum wrong on purpose.',
			'If we become an army, who reminds us to become people too?',
			'Make the new list a promise, not a leash.',
			'I stitch names where orders used to fit.',
			'Children behind stones. Hope in front, unfortunately.',
			'The First Name sounds like a door that remembered its hinge.',
			'Freedom is not permission. It is us standing without asking.'
		]
	}
}

const ACTOR_DIALOG_KEYS = {
	BARTENDER: 'bartender',
	MAYOR_LEONARD: 'mayor',
	DWARF_BILI: 'dwarf',
	MARKET_TRADER: 'marketTrader',
	HOODED_VILLAGER: 'hoodedVillager',
	FOREST_WANDERER: 'forestWanderer',
	LANTERN_KEEPER: 'lanternKeeper',
	STONE_GUARD: 'stoneGuard',
	HIDDEN_GOBLIN_ONE: 'hiddenGoblinOne',
	HIDDEN_GOBLIN_TWO: 'hiddenGoblinTwo',
	HIDDEN_GOBLIN_THREE: 'hiddenGoblinThree'
}

const SPRITE_KEYS = {
	bartender: 'bartender',
	mayor: 'mayor',
	dwarf: 'dwarf',
	marketTrader: 'marketTrader',
	hoodedVillager: 'hoodedVillager',
	forestWanderer: 'forestWanderer',
	lanternKeeper: 'lanternKeeper',
	stoneGuard: 'stoneGuard'
}

const NPC_IDENTITY_META = {
	mayor: {
		homeZone: 'mayor-house',
		combatRole: 'witness',
		combatAction: 'rally'
	},
	bartender: {
		homeZone: 'tavern',
		combatRole: 'resistance-hub',
		combatAction: 'supply'
	},
	dwarf: {
		homeZone: 'market-road',
		combatRole: 'tactician',
		combatAction: 'reveal'
	},
	marketTrader: {
		homeZone: 'market',
		combatRole: 'supplier',
		combatAction: 'supply'
	},
	hoodedVillager: {
		homeZone: 'town-square',
		combatRole: 'agitator',
		combatAction: 'rally'
	},
	forestWanderer: {
		homeZone: 'forest-edge',
		combatRole: 'pathfinder',
		combatAction: 'distract'
	},
	lanternKeeper: {
		homeZone: 'under-road',
		combatRole: 'light-bearer',
		combatAction: 'reveal'
	},
	stoneGuard: {
		homeZone: 'armory',
		combatRole: 'defender',
		combatAction: 'block'
	},
	hiddenGoblinOne: {
		homeZone: 'hidden-camp',
		combatRole: 'scout',
		combatAction: 'warn'
	},
	hiddenGoblinTwo: {
		homeZone: 'hidden-camp',
		combatRole: 'skirmisher',
		combatAction: 'distract'
	},
	hiddenGoblinThree: {
		homeZone: 'hidden-camp',
		combatRole: 'keeper',
		combatAction: 'rally'
	}
}

function createDefaultRelationships(input = {}) {
	return Object.fromEntries(
		Object.entries(CHARACTER_ARCS).map(([key, character]) => {
			const existing = input[key] && typeof input[key] === 'object' ? input[key] : {}
			return [
				key,
				{
					trust: Number.isFinite(existing.trust) ? existing.trust : character.startingTrust,
					suspicion: Number.isFinite(existing.suspicion) ? existing.suspicion : Math.max(0, -character.startingTrust),
					talks: Number.isInteger(existing.talks) ? existing.talks : 0,
					lastTurn: Number.isInteger(existing.lastTurn) ? existing.lastTurn : null,
					stance: existing.stance || (character.startingTrust > 0 ? 'warm' : character.startingTrust < 0 ? 'guarded' : 'unmet')
				}
			]
		})
	)
}

function getActorStoryKey(actor = {}) {
	if (actor.storyKey && CHARACTER_ARCS[actor.storyKey]) return actor.storyKey
	if (actor.dialog && ACTOR_DIALOG_KEYS[actor.dialog]) return ACTOR_DIALOG_KEYS[actor.dialog]
	if (actor.spriteKey && SPRITE_KEYS[actor.spriteKey]) return SPRITE_KEYS[actor.spriteKey]
	const name = String(actor.name || '').toLowerCase()
	if (name.includes('bartender') || name === 'bar') return 'bartender'
	if (name.includes('mayor') || name.includes('leonard')) return 'mayor'
	if (name.includes('bili') || name.includes('dwarf')) return 'dwarf'
	if (name.includes('market') || name.includes('trader')) return 'marketTrader'
	if (name.includes('hood')) return 'hoodedVillager'
	if (name.includes('forest') || name.includes('wander')) return 'forestWanderer'
	if (name.includes('lantern')) return 'lanternKeeper'
	if (name.includes('guard')) return 'stoneGuard'
	if (name.includes('pip')) return 'hiddenGoblinOne'
	if (name.includes('muck')) return 'hiddenGoblinTwo'
	if (name.includes('nib')) return 'hiddenGoblinThree'
	if (name.includes('goblin')) return 'hiddenGoblinOne'
	return 'hoodedVillager'
}

function getCharacter(key) {
	return CHARACTER_ARCS[key] || CHARACTER_ARCS.hoodedVillager
}

function getNpcIdentityForActor(actor = {}) {
	const storyKey = getActorStoryKey(actor)
	const character = getCharacter(storyKey)
	const meta = NPC_IDENTITY_META[storyKey] || NPC_IDENTITY_META.hoodedVillager
	return {
		storyKey,
		displayName: character.displayName,
		faction: character.faction,
		role: character.role,
		homeZone: meta.homeZone,
		combatRole: meta.combatRole,
		combatAction: meta.combatAction
	}
}

module.exports = {
	CHARACTER_ARCS,
	FACTIONS,
	createDefaultRelationships,
	getActorStoryKey,
	getCharacter,
	getNpcIdentityForActor
}
