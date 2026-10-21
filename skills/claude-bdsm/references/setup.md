# Open the manners department

Clone [nlomer/claude-bdsm](https://github.com/nlomer/claude-bdsm), use Node 22.16+ within 22.x, then:

```text
npm run setup
npm start
```

Guided setup installs locked tools, builds the companion and offers optional skill/local AI. Enter skips those optional changes. `npm run setup -- --yes` builds only. Windows also has `Start.cmd` after setup. A missing Node installation requires installing Node first; setup doesn't modify system runtimes.

The panel handles multiline input, previews, approved copying/sending and saved Settings. Instant needs no model. AI downloads happen only on explicit selection. Without Claude, Copy works; choose a native executable in Advanced if needed. Send requires an existing absolute project folder.

The skill installer respects `CLAUDE_CONFIG_DIR`, records its clone path and refuses to overwrite an existing skill. Update/remove preserve owned files under the config directory's `skill-backups/`. It never installs hooks implicitly. After moving the clone, the old helper points at the old location; preserve the old skill and install anew from the moved clone.

The helper's `start` and `setup` run the clone's plain-Node scripts. `status` gives friendly readiness; `doctor` is technical. It accepts no private-message commands. Have users enter originals in the local panel, outside the Claude conversation.
