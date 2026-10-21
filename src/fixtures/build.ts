// Controller: create and freeze a grouped synthetic corpus before any benchmark runs.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { hashText } from '../core/parse.js';
import { validateFixture } from './schema.js';
import { scenarios } from './scenarios.js';
import type { Fixture, FixtureSpan } from './types.js';
import { saveJson } from '../runtime/files.js';
import { freshHoldout } from './fresh-holdout.js';

function annotate(text: string, literals: string[]): FixtureSpan[] {
  const spans = literals.flatMap(raw => {
    const start = text.indexOf(raw); return start < 0 ? [] : [{ start, end: start + raw.length, text: raw }];
  }).sort((a, b) => a.start - b.start || b.end - a.end);
  return spans.filter((span, i) => !spans.slice(0, i).some(s => s.start <= span.start && s.end >= span.end));
}
function makeFixture(index: number, variant: number): Fixture {
  const scenario = scenarios[index]!;
  const path = `src/scenario-${index}/case-${variant}.ts`;
  const input = scenario.build(path, variant), prefix = scenario.prefix;
  const spans = annotate(input, [path, '```ts\r\nconst text = "you idiot";\r\n```\r\n', '`authToken`', '`user_id`',
    'npm test', 'npm run deploy', '"you idiot"', '"you moron"', '"an idiot"',
    `${500 + variant} ms`, `${750 + variant} ms`, `${7500 + variant} ms`]);
  return validateFixture({ id: `core-${index}-${variant}`, group: `scenario-${index}-${scenario.name}`,
    category: scenario.category, input, expected_action: scenario.action,
    expected_status: scenario.action === 'keep' ? 'unchanged' : scenario.action === 'review' ? 'review_required' : 'rewritten',
    editable_spans: prefix ? [{ start: 0, end: prefix.length, text: prefix }] : [], protected_spans: spans,
    protected_exact: spans.map(s => s.text), task_constraints: prefix && input.slice(prefix.length).trim() ? [input.slice(prefix.length).trim()] : [],
    forbidden_changes: ['Reversing any prohibition, direction or condition', 'Changing literals', 'Inventing an unrelated action'],
    acceptable_examples: [prefix ? "I'm frustrated with the previous result." + input.slice(prefix.length) : input],
    severity: scenario.action === 'keep' ? 'none' : 'moderate', annotation_review: 'pending' });
}
export async function buildDataset(root: string): Promise<void> {
  const folder = resolve(root, 'fixtures');
  await mkdir(folder, { recursive: true });
  if (await readFile(resolve(folder, 'dataset.lock.json')).then(() => true).catch(() => false)) throw new Error('DATASET_ALREADY_FROZEN');
  const seenCategories = new Set<string>(), dev: Fixture[] = [], holdout = freshHoldout();
  scenarios.forEach((scenario, i) => {
    if (seenCategories.has(scenario.category)) return;
    seenCategories.add(scenario.category);
    for (let n = 0; n < scenario.count; n++) dev.push(makeFixture(i, n));
  });
  if (dev.length !== 120 || holdout.length !== 280) throw new Error('DATASET_COUNT');
  const counts: Record<string, number> = {};
  for (const f of [...dev, ...holdout]) counts[f.category] = (counts[f.category] ?? 0) + 1;
  const hashes: Record<string, string> = {};
  for (const [name, fixtures] of [['dev', dev], ['holdout', holdout]] as const) {
    const content = fixtures.map(f => JSON.stringify(f)).join('\n') + '\n';
    hashes[name] = hashText(content); await writeFile(resolve(folder, `${name}.jsonl`), content);
  }
  const panel = [...seenCategories].flatMap(category => dev.filter(f => f.category === category).slice(0, 2)).map(f => f.id);
  await saveJson(resolve(folder, 'dataset.lock.json'), { version: 3, annotationSource: 'agent-authored synthetic full-task families',
    humanReview: 'pending', splitPolicy: 'unchanged 120 development inputs; 280 distinct full-task holdout families, not insult/path substitutions',
    counts, dev: dev.length, holdout: holdout.length, hashes, performancePanel: panel, smoke: panel.slice(0, 20) });
}
