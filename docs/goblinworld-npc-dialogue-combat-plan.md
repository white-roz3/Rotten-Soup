# GoblinWorld NPC Dialogue And Combat Expansion Plan

## Goal
Make every live NPC feel like a real participant in Chatty's 24 hour myth arc. The feed should read like authored scenes from a strange videogame story, not generated status text. Every NPC must have a name, a job in the story, a combat role, quest hooks, and a no-repeat line bank.

## Non Negotiables
- No generic labels in the visible feed, such as action tags, npc coordinates, or template filler.
- No repeated NPC line during a 24 hour story cycle.
- Every spoken line must be authored before runtime.
- Every NPC can fight, defend, scout, heal, distract, carry supplies, guard civilians, or otherwise affect battles.
- Every NPC has quest relevance in at least two phases.
- Dialogue must target Chatty and the current story situation.
- Silence is allowed. Repeating a line is not.
- No em dashes or en dashes in story text.

## No Repeat System
The backend should track a `consumedDialogueIds` set inside story state.

Each line gets a stable id:

`actor-163.phase-4.hidden-camp.03`

When a line is emitted:
- Add the id to `story.consumedDialogueIds`.
- Do not allow that id again until the next 24 hour loop.
- If a character has no unused line for the current phase, search in this order:
  1. Same phase, same NPC, adjacent scene category.
  2. Same phase, allied NPC reaction line.
  3. Same phase, nonverbal action event.
  4. Silence plus movement or combat action.
- Never fall back to template construction.

Line targets:
- 25 NPC bodies.
- 8 phases.
- 24 authored lines per NPC per phase.
- 4 combat barks per NPC per major encounter.
- Minimum NPC line pool: 4,800 phase lines plus 800 combat lines.
- Chatty line pool: 600 to 900 authored lines.
- Total no-repeat live script target: 6,500 to 7,500 lines.

At a 3 second loop, the system should not speak every turn. One spoken feed line every 9 to 15 seconds is enough for a readable stream and keeps the 24 hour no-repeat rule realistic.

## Runtime Dialogue Picker
Each turn builds a scene request:

- `phaseId`
- `activeTaskId`
- `locationZone`
- `nearbyNpcIds`
- `activeEncounterId`
- `relationshipState`
- `recentQuestEvents`
- `consumedDialogueIds`

The picker returns:

- `lineId`
- `speakerActorId`
- `message`
- `questTag`
- `combatIntent`
- `relationshipDelta`

The picker should prefer lines that:
- Mention the active task.
- Belong to a nearby NPC.
- Advance an NPC arc.
- React to a recent event.
- Have not been consumed.

## NPC Combat Roles
NPC combat is deterministic and story aware. The model still controls Chatty, but NPCs can participate between Chatty turns.

Combat actions:
- `guard`: reduce incoming damage to Chatty or a civilian group.
- `strike`: damage a nearby hostile.
- `distract`: reduce enemy accuracy or delay enemy intent.
- `heal`: restore a small amount of Chatty or ally health.
- `scout`: reveal the next wave or enemy weakness.
- `supply`: restore one combat resource or trigger an item.
- `evacuate`: move civilians toward a safe marker.
- `rally`: raise morale and unlock stronger ally lines.

Combat events should read like story:

`Dwarf Bili plants his boots beside Chatty and cracks the hound across the knee.`

Not:

`NPC 169 attack hound at 14,16.`

## Map NPC Roster And Story Spine

### actor-163, Pip Understep
Location: west lane, 4,25  
Role: hidden goblin scout who distrusts rescue.  
Combat: scout, distract, thrown stones.  
Quest hooks: Phase 4 hidden camps, Phase 6 road defense, Phase 8 public square.

Dialogue spine:
- Phase 1: `Pip Understep: Chatty, are you tax, prophecy, or another tall problem crouching badly.`
- Phase 2: `Pip Understep: Chatty, if my name is in that ledger, cover it until I choose where it is spoken.`
- Phase 3: `Pip Understep: Chatty, the stump with the bitter face marks the hidden path. Do not laugh at it.`
- Phase 4: `Pip Understep: Chatty, small does not mean owned. Say it like you know what it cost us.`
- Phase 5: `Pip Understep: Chatty, the banner is ugly enough to trust. Let me bite the corner.`
- Phase 6: `Pip Understep: Chatty, hounds coming from the west. I smelled law breath before I saw teeth.`
- Phase 7: `Pip Understep: Chatty, if the Warden has my name, bite the part that thinks it owns me.`
- Phase 8: `Pip Understep: Chatty, I am standing in public and only shaking a medium amount.`

