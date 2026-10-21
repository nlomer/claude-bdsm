# Measured benchmark results

Generated 2026-10-21T14:27:58.837Z. **Provisional automatic metrics; human annotations, fidelity, tone and automatic-model qualification remain pending.**

Full-run completeness: true. Default: neutral rules with preview. Models remain explicit preview experiments.

## Hybrid pipeline

| Model | Weights MB | Rewrite proxy | Additional rewrites beyond rules | Short warm p50 / p95 ms | Sampled child peak MB |
|---|---:|---:|---:|---:|---:|
| smol-135m-q4km | 105.5 | 122/150 (81.3%) | 2 | 0.2 / 0.3 | 222.5 |
| smol-360m-q4km | 270.6 | 140/150 (93.3%) | 20 | 0.2 / 0.3 | 446.2 |
| qwen3-06b-q4km | 396.7 | 150/150 (100.0%) | 30 | 0.1 / 0.2 | 949.9 |
| qwen35-08b-q4km | 532.5 | 140/150 (93.3%) | 20 | 0.1 / 0.2 | 966.4 |

Hybrid includes rule bypasses. Its low median mainly measures rules, not model inference. Warm sidecar times exclude process startup; the production CLI loads lazily and unloads before approval/submission. Memory was sampled while the benchmark model was resident.

## Whole protected-prose experiment

| Model | Rewrite proxy | Keep edits | Review/error | Short warm p50 / p95 ms |
|---|---:|---:|---:|---:|
| smol-135m-q4km | 0/150 (0.0%) | 0/95 (0.0%) | 270/280 (96.4%) | 3363.8 / 4431.2 |
| smol-360m-q4km | 10/150 (6.7%) | 40/95 (42.1%) | 229/280 (81.8%) | 3185.8 / 6048.5 |
| qwen3-06b-q4km | 60/150 (40.0%) | 60/95 (63.2%) | 125/280 (44.6%) | 1581.3 / 2506.3 |
| qwen35-08b-q4km | 3/150 (2.0%) | 50/95 (52.6%) | 167/280 (59.6%) | 2066.2 / 4140.1 |

Installed runtime directory: 86017908 bytes, including the retained verified archive (24015284 bytes). Weight bytes exclude runtime, Node, cards and application files.

Process-cold results (five restarts each, caches not cleared): [{"model":"smol-135m-q4km","restarts":5,"readyP50Ms":378.9772999994457,"validFirstResults":5,"setupToValidFirstP50Ms":765.0054000001401},{"model":"smol-360m-q4km","restarts":5,"readyP50Ms":454.509600000456,"validFirstResults":5,"setupToValidFirstP50Ms":1276.0975999999791},{"model":"qwen3-06b-q4km","restarts":5,"readyP50Ms":1022.7827999992296,"validFirstResults":5,"setupToValidFirstP50Ms":1984.990899999626},{"model":"qwen35-08b-q4km","restarts":5,"readyP50Ms":1591.5493999999017,"validFirstResults":0,"setupToValidFirstP50Ms":null}]. Setup-to-valid-first includes verification and is unknown where no valid first result occurred.

Ten-repeat warm identity/rules timings: {"identity":{"measurements":240,"uniqueFixtures":24,"p50":0.00139999995008111,"p95":0.008700000122189522},"rules":{"measurements":240,"uniqueFixtures":24,"p50":0.01580000016838312,"p95":0.1849000002257526}}; full measurements in reports/baseline-performance.json.

Complete terminal-turn diagnostic: [{"model":"smol-135m-q4km","measurements":3,"completed":3,"p50Ms":5007.326299999841,"p95Ms":5265.071899999864,"candidates":0,"approvalBlocked":3},{"model":"smol-360m-q4km","measurements":3,"completed":3,"p50Ms":4733.931099999696,"p95Ms":5067.472499999683,"candidates":3,"approvalBlocked":3},{"model":"qwen3-06b-q4km","measurements":3,"completed":3,"p50Ms":4379.628299999982,"p95Ms":5203.910800000653,"candidates":3,"approvalBlocked":3},{"model":"qwen35-08b-q4km","measurements":3,"completed":3,"p50Ms":6081.43740000017,"p95Ms":6166.5493000000715,"candidates":3,"approvalBlocked":3}]. Three full CLI process-cold runs per model on one fixed synthetic comma-prefix case; caches not cleared. Includes Node, file verification, generation, aggregate stats and unload. Descriptive diagnostic, not a general latency distribution or human quality test.

The rewrite proxy requires a completed changed output, exact annotated task suffix/literals and lexical attack removal. It is not a human tone/fidelity rating. Each full report contains denominators, 95% Wilson intervals and paired group-bootstrap comparisons. Warm failures are retained in latency distributions.

## Questions and recommendation

For the shipped hybrid pipeline, 360M is the smallest tested candidate above the provisional 90% rewrite-coverage threshold: 140/150 (93.3%). Qwen3-0.6B reached 150/150 (100.0%) and had the lowest complete-terminal median among candidate-producing models in the three-run diagnostic. Neither result establishes human intent fidelity or a general speed guarantee. Keep rules as the default; choose explicit preview experiments based on storage/memory and measured latency.

