# Controlled draft publication — not a production release

This candidate follows draft PR30 (`codex/collection-integrity-acceptance`,
9d0692ace7fbc7b8af52c8a21704374611061036). It consolidates the reviewed local
session/isolation work through c3304ccb6ab4c679aeedab0655769288f2f6236a plus
the verified hydration fix, portable streaming/CI contracts, actual migration
failure harness, distinct rollback tooling and release evidence. The original
five local commits and unfinished work remain preserved separately.

The first publication commit must contain the exact branch exclusion for
codex/admin-release-publication in both app vercel.json files. Existing ignore,
install/build/region/cron settings are retained. No main/dependency ref is pushed.
Keep this PR and dependency PRs draft, with no merge or production activation.

Local evidence:1090 unit tests, both lint/typechecks,10 streaming contracts,
19 safety contracts, three migration-plan contracts, ten storefront budgets,
11 actual isolated migration scenarios and five distinct local rollback groups
including ten production-mode browser editor visits. The primary build has the
separately retained30-cycle hydration regression. See LOCAL_RELEASE_PREPARATION_2026-10-28.md.

Exact-commit GitHub CI and provider suppression are to be checked immediately
after the authorized single publication attempt and reported with the PR/SHA.
Prior local success is not a claim of final GitHub CI or hosted acceptance.

No credentials, private keys, browser profiles/sessions, generated test records,
temporary certificates, archived builds or ignored tmp artifacts belong in the
candidate. Auth/migration/rollback source tests deliberately use synthetic inputs;
they are not exported customer or fixture datasets.

Production remains NO-GO. Remaining gates include final trusted-HTTPS native
cookie/upload acceptance, hosted behavior/latency, old-admin entry-point closure,
verified hosted rollback configuration and separately approved schema/cutover.
The React streaming mitigation remains version/scope bound. SQL files are
prepared source only; publication never authorizes production migration execution.