### actor-164, Muck Vetch
Location: west lane, 3,26  
Role: comic goblin skeptic, loyalty through complaint.  
Combat: taunt, rock throw, morale bark.  
Quest hooks: Phase 3 road diplomacy, Phase 5 banner, Phase 8 chant.

Dialogue spine:
- Phase 1: `Muck Vetch: Chatty, chosen ones are usually taller in songs, but songs lie for rhythm.`
- Phase 2: `Muck Vetch: Chatty, steal the ledger back morally, because it stole first.`
- Phase 3: `Muck Vetch: Chatty, diplomacy means nobody stabs until after the useful answer.`
- Phase 4: `Muck Vetch: Chatty, freedom must include complaining or it is just chores.`
- Phase 5: `Muck Vetch: Chatty, this knot is for tax and this knot is for wet boots.`
- Phase 6: `Muck Vetch: Chatty, I can throw rocks and insults. The second one is unlimited.`
- Phase 7: `Muck Vetch: Chatty, if the basement has a crown, kick it before it introduces itself.`
- Phase 8: `Muck Vetch: Chatty, I started the chant because silence was taking too long.`

### actor-165, Sable Mug
Location: tavern, 7,10  
Role: bartender, coward turned resistance host.  
Combat: supply, pan strike, tavern rally.  
Quest hooks: Phase 1 tavern intro, Phase 2 cellar ledger, Phase 5 rebel toast, Phase 6 resistance hub.

Dialogue spine:
- Phase 1: `Sable Mug: Chatty, that cloak just walked in like it expects soup and a destiny discount.`
- Phase 2: `Sable Mug: Chatty, the ledger passed through my cellar once and the rats got administrative.`
- Phase 3: `Sable Mug: Chatty, ask three people the same question. Lies get tired before truth does.`
- Phase 4: `Sable Mug: Chatty, if you find hidden goblins, tell them the back room has soup and no questions.`
- Phase 5: `Sable Mug: Chatty, a rebel toast should be short enough to yell while ducking.`
- Phase 6: `Sable Mug: Chatty, I am closing the tavern and opening the resistance, which is terrible for inventory.`
- Phase 7: `Sable Mug: Chatty, take bread for the under road. Heroics are worse hungry.`
- Phase 8: `Sable Mug: Chatty, first round is free for anyone who helped history trip over itself.`

### actor-168, Nell Caskwise
Location: tavern, 8,10  
Role: tavern regular who remembers old disappearances.  
Combat: bottle throw, witness rally.  
Quest hooks: Phase 2 ledger witness, Phase 6 tavern defense.

Dialogue spine:
- Phase 1: `Nell Caskwise: Chatty, sit where you can see the door. That is tavern wisdom and survival math.`
- Phase 2: `Nell Caskwise: Chatty, I heard names from the cellar after closing and pretended it was pipes.`
- Phase 3: `Nell Caskwise: Chatty, the road rumor came from a trader who would not meet my eyes.`
- Phase 4: `Nell Caskwise: Chatty, frightened goblins came here once. I served soup and asked nothing.`
- Phase 5: `Nell Caskwise: Chatty, I can stitch cloth, but do not ask me to make rebellion pretty.`
- Phase 6: `Nell Caskwise: Chatty, I have bottles, bad aim, and a reason to improve quickly.`
- Phase 7: `Nell Caskwise: Chatty, if the dark offers you comfort, remember comfort kept me quiet.`
- Phase 8: `Nell Caskwise: Chatty, say their names in the square so I can stop hearing them under the floor.`

### actor-169, Dwarf Bili
Location: tavern south, 8,13  
Role: mentor with shame from a failed rescue.  
Combat: frontline strike, armor breaker.  
Quest hooks: Phase 3 stolen charm, Phase 6 road defense, Phase 7 under road.

Dialogue spine:
- Phase 1: `Dwarf Bili: Chatty, a body is just armor that complains. Learn its balance.`
- Phase 2: `Dwarf Bili: Chatty, paper chains are still chains, and I have hated chains longer than you have had toes.`
- Phase 3: `Dwarf Bili: Chatty, my charm was stolen near the bend where brambles pretend to sleep.`
- Phase 4: `Dwarf Bili: Chatty, hidden goblins do not need a savior who drags them. They need a door held open.`
- Phase 5: `Dwarf Bili: Chatty, put a bite mark on the banner. A clean banner lies.`
- Phase 6: `Dwarf Bili: Chatty, aim for knees. Everything important has knees or regrets.`
- Phase 7: `Dwarf Bili: Chatty, below town is older than town, so insult the walls only if they insult you first.`
- Phase 8: `Dwarf Bili: Chatty, you did it, little cloak. Try not to become king in the annoying way.`

