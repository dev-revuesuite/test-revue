# Storage security fix + storage limits: rollout runbook

## What's in the code

| Part | Files |
| --- | --- |
| A. Security fix (migration) | `supabase/migrations/20261010120000_storage_security_fix.sql` |
| A. Recovery (tiered, never the default rollback) | `supabase/recovery/storage-security-recovery.sql` |
| A. Code | Previews and `.web.pdf` copies are written by the server (service role). The PDF-copy route now checks permission. Revue no longer saves a blank version when an upload fails |
| B. Storage limits (migration) | `supabase/migrations/20261010130000_subscription_plans_v4_storage.sql` |
| B. Code | `/api/storage/uploads` (request / complete / cancel / discard), `src/lib/upload-with-quota.ts`, all 8 upload flows rewired, storage pop-up, Plan tab storage bar, cleanup in the daily job, D5 (5 MB logos), D6 (Enterprise QC "not configured") |

The code works whether the migrations are applied or not:
- **Before migration A:** the new permission function doesn't exist, so the PDF-copy route and the upload flows fall back to today's direct uploads.
- **Before migration B:** reservations fall back to direct uploads.

## Important: the database is shared with production

Migration A changes storage rules **for the whole project**, production included. The production app that's live **today** writes previews and PDF copies with the user's session. After migration A, that's refused. Uploads still work, but PDF previews and fast-loading copies stop being created until the new code is deployed.

**So:** don't apply migration A to the shared database until production runs this code. Test in staging first.

## Step 0: staging (one-time)

1. Create a new Supabase project, e.g. `revue-staging`.
2. Copy production's schema, without data:
   `supabase db dump --linked --schema public,storage -f staging-schema.sql`
   This reads production; it doesn't change anything.
3. Run `staging-schema.sql` on staging. Recreate the buckets with the same settings: `creatives`, `revue-assets` and `client-assets` public with no size limit; `quick-analysis-assets` and `ai-inference-logs` private with 50 MB; `org-logos` public.
4. Apply, in order: plans v1, v2, v3, then A (security fix), then B (v4).
5. Create test users: owner, full-access member, member **without** add_brief, client user, plus an owner of a second organization.
6. Point a local `.env.staging` (Supabase URL and keys, `CRON_SECRET`) at staging and run the app against it.

## Step 1: tests in staging

**Security (A):**

| Test | Expected |
| --- | --- |
| Every upload flow, as owner and as a full-access member: Room, Brief, Revue version, Quick Analysis, new client (logo, brand images, fonts), client edit, brief refs, organization logo (settings), new-organization logo | Works |
| PDF upload | Preview and `.web.pdf` copy created |
| Member without add_brief uploads a design or version | Refused |
| Client user uploads anything | Refused |
| Crafted upload, overwrite or delete in the other organization's folder | Refused |
| Existing files and thumbnails | Load |
| Version-history cleanup job | Still deletes |

**Recovery rehearsal:** break one flow on purpose, recover it with its tier-2 block from the recovery file, then restore the strict rule.

**Storage limits (B)**, with limits switched on for the test organization:
- the full test matrix in `docs/plans-phase3-storage.md`
- two uploads at once
- a file larger than declared
- cancelling, then reusing the URL
- an abandoned upload, then cleanup
- logo over 5 MB; logo while over quota
- Enterprise with no override (storage and QC both say "not configured")

## Step 2: production

1. Deploy the app. Everything keeps working, because the new code falls back to direct uploads.
2. Apply migration A. Then smoke-test each upload flow on Plan Test Org and a second test organization you own.
   - **If a flow breaks:** tier 1 forward fix, or the tier-2 block from the recovery file. Never restore the original rules without the owner's approval.
3. Apply migration B. Nothing changes while limits are off.
4. Set `CRON_SECRET` in Vercel. The daily job runs both cleanups.
5. Turn limits on for Plan Test Org only, and check the Plan tab and one refused upload against a tiny override.
6. **Global switch:** only after the 3.4 GB organization has been told and given time (R4). Their files are never deleted.

## Rollback

| What | How |
| --- | --- |
| App | Redeploy the previous build. Direct uploads still work while limits are off |
| Migration B | Leave it. It's additive and does nothing while limits are off |
| Migration A | Recovery tiers 1–3 only. Tier 4 (original rules) only with the owner's explicit approval |
