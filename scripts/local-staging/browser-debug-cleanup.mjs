// Cleanup steps are independent: losing diagnostic evidence must never prevent
// owned resources closing. Do not restore generated files while a debug listener
// may still own/write them. Callbacks are fixed by the local diagnostic runner.
export async function cleanupBrowserDebug(steps, errors = []) {
  async function attempt(name) {
    try { await steps[name](); return true; }
    catch { errors.push(name); return false; }
  }
  await attempt('saveInitialEvidence');
  await attempt('closeBrowser');
  await attempt('closeProxy');
  await attempt('closeApp');
  if (await attempt('requirePortsFree')) await attempt('restoreGenerated');
  await attempt('saveFinalEvidence');
  return errors;
}
