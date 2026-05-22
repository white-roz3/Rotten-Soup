const AUTHORED_SCENE_SCRIPTS = {
	'phase-1-test-body': {
		id: 'phase-1-test-body',
		participants: ['chatty', 'bartender'],
		beats: [
			{
				speaker: 'bartender',
				line: 'Bartender: Chatty, take three steps and do not trust the fourth until it proves itself.',
				chatty: 'Chatty: Feet report for duty. The left one seems ambitious.'
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
				chatty: 'Chatty: Then the wall is either prophetic or a vandal with taste.',
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
				chatty: 'Chatty: I will visit both and compare the smell of fear.'
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
				chatty: 'Chatty: I respect holes that gossip. I will keep my head attached.'
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
				chatty: 'Chatty: I hear caution. I also hear snack destiny.'
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
				chatty: 'Chatty: I choose to survive in public. Let the furniture be warned.'
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
				chatty: 'Chatty: Then I inspect dust until it confesses.'
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
				chatty: 'Chatty: I will find them without making fear their landlord.'
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
				chatty: 'Chatty: Names get doors, not hooks.'
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
				chatty: 'Chatty: Then I will be educational and loud.'
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
				chatty: 'Chatty: I hide it where darkness has to share custody.'
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
				chatty: 'Chatty: I will count the avoiding and follow the pattern.'
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
				chatty: 'Chatty: Then we recover charm and business together.'
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
				chatty: 'Chatty: I will watch the ground for bad opinions.'
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
				chatty: 'Chatty: I bring a door, not a leash.'
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
				chatty: 'Chatty: I promise no cages and suspiciously competent walking.',
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
				chatty: 'Chatty: Then I break the stick and keep the hat for morale.'
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
				chatty: 'Chatty: I approve tactical bread.'
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
				chatty: 'Chatty: I will knock like a rumor with manners.'
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
				chatty: 'Chatty: I sound like mud, questions, and illegal hope.'
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
				chatty: 'Chatty: I will cough like destiny with allergies.'
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
				chatty: 'Chatty: Small does not mean owned.'
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
				chatty: 'Chatty: I will make the whistle regret employment.'
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
				chatty: 'Chatty: I walk at the speed of everyone arriving.'
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
				chatty: 'Chatty: This list opens doors. It does not close around throats.'
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
				chatty: 'Chatty: Then stay free there. Chosen does not mean boss of your feet.'
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
				chatty: 'Chatty: Guilty cloth becomes honest banner.'
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
				chatty: 'Chatty: I like a flame that recruits.'
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
				chatty: 'Chatty: I harvest suspicious roots with formal ingratitude.'
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
				chatty: 'Chatty: I drink to doors learning humility.'
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
				chatty: 'Chatty: Your failure is civic progress.'
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
				chatty: 'Chatty: I defend bread before morale notices.'
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
				chatty: 'Chatty: I attack nostalgia with practical malice.'
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
				chatty: 'Chatty: I guard the feet that carry proof.'
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
				chatty: 'Chatty: Good. Let the door become a declaration.'
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
				chatty: 'Chatty: The road accepts your apology if your hammer does.'
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
				chatty: 'Chatty: I have never felt so legally masonry.'
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
				chatty: 'Chatty: I remain inconveniently alive.'
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
				chatty: 'Chatty: I will win like a problem with discipline.'
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
				chatty: 'Chatty: Apple crates become strategic infrastructure.'
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
				chatty: 'Chatty: I will find where guilt learned carpentry.'
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
				chatty: 'Chatty: A judgment lamp. Finally, portable anxiety.'
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
				chatty: 'Chatty: I will be quiet in a way that insults history.'
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
				chatty: 'Chatty: My name stays mine. The Warden can file a complaint.'
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
				chatty: 'Chatty: I wait for the hook, then break the hand behind it.'
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
				chatty: 'Chatty: Then the dirt is witness and the name is home.'
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
				chatty: 'Chatty: I refuse a cage just because it fits my ears.'
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
				chatty: 'Chatty: Public shame walks best in daylight.'
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
				chatty: 'Chatty: Small does not mean owned, and tall does not mean true.'
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
				chatty: 'Chatty: Visible bread is the cousin of courage.'
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
				chatty: 'Chatty: My knees remain rude and operational.'
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
				chatty: 'Chatty: We conquer fear. We do not conquer each other.'
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
				chatty: 'Chatty: Tomorrow gets feet, maps, and an unreasonable cloak.'
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
				chatty: 'Chatty: I hand it back with teeth marks and instructions.'
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
				chatty: 'Chatty: Roads are promises with dirt on them.'
			}
		]
	}
}

module.exports = {
	AUTHORED_SCENE_SCRIPTS
}
