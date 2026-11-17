# Plans phase 2: version history (plan, not built yet)

## What the sheet says

| | Free | Plus | Business | Enterprise |
| --- | --- | --- | --- | --- |
| Projects / briefs | Unlimited | Unlimited | Unlimited | Unlimited |
| Active design files | Unlimited | Unlimited | Unlimited | Unlimited |
| Version history | 7 days | 90 days | Unlimited | Custom |

- **Projects / briefs and active design files:** unlimited on every plan, so there's nothing to build.
- **Version history:** this is the only thing to build. It's the same rule as "Iterations auto-delete" in Master Drive.

## Decisions already made

- Old versions are **permanently deleted**, including their files.
- The **latest version of each creative is always kept**.
- The owner is **warned 3 days before** anything is deleted.
- **Only the plan decides** how long versions are kept. The project's own "auto-delete 15 / 30 / 60 days" setting is ignored.
- It only runs for organizations with plan limits switched on, same as QC runs and members.
- Workspaces are on hold until the manager answers (see `plans-open-questions.md`).

## How it will work

1. **Once a day,** a job runs at 2:00 AM IST (Vercel Cron).
2. **It finds versions that are too old:** older than 7 days on Free or 90 days on Plus, never on Business. Enterprise gets a custom number per organization. The latest version of each creative is skipped.
3. **It warns the owner** with an in-app notification: "5 older versions will be deleted on 12 Oct."
4. **3 or more days later, it deletes them.** That removes the version, its file (and the PDF web copy), and its comments, drawings and AI results.
5. **It checks again right before deleting.** If the organization upgraded, or that version became the latest, it's not deleted and the warning is cleared.

## What gets built

1. **Database (new migration, shown to you before it's applied):**
    - A table that remembers which versions the owner was warned about, and when they'll be deleted.
    - A way to set a custom number of days for Enterprise organizations.
    - A function that lists versions due for a warning or deletion.
2. **The daily job:** a protected API route that only Vercel can call, using a new secret, `CRON_SECRET`. It has a test mode that shows what *would* be deleted without deleting anything.
3. **Bug fix:** new versions are numbered "count + 1" today. After old versions are deleted, that number repeats and the upload fails silently. It will use "highest number + 1", and show an error if saving fails.
4. **File safety:** version 1's file is also the creative's thumbnail, so it's never deleted while still in use.
5. **Plan & Usage tab:** shows "Version history: 7 days", plus "N versions will be deleted on DATE" when there are any.
6. **New notification type** for the warning.

## How we'll test it

On Plan Test Org (Free, limits on):

1. Upload 3 versions of one creative, then make 2 of them look old using SQL (shown to you first).
2. Run the job in test mode.
    - It should list the 2 old versions and not the latest one.
3. Run it for real.
    - The owner gets the warning, and nothing is deleted yet.
4. Move the delete date forward using SQL, then run it again.
    - The 2 old versions and their files are deleted, and the latest version stays.
5. Switch the organization to Business and repeat.
    - Nothing is deleted, and the warnings are cleared.
6. Upload a new version after the deletion.
    - It gets the next number and saves correctly.
7. Confirm an organization with limits off is never touched.
