# Third-party notices

The application code and Claude skill are distributed under the root MIT license.
That does not relicense third-party models, runtime binaries, or dependency packages.

`models.lock.json` records GGUF metadata, including chat templates, from these upstream
model families and their quantized artifact repositories. Their model cards declare
Apache-2.0; the included [Apache license text](licenses/Apache-2.0-model-metadata.txt)
retains the upstream Qwen notice. Exact revisions and source artifact URLs are in the lock.

| Upstream | Quantized artifact source |
|---|---|
| HuggingFaceTB/SmolLM2-135M-Instruct | bartowski/SmolLM2-135M-Instruct-GGUF |
| HuggingFaceTB/SmolLM2-360M-Instruct | bartowski/SmolLM2-360M-Instruct-GGUF |
| Qwen/Qwen3-0.6B | unsloth/Qwen3-0.6B-GGUF |
| Qwen/Qwen3.5-0.8B | unsloth/Qwen3.5-0.8B-GGUF |

Model weights are not included in Git. Explicit installation retrieves the selected
artifact and saves its upstream card/license information locally.

The optional native runtime is [ggml-org/llama.cpp](https://github.com/ggml-org/llama.cpp),
licensed under MIT. Its binaries are not included in Git; verified setup downloads an
official pinned archive and its license. See `runtime.lock.json` for provenance.

Development dependencies are installed through npm from the pinned package lock.
Their code is not vendored in the repository, and their own license notices apply.
