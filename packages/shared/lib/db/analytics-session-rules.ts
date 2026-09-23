export const SESSION_IDLE_MS = 30 * 60 * 1000;

export type SessionState = {
  id: string;
  visitorId: string;
  lastActivityAt: string;
  isDemo: boolean;
  source?: string;
};

export function shouldApplyFirstTouch(isNewSession: boolean): boolean {
  return isNewSession;
}

export function resolveAnalyticsSession(input: {
  now: Date;
  cookieVisitorId: string | null;
  cookieSessionId: string | null;
  demoCookie: boolean;
  existingSession: SessionState | null;
  existingVisitorId: string | null;
  newId?: () => string;
}): {
  visitorId: string;
  sessionId: string;
  isNewSession: boolean;
  isNewVisitor: boolean;
  isDemo: boolean;
} {
  const newId = input.newId ?? (() => crypto.randomUUID());

  const isNewVisitor =
    input.cookieVisitorId === null && input.existingVisitorId === null;
  const visitorId =
    input.cookieVisitorId ?? input.existingVisitorId ?? newId();

  const existingSession = input.existingSession;
  const idleMs =
    existingSession === null
      ? Infinity
      : input.now.getTime() -
        new Date(existingSession.lastActivityAt).getTime();

  const canReuseSession =
    existingSession !== null &&
    input.cookieSessionId === existingSession.id &&
    idleMs <= SESSION_IDLE_MS &&
    existingSession.isDemo === input.demoCookie;

  if (canReuseSession) {
    return {
      visitorId,
      sessionId: existingSession.id,
      isNewSession: false,
      isNewVisitor,
      isDemo: input.demoCookie,
    };
  }

  return {
    visitorId,
    sessionId: newId(),
    isNewSession: true,
    isNewVisitor,
    isDemo: input.demoCookie,
  };
}
