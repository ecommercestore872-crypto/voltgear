# Deploy admin (apps/admin) to your current Vercel login.
# Shop stays on ecommercestore872-crypto / buyntryy.com - set ADMIN_PUBLIC_URL on shop to this admin URL.
param(
  [string]$ProjectName = "voltgear-admin",
  [string]$StorefrontUrl = "https://buyntryy.com"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host "Using current Vercel account (run 'vercel whoami' to confirm)."
vercel whoami

$adminDir = Join-Path $Root "apps\admin"
if (-not (Test-Path (Join-Path $adminDir "package.json"))) {
  throw "Missing apps/admin - run this script from the monorepo (scripts/ folder under repo root)."
}

if (-not (Test-Path (Join-Path $Root ".vercel\project.json"))) {
  Write-Host "Link repo root to project '$ProjectName' on this account..."
  vercel link --yes --project $ProjectName
}

$installCmd = "cd ../.. && npm ci"
$buildCmd = "cd ../.. && npm run build -w @voltgear/admin"

vercel project update $ProjectName `
  --root-directory apps/admin `
  --install-command $installCmd `
  --build-command $buildCmd

Write-Host ""
Write-Host "Set on project '$ProjectName' (Production + Preview):"
Write-Host "  STOREFRONT_URL = $StorefrontUrl"
Write-Host "  Same ADMIN_TOKEN, Supabase, Cloudinary, Resend as production shop."
Write-Host ""
Write-Host "Copy env from .env.local (repo root must be linked to voltgear-admin):"
Write-Host "  node scripts/push-vercel-env.mjs"
Write-Host "  Then run this script again or: vercel deploy --prod --yes (from repo root)"
Write-Host ""

Set-Location $Root
# Project Root Directory is apps/admin — deploy from monorepo root only (not --cwd apps/admin).
vercel deploy --prod --yes

Write-Host ""
Write-Host "IMPORTANT - on the SHOP Vercel project (ecommercestore872-crypto / voltgear):"
Write-Host "  ADMIN_PUBLIC_URL = https://voltgear-admin.vercel.app"
Write-Host "  Redeploy shop after changing ADMIN_PUBLIC_URL."
Write-Host "  Open /admin/login on the admin production URL to use the CMS."
