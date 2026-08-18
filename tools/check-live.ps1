# 배포 후 라이브 사이트 점검
# 사이트가 제대로 올라갔는지, 내 폴더와 일치하는지 확인합니다.

$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot
$localDir = Join-Path $root 'public'   # 내 컴퓨터의 사이트 파일 폴더
$site = 'https://isabiseo.com'

Write-Host ""
Write-Host "=== 라이브 사이트 점검 ===" -ForegroundColor Cyan
Write-Host ""

function Get-Text($url) {
  try { return (Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 20).Content }
  catch { return $null }
}
function Get-Status($url) {
  try { return (Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 20).StatusCode }
  catch {
    if ($_.Exception.Response) { return [int]$_.Exception.Response.StatusCode }
    return 0
  }
}

$fail = 0

# 1. 홈 접속
$code = Get-Status $site
if ($code -eq 200) { Write-Host "[정상] 홈페이지 접속 (200)" -ForegroundColor Green }
else { Write-Host ("[문제] 홈페이지 응답 {0}" -f $code) -ForegroundColor Red; $fail++ }

# 2. 캐시 버전 일치
$localVer = [regex]::Match((Get-Content (Join-Path $localDir 'index.html') -Raw -Encoding UTF8), '\?v=(\d+)').Groups[1].Value
$homeHtml = Get-Text $site
$liveVer = ''
if ($homeHtml) { $liveVer = [regex]::Match($homeHtml, 'style\.css\?v=(\d+)').Groups[1].Value }
if ($liveVer -eq $localVer -and $liveVer -ne '') {
  Write-Host ("[정상] 캐시 버전 일치 (?v={0})" -f $liveVer) -ForegroundColor Green
} else {
  Write-Host ("[문제] 캐시 버전 불일치 — 내 폴더 ?v={0} / 라이브 ?v={1}. 배포가 안 됐을 수 있습니다." -f $localVer, $liveVer) -ForegroundColor Red
  $fail++
}

# 3. 사이트맵 주소 수 비교
$localMap = ([regex]::Matches((Get-Content (Join-Path $localDir 'sitemap.xml') -Raw -Encoding UTF8), '<loc>')).Count
$liveMapText = Get-Text "$site/sitemap.xml"
$liveMap = 0
if ($liveMapText) { $liveMap = ([regex]::Matches($liveMapText, '<loc>')).Count }
if ($localMap -eq $liveMap) {
  Write-Host ("[정상] 사이트맵 주소 {0}개 일치" -f $liveMap) -ForegroundColor Green
} else {
  Write-Host ("[문제] 사이트맵 불일치 — 내 폴더 {0}개 / 라이브 {1}개" -f $localMap, $liveMap) -ForegroundColor Red
  $fail++
}

# 4. 가이드 글 수 비교
$localGuides = (Get-ChildItem (Join-Path $localDir 'guide') -Filter *.html -File).Count
$guideText = Get-Text "$site/guide"
$liveGuides = 0
if ($guideText) { $liveGuides = ([regex]::Matches($guideText, 'class="card" href="/guide/')).Count }
if ($localGuides -eq $liveGuides) {
  Write-Host ("[정상] 가이드 글 {0}편 일치" -f $liveGuides) -ForegroundColor Green
} else {
  Write-Host ("[확인] 내 폴더 가이드 {0}편 / 라이브 목록 {1}개. 아직 배포를 안 했거나, 목록에 안 올라간 글이 있습니다." -f $localGuides, $liveGuides) -ForegroundColor Yellow
}

# 5. 사이트맵의 모든 가이드 주소가 실제로 열리는지
Write-Host ""
Write-Host "가이드 주소 응답 확인 중..." -ForegroundColor Gray
$broken = @()
if ($liveMapText) {
  $locs = [regex]::Matches($liveMapText, '<loc>([^<]+)</loc>') | ForEach-Object { $_.Groups[1].Value }
  foreach ($u in $locs) {
    $c = Get-Status $u
    if ($c -ne 200) { $broken += ("{0}  ({1})" -f $u, $c) }
  }
}
if ($broken.Count -eq 0) {
  Write-Host ("[정상] 사이트맵의 모든 주소가 열립니다 ({0}개)" -f $locs.Count) -ForegroundColor Green
} else {
  Write-Host "[문제] 안 열리는 주소:" -ForegroundColor Red
  $broken | ForEach-Object { Write-Host ("   " + $_) -ForegroundColor Red }
  $fail++
}

Write-Host ""
if ($fail -eq 0) { Write-Host "전부 정상입니다." -ForegroundColor Green }
else { Write-Host ("문제 {0}건. 위 빨간 줄을 확인하세요." -f $fail) -ForegroundColor Red }
Write-Host ""
