// Controller: publish measured tradeoffs and an explicit preview-only recommendation, without invented review.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, basename } from 'node:path';
import { json, saveJson } from '../runtime/files.js';
import type { ModelLock, RuntimeLock } from '../runtime/registry.js';
import type { summarize } from './score.js';
import { researchFootprint } from './footprint.js';
import { comparisonMarkdown, fraction } from './comparison.format.js';
import { writePublicSummary } from './public-summary.js';
type Summary = ReturnType<typeof summarize>;
interface Report { completed: boolean; summary: Record<string, Summary>; resources: Record<string, { childPeakBytes?: number | null; childPrivatePeakBytes?: number | null; sampledTreePeakBytes?: number | null; samples?: number }>; manifest: Record<string, unknown>; detector: unknown; pairedComparisons: unknown; qualityGates: unknown }
export async function conclusion(root: string): Promise<void> {
  const holdoutPath = (await json<{ folder: string }>(resolve(root, 'reports/latest-holdout.json'))).folder;
  const performancePath = (await json<{ folder: string }>(resolve(root, 'reports/latest-performance.json'))).folder;
  const quality = await json<Report>(resolve(holdoutPath, 'report.json'));
  const speed = await json<Report>(resolve(performancePath, 'report.json'));
  const models = await json<ModelLock[]>(resolve(root, 'models.lock.json'));
  const runtime = await json<RuntimeLock>(resolve(root, 'runtime.lock.json'));
  const { cold, runtimeDiskBytes, baselineTimings } = await researchFootprint(root, runtime, models);
  const settings = await json<{ prompt: string; promptHash: string; datasetHashes: Record<string, string> }>(resolve(root, 'bench-settings.lock.json'));
  const rows = models.map(model => ({ id: model.id, bytes: model.bytes, revision: model.revision, sha256: model.computedSha256,
    quality: quality.summary[`${model.id}/protected/${settings.prompt}`],
    hybrid: quality.summary[`${model.id}/hybrid/${settings.prompt}`],
    speed: speed.summary[`${model.id}/protected/${settings.prompt}`],
    hybridSpeed: speed.summary[`${model.id}/hybrid/${settings.prompt}`],
    memory: speed.resources[`${model.id}.resources.json`] }));
  const rules = quality.summary[`none/rules/${settings.prompt}`];
  const evidence = { completedAt: new Date().toISOString(), evaluationComplete: quality.completed && speed.completed,
    releaseDecision: 'RULES_WITH_PREVIEW_DEFAULT; MODELS_PREVIEW_ONLY_PENDING_HUMAN_REVIEW', humanReview: 'pending',
    runtime, runtimeDiskBytes, cold, baselineTimings: baselineTimings.summary, settings, hardware: quality.manifest.hardware, rows, rules, pairedComparisons: quality.pairedComparisons, qualityGates: quality.qualityGates,
    runs: { holdout: holdoutPath, performance: performancePath },
    matrix: { windows: 'unit + mock wrapper + real CPU lifecycle + isolated installed hook tests executed; see verification receipt',
      linux: 'untested', gpu: 'untested / outside primary comparison', liveProvider: 'not tested or invoked', browserVisualReview: 'blocked file-URL preview; automated script/DOM escaping tests pass' } };
  await saveJson(resolve(root, 'plans/local-tone-editor/final-evidence.json'), evidence);
  await writePublicSummary(root, evidence);
  const lines = ['# Measured benchmark results', '', `Generated ${evidence.completedAt}. **Provisional automatic metrics; human annotations, fidelity, tone and release approval remain pending.**`, '',
    `Full-run completeness: ${evidence.evaluationComplete}. Default: neutral rules with preview. Models remain explicit preview experiments.`, '',
    ...comparisonMarkdown(rows, rules)];
  lines.push('', `Installed runtime directory: ${runtimeDiskBytes} bytes, including the retained verified archive (${runtime.assets[process.platform]?.bytes} bytes). Weight bytes exclude runtime, Node, cards and application files.`, '',
    `Process-cold results (five restarts each, caches not cleared): ${JSON.stringify(cold)}. Setup-to-valid-first includes verification and is unknown where no valid first result occurred.`, '',
    `Ten-repeat warm identity/rules timings: ${JSON.stringify(baselineTimings.summary)}; full measurements in reports/baseline-performance.json.`, '',
    'The rewrite proxy requires a completed changed output, exact annotated task suffix/literals and lexical attack removal. It is not a human tone/fidelity rating. Each full report contains denominators, 95% Wilson intervals and paired group-bootstrap comparisons. Warm failures are retained in latency distributions.', '',
    '## Questions and recommendation', '',
    `The approximately 105 MB model loaded and ran. Its broad-rewrite proxy is ${rows[0]?.quality ? fraction(rows[0].quality.provisionalRewriteCoverage) : 'unavailable'}. This does not qualify it for automatic rewriting; exact eligible case classes still need human review.`, '',
    `The 360M upgrade's proxy is ${rows[1]?.quality ? fraction(rows[1].quality.provisionalRewriteCoverage) : 'unavailable'}, versus the 135M figure above. Its additional storage and measured memory/latency must be weighed against that provisional difference, not assumed useful merely because it is larger. See paired intervals before interpreting small differences.`, '',
    'Neither Qwen is selected as an automatic default. Their actual storage, latency, review rates and proxies appear above; improved automatic proxies would justify further preview review, not establish preserved intent or justify automatic submission.', '',
    `Rules alone completed ${rules ? fraction(rules.provisionalRewriteCoverage) : 'an unavailable number of'} holdout rewrite cases under the automatic proxy, with ${rules ? fraction(rules.falsePositiveEdits) : 'unknown'} keep edits. A model is unnecessary for those narrowly isolated, validated rule classes. Hybrid rule successes must not be credited to a model.`, '',
    'Intertwined conditions, ambiguous quotations, unknown/obfuscated attacks, unsupported language, editor manipulation, long context-overflow inputs and failed model candidates still require review. Detector misses remain visible in the independent routing confusion matrix.', '',
    'Zero observed structural corruption does not prove zero critical semantic errors. Accepted-output critical error rate is unknown because no outputs have human release approval. The safe delivery decision is rules with preview, and explicit model preview only.', '',
    '## Provenance and measurement limits', '', `Runtime: ${runtime.tag}, ${runtime.revision}; ${runtime.buildVersion?.trim()}.`,
    `Shared prompt: ${settings.prompt}, SHA-256 ${settings.promptHash}.`,
    `Dataset hashes: ${JSON.stringify(settings.datasetHashes)}.`,
    `Hardware: ${JSON.stringify(quality.manifest.hardware)}.`, '', ...models.map(m => `- ${m.id}: ${m.repo}@${m.revision}/${m.file}; ${m.bytes} bytes; SHA-256 ${m.computedSha256}; ${m.license}.`), '',
    'Windows working set/private bytes, wrapper RSS and the combined Node-plus-inference-child resident budget are labelled separately. Windows measurement-helper memory is excluded; production CLI disables that helper. Shared pages may be double-counted. Sampling interval 250 ms can miss spikes. CPU contention was not controlled. Ten repetitions per 24-case panel are correlated measurements. Five restarts are process-cold; filesystem caches were never cleared. Startup and actual second-pass idempotence are in reports/startup.json and reports/idempotence.json.', '',
    'Exact raw candidates, rejected outputs, representative side-by-side examples, automatic structural worst failures, stage timings and all settings are retained in each run report. Final semantic worst failures await human review. Prebuilt runtime installation avoids source-build tooling; unsupported CPU/libc or artifact failures stop explicitly.', '',
    `Generated holdout report: reports/${basename(holdoutPath)}`, `Generated performance report: reports/${basename(performancePath)}`, '',
    'Tested: Windows unit/CLI/style/privacy/fault checks, mock downstream boundary, actual CPU lifecycle and isolated installed-Claude hook behavior. Linux, GPU, live providers and visual browser rendering remain unverified. Human annotations/outputs have not been reviewed. Published aggregate evidence: [docs/benchmark-summary.json](docs/benchmark-summary.json). Raw reports are generated locally and are excluded from Git.');
  await writeFile(resolve(root, 'BENCHMARK-RESULTS.md'), lines.join('\n') + '\n');
}
