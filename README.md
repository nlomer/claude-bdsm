# claude-bdsm

**Brutal Developer Sentiment Management — The Safe Word Protocol**

A Claude Code skill with a local companion for turning personal attacks into constructive feedback while protecting your code, commands, numbers, and constraints.

```text
You idiot. Fix src/auth.ts; do not change the public API.
                         ↓
I'm frustrated with the previous result. Fix src/auth.ts; do not change the public API.
```

Runs locally on your CPU. Start with the instant rules engine, or try the optional ~105 MB local model. You preview and approve the final text before it is passed to Claude.

This is a preview-first release. Model experiments are provisional, and human fidelity review is pending. It is not an official compliance classifier or a promise that every insult will be detected.

The current rules are English-first. Unsupported languages and ambiguous cases require review rather than an automatic rewrite.

## What you get

- **Claude Code skill:** `/claude-bdsm` helps with setup, settings, and understanding local results.
- **Local editor:** preserves literal content and makes narrowly bounded changes; uncertain cases require review.
- **Claude wrapper:** reads your message locally and passes only approved final text to a one-turn Claude session.
- **Optional hook:** blocks a problematic turn and offers a suggestion for manual resubmission.
- **Personalities and local extras:** neutral, HR, Victorian, `/safeword`, playful rage scores, awards, and an offline aggregate dashboard.

The skill itself cannot intercept text before Claude reads it. Enter private originals into the **local terminal editor/wrapper**, rather than pasting them into Claude and expecting a skill to remove them afterward. The hook also cannot replace a turn or erase all local history.

## Requirements

- Node.js **22.16+ within the 22.x line**; `.nvmrc` pins the setup version.
- Windows x64 or Linux x64. Windows is tested; Linux execution remains unverified.
- Git for cloning this repository.
- Claude Code only if you want the skill, wrapper, or hook. The standalone editor needs no Claude account.

No Python, GPU, Ollama, paid evaluation API, or cloud classifier is required. Dependency/model setup uses networking; installed editing has no cloud fallback.

## Install

```sh
git clone https://github.com/nlomer/claude-bdsm.git
cd claude-bdsm
npm ci --ignore-scripts
npm run build
node dist/cli.js skills install
```

The last command creates `~/.claude/skills/claude-bdsm` and records this clone's location. It respects `CLAUDE_CONFIG_DIR`, refuses to overwrite an existing skill, and does not modify global hook settings. Keep the clone at that location.

Restart Claude Code if necessary, then invoke:

```text
/claude-bdsm
```

You can use the local editor immediately, without downloading a model:

```sh
node dist/cli.js sanitize --preview
```

Type a message in the local terminal, inspect the result, and type `yes` to approve it. Even unchanged text requires approval when preview is enabled.

## Use with Claude Code

From this repository, choose the existing project directory that Claude should work in:

```sh
node dist/cli.js chat --preview --cwd "../your-project"
```

The wrapper uses Claude's existing authentication and permission behavior. It adds no bypass flags, implicit session continuation, or stock-terminal emulation. Only the approved final text is passed through stdin. The one-turn response is Claude's structured JSON output.

A native Claude executable must be available. On Windows, npm-installed native Claude is also recognized; use `--claude <native-path>` to select another installation. Shell shims such as `.cmd`, `.bat`, and `.ps1` are not launched by the wrapper.

## Try the smallest model candidate

SmolLM2-135M-Instruct Q4_K_M is approximately **105.5 MB of weights**, excluding the runtime, Node, and working memory. Larger candidates are not installed by default.

```sh
node dist/cli.js runtime install
node dist/cli.js models install smol-135m-q4km
node dist/cli.js sanitize --model smol-135m-q4km --mode hybrid --preview
```

Hybrid mode checks rules and review conditions first, loading the model only when a bounded model rewrite is actually needed. The model is unloaded before waiting for approval or invoking Claude. Model-generated changes always require approval.

Downloads are pinned and checked against exact byte counts and SHA-256. Model cards/licenses are saved beside their files. See [benchmark methodology](BENCHMARK.md) and [measured results](BENCHMARK-RESULTS.md) for quality, latency, memory, and limitations. A larger model is useful only if its measured results justify its cost.

## Tone and local settings

```sh
node dist/cli.js sanitize --tone hr --preview
node dist/cli.js sanitize --tone victorian --preview
node dist/cli.js config
node dist/cli.js config --set '{"personality":"hr","preview":true}'
node dist/cli.js stats --html
```

A leading `/safeword` forces neutral tone and suppresses jokes/awards. Styles change only validated emotional prefixes, not your task. General profanity is kept by default; optional cleanup is a separate consent setting. Rage scores and awards are playful heuristics, not psychological or policy-risk assessments.

The dashboard contains aggregate counters. Personal text is not retained by default. Explicit diagnostic retention stores private text under `.local/diagnostics/`; see [privacy and storage](PRIVACY.md).

## Piped input and JSON

```sh
node dist/cli.js sanitize --stdin --json
```

JSON mode returns the typed result, including a candidate when available. Review the displayed candidate and its SHA-256, then repeat the same input with `--approve <displayed-hash>` to authorize that exact output. A stale hash cannot approve a changed candidate.

Text mode keeps stdout empty while review/approval is pending. UI goes to stderr. Exit codes: `0` approved success, `1` operational/input failure, `2` usage or blocking-hook failure, `3` review/approval required. The wrapper otherwise preserves Claude's exit code; exit 0 alone does not prove a provider request occurred.

## Optional hook

[examples/hooks.settings.json](examples/hooks.settings.json) is a template you can review and adapt. Use an absolute path to this clone's `dist/cli.js` when integrating another project. No hook is installed automatically.

The command hook suggests manual resubmission and uses failure-blocking behavior supported by Claude Code 2.1.295+. Tested with 2.1.305 against an isolated fake provider. See [integration details](INTEGRATION.md) for setup and history limitations.

## Update or remove

Pull updates and rebuild with `npm ci --ignore-scripts` and `npm run build`. Back up customizations before replacing the installed skill folder and running `skills install` again.

Remove the installed `claude-bdsm` skill folder to disable the skill. Settings/stats/opt-in diagnostics live in this clone's `.local/`; downloaded artifacts live in `models/` and `.tools/`. Nothing is silently uploaded or removed.

## Development and reproducibility

```sh
npm test
npm run test:integration
```

Integration tests that need installed artifacts are skipped when unavailable. The installed-Claude checks use a fake loopback provider, not a live account. Run native-runtime tests after releasing the benchmark's exclusive runtime lock.

The [benchmark guide](BENCHMARK.md) covers the four-model comparison, frozen synthetic fixtures, blinded review, resource definitions, and reproducible commands. Generated reports and model weights are excluded from Git.

## License

[MIT](LICENSE). Downloaded models and the native runtime retain their own upstream licenses.
