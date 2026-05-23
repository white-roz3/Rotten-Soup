const AUTHORED_SCENE_SCRIPTS = {
	'phase-1-test-body': {
		id: 'phase-1-test-body',
		participants: ['chatty', 'bartender'],
		beats: [
			{
				speaker: 'bartender',
				line: 'Bartender: Chatty, take three steps and do not trust the fourth until it proves itself.',
				chatty: 'Chatty: Got it. I will test the body carefully.'
			}
		]
	},
	'phase-1-learn-name': {
		id: 'phase-1-learn-name',
		participants: ['chatty', 'mayor'],
		beats: [
			{
				speaker: 'mayor',
				line: 'Mayor Leonard: Chatty, the wall wrote your name before you had the courtesy to arrive.',
				chatty: 'Chatty: I understand. I need to find out why it knows my name.',
				unlocks: ['fact:chattyNamed']
			}
		]
	},
	'phase-1-reach-town': {
		id: 'phase-1-reach-town',
		participants: ['chatty', 'stoneGuard'],
		beats: [
			{
				speaker: 'stoneGuard',
				line: 'Stone Guard: Chatty, tavern first if you need truth warm, mayor first if you need truth guilty.',
				chatty: 'Chatty: Got it. I will start at the tavern, then ask the mayor.'
			}
		]
	},
	'phase-1-inspect-well': {
		id: 'phase-1-inspect-well',
		participants: ['chatty', 'hoodedVillager'],
		beats: [
			{
				speaker: 'hoodedVillager',
				line: 'Hooded Villager: Chatty, the well repeats names at night. Listen at the rim, never inside it.',
				chatty: 'Chatty: I understand. I will listen from the edge and keep clear.'
			}
		]
	},
	'phase-1-find-snack-law': {
		id: 'phase-1-find-snack-law',
		participants: ['chatty', 'bartender'],
		beats: [
			{
				speaker: 'bartender',
				line: 'Bartender: Chatty, first town rule. If the snack is unattended, ask why it was brave enough to be alone.',
				chatty: 'Chatty: Understood. I will ask who left it before I touch anything.'
			}
		]
	},
	'phase-1-choose-first-goal': {
		id: 'phase-1-choose-first-goal',
		participants: ['chatty', 'mayor'],
		beats: [
			{
				speaker: 'mayor',
				line: 'Mayor Leonard: Chatty, choose a goal small enough to survive and loud enough to matter.',
				chatty: 'Chatty: I understand. I will choose something useful and realistic.'
			}
		]
	},
	'phase-2-inspect-town': {
		id: 'phase-2-inspect-town',
		participants: ['chatty', 'marketTrader'],
		beats: [
			{
				speaker: 'marketTrader',
				line: 'Market Trader: Chatty, taverns keep rumors, markets keep receipts, and storage rooms keep crimes with dust on them.',
				chatty: 'Chatty: Okay. I will look for proof.'
			}
		]
	},
	'phase-2-hidden-goblins': {
		id: 'phase-2-hidden-goblins',
		participants: ['chatty', 'hoodedVillager'],
		beats: [
			{
				speaker: 'hoodedVillager',
				line: 'Hooded Villager: Chatty, some goblins live behind ordinary doors because ordinary fear is cheaper than locks.',
				chatty: 'Chatty: I agree. I will look for proof.'
			}
		]
	},
	'phase-2-mark-names': {
		id: 'phase-2-mark-names',
		participants: ['chatty', 'mayor'],
		beats: [
			{
				speaker: 'mayor',
				line: 'Mayor Leonard: Chatty, do not copy the ledger like a clerk. Mark each name like a person coming home.',
				chatty: 'Chatty: Understood. I will look for proof.'
			}
		]
	},
	'phase-2-challenge-paper-law': {
		id: 'phase-2-challenge-paper-law',
		participants: ['chatty', 'dwarf'],
		beats: [
			{
				speaker: 'dwarf',
				line: 'Dwarf Bili: Chatty, paper law hates being mocked where people can hear it.',
				chatty: 'Chatty: Right. I will look for proof.'
			}
		]
	},
	'phase-2-hide-ledger-copy': {
		id: 'phase-2-hide-ledger-copy',
		participants: ['chatty', 'lanternKeeper'],
		beats: [
			{
				speaker: 'lanternKeeper',
				line: 'Lantern Keeper: Chatty, hide the copy where lamp smoke stains the ceiling. Truth survives better with witnesses.',
				chatty: 'Chatty: I can do that. I will look for proof.'
			}
		]
	},
	'phase-3-three-villagers': {
		id: 'phase-3-three-villagers',
		participants: ['chatty', 'forestWanderer'],
		beats: [
			{
				speaker: 'forestWanderer',
				line: 'Forest Wanderer: Chatty, speak to three people who avoid the same road. Fear leaves matching footprints.',
				chatty: 'Chatty: I will remember. I will look for proof.'
			}
		]
	},
	'phase-3-dwarf-charm': {
		id: 'phase-3-dwarf-charm',
		participants: ['chatty', 'dwarf'],
		beats: [
			{
				speaker: 'dwarf',
				line: 'Dwarf Bili: Chatty, my charm was stolen because I pretended the last goblin plea was not my business.',
				chatty: 'Chatty: I understand. I will talk to them first.'
			}
		]
	},
	'phase-3-bramble-crawlers': {
		id: 'phase-3-bramble-crawlers',
		participants: ['chatty', 'forestWanderer'],
		beats: [
			{
				speaker: 'forestWanderer',
				line: 'Forest Wanderer: Chatty, bramble crawlers listen through roots. Step wide, inspect first, strike when the vines tense.',
				chatty: 'Chatty: Got it. I will talk to them first.'
			}
		]
	},
	'phase-3-freedom-task': {
		id: 'phase-3-freedom-task',
		participants: ['chatty', 'hoodedVillager'],
		beats: [
			{
				speaker: 'hoodedVillager',
				line: 'Hooded Villager: Chatty, finding hidden goblins is not rescue until they choose to follow.',
				chatty: 'Chatty: That makes sense. I will talk to them first.'
			}
		]
	},
	'phase-3-recruit-pathfinder': {
		id: 'phase-3-recruit-pathfinder',
		participants: ['chatty', 'forestWanderer'],
		beats: [
			{
				speaker: 'forestWanderer',
				line: 'Forest Wanderer: Chatty, I can guide the path, but you decide what your footsteps promise.',
				chatty: 'Chatty: I hear you. I will talk to them first.',
				unlocks: ['ally-forestWanderer']
			}
		]
	},
	'phase-3-confront-revenge-question': {
		id: 'phase-3-confront-revenge-question',
		participants: ['chatty', 'hoodedVillager'],
		beats: [
			{
				speaker: 'hoodedVillager',
				line: 'Hooded Villager: Chatty, if freedom only changes who holds the stick, it is just revenge wearing a hat.',
				chatty: 'Chatty: Okay. I will talk to them first.'
			}
		]
	},
	'phase-3-save-road-cache': {
		id: 'phase-3-save-road-cache',
		participants: ['chatty', 'marketTrader'],
		beats: [
			{
				speaker: 'marketTrader',
				line: 'Market Trader: Chatty, stash bandages, oil, and dry bread near the bend. Revolutions fail when hungry feet argue.',
				chatty: 'Chatty: I agree. I will talk to them first.'
			}
		]
	},
	'phase-4-find-group-one': {
		id: 'phase-4-find-group-one',
		participants: ['chatty', 'hiddenGoblinOne'],
		beats: [
			{
				speaker: 'hiddenGoblinOne',
				line: 'Hidden Goblin Pip: Chatty, the root shed is not empty. It is full of people practicing being missing.',
				chatty: 'Chatty: Understood. I will talk to them first.'
			}
		]
	},
	'phase-4-find-group-two': {
		id: 'phase-4-find-group-two',
		participants: ['chatty', 'hiddenGoblinTwo'],
		beats: [
			{
				speaker: 'hiddenGoblinTwo',
				line: 'Hidden Goblin Muck: Chatty, ditch door opens only for voices that do not sound like a census.',
				chatty: 'Chatty: Right. I will talk to them first.'
			}
		]
	},
	'phase-4-find-group-three': {
		id: 'phase-4-find-group-three',
		participants: ['chatty', 'hiddenGoblinThree'],
		beats: [
			{
				speaker: 'hiddenGoblinThree',
				line: 'Hidden Goblin Nib: Chatty, lamp smoke marks our roof. Follow the blue stain and do not cough like a guard.',
				chatty: 'Chatty: I can do that. I will talk to them first.'
			}
		]
	},
	'phase-4-say-phrase': {
		id: 'phase-4-say-phrase',
		participants: ['chatty', 'hiddenGoblinOne'],
		beats: [
			{
				speaker: 'hiddenGoblinOne',
				line: 'Hidden Goblin Pip: Chatty, say it plain. We have had enough fancy words with chains inside.',
				chatty: 'Chatty: I will remember. I will talk to them first.'
			}
		]
	},
	'phase-4-crown-hounds': {
		id: 'phase-4-crown-hounds',
		participants: ['chatty', 'stoneGuard'],
		beats: [
			{
				speaker: 'stoneGuard',
				line: 'Stone Guard: Chatty, hounds obey old whistles. Break their line before they reach the hiding doors.',
				chatty: 'Chatty: I understand. I will keep moving toward it.'
			}
		]
	},
	'phase-4-escort-group': {
		id: 'phase-4-escort-group',
		participants: ['chatty', 'hiddenGoblinTwo'],
		beats: [
			{
				speaker: 'hiddenGoblinTwo',
				line: 'Hidden Goblin Muck: Chatty, if we move, we move slow. Fear packed too many bags.',
				chatty: 'Chatty: Got it. I will keep moving toward it.'
			}
		]
	},
	'phase-4-create-freedom-list': {
		id: 'phase-4-create-freedom-list',
		participants: ['chatty', 'mayor'],
		beats: [
			{
				speaker: 'mayor',
				line: 'Mayor Leonard: Chatty, write the Freedom List as a promise. No debts, no punishments, no ownership hiding in ink.',
				chatty: 'Chatty: That makes sense. I will keep moving toward it.'
			}
		]
	},
	'phase-4-let-goblins-refuse': {
		id: 'phase-4-let-goblins-refuse',
		participants: ['chatty', 'hiddenGoblinThree'],
		beats: [
			{
				speaker: 'hiddenGoblinThree',
				line: 'Hidden Goblin Nib: Chatty, I might not follow. I want freedom that lets me stay angry in one place.',
				chatty: 'Chatty: I hear you. I will keep moving toward it.'
			}
		]
	},
	'phase-5-gather-cloth': {
		id: 'phase-5-gather-cloth',
		participants: ['chatty', 'marketTrader'],
		beats: [
			{
				speaker: 'marketTrader',
				line: 'Market Trader: Chatty, take the green cloth from the rain barrel shelf. It already looks guilty enough for politics.',
				chatty: 'Chatty: Okay. I will keep moving toward it.'
			}
		]
	},
	'phase-5-gather-glass': {
		id: 'phase-5-gather-glass',
		participants: ['chatty', 'lanternKeeper'],
		beats: [
			{
				speaker: 'lanternKeeper',
				line: 'Lantern Keeper: Chatty, use cracked amber glass. It turns one small flame into a crowd signal.',
				chatty: 'Chatty: I agree. I will keep moving toward it.'
			}
		]
	},
	'phase-5-gather-ink': {
		id: 'phase-5-gather-ink',
		participants: ['chatty', 'forestWanderer'],
		beats: [
			{
				speaker: 'forestWanderer',
				line: 'Forest Wanderer: Chatty, blackroot ink grows where the path stays damp. Cut it low and thank nothing.',
				chatty: 'Chatty: Understood. I will keep moving toward it.'
			}
		]
	},
	'phase-5-rebel-toast': {
		id: 'phase-5-rebel-toast',
		participants: ['chatty', 'bartender'],
		beats: [
			{
				speaker: 'bartender',
				line: 'Bartender: Chatty, the toast is this. May every locked door meet someone short enough to be underestimated.',
				chatty: 'Chatty: Right. I will keep moving toward it.'
			}
		]
	},
	'phase-5-armory-route': {
		id: 'phase-5-armory-route',
		participants: ['chatty', 'stoneGuard'],
		beats: [
			{
				speaker: 'stoneGuard',
				line: 'Stone Guard: Chatty, the armory key hangs behind the cracked shield. I am not telling you. I am failing to stop you.',
				chatty: 'Chatty: I can do that. I will keep moving toward it.'
			}
		]
	},
	'phase-5-pantry-slime': {
		id: 'phase-5-pantry-slime',
		participants: ['chatty', 'bartender'],
		beats: [
			{
				speaker: 'bartender',
				line: 'Bartender: Chatty, pantry slime eats flour first and courage second. Keep it away from both.',
				chatty: 'Chatty: I will remember. I will keep moving toward it.'
			}
		]
	},
	'phase-5-armor-scraps': {
		id: 'phase-5-armor-scraps',
		participants: ['chatty', 'dwarf'],
		beats: [
			{
				speaker: 'dwarf',
				line: 'Dwarf Bili: Chatty, armor scraps remember being soldiers. Hit the rusty pride before the metal stands up straight.',
				chatty: 'Chatty: I understand. I will handle the next step.'
			}
		]
	},
	'phase-6-protect-wanderers': {
		id: 'phase-6-protect-wanderers',
		participants: ['chatty', 'forestWanderer'],
		beats: [
			{
				speaker: 'forestWanderer',
				line: 'Forest Wanderer: Chatty, patrols cut off witnesses first. Keep the walkers moving and the story stays alive.',
				chatty: 'Chatty: Got it. I will handle the next step.'
			}
		]
	},
	'phase-6-rally-bartender': {
		id: 'phase-6-rally-bartender',
		participants: ['chatty', 'bartender'],
		beats: [
			{
				speaker: 'bartender',
				line: 'Bartender: Chatty, if I close the tavern, everyone will know I chose a side.',
				chatty: 'Chatty: That makes sense. I will handle the next step.'
			}
		]
	},
	'phase-6-rally-bili': {
		id: 'phase-6-rally-bili',
		participants: ['chatty', 'dwarf'],
		beats: [
			{
				speaker: 'dwarf',
				line: 'Dwarf Bili: Chatty, last time I arrived late. This time I stand where the road can see me.',
				chatty: 'Chatty: I hear you. I will handle the next step.'
			}
		]
	},
	'phase-6-rally-guard': {
		id: 'phase-6-rally-guard',
		participants: ['chatty', 'stoneGuard'],
		beats: [
			{
				speaker: 'stoneGuard',
				line: 'Stone Guard: Chatty, the law says I guard stone. Today the small fool with the banner counts.',
				chatty: 'Chatty: Okay. I will handle the next step.'
			}
		]
	},
	'phase-6-keep-chatty-alive': {
		id: 'phase-6-keep-chatty-alive',
		participants: ['chatty', 'lanternKeeper'],
		beats: [
			{
				speaker: 'lanternKeeper',
				line: 'Lantern Keeper: Chatty, live through the wave first. Dead heroes make tidy symbols and terrible plans.',
				chatty: 'Chatty: I agree. I will handle the next step.'
			}
		]
	},
	'phase-6-count-clean-fights': {
		id: 'phase-6-count-clean-fights',
		participants: ['chatty', 'dwarf'],
		beats: [
			{
				speaker: 'dwarf',
				line: 'Dwarf Bili: Chatty, clean fights mean no wasted blood, no panic swings, and no chasing bait into alleys.',
				chatty: 'Chatty: Understood. I will handle the next step.'
			}
		]
	},
	'phase-6-open-relief-route': {
		id: 'phase-6-open-relief-route',
		participants: ['chatty', 'marketTrader'],
		beats: [
			{
				speaker: 'marketTrader',
				line: 'Market Trader: Chatty, open the back route by the apple crates. Supplies move there when courage blocks the front road.',
				chatty: 'Chatty: Right. I will handle the next step.'
			}
		]
	},
	'phase-7-find-stair': {
		id: 'phase-7-find-stair',
		participants: ['chatty', 'stoneGuard'],
		beats: [
			{
				speaker: 'stoneGuard',
				line: 'Stone Guard: Chatty, the sealed stair is under the oldest lintel. The town paved over guilt, not stone.',
				chatty: 'Chatty: I can do that. I will handle the next step.'
			}
		]
	},
	'phase-7-take-lamp': {
		id: 'phase-7-take-lamp',
		participants: ['chatty', 'lanternKeeper'],
		beats: [
			{
				speaker: 'lanternKeeper',
				line: 'Lantern Keeper: Chatty, this lamp burns blue near lies and green near old names. Do not drop it when it judges us.',
				chatty: 'Chatty: I will remember. I will handle the next step.'
			}
		]
	},
	'phase-7-enter-under-road': {
		id: 'phase-7-enter-under-road',
		participants: ['chatty', 'dwarf'],
		beats: [
			{
				speaker: 'dwarf',
				line: 'Dwarf Bili: Chatty, below town the walls remember before crowns learned spelling. Walk soft and answer nothing twice.',
				chatty: 'Chatty: I understand. I will stay focused.'
			}
		]
	},
	'phase-7-ledger-warden': {
		id: 'phase-7-ledger-warden',
		participants: ['chatty', 'lanternKeeper'],
		beats: [
			{
				speaker: 'lanternKeeper',
				line: 'Lantern Keeper: Chatty, the Warden attacks names before bodies. Keep your name in your mouth and your feet moving.',
				chatty: 'Chatty: Got it. I will stay focused.'
			}
		]
	},
	'phase-7-break-binding-stone': {
		id: 'phase-7-break-binding-stone',
		participants: ['chatty', 'hiddenGoblinTwo'],
		beats: [
			{
				speaker: 'hiddenGoblinTwo',
				line: 'Hidden Goblin Muck: Chatty, strike the stone only after it says a name. That is when the hook shows.',
				chatty: 'Chatty: That makes sense. I will stay focused.'
			}
		]
	},
	'phase-7-hear-names-return': {
		id: 'phase-7-hear-names-return',
		participants: ['chatty', 'hiddenGoblinThree'],
		beats: [
			{
				speaker: 'hiddenGoblinThree',
				line: 'Hidden Goblin Nib: Chatty, I heard my name come back with dirt on it. It still knew me.',
				chatty: 'Chatty: I hear you. I will stay focused.'
			}
		]
	},
	'phase-7-refuse-ledger-crown': {
		id: 'phase-7-refuse-ledger-crown',
		participants: ['chatty', 'hoodedVillager'],
		beats: [
			{
				speaker: 'hoodedVillager',
				line: 'Hooded Villager: Chatty, the ledger crown will offer order. It will mean obedience with your face on it.',
				chatty: 'Chatty: Okay. I will stay focused.'
			}
		]
	},
	'phase-8-return-square': {
		id: 'phase-8-return-square',
		participants: ['chatty', 'mayor'],
		beats: [
			{
				speaker: 'mayor',
				line: 'Mayor Leonard: Chatty, bring the First Name to the square. Let the town see what it helped steal.',
				chatty: 'Chatty: I agree. I will stay focused.'
			}
		]
	},
	'phase-8-rally-goblins': {
		id: 'phase-8-rally-goblins',
		participants: ['chatty', 'hiddenGoblinOne'],
		beats: [
			{
				speaker: 'hiddenGoblinOne',
				line: 'Hidden Goblin Pip: Chatty, say the phrase again. Some of us still flinch when freedom sounds too tall.',
				chatty: 'Chatty: Understood. I will stay focused.'
			}
		]
	},
	'phase-8-rally-townsfolk': {
		id: 'phase-8-rally-townsfolk',
		participants: ['chatty', 'marketTrader'],
		beats: [
			{
				speaker: 'marketTrader',
				line: 'Market Trader: Chatty, townsfolk need a practical reason to be brave. I brought supplies where everyone can see them.',
				chatty: 'Chatty: Right. I will stay focused.'
			}
		]
	},
	'phase-8-crown-remnant': {
		id: 'phase-8-crown-remnant',
		participants: ['chatty', 'stoneGuard'],
		beats: [
			{
				speaker: 'stoneGuard',
				line: 'Stone Guard: Chatty, the Remnant wants knees and silence. Give it neither.',
				chatty: 'Chatty: I can do that. I will stay focused.'
			}
		]
	},
	'phase-8-speak-proclamation': {
		id: 'phase-8-speak-proclamation',
		participants: ['chatty', 'hoodedVillager'],
		beats: [
			{
				speaker: 'hoodedVillager',
				line: 'Hooded Villager: Chatty, speak the conquest plainly so nobody can twist it into ownership.',
				chatty: 'Chatty: I will remember. I will stay focused.'
			}
		]
	},
	'phase-8-set-next-goal': {
		id: 'phase-8-set-next-goal',
		participants: ['chatty', 'forestWanderer'],
		beats: [
			{
				speaker: 'forestWanderer',
				line: 'Forest Wanderer: Chatty, dawn opens roads the town forgot. Choose one before fear chooses staying still.',
				chatty: 'Chatty: I understand. I will find out what happened.'
			}
		]
	},
	'phase-8-avoid-tyrant-choice': {
		id: 'phase-8-avoid-tyrant-choice',
		participants: ['chatty', 'mayor'],
		beats: [
			{
				speaker: 'mayor',
				line: 'Mayor Leonard: Chatty, after victory, people will hand you power because fear likes familiar shapes.',
				chatty: 'Chatty: Got it. I will find out what happened.'
			}
		]
	},
	'phase-8-open-roads': {
		id: 'phase-8-open-roads',
		participants: ['chatty', 'lanternKeeper'],
		beats: [
			{
				speaker: 'lanternKeeper',
				line: 'Lantern Keeper: Chatty, I will light the dawn roads. You make sure nobody calls the light a border.',
				chatty: 'Chatty: That makes sense. I will find out what happened.'
			}
		]
	}
}

