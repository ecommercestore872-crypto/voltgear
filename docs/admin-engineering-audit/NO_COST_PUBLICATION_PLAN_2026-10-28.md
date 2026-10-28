# Buy N Try — no-cost publication proposal

2026-10-28. **Plan ready; publication remains NO-GO until the exact configuration
change is approved and included in the first published candidate.** No Vercel
settings, app configuration, Git refs, credentials or database data were changed.
Only this plan and ignored local audit/validation evidence were written.

## Fresh read-only findings

Team: hassaans-projects-e3451522 / team_fcsXz74VGCxgnrYKGnOsSfLG.

| Project | ID | Root | Dashboard ignored-build command | Production branch |
| --- | --- | --- | --- | --- |
| voltgear |prj_gHAuBl5SMG1FnJ45GeinQN2gNGnB|apps/storefront|null|main|
| voltgear-admin |prj_LgVWqruDirgQKMPgDgH0zpHtrC6K|apps/admin|null|main|

Both expose system environment variables. Current project production targets:

- Storefront: dpl_7wohBE6QHspaAHbCSQj4zrfSnNh4.
- Admin: dpl_GZcDV3XPcCHcFjtey7o7Ndo57ckq.
- Both target metadata reports commit2188a0b3cb1a9b4c689026a259c675e5a4a1ac8c.

Source configuration, unchanged:

- apps/storefront/vercel.json: ignoreCommand is
  `node ../../scripts/vercel-ignore-build.mjs storefront`.
- apps/admin/vercel.json: ignoreCommand is
  `node ../../scripts/vercel-ignore-build.mjs admin`.
- Neither contains git.deploymentEnabled. No additional root vercel.json or
  vercel.ts was found in the working source configuration inventory.
- Shared changes make both existing ignore scripts continue building; absent or
  uncertain previous-SHA baselines also continue building.

