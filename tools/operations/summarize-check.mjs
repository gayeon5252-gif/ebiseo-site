import { readFile, appendFile } from 'node:fs/promises';

const reportPath = process.argv[2];
let report;
try { report = JSON.parse(await readFile(reportPath, 'utf8')); }
catch { report = null; }
const text = report ? [
  `## 이비서 서버 점검: ${report.status}`,
  '',
  `검사 시각: ${report.checkedAt}`,
  `검사: ${report.summary.resources}개 리소스 / 사이트맵 ${report.summary.sitemapUrls}개 페이지`,
  `실패 ${report.summary.failures}건 / 비교 경고 ${report.summary.warnings}건`,
  '',
  `가이드 RSS·누락 사이트맵 갱신: ${process.env.EBISEO_FEED_CHANGED === 'true' ? '변경사항을 main에 반영함. Cloudflare 배포 완료와는 별도.' : process.env.EBISEO_FEED_CHANGED === 'false' ? '변경 없음' : '완료 여부 확인 필요'}`,
  `RSS·사이트맵·홈/계산기 JavaScript·홈/계산기/준비물 가이드 HTML의 체크아웃 일치 검증: ${process.env.EBISEO_DEPLOYMENT_OUTCOME || '미실행'}`,
  '',
  '배포 검증은 지정된 7개 리소스를 실행 시 체크아웃한 소스와 비교합니다. JavaScript·HTML은 본문 바이트 일치로 스크립트 참조와 준비물 연결도 확인합니다. 기능 패치가 체크아웃에 포함됐다는 뜻은 아닙니다.',
  'HTTP·정적 코드 검사입니다. 실제 JavaScript 실행, 모바일 화면, 저장 복원, GA4 수신, 제휴 실적은 별도 확인해야 합니다.',
  '',
  '<details><summary>검사 결과</summary>',
  '',
  '```json',
  JSON.stringify(report, null, 2),
  '```',
  '</details>',
  '',
] .join('\n') : '## 이비서 서버 점검 실패\n\n결과 파일이 생성되지 않았습니다. 실행 로그를 확인해야 합니다.\n';
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, text);
else console.log(text);
if (!report) process.exitCode = 1;