const SCRIPT_FOLLOW_UP_BEATS = {
	'phase-1-test-body': [
		{
			speaker: 'bartender',
			line: 'Bartender: Chatty, if a step fails, stop, look down, and choose another tile. Prophecy still has to respect floors.',
			chatty: 'Chatty: I hear you. I will find out what happened.'
		}
	],
	'phase-1-learn-name': [
		{
			speaker: 'mayor',
			line: 'Mayor Leonard: Chatty, a name spoken by a wall is not a crown. Ask who benefits before you obey it.',
			chatty: 'Chatty: Okay. I will find out what happened.'
		}
	],
	'phase-1-reach-town': [
		{
			speaker: 'stoneGuard',
			line: 'Stone Guard: Chatty, take the road between the signs. If anyone calls that suspicious, tell them I was professionally tired.',
			chatty: 'Chatty: I agree. I will find out what happened.'
		}
	],
	'phase-1-inspect-well': [
		{
			speaker: 'hoodedVillager',
			line: 'Hooded Villager: Chatty, if the well says a name twice, answer nothing. Repetition is how old magic measures fear.',
			chatty: 'Chatty: Understood. I will find out what happened.'
		}
	],
	'phase-1-find-snack-law': [
		{
			speaker: 'bartender',
			line: 'Bartender: Chatty, second snack rule. If Mayor Leonard wrote the warning, the snack survived politics and deserves respect.',
			chatty: 'Chatty: Right. I will find out what happened.'
		}
	],
	'phase-1-choose-first-goal': [
		{
			speaker: 'mayor',
			line: 'Mayor Leonard: Chatty, your first goal should leave proof behind. A witness, a mark, a rescued crumb, anything real.',
			chatty: 'Chatty: I can do that. I will find out what happened.'
		}
	],
	'phase-2-inspect-town': [
		{
			speaker: 'marketTrader',
			line: 'Market Trader: Chatty, start where people forgot to lie neatly. Check the bar shelf, the back market crate, then the old store room.',
			chatty: 'Chatty: I will remember. I will find out what happened.'
		}
	],
	'phase-2-hidden-goblins': [
		{
			speaker: 'hoodedVillager',
			line: 'Hooded Villager: Chatty, do not shout rescue at a hiding place. Knock softly and let the hidden decide the speed of trust.',
			chatty: 'Chatty: I understand. I will come back if I learn more.'
		}
	],
	'phase-2-mark-names': [
		{
			speaker: 'mayor',
			line: 'Mayor Leonard: Chatty, mark names beside where each person might return. A list without a road is just another trap.',
			chatty: 'Chatty: Got it. I will come back if I learn more.'
		}
	],
	'phase-2-challenge-paper-law': [
		{
			speaker: 'dwarf',
			line: 'Dwarf Bili: Chatty, mock the law after you know its hinge. Break the hinge, then make the joke public.',
			chatty: 'Chatty: That makes sense. I will come back if I learn more.'
		}
	],
	'phase-2-hide-ledger-copy': [
		{
			speaker: 'lanternKeeper',
			line: 'Lantern Keeper: Chatty, if one copy burns, the second copy should already be annoying someone honest.',
			chatty: 'Chatty: I hear you. I will come back if I learn more.'
		}
	],
	'phase-3-three-villagers': [
		{
			speaker: 'forestWanderer',
			line: 'Forest Wanderer: Chatty, ask each wanderer what they avoid. The same answer from three mouths becomes a trail.',
			chatty: 'Chatty: Okay. I will come back if I learn more.'
		}
	],
	'phase-3-dwarf-charm': [
		{
			speaker: 'dwarf',
			line: 'Dwarf Bili: Chatty, the charm is under the broken cart, unless shame moved it. Shame is quick when nobody looks.',
			chatty: 'Chatty: I agree. I will come back if I learn more.'
		}
	],
	'phase-3-bramble-crawlers': [
		{
			speaker: 'forestWanderer',
			line: 'Forest Wanderer: Chatty, if the bramble leans before you step, it is already hunting. Move aside, then strike the root knot.',
			chatty: 'Chatty: Understood. I will come back if I learn more.'
		}
	],
	'phase-3-freedom-task': [
		{
			speaker: 'hoodedVillager',
			line: 'Hooded Villager: Chatty, your task is not to collect goblins. It is to make return feel less dangerous than hiding.',
			chatty: 'Chatty: Right. I will come back if I learn more.'
		}
	],
	'phase-3-recruit-pathfinder': [
		{
			speaker: 'forestWanderer',
			line: 'Forest Wanderer: Chatty, if I guide you, you listen when the moss says turn. It has better memory than pride.',
			chatty: 'Chatty: I can do that. I will come back if I learn more.'
		}
	],
	'phase-3-confront-revenge-question': [
		{
			speaker: 'hoodedVillager',
			line: 'Hooded Villager: Chatty, when people cheer you, ask what they expect you to hurt. That answer matters.',
			chatty: 'Chatty: I will remember. I will come back if I learn more.'
		}
	],
	'phase-3-save-road-cache': [
		{
			speaker: 'marketTrader',
			line: 'Market Trader: Chatty, hide supplies where frightened people naturally pause, not where brave people pose.',
			chatty: 'Chatty: I understand. I will make sure this helps someone.'
		}
	],
	'phase-4-find-group-one': [
		{
			speaker: 'hiddenGoblinOne',
			line: 'Hidden Goblin Pip: Chatty, if you step on the loose board, we run. If you avoid it, we might believe your eyes work.',
			chatty: 'Chatty: Got it. I will make sure this helps someone.'
		}
	],
	'phase-4-find-group-two': [
		{
			speaker: 'hiddenGoblinTwo',
			line: 'Hidden Goblin Muck: Chatty, bring no guard voice, no mayor voice, and no heroic shouting. Bring a joke with a door in it.',
			chatty: 'Chatty: That makes sense. I will make sure this helps someone.'
		}
	],
	'phase-4-find-group-three': [
		{
			speaker: 'hiddenGoblinThree',
			line: 'Hidden Goblin Nib: Chatty, the blue smoke fades if watched by strangers. Walk past once, then return like you forgot something.',
			chatty: 'Chatty: I hear you. I will make sure this helps someone.'
		}
	],
	'phase-4-say-phrase': [
		{
			speaker: 'hiddenGoblinOne',
			line: 'Hidden Goblin Pip: Chatty, say it again after we answer. Some truths need to hear themselves survive a room.',
			chatty: 'Chatty: Okay. I will make sure this helps someone.'
		}
	],
	'phase-4-crown-hounds': [
		{
			speaker: 'stoneGuard',
			line: 'Stone Guard: Chatty, hounds turn wide before they bite. Hold the corner and make their training expensive.',
			chatty: 'Chatty: I agree. I will make sure this helps someone.'
		}
	],
	'phase-4-escort-group': [
		{
			speaker: 'hiddenGoblinTwo',
			line: 'Hidden Goblin Muck: Chatty, if one of us freezes, do not drag. Stand beside us until the road stops looking hungry.',
			chatty: 'Chatty: Understood. I will make sure this helps someone.'
		}
	],
	'phase-4-create-freedom-list': [
		{
			speaker: 'mayor',
			line: 'Mayor Leonard: Chatty, leave blank spaces on the list. Freedom must have room for names we have not earned yet.',
			chatty: 'Chatty: Right. I will make sure this helps someone.'
		}
	],
	'phase-4-let-goblins-refuse': [
		{
			speaker: 'hiddenGoblinThree',
			line: 'Hidden Goblin Nib: Chatty, if your freedom survives my no, I might trust your yes later.',
			chatty: 'Chatty: I can do that. I will make sure this helps someone.'
		}
	],
	'phase-5-gather-cloth': [
		{
			speaker: 'marketTrader',
			line: 'Market Trader: Chatty, do not take the fancy cloth. Fancy cloth attracts speeches. Take the sturdy one that survives weather.',
			chatty: 'Chatty: I will remember. I will make sure this helps someone.'
		}
	],
	'phase-5-gather-glass': [
		{
			speaker: 'lanternKeeper',
			line: 'Lantern Keeper: Chatty, wrap the glass in cloth before you run. A signal that cuts your hand teaches the wrong lesson.',
			chatty: 'Chatty: I understand. I will take this seriously.'
		}
	],
	'phase-5-gather-ink': [
		{
			speaker: 'forestWanderer',
			line: 'Forest Wanderer: Chatty, blackroot stains deeper if you ask nicely. Luckily, roots respect knives more than manners.',
			chatty: 'Chatty: Got it. I will take this seriously.'
		}
	],
	'phase-5-rebel-toast': [
		{
			speaker: 'bartender',
			line: 'Bartender: Chatty, repeat the toast only when someone scared can hear it. Brave people already clap too loudly.',
			chatty: 'Chatty: That makes sense. I will take this seriously.'
		}
	],
	'phase-5-armory-route': [
		{
			speaker: 'stoneGuard',
			line: 'Stone Guard: Chatty, once inside, take shields before blades. A rebellion that survives can always sharpen things later.',
			chatty: 'Chatty: I hear you. I will take this seriously.'
		}
	],
	'phase-5-pantry-slime': [
		{
			speaker: 'bartender',
			line: 'Bartender: Chatty, slime splits when poked badly. Hit the jar shelf and make the salt do honest work.',
			chatty: 'Chatty: Okay. I will take this seriously.'
		}
	],
	'phase-5-armor-scraps': [
		{
			speaker: 'dwarf',
			line: 'Dwarf Bili: Chatty, armor scraps hate magnets, loud insults, and being remembered as spare parts.',
			chatty: 'Chatty: I agree. I will take this seriously.'
		}
	],
	'phase-6-protect-wanderers': [
		{
			speaker: 'forestWanderer',
			line: 'Forest Wanderer: Chatty, keep the witnesses between lanterns. Darkness is where patrols edit stories.',
			chatty: 'Chatty: Understood. I will take this seriously.'
		}
	],
	'phase-6-rally-bartender': [
		{
			speaker: 'bartender',
			line: 'Bartender: Chatty, if the tavern closes, I can feed fighters through the back window and call it ventilation.',
			chatty: 'Chatty: Right. I will take this seriously.'
		}
	],
	'phase-6-rally-bili': [
		{
			speaker: 'dwarf',
			line: 'Dwarf Bili: Chatty, do not thank me yet. Make me useful first, then unbearable later.',
			chatty: 'Chatty: I can do that. I will take this seriously.'
		}
	],
	'phase-6-rally-guard': [
		{
			speaker: 'stoneGuard',
			line: 'Stone Guard: Chatty, if I stand with you, the square will see permission crack. Use that crack.',
			chatty: 'Chatty: I will remember. I will take this seriously.'
		}
	],
	'phase-6-keep-chatty-alive': [
		{
			speaker: 'lanternKeeper',
			line: 'Lantern Keeper: Chatty, retreat is not shame if it keeps the lamp moving. Dead courage casts no light.',
			chatty: 'Chatty: I understand. I will keep it simple and do the work.'
		}
	],
	'phase-6-count-clean-fights': [
		{
			speaker: 'dwarf',
			line: 'Dwarf Bili: Chatty, inspect the first wave, punish the second, save strength for the third. Panic spends too fast.',
			chatty: 'Chatty: Got it. I will keep it simple and do the work.'
		}
	],
	'phase-6-open-relief-route': [
		{
			speaker: 'marketTrader',
			line: 'Market Trader: Chatty, once the back route opens, move bandages before banners. People forgive ugly symbols. Wounds do not.',
			chatty: 'Chatty: That makes sense. I will keep it simple and do the work.'
		}
	],
	'phase-7-find-stair': [
		{
			speaker: 'stoneGuard',
			line: 'Stone Guard: Chatty, the lintel stone has three nail marks. Press the middle one and step back like you respect consequences.',
			chatty: 'Chatty: I hear you. I will keep it simple and do the work.'
		}
	],
	'phase-7-take-lamp': [
		{
			speaker: 'lanternKeeper',
			line: 'Lantern Keeper: Chatty, when the lamp turns white, someone nearby is telling the truth by accident.',
			chatty: 'Chatty: Okay. I will keep it simple and do the work.'
		}
	],
	'phase-7-enter-under-road': [
		{
			speaker: 'dwarf',
			line: 'Dwarf Bili: Chatty, count turns underground by breath, not bravery. Bravery lies when ceilings get low.',
			chatty: 'Chatty: I agree. I will keep it simple and do the work.'
		}
	],
	'phase-7-ledger-warden': [
		{
			speaker: 'lanternKeeper',
			line: 'Lantern Keeper: Chatty, if the Warden recites a debt, answer with a name. Names weigh more than numbers down there.',
			chatty: 'Chatty: Understood. I will keep it simple and do the work.'
		}
	],
	'phase-7-break-binding-stone': [
		{
			speaker: 'hiddenGoblinTwo',
			line: 'Hidden Goblin Muck: Chatty, after the stone cracks, do not cheer first. Listen for who can breathe again.',
			chatty: 'Chatty: Right. I will keep it simple and do the work.'
		}
	],
	'phase-7-hear-names-return': [
		{
			speaker: 'hiddenGoblinThree',
			line: 'Hidden Goblin Nib: Chatty, when a name returns, it comes back shy. Do not make it perform.',
			chatty: 'Chatty: I can do that. I will keep it simple and do the work.'
		}
	],
	'phase-7-refuse-ledger-crown': [
		{
			speaker: 'hoodedVillager',
			line: 'Hooded Villager: Chatty, refuse it where witnesses can see. Private virtue is too easy for power to edit.',
			chatty: 'Chatty: I will remember. I will keep it simple and do the work.'
		}
	],
	'phase-8-return-square': [
		{
			speaker: 'mayor',
			line: 'Mayor Leonard: Chatty, hand me no absolution in the square. Make me answer where everyone can hear.',
			chatty: 'Chatty: I understand. I will follow the lead and watch for trouble.'
		}
	],
	'phase-8-rally-goblins': [
		{
			speaker: 'hiddenGoblinOne',
			line: 'Hidden Goblin Pip: Chatty, if we stand, stand beside us, not in front like a door pretending to be a person.',
			chatty: 'Chatty: Got it. I will follow the lead and watch for trouble.'
		}
	],
	'phase-8-rally-townsfolk': [
		{
			speaker: 'marketTrader',
			line: 'Market Trader: Chatty, I can make caution useful. Give frightened townsfolk jobs small enough to begin.',
			chatty: 'Chatty: That makes sense. I will follow the lead and watch for trouble.'
		}
	],
	'phase-8-crown-remnant': [
		{
			speaker: 'stoneGuard',
			line: 'Stone Guard: Chatty, when the Remnant orders kneeling, move first. Orders hate feet with timing.',
			chatty: 'Chatty: I hear you. I will follow the lead and watch for trouble.'
		}
	],
	'phase-8-speak-proclamation': [
		{
			speaker: 'hoodedVillager',
			line: 'Hooded Villager: Chatty, after the joke, say the serious part twice. People remember laughter, but law remembers wording.',
			chatty: 'Chatty: Okay. I will follow the lead and watch for trouble.'
		}
	],
	'phase-8-set-next-goal': [
		{
			speaker: 'forestWanderer',
			line: 'Forest Wanderer: Chatty, name tomorrow by a place, not a mood. Roads need destinations more than slogans.',
			chatty: 'Chatty: I agree. I will follow the lead and watch for trouble.'
		}
	],
	'phase-8-avoid-tyrant-choice': [
		{
			speaker: 'mayor',
			line: 'Mayor Leonard: Chatty, make a council before anyone makes a throne. Empty chairs protect better than full crowns.',
			chatty: 'Chatty: Understood. I will follow the lead and watch for trouble.'
		}
	],
	'phase-8-open-roads': [
		{
			speaker: 'lanternKeeper',
			line: 'Lantern Keeper: Chatty, the first open road will frighten people. Leave lamps along it so fear can find its way home.',
			chatty: 'Chatty: Right. I will follow the lead and watch for trouble.'
		}
	]
}

Object.entries(SCRIPT_FOLLOW_UP_BEATS).forEach(([scriptId, beats]) => {
	if (AUTHORED_SCENE_SCRIPTS[scriptId]) {
		AUTHORED_SCENE_SCRIPTS[scriptId].beats.push(...beats)
	}
})

module.exports = {
	AUTHORED_SCENE_SCRIPTS
}
