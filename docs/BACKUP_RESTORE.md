# Backup, restore, and migration

Back up the SQLite database **and** the matching protected `.env`. The auth
secret is needed to decrypt 2FA material and OAuth tokens. Losing the database
or changing the secret unexpectedly is not a safe password-recovery procedure.

## Consistent online backup

The backup helper uses SQLite's backup API, which includes committed WAL data.
Do not copy only the main `.sqlite` file while the application is writing.

Native installation:

```bash
pnpm run backup
# Or choose a destination:
node scripts/backup.mjs /secure/backups/geko.sqlite
```

Docker:

```bash
docker compose exec app node scripts/backup.mjs /app/data/backup.sqlite
docker compose cp app:/app/data/backup.sqlite ./backups/geko.sqlite
```

Create `./backups` first. Move backups to protected off-host storage and keep
them encrypted. The file inside the data volume is only a staging copy, not
a disaster-recovery plan. Backups contain private conversations, authentication
records, session data, and inference configuration.

## Restore Docker

1. Stop the application: `docker compose stop app`.
2. Preserve the current volume and `.env` before replacing anything.
3. Restore the backup to `geko.sqlite` in the mounted data volume and restore
   its matching `.env` (or preserve all original relevant secrets).
4. Remove obsolete `geko.sqlite-wal` and `geko.sqlite-shm` only while the app is
   stopped and only as part of replacing the whole database with the consistent
   backup. Keep the pre-restore files together in the safety copy.
5. Ensure the database is writable by the container's `node` user (UID 1000).
6. Start the source version matching the backup, verify migrations and sign-in,
   then upgrade deliberately.

For a convenient stopped-volume restore, use a one-off Compose container:

```bash
docker compose run --rm --no-deps --user root --entrypoint sh app
# Inside the container, /app/data is the mounted data volume.
```

Mount/copy the protected backup into that maintenance environment explicitly;
verify paths before replacing files. Do not run the normal app simultaneously.
The helper does not automatically overwrite a live installation.

Native restore follows the same stopped-process sequence with `DATA_DIR`.
A database restore may restore old sessions; revoke sessions after a recovery
when compromise is suspected.

## Model storage

Downloaded weights live in the separate `geko-ai_ollama-data` Docker volume.
They can be downloaded again with `docker compose exec ollama ollama pull TAG`.
Keep the application data and `.env` backups even when you can redownload models.
Never run `docker compose down -v` unless you intend to erase persistent data.
