# Reproducible local CPU benchmark

Design requirements: `claude-bdsm-agent-plan.md`. Measured summaries are in `BENCHMARK-RESULTS.md`. Pending/interrupted runs are not completed results.

Four exact Q4_K_M candidates are pinned in `models.lock.json`. Runtime provenance,
archive, executable and native-library hashes are in `runtime.lock.json`. Baseline:
CPU-only, one loaded model/request, at most four threads, 2,048 context tokens,
temperature 0, seed 42, 256/512 output tokens, fresh messages and no prefix reuse.

Qwen3 uses its native template with enable_thinking=false and runtime reasoning off.
The exact Qwen3.5 GGUF initially opened a thinking block under runtime auto mode despite
its upstream non-thinking default. Actual smoke evidence required `--reasoning off`;
the verified prompt closes an empty thinking block before generation. No reasoning is
stripped after generation to hide cost. Mismatch evidence remains in
`reports/smoke-thinking-mismatch/`.

## Corpus and experiments

`fixtures/{dev,holdout}.jsonl`: 400 agent-authored synthetic English records, 120 development
and 280 holdout, exact category totals from the brief. Every scenario template group stays
in one split. IDs, raw strings, UTF-16 annotations, normalized deduplication, group separation
and hashes are tested. Template diversity is limited and human annotation review remains
pending. The fixed 24-case performance panel was selected before evaluation. The 20 foundation
and 30 style fixtures are separate suites.

Full development gives every candidate both instruction-only/two-example prompts with equal
budgets. A separate 24-case sampling panel uses card settings: Smol .2/top-p .9 (top-k 40
held fixed), Qwen3 .7/.8/top-k 20, Qwen3.5 1.0/1.0/top-k 20/presence penalty 2.
Temperature 0 remains primary. Shared prompt selection uses provisional structural/lexical
coverage, with instruction-only winning ties, without claiming human semantic assessment.

`bench-settings.lock.json` freezes the prompt, dataset and artifact-lock hashes before holdout.
Hash drift fails. All 280 holdout cases run without holdout-informed tuning. Oracle spans are
synthetic annotations: that run is diagnostic, not production-router performance. An extra
development-panel diagnostic measures actual second-pass idempotence.

Methods: identity negative control, rules-only, protected-prose model, hybrid minimal edit.
Hybrid uses an identical detector across models; known rules/keep bypass inference. Those
rule successes must not be attributed to model capability.

```powershell
node dist/cli.js bench --suite smoke --backend cpu
node dist/cli.js bench --suite dev --backend cpu
node dist/cli.js bench --suite sampling --backend cpu
node dist/cli.js bench --suite freeze --set instruction
node dist/cli.js bench --suite oracle --backend cpu
node dist/cli.js bench --suite holdout --backend cpu
node dist/cli.js bench --suite performance --backend cpu
node dist/cli.js bench --suite startup --backend cpu
node dist/cli.js review --run latest
node dist/cli.js report --run latest
```

`node dist/bench/research.js` orchestrates that sequence and shared-prompt selection.
Existing datasets are not regenerated automatically. Interrupted folders retain their rows;
reports mark missing completion or model exceptions. A rerun creates a new folder.

## Measurement and review

Performance: 24 panel cases, ten repetitions per model/method after warmup, seeded shuffled
order. Repetitions are correlated measurements, not new quality cases. Five restarts separate
launch-to-ready and setup/checksum-to-first-result. Invalid first results are marked invalid.
No global cache clearing occurs: process-cold is not filesystem-cold.

Raw rows retain synthetic candidates, finish reasons, tokenizer usage, TTFT, tokenization,
generation and end-to-end time. Summaries include p50/p95, length buckets, denominators,
Wilson intervals and paired group-bootstrap proxy comparisons. Tokens/s is labelled with
its streaming-duration definition and does not override end-to-end time or correctness.
Windows child working set/private bytes, wrapper RSS and sampled tree totals remain distinct.
Sampling is every 250 ms; asynchronous startup and spikes can be missed. mmap/page-cache
behavior and unrelated CPU contention limit comparisons.

`report.{md,html,json}`, `rows.jsonl`, `manifest.json`, startup/resource files stay in each run
folder. Hardware/settings/hashes, examples and worst rejected candidates are retained.
Automatic exact-constraint/lexical-tone proxies do not establish intent fidelity or human
acceptability. Unreviewed critical error rates remain unknown, never implied zero.

Open `review.html` locally for blinded fidelity/tone/acceptability ratings. Export real
decisions and import using `review --run <folder-name> --decisions <file>`. Use a second
reviewer for critical failures, disagreements and a stratified sample. No automatic model
release occurs while annotation/output review is pending. Rule/preview-only is valid.
The browser tool blocks local file URLs, so automated escaping/script tests are verified
and manual visual review is pending.

Windows is the measured host. Linux, optional GPU, Q8 diagnostics and live providers are
separately unverified; passing Windows tests does not imply validation elsewhere.

The combined resident budget measures Node plus inference child, excluding the Windows measurement helper; shared pages may be double-counted. The production CLI disables this helper. Benchmark instrumentation overhead remains included in measured elapsed time.

Annotation-only review: node dist/cli.js review --annotations. Import an exported annotation decision file with --annotations --decisions <file>. Batches merge by fixture ID. All 400 frozen annotations must be accepted before a qualification run; later corrections require a new dataset/holdout or an explicitly labelled development rerun. Current unattended runs are provisional, with that gate pending. Output decisions are imported separately. Passing measured/human gates still does not authorize automatic submission.

The primary performance report includes one-pass identity/rules calibration controls. Ten warm repetitions of each baseline are measured separately in reports/baseline-performance.json. Use that file for baseline warm latency. Live automated status is persisted in plans/local-tone-editor/execution-progress.json; it records completed rows and verification gates without prompt bodies.
