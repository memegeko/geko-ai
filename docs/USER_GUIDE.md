# Using geko.ai

## Start a conversation

Sign in to the installation, choose a starter character in Discover, and send
a message. The installer connects Ollama automatically. A selected model must be downloaded
before replies work. Connection details can be changed in Settings. Without
a connection, messages are saved and an explicit notice appears; the app does
not supply fabricated demo replies.

While a reply is generating, text is revealed progressively. Stop keeps the
visible part. Reply retries after a user message; Regenerate creates another
version of the latest assistant reply. Arrow controls select saved alternatives.
Editing an assistant message replaces that version's alternative list.

Message controls copy, rate, pin, edit, or truncate history. Deleting a message
and everything after it is destructive. Export downloads the conversation as
JSON; it is a conversation export, not a complete server backup.

## Create a character

Choose **Create → A character**. Supply a name, greeting, short description,
and personality definition. Definitions can include background, voice, rules,
and example dialogue. Select a category, add tags, and optionally upload an
avatar. Supported avatar formats are PNG, JPEG, WebP, and GIF.

Private characters appear only to their owner. Shared characters appear to
other accounts allowed on the installation. Existing conversations retain
character snapshots so deleting a character does not immediately destroy them.
Sharing a character with a group exposes that snapshot within the group.

## Personas

Create a persona describing the role you play: name, background, appearance,
and preferences. A default applies to new personal chats; an existing
conversation has an explicit persona selector. Persona definitions remain
private until deliberately selected in a shared group.

## Lorebooks

Create a lorebook, add entries, and provide comma-separated keywords.
Enabled entries enter personal chat context when a keyword occurs in recent
messages. Important world rules can be marked **Always include**. Disable an
entry to retain it without sending it to the model. Lorebooks currently apply
across personal chats belonging to their owner.

## Memories and pins

Open conversation details to add or edit explicit long-term memories for a
character. Those facts apply to future personal chats with that character.
They are not automatically inferred from messages. Pin individual messages
when a detail should remain in prompt context even after it leaves recent
history. The model can still forget details if its context capacity is exceeded.

## Shared group chats

1. Open **Chats → New group chat** and choose one or two AI characters.
2. Copy the room invitation and send it to one permitted user.
3. The second person signs in and selects **Join group**.
4. Send human messages, select the next AI, and press **Reply**.

The creator counts as the first of two human seats. A third person cannot join,
even with the link. The creator can replace the link, rename the room, truncate
history, or delete the group. The guest can leave; leaving revokes their access
and rotates the invitation. A room accepts one AI generation at a time.

Private personal chats, lorebooks, and character memories are not included in
shared prompts. Group personas must be selected explicitly. Room access does
not grant an account permission to sign into the whole installation.

## Account security

Open **Settings → Security** to set up an authenticator, save or replace recovery
codes, connect a login provider, change a password, or revoke sessions. See
[Authentication](AUTHENTICATION.md) for enrollment and recovery behavior.
