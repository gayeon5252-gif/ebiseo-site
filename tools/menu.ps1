# 이비서 작업 도구 — 메뉴
$ErrorActionPreference = 'Continue'

while ($true) {
  Clear-Host
  Write-Host ""
  Write-Host "  ==============================" -ForegroundColor Cyan
  Write-Host "        이비서 작업 도구" -ForegroundColor Cyan
  Write-Host "  ==============================" -ForegroundColor Cyan
  Write-Host ""
  Write-Host "   1.  새 가이드 글 만들기"
  Write-Host "       제목만 넣으면 파일·목록·사이트맵까지 한 번에"
  Write-Host ""
  Write-Host "   2.  배포 파일 만들기"
  Write-Host "       Cloudflare에 올릴 zip 생성 (뺄 파일 자동 제외)"
  Write-Host ""
  Write-Host "   3.  캐시 버전 올리기"
  Write-Host "       CSS·JS를 고쳤을 때만 실행"
  Write-Host ""
  Write-Host "   4.  라이브 사이트 점검"
  Write-Host "       배포가 제대로 됐는지 확인"
  Write-Host ""
  Write-Host "   0.  끝내기"
  Write-Host ""
  $sel = Read-Host "  번호를 입력하세요"

  switch ($sel) {
    '1' { & (Join-Path $PSScriptRoot 'new-guide.ps1');    Read-Host "`n  엔터를 누르면 메뉴로 돌아갑니다" }
    '2' { & (Join-Path $PSScriptRoot 'build-deploy.ps1'); Read-Host "`n  엔터를 누르면 메뉴로 돌아갑니다" }
    '3' { & (Join-Path $PSScriptRoot 'bump-version.ps1'); Read-Host "`n  엔터를 누르면 메뉴로 돌아갑니다" }
    '4' { & (Join-Path $PSScriptRoot 'check-live.ps1');   Read-Host "`n  엔터를 누르면 메뉴로 돌아갑니다" }
    '0' { return }
    default { Write-Host "  1~4 또는 0을 입력하세요." -ForegroundColor Yellow; Start-Sleep -Seconds 1 }
  }
}
