# Milestone 5 Quest Interaction Director Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make quests progress from concrete Chatty actions at the right target, not only broad fallback flags or elapsed time.

**Architecture:** Add a quest interaction director that reads the current quest, current navigation snapshot, and Chatty action. It applies player-facing story effects such as facts, items, callbacks, and quest action events when Chatty inspects, interacts, speaks, picks up, or decides at the reached objective. Live world stays authoritative and emits narrative quest events over the existing SSE shape.

**Tech Stack:** Node.js CommonJS modules, existing story phase definitions, existing navigation resolver, Vue 2 live client with no UI schema break.

---

## File Structure

- Create `server/goblinworld/story/questInteractionDirector.js`
  - Maps quest target kinds to allowed actions.
  - Applies concrete effects to `story.facts`, `story.items`, `story.callbacks`, and relationship hints.
  - Emits public quest/discovery/dialogue events.
- Modify `server/goblinworld/story/storyEngine.js`
  - Export `applyQuestInteraction`.
- Modify `server/goblinworld/liveWorld.js`
  - Call quest interaction director for non-combat `inspect`, `interact`, `pick_up`, `cast`, and `wait` actions.
  - Merge resulting `worldDelta.story` into the action event.
- Modify `server/goblinworld/openaiGoblin.js`
  - Keep fallback and hybrid decisions aware that reached quest objectives prefer interaction actions.
- Modify `tests/goblinworld-live.test.js`
  - Add tests for concrete quest effects and no premature off-target completion.

---

### Task 1: Add Concrete Quest Interaction Tests

- [ ] **Step 1: Write failing tests**

Add tests that:

- `inspect` during an inspect quest sets the named fact.
- `pick_up` during an item quest sets the named item.
- `interact` during a route or place quest sets a callback.
- Off-target movement does not apply quest interaction rewards.

- [ ] **Step 2: Verify red**

Run `npm test`.
Expected failure: `applyQuestInteraction` does not exist and live decisions do not create quest effects.

### Task 2: Implement Quest Interaction Director

- [ ] **Step 1: Create the module**

Create `server/goblinworld/story/questInteractionDirector.js`.

- [ ] **Step 2: Implement target kind action rules**

Rules:

- `inspect` target accepts `inspect`.
- `item` target accepts `pick_up` and `interact`.
- `place`, `route`, `escort`, and `defense` accept `interact`.
- `speech`, `goal`, `choice`, `ideology`, `rumor`, and `dialogue` accept `interact` or `wait` only when reached.
- `self` accepts `move`, `wait`, and `inspect`.

- [ ] **Step 3: Implement effects**

Effects:

- Facts use stable names from target names or task ids.
- Items use target item names converted to camel case where possible.
- Callbacks use `quest-action:<taskId>`.
- Events use player-facing messages and never include coordinates or raw ids.

### Task 3: Wire Live World Actions

- [ ] **Step 1: Call the director from `applyDecision()`**

For non-combat actions, call `applyQuestInteraction()` after movement validation and before appending the event.

- [ ] **Step 2: Merge event patches**

Merge `worldDelta.story` and public message details into the existing action event without changing the wire shape.

- [ ] **Step 3: Verify green**

Run `npm test`.

### Task 4: Build And Deploy

- [ ] **Step 1: Build**

Run `CI=1 npm run build`.

- [ ] **Step 2: Local smoke**

Start `PORT=5016 GOBLINWORLD_AI_MODE=fallback GOBLINWORLD_MODEL_PROVIDER=anthropic node server.js` and verify `/api/live/state` includes quest effects after actions in tests.

- [ ] **Step 3: Deploy**

Run `rsync -a --delete dist/ railway_dist/`, `railway up --detach`, and verify production state.

