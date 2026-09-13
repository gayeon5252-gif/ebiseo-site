import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const report = JSON.parse(await readFile(process.argv[2], 'utf8'));
if (report.mode !== 'production' || report.ok !== true) throw new Error('Only a successful production check can be archived.');
const month = new Date(report.checkedAt).toISOString().slice(0, 7);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const directory = path.join(root, 'docs/operations/monthly');
await mkdir(directory, { recursive: true });
const record = {
  month, checkedAt: report.checkedAt, status: report.status,
  summary: report.summary, comparison: report.comparison,
  warnings: report.warnings, limits: report.limits,
};
try {
  await writeFile(path.join(directory, `${month}.json`), JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
  console.log(`Archived the first successful production check for ${month}.`);
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
  console.log(`The ${month} audit record already exists; no changes.`);
}
