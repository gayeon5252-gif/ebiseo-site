# 새 가이드 글 만들기
# 제목만 넣으면 주소·파일·목록·사이트맵을 전부 자동으로 만듭니다.

param(
  [string]$Title,
  [string]$Desc,
  [string]$CategoryNo,
  [string]$Slug,
  [int]$Minutes = 6,
  [switch]$Auto
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$site = Join-Path $root 'public'   # 배포되는 사이트 파일이 있는 폴더

# ---------- 한글 제목 -> 영문 주소 자동 변환 ----------
$CHO  = @('g','kk','n','d','tt','r','m','b','pp','s','ss','','j','jj','ch','k','t','p','h')
$JUNG = @('a','ae','ya','yae','eo','e','yeo','ye','o','wa','wae','oe','yo','u','wo','we','wi','yu','eu','ui','i')
$JONG = @('','k','k','k','n','n','n','t','l','k','m','l','l','l','p','l','m','p','p','t','t','ng','t','t','k','t','p','t')

function ConvertTo-Slug([string]$text) {
  $sb = New-Object System.Text.StringBuilder
  foreach ($ch in $text.ToCharArray()) {
    $code = [int]$ch
    if ($code -ge 0xAC00 -and $code -le 0xD7A3) {
      $idx  = $code - 0xAC00
      $iCho  = [int][math]::Floor($idx / 588)
      $iJung = [int][math]::Floor(($idx % 588) / 28)
      $iJong = [int]($idx % 28)
      [void]$sb.Append($CHO[$iCho]).Append($JUNG[$iJung]).Append($JONG[$iJong])
    }
    elseif ($ch -match '[a-zA-Z0-9]') { [void]$sb.Append($ch.ToString().ToLower()) }
    else { [void]$sb.Append('-') }
  }
  $s = $sb.ToString() -replace '-+', '-'
  $s = $s.Trim('-')
  if ($s.Length -gt 42) {
    $cut  = $s.Substring(0, 42)
    $last = $cut.LastIndexOf('-')
    if ($last -gt 15) { $s = $cut.Substring(0, $last) } else { $s = $cut }
  }
  return $s.Trim('-')
}

$CATS = @('계약 안전','행정','이사 비용','주거','청년·1인가구','대출','준비물','이사 방식','이사 후','상황별')

Write-Host ""
Write-Host "=== 새 가이드 글 만들기 ===" -ForegroundColor Cyan
Write-Host ""

# ---------- 1. 제목 ----------
if (-not $Title) {
  Write-Host "글 제목을 한글로 그대로 쓰세요."
  Write-Host "  예) 반려동물과 함께 이사하기" -ForegroundColor DarkGray
  Write-Host ""
  $Title = Read-Host "제목"
}
$Title = $Title.Trim()
if (-not $Title) { Write-Host "제목이 비어 있습니다." -ForegroundColor Red; exit 1 }

# ---------- 2. 분류 ----------
if (-not $CategoryNo) {
  Write-Host ""
  Write-Host "이 글은 어느 분류인가요? 번호를 고르세요."
  Write-Host ""
  for ($i = 0; $i -lt $CATS.Count; $i++) {
    Write-Host ("   {0,2}. {1}" -f ($i + 1), $CATS[$i])
  }
  Write-Host ""
  $CategoryNo = Read-Host "번호"
}
$ci = 0
if (-not [int]::TryParse($CategoryNo, [ref]$ci) -or $ci -lt 1 -or $ci -gt $CATS.Count) {
  Write-Host ("1~{0} 사이 번호를 입력하세요." -f $CATS.Count) -ForegroundColor Red
  exit 1
}
$Category = $CATS[$ci - 1]

# ---------- 3. 한 줄 설명 ----------
if (-not $Desc) {
  Write-Host ""
  Write-Host "검색 결과에서 제목 아래 뜨는 한 줄 설명입니다."
  Write-Host "  예) 이사 당일 반려동물을 어디에 둘지부터 새집 적응까지 정리했습니다." -ForegroundColor DarkGray
  Write-Host ""
  $Desc = Read-Host "한 줄 설명"
}
$Desc = $Desc.Trim()
if (-not $Desc) { $Desc = $Title }

# ---------- 4. 주소 자동 생성 ----------
if (-not $Slug) { $Slug = ConvertTo-Slug $Title }
if (-not $Slug) { $Slug = 'guide-' + (Get-Date -Format 'yyyyMMdd-HHmm') }

if (-not $Auto) {
  Write-Host ""
  Write-Host "인터넷 주소는 이렇게 만들어집니다." -ForegroundColor Cyan
  Write-Host ("   isabiseo.com/guide/{0}" -f $Slug) -ForegroundColor Yellow
  Write-Host ""
  Write-Host "그대로 쓰시려면 그냥 엔터를 누르세요." -ForegroundColor DarkGray
  $custom = Read-Host "엔터 = 이대로"
  if ($custom.Trim()) { $Slug = $custom.Trim().ToLower() }
}

$Slug = ($Slug -replace '[^a-z0-9\-]', '').Trim('-')
if (-not $Slug) { Write-Host "주소를 만들 수 없습니다." -ForegroundColor Red; exit 1 }

$guidePath = Join-Path $site ("guide\{0}.html" -f $Slug)
if (Test-Path $guidePath) {
  Write-Host ""
  Write-Host ("이미 같은 주소의 글이 있습니다: {0}" -f $Slug) -ForegroundColor Red
  Write-Host "제목을 조금 바꿔서 다시 해보세요."
  exit 1
}

$index = Get-Content (Join-Path $site 'index.html') -Raw -Encoding UTF8
$ver = [regex]::Match($index, '\?v=(\d+)').Groups[1].Value
if (-not $ver) { $ver = '11' }

$today = Get-Date -Format 'yyyy-MM-dd'
$url = "https://isabiseo.com/guide/$Slug"

$tpl = @'
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta property="og:type" content="article">
<meta property="og:site_name" content="이비서">
<meta property="og:title" content="{{TITLE}}">
<meta property="og:description" content="{{DESC}}">
<meta property="og:url" content="{{URL}}">
<meta property="og:image" content="https://isabiseo.com/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{{TITLE}}">
<meta name="twitter:description" content="{{DESC}}">
<meta name="twitter:image" content="https://isabiseo.com/og-image.png">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/favicon.svg">
<title>{{TITLE}} | 이비서</title>
<meta name="description" content="{{DESC}}">
<link rel="canonical" href="{{URL}}">
<link rel="stylesheet" href="/css/style.css?v={{VER}}">
<style>.article-body p{font-size:15px;margin-bottom:12px}.article-body h2{margin:20px 0 8px}.crumb{font-size:13px;color:var(--sub);margin:16px 0 4px}.crumb a{color:var(--sub)}</style>
<script type="application/ld+json">
{"@context": "https://schema.org", "@type": "Article", "headline": "{{TITLE}}", "description": "{{DESC}}", "datePublished": "{{DATE}}", "dateModified": "{{DATE}}", "inLanguage": "ko-KR", "mainEntityOfPage": {"@type": "WebPage", "@id": "{{URL}}"}, "author": {"@type": "Organization", "name": "이비서", "url": "https://isabiseo.com/"}, "publisher": {"@type": "Organization", "name": "이비서", "url": "https://isabiseo.com/", "logo": {"@type": "ImageObject", "url": "https://isabiseo.com/favicon.svg"}}, "image": "https://isabiseo.com/og-image.png"}
</script>
<script type="application/ld+json">
{"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "홈", "item": "https://isabiseo.com/"}, {"@type": "ListItem", "position": 2, "name": "이사 가이드", "item": "https://isabiseo.com/guide"}, {"@type": "ListItem", "position": 3, "name": "{{TITLE}}", "item": "{{URL}}"}]}
</script>
</head>
<body>
<main class="container">
<nav class="crumb" aria-label="위치"><a href="/">홈</a> › <a href="/guide">이사 가이드</a> › {{TITLE}}</nav>
<article class="article-body">
<h1 style="margin:4px 0 6px">{{TITLE}}</h1>
<p class="sub" style="font-size:13px;margin-bottom:16px">{{CATEGORY}} · 약 {{MIN}}분 읽기 · 작성 {{DATE}} · 업데이트 {{DATE}}</p>
<div class="card">

<!-- ================= 여기부터 본문 ================= -->

<p>첫 문단을 여기에 씁니다.</p>

<h2>소제목</h2>
<p>내용을 씁니다. 강조하고 싶은 말은 <b>이렇게</b> 감싸세요.</p>

<h2>소제목</h2>
<p>다른 글로 연결할 때는 <a href="/guide/다른-글-주소">이렇게</a> 씁니다.</p>

<!-- ================= 여기까지 본문 ================= -->

</div>
<div class="notice" style="margin:16px 0"><span data-icon="info"></span><span><b>확인 기준일: {{DATE}}.</b> 본 글은 일반적인 참고용 정보이며 법률·금융 자문이 아닙니다. 제도·금리·수치는 바뀔 수 있으니 실제 신청 전 공식 기관에서 최신 내용을 확인하세요. 공식 출처: <a href="https://www.easylaw.go.kr" target="_blank" rel="noopener">찾기쉬운 생활법령정보</a></span></div></article>
<div style="margin:16px 0"><button class="btn btn-outline btn-sm" onclick="shareLink(this)">🔗 이 글 링크 공유</button> <a class="btn btn-ghost btn-sm" href="/guide">← 가이드 목록</a></div>
<div class="card"><h2 style="margin-bottom:10px;font-size:16px">이비서 도구로 이어서 준비하기</h2><div class="stat-grid"><a class="card" href="/cost" style="text-align:center;padding:14px 8px"><b style="color:var(--primary);font-size:14px">이사비용 계산</b><div style="font-size:12px;color:var(--sub)">박스·차량·비용</div></a><a class="card" href="/checklist" style="text-align:center;padding:14px 8px"><b style="color:var(--primary);font-size:14px">날짜별 체크리스트</b><div style="font-size:12px;color:var(--sub)">D-60~이사 후</div></a><a class="card" href="/safety" style="text-align:center;padding:14px 8px"><b style="color:var(--primary);font-size:14px">계약 안전센터</b><div style="font-size:12px;color:var(--sub)">전세사기 예방</div></a><a class="card" href="/policy" style="text-align:center;padding:14px 8px"><b style="color:var(--primary);font-size:14px">정부 지원·제도</b><div style="font-size:12px;color:var(--sub)">계약·대출·지원금</div></a></div></div>
</main>
<script src="/js/config.js?v={{VER}}"></script>
<script src="/js/analytics.js?v={{VER}}"></script>
<script src="/js/common.js?v={{VER}}"></script>
<script src="/js/affiliate.js?v={{VER}}"></script>
<script src="/js/auth.js?v={{VER}}"></script>
</body>
</html>
'@

$html = $tpl.Replace('{{TITLE}}', $Title).Replace('{{DESC}}', $Desc).Replace('{{URL}}', $url).Replace('{{DATE}}', $today).Replace('{{CATEGORY}}', $Category).Replace('{{MIN}}', [string]$Minutes).Replace('{{VER}}', $ver)

$utf8 = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($guidePath, $html, $utf8)

# --- guide.html 목록에 카드 추가 ---
$listPath = Join-Path $site 'guide.html'
$list = Get-Content $listPath -Raw -Encoding UTF8
$anchor = '<h2 style="font-size:16px;margin:0 0 10px">새로 올라온 글</h2>'
$listOk = $false
if ($list.Contains($anchor)) {
  $card = "`r`n" + ('<a class="card" href="/guide/{0}" style="display:block;margin-bottom:10px"><div style="font-weight:700;color:#191F28;font-size:15px">{1}</div><div class="sub" style="font-size:13px;margin:4px 0">{2}</div><div class="meta" style="font-size:12px;color:var(--sub)">{3} · 약 {4}분 읽기 · {5}</div></a>' -f $Slug, $Title, $Desc, $Category, $Minutes, $today)
  $list = $list.Replace($anchor, $anchor + $card)
  [System.IO.File]::WriteAllText($listPath, $list, $utf8)
  $listOk = $true
}

# --- sitemap.xml 갱신 ---
$mapPath = Join-Path $site 'sitemap.xml'
$map = Get-Content $mapPath -Raw -Encoding UTF8
$entry = ('  <url><loc>{0}</loc><lastmod>{1}</lastmod><priority>0.7</priority></url>' -f $url, $today)
$map = $map.Replace('</urlset>', $entry + "`r`n</urlset>")
$map = [regex]::Replace($map, '(<loc>https://isabiseo\.com/guide</loc><lastmod>)[\d-]+(</lastmod>)', ('${1}' + $today + '${2}'))
[System.IO.File]::WriteAllText($mapPath, $map, $utf8)
$locCount = ([regex]::Matches($map, '<loc>')).Count

Write-Host ""
Write-Host "다 만들었습니다." -ForegroundColor Green
Write-Host ""
Write-Host ("  제목   : {0}" -f $Title)
Write-Host ("  분류   : {0}" -f $Category)
Write-Host ("  주소   : {0}" -f $url)
Write-Host ("  파일   : guide\{0}.html" -f $Slug)
if ($listOk) { Write-Host "  목록   : guide.html 맨 위에 추가됨" }
else         { Write-Host "  목록   : 자동 추가 실패 — 직접 넣으세요" -ForegroundColor Yellow }
Write-Host ("  주소록 : sitemap.xml 등록 (총 {0}개)" -f $locCount)
Write-Host ""
Write-Host "이제 이렇게 하세요." -ForegroundColor Cyan
Write-Host ""
Write-Host ("  1. public\guide 폴더의 {0}.html 을 편집기로 엽니다" -f $Slug)
Write-Host "  2. '여기부터 본문' ~ '여기까지 본문' 사이를 채웁니다"
Write-Host "  3. 이 도구의 2번을 눌러 배포 파일을 만듭니다"
Write-Host ""
