/** Only leave the editor after the server explicitly confirms revocation. */
export async function completeAdminLogout(options: {
  request: () => Promise<unknown>;
  clearLocalToken: () => void;
  navigate: () => void;
}): Promise<void> {
  const result = await options.request();
  if (!result || typeof result !== "object" || !("ok" in result) || result.ok !== true) {
    throw new Error("Sign-out could not be confirmed. Please try again.");
  }
  options.clearLocalToken();
  options.navigate();
}
