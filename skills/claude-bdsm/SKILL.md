---
name: claude-bdsm
description: Set up or configure this local developer-message tone editor, inspect its benchmark, and explain its wrapper and hook limits. This skill is not an input interceptor.
license: MIT
---

Use the bundled helper to locate and verify the local companion, independent of the user's current project:

```text
node "${CLAUDE_SKILL_DIR}/scripts/manage.mjs" doctor
```

If missing or unbuilt, read [setup instructions](references/setup.md). The companion requires Node 22. The skill installer records its clone path locally and never overwrites existing skills or global settings.

For requested setup/configuration, use that helper with `runtime install`, `models install <registry-id>`, `config`, or `stats`. Setup networking is explicit and downloads verified artifacts. Start with rules. The smallest candidate, `smol-135m-q4km` (~105 MB), adds little over rules and misses the provisional coverage threshold. `smol-360m-q4km` (~271 MB) is the smallest tested hybrid above that automatic threshold, but all models remain preview experiments pending human fidelity review. Read the companion's BENCHMARK-RESULTS.md before recommending a model; compare full response time and quality, not size alone. Never silently substitute model/quantization. Installed inference is authenticated loopback-only, with no cloud fallback.

Default to neutral rules with preview. Every preview output needs exact-output approval, including unchanged text; model changes always require approval even if rule previews are disabled. Benchmark scores and lexical proxies do not replace human fidelity review.

Private messages belong in the local terminal wrapper before Claude starts, using stdin. Do not ask the user to paste private originals into Claude and then promise to remove them. `/safeword` is intercepted locally and forces neutral tone. Style changes only emotional clauses; counters/jokes stay local.

The one-turn wrapper passes only approved output to a native Claude executable using stdin and preserves its permission behavior. Do not add bypass flags, global resume, or live provider tests without explicit user authorization.

The command hook blocks and suggests manual resubmission; adding context cannot remove the original prompt. `onFailure: block` requires a compatible installed Claude version. Hook-only operation cannot guarantee originals stay out of local history/transcripts. This skill offers setup guidance; it does not intercept arbitrary input.

Keep personal prompt retention off by default. `.local/` is ignored; its dashboard contains aggregate counters only. Opt-in diagnostics may contain private text and can be deleted locally. Do not change global Claude settings during setup without an explicit request.
