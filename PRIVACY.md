# Privacy and failure boundary

The optional browser panel binds to `127.0.0.1` on a random port. API calls require a
random launch token and the exact host/origin. The token travels in the initial URL
fragment (not HTTP request paths) and tab session storage; don't share launch URLs.
Message bodies stay in request bodies and page memory, never URLs or tab storage.
No external panel scripts, fonts or analytics are loaded. Clipboard copying is explicit.
Closing the tab does not stop the launcher; Ctrl+C stops its local server.

Panel preferences save profile, tone and chosen paths, not message bodies. The panel
always requires preview approval. Tickets expire after five minutes, change with
settings/input, and are consumed once for Send. Cancellation cannot undo an already
started provider request. Unknown/blocked/zero-usage Claude envelopes are not labelled
as verified successful replies. Skill update/removal preserves previous owned files
under the Claude configuration directory's `skill-backups/`.

Setup downloads official runtime archives, exact model artifacts and cards/licenses.
Runtime inference uses only an authenticated `127.0.0.1` sidecar with its UI disabled.
There is no cloud fallback, remote classifier/judge, telemetry, hosted font or dashboard script.
One owned sidecar/request is permitted at a time; excess clients fail explicitly.

Messages travel in memory and loopback HTTP bodies. This application never passes
original messages or its sidecar authentication tokens through child arguments/environment.
A transient random API-key file uses mode 0600 where supported, is read during startup,
and is deleted after readiness. Windows ACLs are governed by the containing directory/OS.
Same-user administrative access is outside this isolation boundary.

Models, native libraries and runtime executables are integrity-checked before loading.
Publisher checksums do not independently authenticate a publisher. Models have no tools
or repository-code execution. Prompt caches are disabled, conversations are fresh,
context/output budgets are bounded, and failures request review instead of forwarding originals.

Default storage contains consent and aggregate counts only. Personal original/edited
text is not logged. `.local/` is ignored by Git. Explicit `retention: true` opts into
`.local/diagnostics/events.jsonl`, containing private message bodies/outputs. There is
no automatic expiration; delete that directory locally. Statistics are atomic, with an
exclusive lock; a busy update can be skipped and is not an authoritative audit log.

Synthetic benchmark data and rejected raw candidates stay in `reports/` for reproducibility.
Review/report HTML escapes data and uses textContent, without external resources.
Human decisions are imported explicitly; automatic scores never become human ratings.
Do not place personal messages in synthetic fixture files.

The wrapper owns one input before launching Claude, submits approved final text through
stdin, uses no shell interpolation/bypass flags, and never resumes an implicit recent
session. Repository files, old conversations, plugins, tools and Claude behavior remain
outside this boundary. Hook-only use blocks/suggests, without substituting the prompt.
Suppressing a block message's original does not erase transcripts/history.

Installed-hook tests use dummy credentials and a fake loopback provider in an isolated
configuration directory; they are not live account tests. No guaranteed RAM erasure or
protection against OS swap/crash dumps/same-user process inspection is claimed.
Force-killed processes can leave stale ownership locks. Verify the recorded owner PID
is gone before manually removing only `.tools/active.lock`; do not kill unrelated
processes or clear global OS caches. Normal close/cancellation cleans up owned children.
