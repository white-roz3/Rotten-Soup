# Milestone 4 Encounter Director Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn story combat from hidden counters into a shared encounter layer with visible hostiles, ally support, wave state, and quest objective pressure.

**Architecture:** Keep `server/goblinworld/liveWorld.js` as the authority. Add a focused encounter director under `server/goblinworld/story/` that owns hostile combatants, wave spawning, tactical action resolution, and public encounter snapshots. The existing story tasks, scene director, NPC conversation system, and hybrid model controller stay compatible.

**Tech Stack:** Node.js CommonJS modules, existing `node:test` suite in `tests/goblinworld-live.test.js`, Vue 2 live client consuming existing `map.actors` and `worldDelta.actors`.

---

## File Structure

- Create `server/goblinworld/story/encounterDirector.js`
  - Normalizes `story.combatBoard`.
  - Spawns visible hostile actors for active encounters.
  - Applies encounter actions to combatants and encounter HP.
  - Produces public `combatBoard` snapshots.
- Modify `server/goblinworld/story/storyEngine.js`
  - Normalize and expose `combatBoard`.
  - Initialize board on encounter spawn.
  - Route combat actions through the encounter director.
- Modify `server/goblinworld/story/conversationEngine.js`
  - Let NPC support affect combatants as well as encounter totals.
- Modify `server/goblinworld/liveWorld.js`
  - Inject hostile actors into `map.actors`.
  - Apply hostile deltas over SSE.
  - Remove defeated hostiles from the visible actor list.
- Modify `server/goblinworld/story/index.js`
  - Export new encounter director helpers through the existing story barrel.
- Modify `tests/goblinworld-live.test.js`
  - Add tests for board spawn, visible hostile actors, tactical actions, waves, ally support, and public snapshots.

---

### Task 1: Add Encounter Board State

- [ ] **Step 1: Write failing tests**

Add tests named:

```js
test('encounter spawn creates a public combat board with visible hostile combatants', () => {
	const world = new GoblinWorld(createInitialWorld({
		turn: 20,
		story: {
			completedTasks: ['phase-1-test-body', 'phase-1-find-voice', 'phase-1-learn-name', 'phase-1-reach-town']
		},
		goblin: { x: 8, y: 6 }
	}))
	world.advanceStory()
	const snapshot = world.getSnapshot()
	assert.ok(snapshot.story.combatBoard)
	assert.strictEqual(snapshot.story.combatBoard.status, 'active')
	assert.ok(snapshot.story.combatBoard.combatants.some(combatant => combatant.team === 'hostile'))
})
```

- [ ] **Step 2: Verify red**

Run `npm test`.
Expected failure: `snapshot.story.combatBoard` is missing.

- [ ] **Step 3: Implement board normalization**

Create `server/goblinworld/story/encounterDirector.js` with:

```js
function normalizeCombatBoard(input = {}) {
	return {
		status: input.status === 'active' ? 'active' : 'idle',
		taskId: input.taskId || null,
		encounterId: input.encounterId || null,
		wave: Number.isInteger(input.wave) ? input.wave : 0,
		objective: input.objective || '',
		combatants: Array.isArray(input.combatants) ? input.combatants.slice() : [],
		lastActionTurn: Number.isInteger(input.lastActionTurn) ? input.lastActionTurn : 0
	}
}
```

- [ ] **Step 4: Expose public snapshot**

Add `combatBoard: getCombatBoardSnapshot(story.combatBoard)` to `getStorySnapshot()`.

- [ ] **Step 5: Verify green**

Run `npm test`.

### Task 2: Spawn Visible Hostile Actors

- [ ] **Step 1: Write failing tests**

Add a test that `world.advanceStory()` for a combat task adds enemy actors to `snapshot.map.actors`, each with:

```js
{
	entityType: 'HOSTILE',
	wanders: false,
	spriteId: Number,
	x: Number,
	y: Number,
	home: { x: Number, y: Number }
}
```

- [ ] **Step 2: Verify red**

Run `npm test`.
Expected failure: no `HOSTILE` actors exist.

- [ ] **Step 3: Implement spawn helper**

In `encounterDirector.js`, add `createCombatBoardForEncounter(encounter, goblin, map)` that places two or three hostiles on legal nearby tiles and creates combatants with ids like `hostile-phase-1-first-fight-1-0`.

- [ ] **Step 4: Insert actors in live world**

In `liveWorld.advanceStory()`, after story events are returned, sync `story.combatBoard.combatants` into `this.state.map.actors`.

- [ ] **Step 5: Verify green**

Run `npm test`.

### Task 3: Make Combat Actions Hit Board Combatants

- [ ] **Step 1: Write failing tests**

Add tests that `applyDecision({ action: 'attack' })` lowers the lead hostile HP, emits `target.id`, and removes the hostile when HP reaches zero.

- [ ] **Step 2: Verify red**

Run `npm test`.
Expected failure: combat only changes encounter HP.

- [ ] **Step 3: Implement board action resolution**

Add `applyCombatBoardAction(story, action, turn)` that:

- Selects the first alive hostile.
- Uses existing encounter weakness and armor rules.
- Updates combatant HP and encounter HP.
- Marks combatant `defeated: true` at zero.
- Adds `worldDelta.actors[hostileId].removed = true` when removed.

- [ ] **Step 4: Wire into `applyStoryCombatAction()`**

Call `applyCombatBoardAction()` after the current encounter damage logic and merge its event patch into combat events.

- [ ] **Step 5: Verify green**

Run `npm test`.

### Task 4: Support Waves And Objectives

- [ ] **Step 1: Write failing tests**

Add tests that defeating all wave one hostiles spawns wave two hostiles for multi-wave encounters, and final wave victory clears the board.

- [ ] **Step 2: Verify red**

Run `npm test`.

- [ ] **Step 3: Implement wave refresh**

When `encounter.wave` increases, rebuild the board with the new wave number. When `encounter.defeated` is true, set board `status: 'cleared'` and mark all hostiles removed.

- [ ] **Step 4: Verify green**

Run `npm test`.

### Task 5: Tie NPC Ally Support Into Board Combat

- [ ] **Step 1: Write failing tests**

Add tests that `applyNpcCombatSupport()` can reveal a weakness, block incoming damage, or damage a visible hostile depending on the NPC combat role.

- [ ] **Step 2: Verify red**

Run `npm test`.

- [ ] **Step 3: Implement support effects**

In `conversationEngine.js`, have support roles update `story.combatBoard.combatants` and include `target.id` in the public combat support event.

- [ ] **Step 4: Verify green**

Run `npm test`.

### Task 6: Production Verification

- [ ] **Step 1: Run tests**

Run `npm test`. Expected: all tests pass.

- [ ] **Step 2: Build**

Run `npm run build`. Expected: build succeeds with only existing bundle-size warnings.

- [ ] **Step 3: Local smoke**

Start `PORT=5015 GOBLINWORLD_AI_MODE=fallback GOBLINWORLD_MODEL_PROVIDER=anthropic node server.js`, open `/live`, and verify hostiles can appear as map actors during combat.

- [ ] **Step 4: Deploy**

Run `rsync -a --delete dist/ railway_dist/`, then `railway up --detach`.

- [ ] **Step 5: Production smoke**

Verify `https://goblinworld-production.up.railway.app/api/live/state` includes `story.combatBoard` and `/live` still renders.