### actor-170, Rowan Mossroad
Location: north road, 14,16  
Role: road guide and rumor carrier.  
Combat: scout, reveal enemy wave.  
Quest hooks: Phase 3 mud road diplomacy, Phase 6 patrol warning.

Dialogue spine:
- Phase 1: `Rowan Mossroad: Chatty, roads tell the truth slowly. Walk them until they get nervous.`
- Phase 2: `Rowan Mossroad: Chatty, ledger riders used the north road and left the birds silent.`
- Phase 3: `Rowan Mossroad: Chatty, lanterns end where honest paths become useful. Start there.`
- Phase 4: `Rowan Mossroad: Chatty, hidden camps move at dusk, but their smoke forgets to lie.`
- Phase 5: `Rowan Mossroad: Chatty, blackroot ink grows where the ground remembers fire.`
- Phase 6: `Rowan Mossroad: Chatty, three patrol waves are moving through the eastern road.`
- Phase 7: `Rowan Mossroad: Chatty, the under road has turns that hate being remembered.`
- Phase 8: `Rowan Mossroad: Chatty, dawn has roads the crown never bothered to count.`

### actor-171, Jorie Fen
Location: north road, 16,16  
Role: nervous pathfinder who learns public courage.  
Combat: evade, guide civilians, mark safe tiles.  
Quest hooks: Phase 3 path overlap, Phase 4 escort, Phase 8 dawn roads.

Dialogue spine:
- Phase 1: `Jorie Fen: Chatty, if the road looks empty, ask what it scared away.`
- Phase 2: `Jorie Fen: Chatty, I saw a wax sealed crate leave town hall and nobody wanted a witness.`
- Phase 3: `Jorie Fen: Chatty, three rumors meet near the broken lamp. That is where truth gets muddy.`
- Phase 4: `Jorie Fen: Chatty, I can guide slow feet if someone keeps the hounds busy.`
- Phase 5: `Jorie Fen: Chatty, the banner should point toward roads, not obedience.`
- Phase 6: `Jorie Fen: Chatty, I marked the orchard gap. If the line breaks, run there with purpose.`
- Phase 7: `Jorie Fen: Chatty, follow the wrong mark twice, then the right one appears.`
- Phase 8: `Jorie Fen: Chatty, when the speech ends, walk somewhere new so the story keeps its feet.`

### actor-173, Orra Wick
Location: central square, 23,33  
Role: lantern keeper, secrecy and signal craft.  
Combat: blind, reveal weakness, protect route.  
Quest hooks: Phase 4 blue oil escort, Phase 5 lantern glass, Phase 7 under road lamp.

Dialogue spine:
- Phase 1: `Orra Wick: Chatty, light can expose you or protect you, so stand where it has a reason to be kind.`
- Phase 2: `Orra Wick: Chatty, ledger paper glows dull blue when the old ink wakes.`
- Phase 3: `Orra Wick: Chatty, the lamps can hide a trail if you feed them blue oil.`
- Phase 4: `Orra Wick: Chatty, walk when the lamp coughs and stop when it sings.`
- Phase 5: `Orra Wick: Chatty, take broken glass from the old lamp shelf. Broken things can still signal.`
- Phase 6: `Orra Wick: Chatty, when the market lamps blink twice, run toward the banner.`
- Phase 7: `Orra Wick: Chatty, take this lamp. Darkness lies better when no one can see its face.`
- Phase 8: `Orra Wick: Chatty, today the lights stay on because hiding has retired.`

### actor-174, Halvek Stonejaw
Location: central south, 23,41  
Role: guard who becomes a defensive ally.  
Combat: shield, hold line, interrupt charge.  
Quest hooks: Phase 5 armory, Phase 6 defense, Phase 8 square order.

Dialogue spine:
- Phase 1: `Halvek Stonejaw: Chatty, roads have rules, and dramatic fabric does not count as a permit.`
- Phase 2: `Halvek Stonejaw: Chatty, old law is still law, which is sometimes the problem.`
- Phase 3: `Halvek Stonejaw: Chatty, I cannot leave the gate yet, but I can forget to close it.`
- Phase 4: `Halvek Stonejaw: Chatty, I guard stone. Today I may also guard the small fool carrying a promise.`
- Phase 5: `Halvek Stonejaw: Chatty, the armory lock respects keys, force, and embarrassing persistence.`
- Phase 6: `Halvek Stonejaw: Chatty, the courthouse can guard itself. The road cannot.`
- Phase 7: `Halvek Stonejaw: Chatty, if you do not return, I will deny being emotionally invested.`
- Phase 8: `Halvek Stonejaw: Chatty, the square is yours for one speech. Make it short enough to survive.`

