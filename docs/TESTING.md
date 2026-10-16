# Verification report

Version **0.2.0-beta.2**, checked **2026-10-16** with Node.js 24.19.0.

| Check | Result |
| --- | --- |
| TypeScript | Passed. |
| Application, streams, auth, storage, bootstrap, installer tests | **79 passed, 0 failed.** |
| Standalone Next.js production build | Passed. |
| Packaged production HTTP smoke test | Passed. |
| Installer shell syntax | Passed. |
| Repository documentation links | Checked. |

The application route suite uses real in-memory SQLite and isolated test
identities. Auth tests use Better Auth with a temporary file-backed database.
Ollama responses are mocked; the suite does not download model weights.

Installer checks cover input rejection, random secrets, mode-600 configuration,
repeat runs, download and skip modes, external Ollama, NVIDIA configuration,
failed start/pull recovery, and running the script through piped stdin. Docker
commands are simulated in these local tests. Initial connection defaults are
checked for seeding once and preserving owner-saved settings.

The production smoke test stages the traced Next package with the same
entrypoint/files as Docker. Through real HTTP it checks pages/assets,
invite-only registration, anonymous rejection, account isolation, automatic
connection seeding, local Ollama discovery/streaming against a stub, two-account
groups, online backups, and restart persistence. Saved AI settings survive a
restart despite different installer defaults.

## Container verification

A Docker daemon is unavailable in the authoring environment. GitHub CI is
configured to validate CPU/NVIDIA Compose configurations, build the real image,
and run the installer with actual app/Ollama containers using `--skip-model`.
It checks application health and confirms that the Ollama model list is empty.
These CI checks are distinct from the locally passing checks above; consult
the workflow result for their actual status.

## Not covered locally

- Clean OS package installation and GPU toolkit/driver configuration.
- Real model downloads, GPU loading, inference quality, or hardware performance.
- Real Google/GitHub authorization, SMTP delivery, DNS, and HTTPS certificates.
- Browser visual/accessibility testing and a phone scanning a TOTP QR code.
  TOTP flows are exercised with independently generated codes.

After installing on your server, verify sign-in, a real model response, optional
providers, and a backup/restore using your actual configuration.
