# Security — release notes

## 2026-09-25 — Remediation step 8

- RLS enabled on `homepage_sections` + `homepage_section_products`.
- CI audit: `npm run audit:security` (migrations RLS + public env allowlist).
- Shop API marker tests; rate limits on order cancel and deal quote POST.
- Runbook: `docs/modules/security/SECURITY_AUDIT.md`.
