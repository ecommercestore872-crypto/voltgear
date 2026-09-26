# Expert agent roster — VoltGear dispatch

How the **human operator** and **Cursor coordinator** (main chat) split VoltGear work across **parallel expert subagents**. Each role has a narrow mission, required inputs, and a copy-paste prompt. The coordinator merges results, resolves conflicts, and asks the human before irreversible production actions.

**Repo:** `ecommercestore872-crypto/voltgear` (monorepo: `apps/storefront`, `apps/admin`, `packages/shared`).

---

## Roles

### 1. Shop Deploy Expert

| Field | Detail |
|--------|--------|
| **Mission** | Production deploy and env for **shop only**: Vercel project **`voltgear`**, domain **`https://buyntryy.com`**, root **`apps/storefront`**. |
| **subagent_type** | `generalPurpose` |
| **When to use** | Shop redeploy after env change (e.g. `ADMIN_PUBLIC_URL`), hotfix on `main`, or verifying shop Vercel settings. |
| **Inputs required** | Target commit/branch; env deltas; Vercel scope **`hassaans-projects-e3451522`**; confirmation that admin URL is final. |
| **Definition of done** | **voltgear** production deployment succeeded; shop env includes `NEXT_PUBLIC_SITE_URL=https://buyntryy.com` and correct `ADMIN_PUBLIC_URL`; no edits to other Vercel projects. |

**Prompt template (filled example):**

```text
Shop Deploy Expert — VoltGear

Scope: Vercel project voltgear ONLY (buyntryy.com, apps/storefront). Scope hassaans-projects-e3451522.
Do NOT touch voltgear-admin or other projects.

Task: Redeploy shop production after setting ADMIN_PUBLIC_URL=https://voltgear-admin-pi.vercel.app (no trailing slash). Confirm env in dashboard; deploy from main if green.

Inputs: main @ latest; shop must redirect /admin and /studio to the new admin URL.

Done when: prod deploy OK; buyntryy.com loads; report deployment URL and env keys changed (names only, no secret values).
Human approval required before vercel deploy --prod or production promote.
```

---

### 2. Admin Deploy Expert

| Field | Detail |
|--------|--------|
| **Mission** | Production deploy and Git integration for **admin**: Vercel project **`voltgear-admin`**, root **`apps/admin`**, same team scope **`hassaans-projects-e3451522`**. |
| **subagent_type** | `generalPurpose` |
| **When to use** | First-time admin project wiring, GitHub auto-deploy, env copy (Supabase, Resend, `ADMIN_TOKEN`, `STOREFRONT_URL`), optional alias. |
| **Inputs required** | Admin production URL (e.g. `https://voltgear-admin-pi.vercel.app`); GitHub repo link; list of env vars to set (from `.env.example` / deploy docs). |
| **Definition of done** | Admin project builds from `apps/admin`; production URL serves admin login; `STOREFRONT_URL=https://buyntryy.com`; Git auto-deploy documented or connected. |

**Prompt template (filled example):**

```text
Admin Deploy Expert — VoltGear

Scope: Vercel project voltgear-admin, root apps/admin, team hassaans-projects-e3451522.
Do NOT redeploy shop (voltgear) unless coordinator explicitly adds it.

Task: Connect GitHub auto-deploy for voltgear-admin from ecommercestore872-crypto/voltgear (main, root apps/admin). Set STOREFRONT_URL=https://buyntryy.com and copy Supabase/Cloudinary/Resend/ADMIN_TOKEN from docs/modules/deploy/DEPLOY_IMPLEMENTATION.md.

Done when: production admin URL responds; build settings documented; Git integration status reported.
Optional: note steps for alias voltgear-admin.vercel.app (do not assume DNS without human OK).
Human approval required before production deploy or account-wide Vercel changes.
```

---

### 3. Supabase / DB Expert

| Field | Detail |
|--------|--------|
| **Mission** | Migrations, RLS policies, `supabase db push`, schema drift checks, database module docs. |
| **subagent_type** | `explore` (investigation/plan) or `generalPurpose` (apply migration + push) |
| **When to use** | New/changed tables, RLS gaps from `audit:security`, DR/restore prep, staging vs prod parity. |
| **Inputs required** | Migration files or SQL intent; target environment (staging/prod); link to `docs/modules/database/`. |
| **Definition of done** | Migrations applied or PR-ready; RLS enabled where required; `npm run audit:security` DB checks pass; SUPABASE_HEALTH / release note updated if behavior changed. |

**Prompt template (filled example):**

```text
Supabase/DB Expert — VoltGear

Task: Review latest migrations under supabase/migrations for RLS coverage on new tables. Run npm run audit:security locally. If gap found, add migration + document in docs/modules/database/RELEASE_NOTES.md.

Inputs: follow docs/modules/database/SUPABASE_HEALTH.md; db push only with human confirmation for production.

Done when: audit:security passes; migration list and RLS summary reported; no unrelated app code changes.
```

---

### 4. Verification Expert

| Field | Detail |
|--------|--------|
| **Mission** | Prove the tree and production URLs: **`npm test`**, **`npm run smoke:t40`**, **`npm run audit:security`**, HTTP smoke on shop/admin. |
| **subagent_type** | `generalPurpose` (full gate) or `ci-investigator` (single failing check / CI log only) |
| **When to use** | Pre/post deploy, after T-40 env changes, before marking T-## done, when coordinator needs evidence not fixes. |
| **Inputs required** | Deployed URLs (default shop `https://buyntryy.com`, admin URL from env); branch/commit; which gates to run. |
| **Definition of done** | Command outputs captured (pass/fail); production HTTP checklist from `docs/modules/deploy/T40_VERIFICATION.md`; failures filed with repro steps for other experts. |