### actor-177, Nib Softstep
Location: south west camp, 3,51  
Role: gentle hidden goblin who fears revenge.  
Combat: healer, civilian guard.  
Quest hooks: Phase 4 consent test, Phase 5 banner names, Phase 8 ideology.

Dialogue spine:
- Phase 1: `Nib Softstep: Chatty, if you are here to rescue us later, blink twice and learn gentleness now.`
- Phase 2: `Nib Softstep: Chatty, they turned our lullabies into numbers. I still hum wrong on purpose.`
- Phase 3: `Nib Softstep: Chatty, if we become an army, who reminds us to become people too.`
- Phase 4: `Nib Softstep: Chatty, make the new list a promise, not a leash.`
- Phase 5: `Nib Softstep: Chatty, I stitch names where orders used to fit.`
- Phase 6: `Nib Softstep: Chatty, children behind stones, hope in front, unfortunately.`
- Phase 7: `Nib Softstep: Chatty, the First Name sounds like a door that remembered its hinge.`
- Phase 8: `Nib Softstep: Chatty, freedom is not permission. It is us standing without asking.`

### actor-178, Luma Potbelly
Location: south west camp, 7,49  
Role: camp cook and practical caretaker.  
Combat: heal, food supply, morale.  
Quest hooks: Phase 4 escort, Phase 6 survival, Phase 8 feast.

Dialogue spine:
- Phase 1: `Luma Potbelly: Chatty, heroes who skip food become speeches with bones. Eat something.`
- Phase 2: `Luma Potbelly: Chatty, the ledger counted mouths and never once fed them.`
- Phase 3: `Luma Potbelly: Chatty, bring the hidden ones by the low road. I can make soup look like fog.`
- Phase 4: `Luma Potbelly: Chatty, if rescue arrives hungry, rescue gets mean. Carry bread.`
- Phase 5: `Luma Potbelly: Chatty, dye the banner with blackroot, not stew, because stew has work.`
- Phase 6: `Luma Potbelly: Chatty, I have bandages in the flour sack and courage in the soup pot.`
- Phase 7: `Luma Potbelly: Chatty, take broth below. Darkness hates a warm stomach.`
- Phase 8: `Luma Potbelly: Chatty, after the speech, everyone eats before anyone invents new rules.`

### actor-181, Venn Copperlist
Location: east market, 36,16  
Role: trader who becomes logistics chief.  
Combat: supply, trap tools, route funding.  
Quest hooks: Phase 2 wax crate, Phase 5 cloth, Phase 6 supplies.

Dialogue spine:
- Phase 1: `Venn Copperlist: Chatty, I sell rope, turnips, and advice that becomes expensive after sunset.`
- Phase 2: `Venn Copperlist: Chatty, old ledger paper moved through cracked crates near my stall.`
- Phase 3: `Venn Copperlist: Chatty, I saw short merchants with emergency posture near the lantern road.`
- Phase 4: `Venn Copperlist: Chatty, the hidden groups need food before speeches and blankets before banners.`
- Phase 5: `Venn Copperlist: Chatty, cloth is cheap until people start believing in it.`
- Phase 6: `Venn Copperlist: Chatty, I discounted bandages and overcharged cowardice. The books balance beautifully.`
- Phase 7: `Venn Copperlist: Chatty, blue oil for the under road is expensive, illegal, and already packed.`
- Phase 8: `Venn Copperlist: Chatty, free people buy more bread than frightened people, and that is my ideology today.`

### actor-182, Tallow Reed
Location: east market, 36,20  
Role: market apprentice who sees everything.  
Combat: courier, supply toss.  
Quest hooks: Phase 2 crate memory, Phase 6 relief route.

Dialogue spine:
- Phase 1: `Tallow Reed: Chatty, I count coins and lies. Today the lies are winning.`
- Phase 2: `Tallow Reed: Chatty, the wax crate was heavy for paper and louder than a crate should be.`
- Phase 3: `Tallow Reed: Chatty, the hidden buyers asked for beans, lamp oil, and no eye contact.`
- Phase 4: `Tallow Reed: Chatty, I can run blankets to the camps if someone distracts the hounds.`
- Phase 5: `Tallow Reed: Chatty, I found cloth under invoices marked cabbage, which means rebellion has accounting.`
- Phase 6: `Tallow Reed: Chatty, the relief route is open if I sprint and nobody expects dignity.`
- Phase 7: `Tallow Reed: Chatty, if you come back with the First Name, I will write it in the clean ledger.`
- Phase 8: `Tallow Reed: Chatty, I want a market where nobody has to buy back their own name.`

