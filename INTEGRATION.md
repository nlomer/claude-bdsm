# One-turn Claude and hook compatibility

Installed version checked: Claude Code 2.1.305. The programmatic path uses `-p` and
`--output-format json`. Approved text travels only via stdin to a native executable;
the wrapper preserves existing authentication/permissions, supplies an explicit directory,
and adds no bypass flag or implicit resume.

```powershell
node dist/cli.js chat --preview --cwd 'D:\path\to\your\project'
```

Noninteractive callers review the candidate and supply its exact `--approve <sha256>`.
A changed candidate needs new approval. `--claude <native-path>` explicitly selects
an executable; Windows .cmd/.bat/.ps1 shims are rejected. The default Windows locator
recognizes the installed native npm-package executable. This is one turn without the
stock terminal UI. Invoking chat can use a provider; implementation tests do not.

Downstream exit codes/structured response text are preserved. Exit 0 alone is not proof
of a provider request: a hook may block and still return a successful structured result.
Inspect the result and actual usage. Offline receipts demonstrate this with zero requests.

`examples/hooks.settings.json` is a reviewable template, never an installed global change.
It points at `${CLAUDE_PROJECT_DIR}/dist/cli.js`; when integrating another project, use
this application's absolute compiled entrypoint. Native Node + argument arrays avoid
shell interpolation. The hook blocks and suggests manual resubmission; additional context
cannot replace the original. It never recursively launches Claude.

`onFailure: block` is documented for >=2.1.295. The command has a five-second timeout.
Actual isolated installed-CLI tests cover explicit block, missing script, timeout and this
application hook, using a temporary config, dummy key, fake loopback provider and disabled
nonessential traffic. All four paths had zero fake-provider requests. Receipts:
`reports/claude-hook-offline.json`. These are not live account/provider tests.

The hook sets `suppressOriginalPrompt: true` in its block output, which suppresses only
the original in the block message, without guaranteeing deletion from local history.
The setup skill gives configuration guidance; it is not an input interceptor.

- [Programmatic interface](https://code.claude.com/docs/en/headless)
- [Hook decisions/failure behavior](https://code.claude.com/docs/en/hooks)

Windows native wrapper behavior is mock-tested. Linux/live provider execution is untested.
No global Claude configuration was modified.
