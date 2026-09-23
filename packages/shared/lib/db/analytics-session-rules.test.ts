import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SESSION_IDLE_MS,
  resolveAnalyticsSession,
  shouldApplyFirstTouch,
} from "./analytics-session-rules";

const NOW = new Date("2026-08-28T12:00:00.000Z");
const VISITOR = "11111111-1111-4111-8111-111111111111";
const SESSION = "22222222-2222-4222-8222-222222222222";

function minutesAgo(minutes: number): string {
  return new Date(NOW.getTime() - minutes * 60 * 1000).toISOString();
}

function makeExistingSession(
  overrides: Partial<{
    id: string;
    visitorId: string;
    lastActivityAt: string;
    isDemo: boolean;
  }> = {}
) {
  return {
    id: SESSION,
    visitorId: VISITOR,
    lastActivityAt: minutesAgo(5),
    isDemo: false,
    ...overrides,
  };
}

describe("SESSION_IDLE_MS", () => {
  it("is 30 minutes", () => {
    assert.equal(SESSION_IDLE_MS, 30 * 60 * 1000);
  });
});

describe("shouldApplyFirstTouch", () => {
  it("is true only for new sessions", () => {
    assert.equal(shouldApplyFirstTouch(true), true);
    assert.equal(shouldApplyFirstTouch(false), false);
  });
});

describe("resolveAnalyticsSession", () => {
  it("creates new visitor and session when no cookies", () => {
    let n = 0;
    const newId = () => `id-${++n}`;

    const result = resolveAnalyticsSession({
      now: NOW,
      cookieVisitorId: null,
      cookieSessionId: null,
      demoCookie: false,
      existingSession: null,
      existingVisitorId: null,
      newId,
    });

    assert.equal(result.visitorId, "id-1");
    assert.equal(result.sessionId, "id-2");
    assert.equal(result.isNewVisitor, true);
    assert.equal(result.isNewSession, true);
    assert.equal(result.isDemo, false);
  });

  it("reuses session when last activity was 29 minutes ago", () => {
    const result = resolveAnalyticsSession({
      now: NOW,
      cookieVisitorId: VISITOR,
      cookieSessionId: SESSION,
      demoCookie: false,
      existingSession: makeExistingSession({ lastActivityAt: minutesAgo(29) }),
      existingVisitorId: VISITOR,
    });

    assert.equal(result.visitorId, VISITOR);
    assert.equal(result.sessionId, SESSION);
    assert.equal(result.isNewSession, false);
    assert.equal(result.isNewVisitor, false);
    assert.equal(result.isDemo, false);
  });

  it("starts new session after 31 minutes idle but keeps visitor", () => {
    let n = 0;
    const newId = () => `new-${++n}`;

    const result = resolveAnalyticsSession({
      now: NOW,
      cookieVisitorId: VISITOR,
      cookieSessionId: SESSION,
      demoCookie: false,
      existingSession: makeExistingSession({ lastActivityAt: minutesAgo(31) }),
      existingVisitorId: VISITOR,
      newId,
    });

    assert.equal(result.visitorId, VISITOR);
    assert.equal(result.sessionId, "new-1");
    assert.equal(result.isNewSession, true);
    assert.equal(result.isNewVisitor, false);
  });

  it("does not resurrect an expired session from a replayed cookie", () => {
    let n = 0;
    const newId = () => `new-${++n}`;

    const result = resolveAnalyticsSession({
      now: NOW,
      cookieVisitorId: VISITOR,
      cookieSessionId: SESSION,
      demoCookie: false,
      existingSession: makeExistingSession({ lastActivityAt: minutesAgo(31) }),
      existingVisitorId: null,
      newId,
    });

    assert.equal(result.visitorId, VISITOR);
    assert.equal(result.sessionId, "new-1");
    assert.equal(result.isNewSession, true);
    assert.notEqual(result.sessionId, SESSION);
  });

  it("starts new session when demo flag differs but keeps visitor", () => {
    let n = 0;
    const newId = () => `new-${++n}`;

    const result = resolveAnalyticsSession({
      now: NOW,
      cookieVisitorId: VISITOR,
      cookieSessionId: SESSION,
      demoCookie: true,
      existingSession: makeExistingSession({
        isDemo: false,
        lastActivityAt: minutesAgo(5),
      }),
      existingVisitorId: VISITOR,
      newId,
    });

    assert.equal(result.visitorId, VISITOR);
    assert.equal(result.sessionId, "new-1");
    assert.equal(result.isNewSession, true);
    assert.equal(result.isNewVisitor, false);
    assert.equal(result.isDemo, true);
  });

  it("starts new session when cookie session id has no existing row but keeps visitor", () => {
    let n = 0;
    const newId = () => `new-${++n}`;

    const result = resolveAnalyticsSession({
      now: NOW,
      cookieVisitorId: VISITOR,
      cookieSessionId: SESSION,
      demoCookie: false,
      existingSession: null,
      existingVisitorId: VISITOR,
      newId,
    });

    assert.equal(result.visitorId, VISITOR);
    assert.equal(result.sessionId, "new-1");
    assert.equal(result.isNewSession, true);
    assert.equal(result.isNewVisitor, false);
  });
});