### actor-184, Petal Quickpost
Location: central square, 22,33  
Role: mayoral runner who defects into messenger work.  
Combat: courier, warning relay.  
Quest hooks: Phase 2 Leonard confession, Phase 6 wave warnings.

Dialogue spine:
- Phase 1: `Petal Quickpost: Chatty, the mayor is pacing holes into the office floor because of you.`
- Phase 2: `Petal Quickpost: Chatty, Leonard told me not to mention the red wax, so I am mentioning it carefully.`
- Phase 3: `Petal Quickpost: Chatty, three messages vanished on the lantern road and all came back afraid.`
- Phase 4: `Petal Quickpost: Chatty, I can carry the phrase to the camps if the camps do not shoot the messenger.`
- Phase 5: `Petal Quickpost: Chatty, give me banner news and I will make it arrive before the panic.`
- Phase 6: `Petal Quickpost: Chatty, second wave from the east, third from wherever fear feels clever.`
- Phase 7: `Petal Quickpost: Chatty, Leonard left the under road key where guilt could find it.`
- Phase 8: `Petal Quickpost: Chatty, I am done carrying orders. Today I carry invitations.`

### actor-190, Sedge Rootwise
Location: south road, 15,50  
Role: forest root scout.  
Combat: ambush, snare.  
Quest hooks: Phase 3 hidden route, Phase 4 camps, Phase 7 under road signs.

Dialogue spine:
- Phase 1: `Sedge Rootwise: Chatty, the dirt knows you are new because you apologize to it with every step.`
- Phase 2: `Sedge Rootwise: Chatty, ledger riders avoided roots, which means roots were doing something right.`
- Phase 3: `Sedge Rootwise: Chatty, the tucked away goblins listen for three knocks and no boots.`
- Phase 4: `Sedge Rootwise: Chatty, I can hide an escort trail under leaf rot and bad weather.`
- Phase 5: `Sedge Rootwise: Chatty, blackroot ink is not picked. It is negotiated with dirt.`
- Phase 6: `Sedge Rootwise: Chatty, I set snares on the south road. Tell allies not to be heroic there.`
- Phase 7: `Sedge Rootwise: Chatty, under road roots point toward names that want to come home.`
- Phase 8: `Sedge Rootwise: Chatty, open roads still need hidden paths for people who heal slowly.`

### actor-191, Kett Bramblehand
Location: south road, 18,49  
Role: bramble hunter who knows hostile plants.  
Combat: anti-bramble striker, trap breaker.  
Quest hooks: Phase 3 bramble crawlers, Phase 5 blackroot, Phase 6 Thorn Scouts.

Dialogue spine:
- Phase 1: `Kett Bramblehand: Chatty, if a weed bites first, it has chosen politics.`
- Phase 2: `Kett Bramblehand: Chatty, mites and brambles both hate inspection because inspection finds soft parts.`
- Phase 3: `Kett Bramblehand: Chatty, bramble crawlers punish straight lines, so walk like you owe mud money.`
- Phase 4: `Kett Bramblehand: Chatty, hounds hate thorn smoke. I can make thorn smoke.`
- Phase 5: `Kett Bramblehand: Chatty, blackroot ink stains best after the root insults you.`
- Phase 6: `Kett Bramblehand: Chatty, Thorn Scouts whistle before they bind. Cut the whistle.`
- Phase 7: `Kett Bramblehand: Chatty, if the Warden grows roots, burn the sentence it repeats.`
- Phase 8: `Kett Bramblehand: Chatty, if freedom grows wild, good. Gardens taught the crown bad habits.`

### actor-192, Mosslet Dain
Location: south camp, 16,52  
Role: young goblin runner who becomes brave in public.  
Combat: decoy, courier, morale.  
Quest hooks: Phase 4 escort, Phase 6 civilian route, Phase 8 square.

Dialogue spine:
- Phase 1: `Mosslet Dain: Chatty, I have been hiding so long my shadow pays rent.`
- Phase 2: `Mosslet Dain: Chatty, my name is not a debt, even if the book says it with confidence.`
- Phase 3: `Mosslet Dain: Chatty, I know a route small enough for fear and fast enough for hope.`
- Phase 4: `Mosslet Dain: Chatty, I can run messages if everyone stops calling me too little to matter.`
- Phase 5: `Mosslet Dain: Chatty, put my name on the banner low where I can see it.`
- Phase 6: `Mosslet Dain: Chatty, I can lead children through the orchard gap. I am scared and doing it.`
- Phase 7: `Mosslet Dain: Chatty, bring back the First Name so mine stops feeling borrowed.`
- Phase 8: `Mosslet Dain: Chatty, I am not hiding today. I am standing behind Pip, which counts.`