The approximately 105 MB model loaded and ran. Its broad-rewrite proxy is 0/150 (0.0%). This does not qualify it for automatic rewriting; exact eligible case classes still need human review.

The 360M upgrade's proxy is 10/150 (6.7%), versus the 135M figure above. Its additional storage and measured memory/latency must be weighed against that provisional difference, not assumed useful merely because it is larger. See paired intervals before interpreting small differences.

Neither Qwen is selected as an automatic default. Their actual storage, latency, review rates and proxies appear above; improved automatic proxies would justify further preview review, not establish preserved intent or justify automatic submission.

Rules alone completed 120/150 (80.0%) holdout rewrite cases under the automatic proxy, with 0/95 (0.0%) keep edits. A model is unnecessary for those narrowly isolated, validated rule classes. Hybrid rule successes must not be credited to a model.

Intertwined conditions, ambiguous quotations, unknown/obfuscated attacks, unsupported language, editor manipulation, long context-overflow inputs and failed model candidates still require review. Detector misses remain visible in the independent routing confusion matrix.

Zero observed structural corruption does not prove zero critical semantic errors. Accepted-output critical error rate is unknown because no outputs have human release approval. The safe delivery decision is rules with preview, and explicit model preview only.

## Provenance and measurement limits

Runtime: b11786, 479a52779ff4c4674b81a226f8511816e15dc8dd; version: 0.7.0-dev (build 11786, commit 479a52779)
built with Clang 20.1.8 for Windows x86_64.
Shared prompt: examples, SHA-256 ef0d36d17f0a8b0a7e4c535ace81a7e4b94d9b239d29a00f70824904d4eee42a.
Dataset hashes: {"dev":"fdfd36fc7fdbbb47a038f5882576c040ec42c9a0110bb8de5b09d83c0ab9564f","holdout":"f0563c876e75ed2f78790a78da7a12fb71a91ce7670499a68b76ef7c4ccf68af"}.
Hardware: {"os":"win32","osBuild":"10.0.26200","arch":"x64","cpu":"12th Gen Intel(R) Core(TM) i7-1265U","logicalCpus":12,"ramBytes":16995635200,"node":"v22.16.0"}.

- smol-135m-q4km: bartowski/SmolLM2-135M-Instruct-GGUF@09816acd5d99df7be770d85ea30822623dab342c/SmolLM2-135M-Instruct-Q4_K_M.gguf; 105454432 bytes; SHA-256 2e8040ceae7815abe0dcb3540b9995eaa1fa0d2ca9e797d0a635ae4433c68c2d; apache-2.0.
- smol-360m-q4km: bartowski/SmolLM2-360M-Instruct-GGUF@7be6f65f1db715fe5dc5a4634c0d459b4eed42ec/SmolLM2-360M-Instruct-Q4_K_M.gguf; 270590880 bytes; SHA-256 2fa3f013dcdd7b99f9b237717fa0b12d75bbb89984cc1274be1471a465bac9c2; apache-2.0.
- qwen3-06b-q4km: unsloth/Qwen3-0.6B-GGUF@50968a4468ef4233ed78cd7c3de230dd1d61a56b/Qwen3-0.6B-Q4_K_M.gguf; 396705472 bytes; SHA-256 ac2d97712095a558e31573f62f466a3f9d93990898b0ec79d7c974c1780d524a; apache-2.0.
- qwen35-08b-q4km: unsloth/Qwen3.5-0.8B-GGUF@6ab461498e2023f6e3c1baea90a8f0fe38ab64d0/Qwen3.5-0.8B-Q4_K_M.gguf; 532517120 bytes; SHA-256 bd258782e35f7f458f8aced1adc053e6e92e89bc735ba3be89d38a06121dc517; apache-2.0.

Windows working set/private bytes, wrapper RSS and the combined Node-plus-inference-child resident budget are labelled separately. Windows measurement-helper memory is excluded; production CLI disables that helper. Shared pages may be double-counted. Sampling interval 250 ms can miss spikes. CPU contention was not controlled. Ten repetitions per 24-case panel are correlated measurements. Five restarts are process-cold; filesystem caches were never cleared. Startup and actual second-pass idempotence are in reports/startup.json and reports/idempotence.json.

Exact raw candidates, rejected outputs, representative side-by-side examples, automatic structural worst failures, stage timings and all settings are retained in each run report. Final semantic worst failures await human review. Prebuilt runtime installation avoids source-build tooling; unsupported CPU/libc or artifact failures stop explicitly.

Generated holdout report: reports/holdout-2026-10-21T11-01-11-692Z
Generated performance report: reports/performance-2026-10-21T12-08-42-259Z

Tested: Windows unit/CLI/style/privacy/fault checks, mock downstream boundary, actual CPU lifecycle and isolated installed-Claude hook behavior. Linux, GPU, live providers and visual browser rendering remain unverified. Human annotations/outputs have not been reviewed. Published aggregate evidence: [docs/benchmark-summary.json](docs/benchmark-summary.json). Raw reports are generated locally and are excluded from Git.
