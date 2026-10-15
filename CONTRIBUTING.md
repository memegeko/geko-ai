# Contributing to geko.ai

Focused fixes, accessibility improvements, clearer setup instructions, and
reproducible bug reports are welcome.

Before submitting a change, run:

```bash
pnpm run typecheck
pnpm test
pnpm run build
```

Describe the concrete problem, resulting behavior, and tests performed. Include
the app version, browser, and reproduction steps for interface defects. Include
the Ollama version, model tag, and sanitized gateway response when reporting
inference problems. Distinguish a mocked test from a real model or browser run.

Preserve account isolation, the maximum of two people and two AIs per shared
room, server-side gateway tokens, and explicit sharing boundaries for personas
and character definitions. Add focused regression coverage when changing these
contracts. Applied database migrations are immutable; append new migrations.

Do not include private chats, bearer tokens, real account identifiers, local
databases, generated build output, or authoring-session state in a contribution.
Keep required upstream source and license notices. Do not submit proprietary
Character.AI assets or datasets.
