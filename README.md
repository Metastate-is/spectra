# Spectra decommission and migration runbook

Spectra is being retired as a standalone runtime. Its reputation behavior now lives in
Citadel and its persisted marks/changelog move from Neo4j to Citadel PostgreSQL.

This repository must not be deployed after the migration changes are merged. Keep it
available only long enough to export and verify the production data. The local
`compose.yml` is a recovery/export aid; it is not part of the target VDS stack.

## Safety rules

- Perform the cutover from the exact `UH` branch in both repositories.
- Treat every credential that was previously committed to this repository as
  compromised. Obtain current credentials from the deployment secret store and never
  copy them into Git, shell history, logs, tickets, or the export file name.
- Store the export on an encrypted/restricted filesystem. It contains participant
  relationships and must remain mode `0600`.
- Do not stop Neo4j or archive this repository until the export checksum, participant
  references, PostgreSQL import, GraphQL smoke tests, and Bot delivery have all been
  verified.
- Take a PostgreSQL backup before running the import. Keep Neo4j read-only and
  recoverable until the rollback window has ended.

## Cutover procedure

### 1. Freeze reputation writes

Enter a maintenance window and stop all old Citadel `markCreate` traffic before the
export begins. Keep Spectra and Neo4j reachable only from the trusted operator host.
Record the maintenance start time and confirm that no mark mutation is still in flight.

Do not run an export while writes continue: marks and their changelog would not be a
consistent cutover snapshot.

### 2. Export Spectra from Neo4j

From this repository, install/build the already-reviewed `UH` revision and supply
`NEO4_URL`, `NEO4J_USER`, and `NEO4J_PASSWORD` through the secure runtime environment.
Use a path outside the repository:

```bash
umask 077
npm run cli -- export-postgres --output /secure/spectra/spectra-export.json
```

The exporter writes schema version 1 JSON, adds a SHA-256 checksum over the payload,
and creates the file with mode `0600`. Preserve the exporter log containing only row
counts and checksum; do not print the JSON itself.

### 3. Prepare Citadel PostgreSQL

Back up the Citadel PostgreSQL database using the normal encrypted production backup
process. From the matching Citadel `UH` revision, provide its database environment and
apply all migrations:

```bash
npm run migration:run
```

This creates `reputation_marks`, `reputation_mark_history`, and `reputation_outbox`.

### 4. Verify before import

Copy the export to the trusted Citadel operator host without relaxing its permissions,
then validate the checksum, schema, IDs, timestamps, mark types, and participant
references without writing rows:

```bash
npm run cli -- import-spectra \
  --input /secure/spectra/spectra-export.json \
  --verify-only
```

Verification must succeed. If Citadel lacks any referenced participant, stop and
reconcile participant data before retrying. Do not edit the export by hand because that
invalidates its checksum.

### 5. Import and reconcile counts

Run the idempotent import:

```bash
npm run cli -- import-spectra \
  --input /secure/spectra/spectra-export.json
```

Save the reported exported/imported/duplicate counts. Re-running the same import is
safe: current marks are upserted by their directed participant/type/source key and
history IDs are inserted once. Historical records intentionally do not enqueue Bot
notifications.

Compare the resulting PostgreSQL counts with the importer report:

```sql
SELECT count(*) FROM reputation_marks;
SELECT count(*) FROM reputation_mark_history;
SELECT count(*) FROM reputation_outbox;
```

The outbox count added by the historical import must be zero. Account for any rows that
existed before import explicitly rather than assuming an empty database.

### 6. Deploy and smoke-test Citadel

Deploy the Citadel `UH` revision with PostgreSQL migrations applied and without
`SPECTRA_INTERNAL_URL` or `GRPC_SPECTRA_SERVICE_URL`. Exercise the existing GraphQL
contract for representative on-chain and off-chain cases:

- read `reputationContext`, including mutual and one-hop common-neighbour results;
- read `reputationCount` and `reputationChangelog`;
- call `markCreate` once with a controlled participant pair;
- confirm the current mark and one new history row in PostgreSQL;
- confirm one durable outbox event is delivered to Bot and marked delivered;
- repeat/retry delivery and confirm Bot handles the stable event ID idempotently.

Keep the maintenance window active if any check differs from the pre-cutover result.

### 7. Retire Spectra and Neo4j

Only after all verification succeeds:

1. Remove Spectra and Neo4j from the production/VDS Compose definition.
2. Shut down their containers without deleting the Neo4j data volume.
3. Revoke/rotate all old Neo4j credentials and close its network endpoint.
4. Retain the encrypted database backup and export for the agreed rollback period.
5. Archive this repository after confirming no deployment automation or runtime still
   references it.

## Rollback

If verification fails before new writes are enabled, keep maintenance mode active,
restore the pre-import PostgreSQL backup if needed, and resume the old Citadel + Spectra
path against the preserved Neo4j database.

If the new Citadel path has already accepted writes, do not blindly switch back: those
writes exist only in PostgreSQL. Freeze writes again, preserve both databases and the
outbox, and perform an explicit data reconciliation before choosing the serving path.

## Local recovery/export commands

The remaining Spectra build and tests are available only to validate the exporter and
recover the old service during the migration window:

```bash
npm run build
npm test -- --runInBand
```

Do not re-enable the removed deployment workflow or the unauthenticated `/create` and
`/get-mark` debug routes.
