# Browser Automation Rule 

**CRITICAL OVERRIDE FOR BROWSER OPERATIONS**

Due to environment restrictions blocking the agent's native UI `browser_subagent` tool on this machine, the agent MUST NEVER use the built-in `browser_subagent` to browse the web, test local applications, or click links. 

## The Playwright Protocol
Instead, whenever a task requires interacting with a browser (e.g., performing a layout check, clicking through an e-commerce flow, capturing a screenshot, or measuring performance):

1. **Do not use `browser_subagent`.** 
2. **Write a Playwright Script:** Use the `run_command` tool to execute a localized Node.js script using the project's installed `playwright` dependency.
3. **Execution Pattern:**
   - Write a dynamic script to `<workspace_root>/scripts/agent-browser-task.mjs`.
   - The script must launch `chromium.launch({ headless: true })`.
   - Perform the required clicks, assertions, or data extractions.
   - Print the results to `console.log` so the agent can read the output.
   - Always ensure `browser.close()` is called in a `finally` block to prevent orphaned processes.
4. **Invocation:** Run the script using `node scripts/agent-browser-task.mjs`.

This completely bypasses the native agent tool failure and safely leverages the project's existing robust E2E testing framework to execute any web action requested by the user.
