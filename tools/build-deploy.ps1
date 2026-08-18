# Cloudflare Pages 배포용 zip 만들기
#
# public 폴더만 통째로 압축합니다. 문서·도구·옛 zip은 애초에 public 밖에 있어
# 따로 제외할 필요가 없습니다.
#
# 참고: 깃허브 자동 배포를 쓰기 시작하면 이 도구는 안 쓰셔도 됩니다.
#       비상시(자동 배포가 멈췄을 때) 손으로 올리는 용도로 남겨둡니다.

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem

$root  = Split-Path -Parent $PSScriptRoot
$site  = Join-Path $root 'public'
$stamp = Get-Date -Format 'yyyy-MM-dd-HHmm'
$out   = Join-Path $root ("ebiseo-deploy-{0}.zip" -f $stamp)

Write-Host ""
Write-Host "=== 배포 파일 만들기 ===" -ForegroundColor Cyan

if (-not (Test-Path $site)) {
  Write-Host "public 폴더를 찾을 수 없습니다: $site" -ForegroundColor Red
  exit 1
}

$bs = [string][char]92
$fs = [string][char]47

if (Test-Path $out) { [System.IO.File]::Delete($out) }
$zip = [System.IO.Compression.ZipFile]::Open($out, 'Create')
Get-ChildItem $site -Recurse -File | ForEach-Object {
  $rel = $_.FullName.Substring($site.Length + 1).Replace($bs, $fs)
  [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $rel, 'Optimal')
}
$zip.Dispose()

# 검증
$z = [System.IO.Compression.ZipFile]::OpenRead($out)
$total    = $z.Entries.Count
$guides   = ($z.Entries | Where-Object { $_.FullName.StartsWith('guide/') }).Count
$hasCss   = [bool]($z.Entries | Where-Object { $_.FullName -eq 'css/style.css' })
$hasHdr   = [bool]($z.Entries | Where-Object { $_.FullName -eq '_headers' })
$hasMap   = [bool]($z.Entries | Where-Object { $_.FullName -eq 'sitemap.xml' })
$hasIndex = [bool]($z.Entries | Where-Object { $_.FullName -eq 'index.html' })
$backslsh = ($z.Entries | Where-Object { $_.FullName.Contains($bs) }).Count
$leaked   = ($z.Entries | Where-Object { $_.FullName -like '*.md' -or $_.FullName -like '*.ps1' -or $_.FullName -like '*.zip' -or $_.FullName -like '*.bat' }).Count
$z.Dispose()

Write-Host ""
Write-Host ("파일 위치 : {0}" -f $out) -ForegroundColor Green
Write-Host ("총 파일   : {0}개" -f $total)
Write-Host ("가이드 글 : {0}편" -f $guides)
Write-Host ("크기      : {0} KB" -f [math]::Round((Get-Item $out).Length / 1KB))
Write-Host ""

$ok = $true
if (-not $hasIndex)  { Write-Host "[문제] index.html 이 빠졌습니다"     -ForegroundColor Red; $ok = $false }
if (-not $hasCss)    { Write-Host "[문제] css/style.css 가 빠졌습니다"  -ForegroundColor Red; $ok = $false }
if (-not $hasHdr)    { Write-Host "[문제] _headers 가 빠졌습니다"       -ForegroundColor Red; $ok = $false }
if (-not $hasMap)    { Write-Host "[문제] sitemap.xml 이 빠졌습니다"    -ForegroundColor Red; $ok = $false }
if ($backslsh -gt 0) { Write-Host "[문제] 경로 구분자가 잘못됐습니다"   -ForegroundColor Red; $ok = $false }
if ($leaked -gt 0)   { Write-Host "[문제] 배포하면 안 되는 파일이 섞였습니다 ($leaked 개)" -ForegroundColor Red; $ok = $false }

if ($ok) {
  Write-Host "검사 통과. 이 파일을 Cloudflare에 올리시면 됩니다." -ForegroundColor Green
  Write-Host ""
  Write-Host "  dash.cloudflare.com -> Workers & Pages -> 프로젝트 선택"
  Write-Host "  -> Create deployment -> Production -> file -> 위 zip 선택 -> Save and deploy"
}
Write-Host ""
