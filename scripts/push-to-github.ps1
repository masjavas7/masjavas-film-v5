# Push MASJAVAS Film V5 ke GitHub (jalankan setelah: gh auth login)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot\..

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Write-Error 'GitHub CLI (gh) tidak ditemukan. Instal: winget install GitHub.cli'
}

gh auth status
if ($LASTEXITCODE -ne 0) {
  Write-Host 'Login dulu: gh auth login'
  exit 1
}

$exists = gh repo view masjavas-film-v5 2>$null
if ($LASTEXITCODE -ne 0) {
  gh repo create masjavas-film-v5 --public --source=. --remote=origin --description "MASJAVAS Film V5 - AI cinematic video desktop app"
} else {
  if (-not (git remote get-url origin 2>$null)) {
    gh repo set-default
    git remote add origin (gh repo view masjavas-film-v5 --json url -q .url + '.git')
  }
}

git push -u origin main
Write-Host 'Selesai. URL:' (gh repo view masjavas-film-v5 --json url -q .url)