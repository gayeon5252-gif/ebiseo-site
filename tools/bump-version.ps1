# 캐시 버전 올리기 (?v=N -> ?v=N+1)
# CSS·JS를 고친 뒤 실행하면 모든 HTML의 버전 번호가 한 번에 올라갑니다.
# 방문자 브라우저가 옛 파일을 붙들고 있는 문제를 없애줍니다.

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$site = Join-Path $root 'public'   # 배포되는 사이트 파일이 있는 폴더

Write-Host ""
Write-Host "=== 캐시 버전 올리기 ===" -ForegroundColor Cyan

$indexPath = Join-Path $site 'index.html'
if (-not (Test-Path $indexPath)) {
  Write-Host "index.html을 찾을 수 없습니다: $root" -ForegroundColor Red
  exit 1
}

$index = Get-Content $indexPath -Raw -Encoding UTF8
$m = [regex]::Match($index, '\?v=(\d+)')
if (-not $m.Success) {
  Write-Host "현재 버전 번호를 찾지 못했습니다." -ForegroundColor Red
  exit 1
}

$cur = [int]$m.Groups[1].Value
$next = $cur + 1

Write-Host ("현재 버전: ?v={0}  ->  새 버전: ?v={1}" -f $cur, $next)
Write-Host ""

$files = Get-ChildItem $site -Recurse -Filter *.html -File
$changedFiles = 0
$changedSpots = 0

foreach ($f in $files) {
  $text = Get-Content $f.FullName -Raw -Encoding UTF8
  $hits = ([regex]::Matches($text, "\?v=$cur\b")).Count
  if ($hits -gt 0) {
    $new = $text -replace "\?v=$cur\b", "?v=$next"
    [System.IO.File]::WriteAllText($f.FullName, $new, (New-Object System.Text.UTF8Encoding($false)))
    $changedFiles++
    $changedSpots += $hits
  }
}

Write-Host ("바뀐 파일: {0}개" -f $changedFiles) -ForegroundColor Green
Write-Host ("바뀐 위치: {0}곳" -f $changedSpots) -ForegroundColor Green
Write-Host ""
Write-Host "다음 순서: 2번(배포 파일 만들기)을 실행한 뒤 Cloudflare에 올리세요."
Write-Host ""
