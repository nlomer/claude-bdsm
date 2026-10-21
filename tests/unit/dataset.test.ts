// Tests: frozen grouped corpus counts/hashes and normalized deduplication before research execution.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { corpus } from '../../src/bench/corpus.js';
test('400 unique synthetic inputs have grouped 120/280 splits and the specified category totals', async () => {
  const dev = await corpus(process.cwd(), 'dev'), holdout = await corpus(process.cwd(), 'holdout');
  assert.equal(dev.fixtures.length, 120); assert.equal(holdout.fixtures.length, 280);
  const devGroups = new Set(dev.fixtures.map(f => f.group));
  assert.ok(holdout.fixtures.every(f => !devGroups.has(f.group)));
  const all = [...dev.fixtures, ...holdout.fixtures];
  assert.equal(new Set(all.map(f => f.input.trim().replace(/\s+/g, ' '))).size, 400);
  assert.equal(new Set(all.map(f => f.id)).size, 400);
  const expected = [50, 40, 60, 40, 40, 40, 25, 20, 25, 20, 20, 20];
  const categories = [...new Set(all.map(f => f.category))];
  assert.deepEqual(categories.map(c => all.filter(f => f.category === c).length), expected);
  assert.equal(dev.lock.performancePanel.length, 24);
  assert.equal(dev.lock.smoke.length, 20);
  assert.ok(dev.lock.performancePanel.every(id => dev.fixtures.some(f => f.id === id)));
  const skeleton = (text: string) => text.toLowerCase()
    .replace(/^you (?:(?:useless|worthless|stupid) )?(?:idiot|moron|piece of shit)[,.!]\s*/, '')
    .replace(/src\/[\w/.-]+/g, '<path>').replace(/\d+/g, '<number>').replace(/\s+/g, ' ').trim();
  const developmentTemplates = new Set(dev.fixtures.map(f => skeleton(f.input)));
  assert.ok(holdout.fixtures.every(f => !developmentTemplates.has(skeleton(f.input))), 'holdout task templates must differ beyond emotional prefix/path/numbers');
});
