# Local companion setup

Clone and build [nlomer/claude-bdsm](https://github.com/nlomer/claude-bdsm), using Node 22:

```text
npm ci --ignore-scripts
npm run build
node dist/cli.js skills install
```

The installer creates `~/.claude/skills/claude-bdsm` and records this clone's path in
that skill's local `installation.json`. Existing skills are never overwritten. It does
not install hooks or modify global Claude settings. Restart Claude if the skill is not listed.
Keep the clone at that path. To move it, update the installed skill's installation.json
to the new applicationRoot, or reinstall after preserving/removing the old skill folder.

Use the bundled `scripts/manage.mjs` helper for doctor, config, stats and explicit model/runtime
installation. Its location is `${CLAUDE_SKILL_DIR}/scripts/manage.mjs` in Claude Code.

The smallest benchmark candidate is SmolLM2-135M-Instruct Q4_K_M (~105 MB weights).
Model use is experimental/preview-only until the published evaluation and human review
support stronger claims. Rules-only mode downloads no weights. No cloud inference fallback exists.

Private text must be entered into the local terminal wrapper before Claude is launched:

```text
node /path/to/claude-bdsm/dist/cli.js chat --preview --cwd /path/to/project
```

Do not paste private text into Claude and then invoke the skill expecting that to remove
the original from the hosted conversation. A skill cannot retroactively intercept input.
The optional command hook blocks and suggests manual resubmission; it is not replacement.
