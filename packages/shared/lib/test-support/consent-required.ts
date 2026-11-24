type TestContext = { after: (fn: () => void) => void };

/**
 * For a test of the OPTIONAL "wait for the visitor's choice" policy
 * (NEXT_PUBLIC_TRACK_ALL_VISITORS=false). The default policy tracks everyone.
 * Call first inside a test: `legacyConsentPolicy(t)`.
 */
export function legacyConsentPolicy(t: TestContext): void {
  const before = process.env.NEXT_PUBLIC_TRACK_ALL_VISITORS;
  process.env.NEXT_PUBLIC_TRACK_ALL_VISITORS = "false";
  t.after(() => {
    if (before === undefined) delete process.env.NEXT_PUBLIC_TRACK_ALL_VISITORS;
    else process.env.NEXT_PUBLIC_TRACK_ALL_VISITORS = before;
  });
}
