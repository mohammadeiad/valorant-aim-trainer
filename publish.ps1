$ErrorActionPreference = "Stop"

$RepoName = "valorant-aim-trainer"
$GitHubUser = "mohammadeiad"
$RemoteUrl = "https://github.com/$GitHubUser/$RepoName.git"

Write-Host "Publishing VAL Track to $RemoteUrl" -ForegroundColor Cyan

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw "Git is not installed or not available in PATH."
}

if (-not (Test-Path ".git")) {
    git init
}

git add .

$changes = git status --porcelain
if ($changes) {
    git commit -m "Add Valorant aim tracking trainer"
} else {
    Write-Host "No new changes to commit." -ForegroundColor Yellow
}

git branch -M main

$existingOrigin = git remote get-url origin 2>$null
if ($LASTEXITCODE -eq 0) {
    git remote set-url origin $RemoteUrl
} else {
    git remote add origin $RemoteUrl
}

git push -u origin main

Write-Host "" 
Write-Host "Push complete." -ForegroundColor Green
Write-Host "Repository: https://github.com/$GitHubUser/$RepoName"
Write-Host "After GitHub Pages is enabled with GitHub Actions:"
Write-Host "https://$GitHubUser.github.io/$RepoName/"
