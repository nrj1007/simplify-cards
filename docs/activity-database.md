# Activity database

Production activity events are stored in the `simplifycards-activity` Turso database
(Mumbai, Vercel Marketplace Starter plan). The integration injects
`TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` into the production environment.
Credentials must stay server-side and out of Git.

Before deploying to a new database, run:

```sh
node --env-file=/path/to/private.env scripts/setup-activity-db.mjs
```

The idempotent script creates the activity table and indexes. Events retain the
existing validated payload, timestamp, event type, card ID and anonymous session
ID. Raw event readers use Turso when configured. Existing Blob daily summaries,
feedback records and question logs remain in place; historical data is not migrated.
Without Turso credentials, the existing storage behavior is preserved.

The analytics review page reads exclusively from Turso and derives its daily
summaries from all events in the 30-day reporting window, using paginated reads
in a consistent read transaction. It does not use legacy Blob summaries or
historical logs. Missing credentials or database errors fail the page rather
than showing misleading zero counts. Existing Blob summary writes continue.

Preview and local environments are not connected to production Turso. Provision a
separate database and run the same schema script before enabling them. Activity
has no automatic deletion policy yet; monitor storage usage as events accumulate.