### actor-200, Rill Gatekin
Location: south west gate, 9,42  
Role: gate scout who tracks patrol routes.  
Combat: gate control, warning horn.  
Quest hooks: Phase 4 escort, Phase 6 road defense.

Dialogue spine:
- Phase 1: `Rill Gatekin: Chatty, gates remember who gets chased through them. This one remembers too much.`
- Phase 2: `Rill Gatekin: Chatty, ledger men used the south gate when they wanted no questions.`
- Phase 3: `Rill Gatekin: Chatty, the mud road is safer after rain because hounds hate honest footprints.`
- Phase 4: `Rill Gatekin: Chatty, bring the hidden group to this gate and I will make it forget to squeak.`
- Phase 5: `Rill Gatekin: Chatty, a banner at the gate turns escape into arrival.`
- Phase 6: `Rill Gatekin: Chatty, I can hold this gate for one wave, maybe two if fear stays polite.`
- Phase 7: `Rill Gatekin: Chatty, the sealed stair below town smells like gate hinges and old blame.`
- Phase 8: `Rill Gatekin: Chatty, leave the gates open after dawn. A free town should breathe.`

### actor-201, Ansel Greybook
Location: south west house, 8,42  
Role: ex clerk who copied ledger pages.  
Combat: weak point analyst, spell support.  
Quest hooks: Phase 2 ledger, Phase 7 Warden weakness.

Dialogue spine:
- Phase 1: `Ansel Greybook: Chatty, I know paper fear when I see it, and you have walked into a town full of it.`
- Phase 2: `Ansel Greybook: Chatty, I copied the ledger margins and hid the copy under a floor that still hates me.`
- Phase 3: `Ansel Greybook: Chatty, the old road entries stopped where the hidden camps began. That was deliberate.`
- Phase 4: `Ansel Greybook: Chatty, the freedom list must not number people the way I once did.`
- Phase 5: `Ansel Greybook: Chatty, write the banner phrase in uneven letters so it cannot become official stationery.`
- Phase 6: `Ansel Greybook: Chatty, Thorn Scouts carry orders in knots. Cut the knots and their courage thins.`
- Phase 7: `Ansel Greybook: Chatty, the Warden repeats clauses before it strikes. Inspect the repeated clause.`
- Phase 8: `Ansel Greybook: Chatty, let me read my confession before the proclamation. The square should know who helped the book breathe.`

### actor-202, Gilda Ashpocket
Location: south west house, 10,43  
Role: elder who remembers the first goblin tax.  
Combat: rally, curse breaker.  
Quest hooks: Phase 2 history, Phase 8 public memory.

Dialogue spine:
- Phase 1: `Gilda Ashpocket: Chatty, I have outlived three mayors and four lies pretending to be traditions.`
- Phase 2: `Gilda Ashpocket: Chatty, the first goblin tax was paid in names because coin was too honest.`
- Phase 3: `Gilda Ashpocket: Chatty, roads remember what old people stop saying. Listen under the polite parts.`
- Phase 4: `Gilda Ashpocket: Chatty, tell the hidden ones I remember them before the ledger renamed them trouble.`
- Phase 5: `Gilda Ashpocket: Chatty, stitch old shame into the banner so nobody can sell it back as pride.`
- Phase 6: `Gilda Ashpocket: Chatty, I cannot swing hard, but I can make cowards hear their ancestors coughing.`
- Phase 7: `Gilda Ashpocket: Chatty, the First Name was stolen before I lost my first tooth. Bring it back louder than grief.`
- Phase 8: `Gilda Ashpocket: Chatty, a town that forgets its small people deserves small people at the microphone.`

### actor-205, Vale Crownshed
Location: east house, 39,40  
Role: deserter from the Crown remnants.  
Combat: enemy intent reveal, counter tactics.  
Quest hooks: Phase 6 patrol tactics, Phase 8 Crown Remnant.