Vercel states that [repository ignoreCommand overrides the dashboard setting](https://vercel.com/docs/project-configuration/vercel-json).
Consequently changing only the dashboard to “Only build production” would not
reliably suppress these previews. Do not approve that ineffective change.

## Recommended minimal configuration

Use a dedicated publication branch named **codex/admin-release-publication**.
Add this property to **both existing app vercel.json files**, retaining all current
properties and both ignore commands:

```json
{
  "git": {
    "deploymentEnabled": {
      "codex/admin-release-publication": false
    }
  }
}
```

This is an additive repository configuration proposal, **not** a dashboard/API
settings update. It requires two file changes and zero Vercel setting writes.
Vercel's [supported Git configuration](https://vercel.com/docs/project-configuration/git-configuration)
can suppress automatic deployments for an exact branch; unspecified branches stay
enabled. Do not add an overlapping true wildcard rule. No universal `false`,
main-branch exclusion, deprecated github.enabled or team-wide change is proposed.

Prefer preventing the automatic deployment trigger to starting a build merely to
cancel it. [Ignored-build cancellations still consume deployment quota and slots](https://vercel.com/docs/project-configuration/project-settings).
An environment-based ignored command also depends on variable exposure and leaves
the current repository override problem to solve.

## Cost and expected side effects

- No new project, staging service, paid protection add-on, runner or database.
  The disabled branch should create no automatic app build/runtime deployment.
- GitHub metadata currently reports this repository public. Existing CI uses
  standard ubuntu-latest runners; [standard public-repository Actions usage is free](https://docs.github.com/en/actions/concepts/billing-and-usage).
  Do not switch to larger runners or buy storage. Recheck visibility/usage rules
  if that context changes. This proposal does not reduce the existing Vercel plan
  subscription or costs from unrelated traffic/deployments.
- Existing production targets, domains, functions and cron schedules keep serving.
  Other branches retain their current behavior; their previews remain unsafe for
  synthetic writes unless independently isolated.
- This branch has no Vercel visual preview. Vercel checks may be absent/skipped;
  do not bypass any required checks or branch-protection rules to compensate.
- This controls automatic Git deployments only. Manual CLI/dashboard deployment,
  deploy hooks and independent deployment workflows are not a security sandbox.
  Nobody should invoke them for this production-connected branch. The inspected
  repository Actions workflow contains verification jobs, no Vercel deploy command.
- Renaming the branch loses the exact-name exclusion unless both rules are updated
  first. Removing the rule can immediately restore automatic previews.
- If this configuration later reaches main, the main branch is still enabled;
  this does not authorize a merge or production deployment.

## Verification procedure — future approved execution

1. Re-read both exact project roots, production targets/aliases and ignored-build
   settings. Record sanitized before-state. Confirm the proposed branch is unused
   or owned by this task; never overwrite someone else's branch.
2. After separate approval, add only the property above to both configs. Parse
   JSON, inspect the diff and ensure there is no vercel.ts or conflicting Git rule.
   Preserve all current build/install/ignore/cron settings and unrelated work.
3. Inspect the **actual committed blobs** before any push. Both safety rules must
   be present in the first published candidate, not added by a later push. Do not
   publish an unprotected bootstrap branch or intermediate branch event. If needed,
   prepare one protected publication commit atop the existing remote draft-chain
   base while preserving the original unpublished local history separately; review
   its complete net diff before approving publication. Never force-push dependencies.
4. Preserve PRs28–30 as drafts. A follow-up based on PR30's
   codex/collection-integrity-acceptance matches the current Actions PR-base filters;
   codex/isolated-staging-certification is also included in the prepared workflow.
   A feature-branch push alone does not trigger its push filter, which is main-only.
   Opening the approved draft PR must trigger verify and product-integrity jobs.
5. Only when publication is separately allowed, push the protected final candidate
   and open/update the draft PR. Capture the exact final SHA. Read GitHub CI results
   for that SHA; do not substitute old CI or assume skipped Vercel checks are CI.
6. Read both Vercel deployment inventories for the exact SHA and branch. Confirm no
   install/build, READY preview or new runtime is created; a provider skipped-status
   record is not itself an application deployment. Do not start a build to test the
   rule, click Redeploy or invoke a bypass. Recheck the recorded production targets
   and domain bindings are unchanged. Investigate unexpected activity and stop
   further pushes; cancellation/settings changes would need separate approval.
7. Keep production NO-GO and do not exercise old/production-connected preview URLs
   with synthetic writes. Hosted browser acceptance and old-admin closure remain
   separate requirements.

## Rollback procedure

Before publication, remove only the two newly added branch rules (and their empty
git containers), preserving every original property. The in-memory validation
confirmed that doing so restores the exact original configuration objects.

**After publication, do not push that rollback while previews still target
production.** A revert that removes the exclusion can itself trigger an unsafe
preview. The safe immediate course is to retain the exclusion and stop further
publication. Restore automatic previews only after separate approval and verified
isolated preview environments, or another independently verified deployment block.
No production app rollback, alias change, secret rotation or data restore is
needed for this proposal, because it does not alter the currently served apps.

## Verified now versus pending

Verified: provider documentation, fresh read-only settings for both projects,
repository overrides, CI trigger/no-deploy workflow inspection, current public
repository visibility and in-memory proposal assertions for both app configs.
Assertions verify JSON construction, exact branch=false, unchanged main/other
branch defaults, unchanged ignore commands, reversible object changes and untouched
working files. Evidence:

- tmp/isolated-staging/release-readiness-20261028/ignore-settings-235a624f-824b-4823-bee7-5970cda077c4.json
- tmp/isolated-staging/release-readiness-20261028/publication-config-proposal-validation.json

Not executed: app-config edits, Git staging/commits/push, a hosted Git event proving
effective suppression, new PR or CI run. Static checks are not a live test of the
first push. Stop if the effective root/config or branch differs from this proposal.

## Precise approval requested

Approve adding only git.deploymentEnabled["codex/admin-release-publication"]=false
to apps/storefront/vercel.json and apps/admin/vercel.json, leaving Vercel dashboard
settings unchanged. This approval step permits preparation/verification of those
two local configuration edits only; it does not yet authorize publication, merge,
manual deployment, production settings or data changes.
