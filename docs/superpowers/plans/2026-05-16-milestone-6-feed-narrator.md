# Milestone 6 Feed Narrator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `feed.log` display a clean adventure log instead of raw simulation, action labels, ids, coordinates, or backend-shaped event text.

**Architecture:** Add a backend feed narrator that creates a public `feed` object for each event. Keep raw event fields for simulation and debugging compatibility, but have `/live` prefer `event.feed` whenever present. Hide raw NPC wandering, validation, ids, and coordinate text from the visible feed.

**Tech Stack:** Node.js CommonJS, existing SSE event shape, Vue 2 live client, `node:test` suite in `tests/goblinworld-live.test.js`.

---

### Task 1: Feed Narrator Tests

- [ ] Add tests proving `createEvent().toJSON().feed` exists for player-facing events.
- [ ] Add tests proving NPC wandering and validation events produce `feed: null`.
- [ ] Add tests proving generated feed text strips coordinates, raw ids, and bracketed action labels.
- [ ] Run `npm test` and verify the new feed tests fail before implementation.

### Task 2: Backend Feed Narrator

- [ ] Create `server/goblinworld/feedNarrator.js`.
- [ ] Export `createFeedEntryForEvent(event)`.
- [ ] Add speaker, tone, text, and visible fields.
- [ ] Hide validation and non-Chatty NPC movement.
- [ ] Sanitize coordinate strings, actor ids, `NPC`, and `[ACTION]` style labels.
- [ ] Wire `GoblinWorldEvent` to include `feed`.
- [ ] Run `npm test` and verify feed tests pass.

### Task 3: Frontend Feed Rendering

- [ ] Update `src/components/GoblinWorldLive.vue` so `createFeedEntry(event)` returns `event.feed` first.
- [ ] Preserve existing fallback formatting for older persisted events without `feed`.
- [ ] Ensure `feed.visible === false` or `feed === null` hides the event.
- [ ] Run `npm test`.

### Task 4: Build And Deploy

- [ ] Run `CI=1 npm run build`.
- [ ] Start local server and verify `/api/live/state` events include `feed`.
- [ ] Open `/live` locally and confirm feed stays player-facing.
- [ ] Deploy Railway.
- [ ] Verify production `/api/live/state` includes feed entries and `/live` renders.