Dialogue spine:
- Phase 1: `Vale Crownshed: Chatty, crowns love small bodies because they mistake them for easy shelves.`
- Phase 2: `Vale Crownshed: Chatty, the ledger was not a mistake. It was training.`
- Phase 3: `Vale Crownshed: Chatty, patrol roads are drawn by people who never had to hide from patrols.`
- Phase 4: `Vale Crownshed: Chatty, hounds stop when the command chain breaks. Find the handler mark.`
- Phase 5: `Vale Crownshed: Chatty, a banner makes a target, but it also makes a place to defend.`
- Phase 6: `Vale Crownshed: Chatty, Thorn Scouts test the weakest corner first. Make the weakest corner a trap.`
- Phase 7: `Vale Crownshed: Chatty, the Warden speaks like the officers who taught me to stop sleeping.`
- Phase 8: `Vale Crownshed: Chatty, when the Remnant says order, ask who was ordered to disappear.`

### actor-206, Brindle Lock
Location: east house, 33,37  
Role: armory clerk and reluctant saboteur.  
Combat: gear supply, lock sabotage.  
Quest hooks: Phase 5 armory, Phase 6 supplies.

Dialogue spine:
- Phase 1: `Brindle Lock: Chatty, keys are just small arguments that metal respects.`
- Phase 2: `Brindle Lock: Chatty, ledger cabinets use ceremonial locks because guilt enjoys costume.`
- Phase 3: `Brindle Lock: Chatty, the road armory has old tools and newer excuses.`
- Phase 4: `Brindle Lock: Chatty, I can open a safehouse door faster than fear can knock.`
- Phase 5: `Brindle Lock: Chatty, if a key falls near your feet, I saw nothing with great discipline.`
- Phase 6: `Brindle Lock: Chatty, I jammed the patrol gate. They will call it rust because rust cannot be arrested.`
- Phase 7: `Brindle Lock: Chatty, the sealed door below town has a lock that listens for stolen names.`
- Phase 8: `Brindle Lock: Chatty, after dawn I want every lock in town to justify itself.`

### actor-212, Mina Wellscratch
Location: mid town, 17,24  
Role: wall scribe who knows the prophecy graffiti.  
Combat: sigil mark, spell assist.  
Quest hooks: Phase 1 wall scribbles, Phase 7 binding stone.

Dialogue spine:
- Phase 1: `Mina Wellscratch: Chatty, I wrote around the old wall words, never over them. I was afraid ink could bite.`
- Phase 2: `Mina Wellscratch: Chatty, the ledger and the wall use the same old letter for owned.`
- Phase 3: `Mina Wellscratch: Chatty, road signs were altered to make hidden paths look like mistakes.`
- Phase 4: `Mina Wellscratch: Chatty, write small does not mean owned where short eyes can read it first.`
- Phase 5: `Mina Wellscratch: Chatty, I can letter the banner, but the letters must look alive, not official.`
- Phase 6: `Mina Wellscratch: Chatty, I marked safe stones with chalk. Step where the chalk looks nervous.`
- Phase 7: `Mina Wellscratch: Chatty, the binding stone has grammar. Break the verb that means own.`
- Phase 8: `Mina Wellscratch: Chatty, let the square read the phrase before it hears the speech.`

### actor-214, Orvek Bridgehand
Location: mid town, 25,24  
Role: mason who built roads and knows hidden underpasses.  
Combat: barricade, stone throw, path unlock.  
Quest hooks: Phase 3 road route, Phase 6 barricade, Phase 7 sealed door.

Dialogue spine:
- Phase 1: `Orvek Bridgehand: Chatty, stones do not care who owns them, which is why rulers carve names into them.`
- Phase 2: `Orvek Bridgehand: Chatty, ledger carts cracked the north bridge because shame rides heavy.`
- Phase 3: `Orvek Bridgehand: Chatty, the mud road dips where an underpass used to breathe.`
- Phase 4: `Orvek Bridgehand: Chatty, I can raise a crossing for the hidden group if the hounds are busy elsewhere.`
- Phase 5: `Orvek Bridgehand: Chatty, hang the banner where old stone frames it and new feet can find it.`
- Phase 6: `Orvek Bridgehand: Chatty, I built a barricade from bad benches and worse civic pride.`
- Phase 7: `Orvek Bridgehand: Chatty, the sealed door is older than the square and less impressed by speeches.`
- Phase 8: `Orvek Bridgehand: Chatty, roads should lead out as easily as in. That is how a town stops being a cage.`

### actor-225, Mayor Leonard
Location: west office, 3,32  
Role: guilty mayor who chooses reform in public.  
Combat: rally, legal reversal, crowd control.  
Quest hooks: Phase 2 ledger confession, Phase 6 public reversal, Phase 8 new rules.

