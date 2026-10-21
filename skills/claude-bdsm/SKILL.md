---
name: claude-bdsm
description: Set up or launch the local keyboard manners department, configure its tone/model/project, or troubleshoot Claude integration. Not an input interceptor.
license: MIT
---

Help operate this playful local tone editor without teaching a pile of flags. Use a light tone; keep status/recovery guidance clear.

The bundled helper locates the companion independently of the current project:

```text
node "${CLAUDE_SKILL_DIR}/scripts/manage.mjs" status
node "${CLAUDE_SKILL_DIR}/scripts/manage.mjs" start
```

`start` opens a local browser panel and keeps a foreground process running. Use the host's supported long-running terminal mechanism rather than claiming it finished. Users paste multiline messages there, preview, review and explicitly copy/send. Panel Settings remembers style, processing and Claude project. `status` gives readiness/recovery guidance; `doctor` is technical.

If missing/unbuilt, read [setup](references/setup.md). Setup needs Node 22 and networking for dependencies. Optional models and skill changes require separate selections; setup `--yes` builds only. The helper also supports `setup`, `config`, `stats`, `runtime`, `models`, and `skills` for requested advanced actions.

Default to Instant/rules, neutral, preview on and personal retention off. Small AI (~271 MB) and larger AI (~397 MB) remain experimental; exact model IDs belong in advanced explanations. The ~105 MB candidate added little over rules. Automatic scores aren't human fidelity qualification. No silent substitutions or cloud editor fallback.

Private originals belong in the local panel before Claude receives them. Never ask users to paste them into Claude and promise to remove them afterward. A skill cannot intercept arbitrary input; the optional hook only blocks/suggests manual resubmission. `/safeword` is handled locally and suppresses jokes/awards.

The app binds approval to current preview/settings, sends only approved final text through stdin and preserves Claude permissions. Send can invoke the user's provider/account. Do not initiate live provider tests or add bypass/resume flags. A blocked/cancelled response is not delivery proof. Skill update/removal backs up owned files; unrelated skills/settings stay untouched.
