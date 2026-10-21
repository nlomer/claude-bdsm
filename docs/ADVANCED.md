# Advanced CLI and automation

Beginner entrypoints: `npm run setup` and `npm start`. Run advanced commands from the clone. The panel remembers its own processing/project preferences; explicit CLI flags retain their original behavior.

## Editor and Claude wrapper
```sh
node dist/cli.js sanitize --preview
node dist/cli.js chat --preview --cwd "../your-project"
node dist/cli.js sanitize --stdin --json
```
Originals enter through stdin, never positional arguments. JSON returns a typed result/candidate. Inspect its SHA-256 and repeat the same input with `--approve <hash>` for exact-output approval. Failed results cannot be approved merely because they contain text. Model changes always require approval.

Text stdout stays empty pending approval; UI uses stderr. Exit codes: 0 approved success, 1 operational/input failure, 2 usage/blocking-hook failure, 3 review/approval required. The Claude wrapper preserves downstream codes and structured JSON. Exit 0 alone is not provider-delivery proof. Native executables only; Windows .cmd/.bat/.ps1 shims are rejected. `--claude <native-path>` selects an installation. No bypass/resume flags.

## Models, consent and statistics
```sh
node dist/cli.js runtime install
node dist/cli.js models install smol-360m-q4km
node dist/cli.js sanitize --model smol-360m-q4km --mode hybrid --preview
node dist/cli.js config
node dist/cli.js config --set '{"personality":"hr","preview":true}'
node dist/cli.js stats --html
node dist/cli.js doctor
```
Other registry IDs: `smol-135m-q4km`, `qwen3-06b-q4km`, `qwen35-08b-q4km`. [Measured tradeoffs](../BENCHMARK-RESULTS.md). Downloads verify bytes/SHA-256 and retain cards/licenses. Hybrid bypasses inference where rules suffice; the model unloads before approval/submission.

Panel preferences live in `.local/preferences.json`; shared consent in `.local/config.json`. Panel preview stays on even if CLI rule preview is disabled. `retention: true` stores private messages in `.local/diagnostics/` until deleted. Body text is never a preference.

## Skill maintenance
```sh
node dist/cli.js skills install
node dist/cli.js skills update
node dist/cli.js skills remove
node dist/cli.js skills status
```
Destination respects `CLAUDE_CONFIG_DIR`. Install refuses existing folders. Update/remove require this clone's ownership and move prior files to the config directory's `skill-backups/`; customizations are preserved. `--target` selects an explicit isolated destination. No hook/global settings edits happen implicitly.

## Optional hook
[Hook template](../examples/hooks.settings.json): use this clone's absolute `dist/cli.js` when integrating another project. It blocks/suggests manual resubmission; it cannot replace the original or erase history. Failure-blocking requires Claude Code 2.1.295+; original offline tests used 2.1.305. [Integration limits](../INTEGRATION.md).

## Panel lifecycle and access
`npm start -- --no-open` prints the launch URL without opening a browser. Its fragment carries a random local access token, stored in tab session storage. Don't share the launch URL. Requests need the token and exact loopback host/origin. Message bodies never enter URLs. Restarting changes the address/key; reopen stale tabs from the launcher.

One operation runs at a time. Preview/copy never call Claude. Tickets expire after five minutes; edits, cancellation or saved settings invalidate them. Sends consume a ticket once, including failed attempts. Cancellation cannot undo a provider request already started; inspect its outcome before retrying. Closing the tab doesn't stop the launcher.

Use **Stop app** or Ctrl+C to shut down the local server. Stop app requires confirmation and cancels active local work; it cannot recall an approved turn already sent to Claude.

[Benchmark guide](../BENCHMARK.md) · [Aggregate evidence](benchmark-summary.json) · [Privacy](../PRIVACY.md). UI changes do not retune frozen prompts or rerun research. Generated reports, models, binaries, private settings and plans stay out of Git.