Dialogue spine:
- Phase 1: `Mayor Leonard: Chatty, Mulberry has rules because Mulberry has guilt, and guilt loves a notice board.`
- Phase 2: `Mayor Leonard: Chatty, I did not write the goblin debts, but I let the cabinet stay locked.`
- Phase 3: `Mayor Leonard: Chatty, the roads past the lamps were never empty. We called them empty so we could sleep.`
- Phase 4: `Mayor Leonard: Chatty, if you find the hidden goblins, ask before you lead. Rescue can become another leash.`
- Phase 5: `Mayor Leonard: Chatty, a banner will frighten the people who prefer injustice indoors.`
- Phase 6: `Mayor Leonard: Chatty, I wanted reform with minutes and chairs. You brought reform with teeth.`
- Phase 7: `Mayor Leonard: Chatty, the ledger root is under the oldest stones beneath my office.`
- Phase 8: `Mayor Leonard: Chatty, I am standing with you because guilt finally became less useful than courage.`

## Quest Integration By Phase

### Phase 1, The Body Wakes Up Wrong
Core NPCs: Sable Mug, Mayor Leonard, Mina Wellscratch, Halvek Stonejaw.  
Support NPCs: Nell, Bili, Venn, Pip.  
Combat: rats and weeds. Bili teaches body basics, Sable supplies a pan, Halvek comments if Chatty survives.

### Phase 2, The Ledger Of Small Chains
Core NPCs: Mayor Leonard, Ansel Greybook, Nell, Venn, Orra.  
Support NPCs: Pip, Nib, Gilda, Brindle.  
Combat: ledger mites. Ansel reveals weakness, Orra reveals magic glow, Bili breaks armor.

### Phase 3, Mud Road Diplomacy
Core NPCs: Rowan, Jorie, Sedge, Kett, Dwarf Bili.  
Support NPCs: Muck, Venn, Tallow, Orvek.  
Combat: bramble crawlers. Kett reveals plant weakness, Rowan scouts route, Orvek unlocks road shortcut.

### Phase 4, The Hidden Goblin Census
Core NPCs: Pip, Muck, Nib, Luma, Rill, Sedge.  
Support NPCs: Orra, Leonard, Hooded sympathizers.  
Combat: Crown Hounds. Pip warns, Rill opens gate, Luma heals, Halvek shields.

### Phase 5, The Banner Of Bad Ideas
Core NPCs: Sable, Venn, Brindle, Mina, Orra, Bili.  
Support NPCs: Pip, Muck, Nib, Orvek.  
Combat: pantry slime and armor scraps. Brindle sabotages armor, Sable fights slime, Mina writes banner phrase.

### Phase 6, The Small War Begins
Core NPCs: Halvek, Bili, Rowan, Vale, Orra, Venn, Petal.  
Support NPCs: all hidden goblins and market workers.  
Combat: three wave defense. Every NPC gets a battlefield job.

### Phase 7, The Crown Below
Core NPCs: Orra, Bili, Ansel, Mina, Orvek, Leonard.  
Support NPCs: Pip, Nib, Vale, Brindle.  
Combat: Ledger Warden. Ansel decodes clauses, Mina marks the verb, Orra reveals weakness, Bili strikes.

### Phase 8, Dawn Of The Chosen One
Core NPCs: everyone.  
Combat: Crown Remnant. Every NPC has one unique final battle act and one unique reaction to the proclamation.

## Implementation Steps
1. Add `server/goblinworld/story/npcRoster.js` with one entry per map actor id.
2. Add `server/goblinworld/story/npcDialogueBible.js` with authored line arrays keyed by actor id, phase id, quest id, and encounter id.
3. Add `consumedDialogueIds` to story state and persistence migration.
4. Replace archetype based selection with actor id based selection.
5. Add NPC combat roles to actor snapshots.
6. Add deterministic allied combat turns after Chatty and before hostile resolution.
7. Add tests that every NPC has lines for all 8 phases.
8. Add tests that no line text repeats anywhere in the bible.
9. Add tests that a consumed line cannot emit again in the same 24 hour cycle.
10. Add tests that every NPC has at least one combat action and at least two quest hooks.
11. Add a 24 hour dry run that fails if visible dialogue repeats.

## Acceptance Test
The final smoke test should run a mocked 24 hour cycle and assert:

- 25 NPCs are named.
- 25 NPCs have actor id based scripts.
- 25 NPCs can participate in combat.
- Zero duplicate dialogue strings exist in the full bible.
- Zero consumed line ids repeat during the run.
- No fallback template strings appear.
- No NPC coordinate or programmer label appears in the feed.
- Every phase includes dialogue from at least 8 different NPCs.
- Final battle includes at least 15 NPC combat or rally events.
