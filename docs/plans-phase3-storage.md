# Plans phase 3: storage limit (plan, not built yet)

## What the sheet says

| | Free | Plus | Business | Enterprise |
| --- | --- | --- | --- | --- |
| Storage | 1 GB | 100 GB | 1 TB | Custom |

## Decisions already made

- **What counts:** every file the team uploads:
  - designs and their versions
  - Quick Analysis files
  - client brand images and project reference files
- **What doesn't count:**
  - client and organization **logos**
  - files the system makes by itself: preview thumbnails, the faster-loading copy of each PDF, AI logs
- **When full:** new uploads are blocked. Existing files are never touched.
- **Organizations already over the limit** keep everything, but can't upload until they're under it or upgrade. One organization is at 3.4 GB on Free today.
- **Buying extra storage** is out of scope for now.
- Like everything else, it only applies to organizations with plan limits switched on.

## How we measure an organization's storage

Supabase records the size of every file. The file's folder tells us which organization owns it:

| Where the file is | How we find the organization |
| --- | --- |
| Design (`creatives/<project>/...`) | project, then client, then organization |
| Version (`revue-assets/iterations/<design>/...`) | design, then project, then organization |
| Quick Analysis (`quick-analysis-assets/<organization>/...`) | directly |
| Brand image or reference (`client-assets/<organization>/...`) | directly. Skipped if it's a client's or the organization's logo |

**Used storage** is the sum of those file sizes. About 160 old files (158 MB) belong to deleted projects and aren't counted.

## What gets built

1. **Database (new migration, shown to you before it's applied):**
    - A function that adds up an organization's used storage.
    - A function that answers "can this organization upload a file of this size?"
    - A Custom storage size for Enterprise organizations.
2. **Check before every upload:** the app asks the database before uploading. If the file doesn't fit, a pop-up says: *"Storage full: 1 GB of 1 GB used. Delete old files or upgrade your plan."* Upload points:
    - new design (Room / Brief)
    - new version (Revue)
    - Quick Analysis upload
    - client brand images and project references
3. **Database safety net:** some uploads go straight from the browser to storage. The database will also refuse a file that goes over the limit, so the app's check can't be bypassed.
    - *To verify first:* that Supabase gives the file's size at this point. If it doesn't, those uploads will go through our server instead, which can check the size.
4. **Plan & Usage tab:** a "Storage: 340 MB / 1 GB" bar.

## How we'll test it

On Plan Test Org (Free, limits on):

1. The Plan tab shows the correct used storage.
2. Set a tiny custom limit (e.g. 5 MB) with SQL, then upload a bigger file in each place.
    - It's blocked with the pop-up, and nothing is saved.
3. A small file that fits uploads normally.
4. Uploading a logo still works, and doesn't change the used storage.
5. Delete a design or version.
    - Used storage goes down.
6. Switch to Business.
    - Large uploads work again.
7. An organization with limits off is never blocked.
