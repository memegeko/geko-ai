# Beta release testing

Release candidate: **0.1.0-beta.1**

Checked on **2026-10-15** using Node.js 24.19.0 and pnpm 11.25.0.

## Completed checks

| Check | Result |
| --- | --- |
| `pnpm run typecheck` | Passed. |
| `pnpm test` | Passed: **53 tests, 0 failures**. |
| Production Sites/Vinext build | Passed; app and all five API routes built. |
| Sanitized portable source | TypeScript check, 53 tests, and portable production build passed using the existing dependency installation. |
| Database migrations | Both included migrations applied to an in-memory SQLite database by the API suite. |
| Character artwork and logo files | Source assets included; logo visually inspected at 16 px and 32 px during development. |

The API tests execute the application's route handlers against a real
in-memory SQLite database. The platform identity/binding and the upstream
Ollama network response are mocked. No production account records are read or
modified by the test suite.

## Coverage

| Area | Verified behavior |
| --- | --- |
| Identity | Anonymous access is refused; private records stay account-scoped. |
| Character authoring | Create, update, visibility, delete, reserved starter IDs, avatar validation, and saved snapshots. |
| Persistent data | Chats, edits, variants, ratings, pins, favorites, profiles, personas, lorebooks, memories, and deletion. |
| Record validation | Malformed record shapes, message roles, unsafe avatar URLs, and unsupported group-shaped personal records are rejected. |
| Prompt construction | Character identity, persona, matching lore, disabled entries, always-included entries, pinned text, and memories. |
| Gateway configuration | Owner-only writes, HTTPS validation, token preservation/removal, secret redaction, model discovery, and creativity value 0. |
| Stream parsing | First text before completion, split UTF-8, split JSON, final lines without newlines, and stream errors. |
| Typing display | Progressive reveal of buffered chunks, emoji graphemes, delayed ticks, queue completion, and immediate cancellation. |
| Group membership | One guest seat, blocked third user, simultaneous invitation claims, member-only read/write/generation, and revoked invitations. |
| Shared messages | Server-authenticated authors, simultaneous sends without lost messages, editing permissions, pins, ratings, and owner truncation. |
| Group generation | One active AI reply, stored streamed output, regeneration alternatives, stale request rejection, and gateway failures. |
| Stop behavior | Visible text preserved, late tokens cannot restore the tail, and model warm-up cancellation cannot create a ghost reply. |
| Privacy | Group prompts exclude personal memories/lorebooks and use a persona only after explicit selection. |

## Fixes found during the release audit

- Added API-boundary validation for saved record types. Malformed persona,
  lorebook, memory, chat, and profile data can no longer be saved and fail later
  during prompt construction.
- Preserved a creativity setting of 0 instead of replacing it with the default.
- Prevented overwriting the IDs of built-in starter characters.
- Rejected gateway URLs containing embedded credentials, query strings, or
  fragments rather than silently transforming those fields.

## Follow-up audit — 2026-10-15

- Fixed Stop rejecting visible group reply text that arrived between throttled
  database saves. The requesting member can preserve the newer suffix; altered
  saved prefixes and oversized submissions are rejected. A regression test also
  verifies late tokens cannot overwrite the stopped reply.
- Disabled personal-chat pin, rating, rename, and persona changes during an
  active local generation to prevent the final reply save overwriting those edits.
- Preserved the existing pages, artwork, branding, storage, and authentication.

## Not yet verified

The following require real browser sessions or home infrastructure and are
**not certified by the automated suite**:

- Desktop and mobile browser interaction, focus handling, visual overflow,
  keyboard behavior, avatar upload, clipboard access, and downloaded exports.
- Real ChatGPT sign-in, Site invitations, and two people interacting in separate
  signed-in browser sessions.
- An actual Ollama model, real response quality, model loading time, proxy
  buffering, gateway authentication, and sustained home-network operation.
- A fresh dependency download and the first GitHub-hosted CI run.

The managed authoring environment did not expose its required browser-control
capability. No substitute browser path was used and no browser pass is claimed.
This is a Beta source release, not a stable-release certification.

## Manual acceptance before a stable release

1. Sign in with two invited accounts in separate browsers and verify their
   personal histories, personas, favorites, lorebooks, and memories are isolated.
2. Create, edit, upload an avatar for, share, favorite, and delete a character.
3. Test personal replies, edits, regeneration, alternative selection, ratings,
   pins, truncation, clipboard actions, and JSON export against real Ollama.
4. Create a group, join with the second account, reject a third account, send
   simultaneously, trigger each AI, and stop during both loading and typing.
5. Rotate a group invitation, leave, confirm access is removed, and delete the
   room as its owner.
6. Check narrow and wide layouts, keyboard navigation, dialogs, long messages,
   scrolling while typing, refresh, temporary network loss, and sign-out.
