// Tests: doctor truthfully reports foundation readiness and enforces CLI stream/exit behavior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { doctor } from '../../src/cli/doctor.js';

test('doctor reports host without claiming configured inference', () => {
  const report = doctor();
  assert.equal(report.node, process.version);
  assert.equal(report.inferenceReady, false);
  assert.equal(report.networkUsed, false);
  assert.equal(report.runtime, 'not_configured');
  assert.equal(report.models, 'not_configured');
  assert.ok(report.defaultThreads >= 1 && report.defaultThreads <= 4);
  assert.ok(report.ramBytes > 0);
  assert.deepEqual(report.diagnostics, ['RUNTIME_NOT_CONFIGURED', 'MODELS_NOT_CONFIGURED']);
});

test('doctor CLI emits JSON only; unknown commands emit usage on stderr', () => {
  const entry = fileURLToPath(new URL('../../src/cli.js', import.meta.url));
  const child = spawnSync(process.execPath, [entry, 'doctor'], { encoding: 'utf8' });
  assert.equal(child.status, doctor().nodeSupported ? 0 : 1, child.stderr);
  assert.equal(child.stderr, '');
  assert.equal(JSON.parse(child.stdout).inferenceReady, false);
  const invalid = spawnSync(process.execPath, [entry, 'unknown'], { encoding: 'utf8' });
  assert.equal(invalid.status, 2);
  assert.equal(invalid.stdout, '');
  assert.match(invalid.stderr, /Usage:/);
});