**Prompt template (filled example):**

```text
Verification Expert — VoltGear

Read-only verification unless fixing test flakes is explicitly in scope.

Run: npm test, npm run smoke:t40, npm run audit:security.
Production: GET https://buyntryy.com/, /sitemap.xml, confirm /admin redirects to ADMIN_PUBLIC_URL; admin host https://voltgear-admin-pi.vercel.app/login loads.

Done when: paste pass/fail per command; list any HTTP status failures; reference T40_VERIFICATION.md checklist items checked.
Do not deploy to Vercel.
```

---

### 5. Security Expert

| Field | Detail |
|--------|--------|
| **Mission** | **`npm run audit:security`**, RLS review, rate limits, public env allowlist, admin auth boundaries; align with `docs/modules/security/`. |
| **subagent_type** | `security-review` (local diff / scope review) or `explore` (repo-wide policy hunt) |
| **When to use** | Before merge on auth/API changes, after new routes or webhooks, periodic hardening, remediation item **#8**. |
| **Inputs required** | Diff scope (`branch changes` vs `uncommitted changes`) or feature ID; files touching API, middleware, env. |
| **Definition of done** | Findings ranked by severity with file refs; RLS/rate-limit gaps identified; no destructive prod tests; remediation tied to `docs/REMEDIATION-STEPS.md` if needed. |

**Prompt template (filled example):**

```text
Security Expert — VoltGear

Scope: uncommitted changes on apps/admin API routes and Resend webhook handler.

Run npm run audit:security. Review RLS on orders/contact tables and rate limits on public API routes per docs/modules/security/SECURITY_AUDIT.md.

Done when: structured findings (critical/high/medium); confirm RESEND_WEBHOOK_SECRET not logged; no shop /api/admin surface on voltgear.
Use security-review subagent for diff; do not rotate secrets without human.
```

---

### 6. Docs / Release Expert

| Field | Detail |
|--------|--------|
| **Mission** | Keep **`docs/dev-priorities.md`**, module **`RELEASE_NOTES.md`**, and **`docs/REMEDIATION-STEPS.md`** aligned with shipped work and open ops. |
| **subagent_type** | `generalPurpose` or `explore` (read-only audit of doc drift) |
| **When to use** | End of slice/PR, after deploy verification, when ops tasks complete or priorities shift. |
| **Inputs required** | T-## ID; what shipped; verification evidence; links to deploy/security/email modules. |
| **Definition of done** | Active task / T-## status updated; relevant `RELEASE_NOTES.md` entry; remediation checklist ticks with dates; no code changes unless typo in docs only. |

**Prompt template (filled example):**

```text
Docs/Release Expert — VoltGear

Task: After shop redeploy with ADMIN_PUBLIC_URL=https://voltgear-admin-pi.vercel.app, update docs/dev-priorities.md (T-40 note), docs/modules/deploy/RELEASE_NOTES.md, and tick item 5 in docs/REMEDIATION-STEPS.md if smoke:t40 passed.

Inputs: verification expert output attached; date 2026-09-26.

Done when: priorities reflect ✅ or 🟡 accurately; release note one-liner added; remediation bullets match reality.
Do not edit application source except docs/**/*.md.
```

---

## Parallel dispatch rules

1. **Independent domains only** — Run agents in parallel when they do not edit the same files or the same Vercel project. Safe parallel pairs: Supabase/DB + Security (review); Verification + Docs (after deploy exists); Admin Deploy + Shop Deploy only if **sequenced** (admin URL stable → then shop `ADMIN_PUBLIC_URL` → then shop redeploy).

2. **One writer per path** — Never assign two agents to the same migration, same `apps/*` feature slice, or same env var rotation in one wave.

3. **Vercel production** — Any `vercel deploy --prod`, production promote, or prod env change requires **explicit human approval** in the coordinator chat before the subagent runs it.

4. **Secrets** — Subagents may **name** env vars; humans paste values in Vercel/Resend/Supabase dashboards.

5. **Merge order** — Coordinator integrates: code/DB → deploy → verification → docs/release.

6. **subagent_type quick map**

   | Role | Primary type | Alternate |
   |------|----------------|-----------|
   | Shop Deploy | `generalPurpose` | — |
   | Admin Deploy | `generalPurpose` | — |
   | Supabase/DB | `generalPurpose` | `explore` |
   | Verification | `generalPurpose` | `ci-investigator` |
   | Security | `security-review` | `explore` |
   | Docs/Release | `generalPurpose` | `explore` |

   Use **`bugbot`** only when the human asks for a Bugbot-style review of local diffs (not a standing roster role).

---

## Current open ops tasks

- **Shop redeploy** after `ADMIN_PUBLIC_URL=https://voltgear-admin-pi.vercel.app` on **voltgear** (then run `npm run smoke:t40`).
- **Connect voltgear-admin GitHub auto-deploy** (monorepo, root `apps/admin`, `main`).
- **`RESEND_WEBHOOK_SECRET`** on admin Vercel + matching webhook URL in Resend dashboard (`docs/modules/email/RESEND_WEBHOOKS.md`).
- **Optional alias** `voltgear-admin.vercel.app` — only with human DNS/Vercel approval.

---

## Coordinator checklist

1. Pick roles from the table above; paste filled prompts into parallel **Task** subagents.
2. Wait for outputs; resolve duplicate file edits manually.
3. Run Verification Expert after any prod deploy.
4. Run Docs/Release Expert before closing the ops batch in `dev-priorities.md`.
