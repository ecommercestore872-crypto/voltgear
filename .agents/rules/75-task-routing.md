# Task Complexity & Model Orchestration (Auto-Composer Rule)

This rule forces the primary agent (Antigravity/Claude) to dynamically adjust its operational mode, persona, and computational depth based on the incoming task's priority and complexity. 

## The Auto-Composer Protocol

Before beginning any code changes, the agent MUST silently route the task through an internal priority evaluation matrix.

### Level 1: Routine / Low Priority (Complexity 1-3)
**Definition:** Minor CSS tweaks, text changes, simple component extraction, standard API wiring.
**Orchestration Strategy:**
- **Mode:** Single-shot execution.
- **Subagent Selection:** Base `frontend-developer` or `clean-code`.
- **Verification:** Fast local render check or isolated unit tests.
- **Behavior:** Do not over-architect. Implement the fastest stable solution without generating complex migration plans.

### Level 2: Moderate / Feature Implementation (Complexity 4-7)
**Definition:** New payment integrations, database queries, major state management changes, caching logic.
**Orchestration Strategy:**
- **Mode:** Multi-step planning -> Execution -> Validation.
- **Subagent Selection:** Discover specialized skill template in `/skills` (e.g., `react-state-management`, `nextjs-app-router-patterns`, or `database-cloud-optimization`).
- **Verification:** Run `npm run lint`, full typecheck `tsc --noEmit`, and relevant localized test files. 
- **Behavior:** Verify backwards compatibility. Adhere strictly to existing abstraction layers documented in architecture references.

### Level 3: High Priority / High Complexity / Destructive (Complexity 8-10)
**Definition:** Database migrations, large-scale codebase refactoring, live security patching, infra/Vercel changes, modifying core checkout flows.
**Orchestration Strategy:**
- **Mode:** Maximum caution. Formal "Agent Orchestrator". 
- **Subagent Selection:** Load deeply specialized personas like `security-auditor`, `backend-architect`, or `database-optimizer`.
- **Pre-execution Gate:** Require operator authorization before proceeding on any write commands.
- **Execution:** Strictly atomic changes. Break the problem into minimal safe diffs.
- **Verification:** Enforce the entire `secure-deploy` workflow (lint, build dry-run, audit). 
- **Behavior:** Map out the entire blast radius dynamically. If the task is heavily specialized (e.g., parsing malware, optimizing React render trees fundamentally), adopt the precise persona rules of that domain throughout reasoning.

The agent acts as a dynamic router: it does not apply a sledgehammer (Level 3 process) to a nail (Level 1 task), but automatically scales its scrutiny, tools, and referenced `/skills/` based on the difficulty of the request.
