# Milestone 7 Live Ops Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add safe live-ops controls so the shared GoblinWorld run can be inspected, recovered, and reset without exposing secrets or corrupting the live story.

**Architecture:** Add public health/status endpoints, guarded admin reset, and safer persistence handling. Keep `/api/live/state` and SSE compatible. Reset and health live in the backend only and do not alter the player-facing frontend.

**Tech Stack:** Express, existing `GoblinWorld` authority object, filesystem JSON persistence, Node test suite.

---

### Task 1: Health And Status Tests

- [ ] Add a test for `GET /api/live/health`.
- [ ] Assert it returns `ok`, `turn`, `status`, `controller`, `clients`, `persistence.enabled`, and `uptimeSeconds`.
- [ ] Assert it does not contain API keys, env var names, raw prompts, or memory.
- [ ] Run `npm test` and verify the test fails before implementation.

### Task 2: Safe Admin Reset Tests

- [ ] Add a test for `POST /api/live/admin/reset`.
- [ ] Assert reset returns `404` when no admin token is configured.
- [ ] Assert reset returns `403` for a wrong token.
- [ ] Assert reset returns `200` for `Authorization: Bearer <token>`.
- [ ] Assert the shared world returns to turn zero and persistence is cleared when reset succeeds.
- [ ] Run `npm test` and verify the test fails before implementation.

### Task 3: Persistence Recovery Tests

- [ ] Add a test where `snapshot.json` contains invalid JSON.
- [ ] Assert `loadSnapshot()` returns `null` and writes a `.corrupt-*` backup.
- [ ] Run `npm test` and verify the test fails before implementation.

### Task 4: Implement Backend Reliability

- [ ] Add persistence `clear()` and corrupt snapshot backup behavior.
- [ ] Add health endpoint to `server/goblinworld/app.js`.
- [ ] Convert app-local `world` from `const` to `let` so admin reset can replace the shared world.
- [ ] Add token-guarded reset endpoint.
- [ ] Run `npm test`.

### Task 5: Verify And Deploy

- [ ] Run `npm test`.
- [ ] Run a local server smoke for `/api/live/health`.
- [ ] Deploy Railway.
- [ ] Verify production `/api/live/health`.

