# Plans phase 5: add-ons (plan, not built yet)

## What the sheet says

| Add-on | Price |
| --- | --- |
| QC pack: 100 runs | ₹900 |
| QC pack: 500 runs | ₹4,000 |
| QC pack: 2,000 runs | ₹14,000 |
| Storage: +50 GB | ₹400 / month |
| Storage: +200 GB | ₹1,200 / month |
| Storage: +1 TB | ₹4,000 / month |

## Decisions

- **Added by hand for now** (your team adds them in the database). Payments (Razorpay) come later.
- **QC packs expire 12 months** after they're added.
- **Extra storage is monthly.** It counts while active and stops when it ends.
- **Any plan can have add-ons**, Free included.
- **Several at once:** a company can hold many packs and storage add-ons together.
- **Free:** pack runs are used once the 5 daily runs are gone.
- **Business:** packs go beyond the 5,000 monthly limit.
- **Plan changes** (upgrade or downgrade): packs and storage add-ons stay. *(Assumed; please confirm.)*
- **Enterprise:** no special rule for now. Add-ons simply add on top, like other plans.

## How QC packs work

1. A check uses the **plan allowance first** (5 a day on Free, 500 a month on Plus…).
2. When that's used up, it uses the **pack that expires soonest**.
3. A failed check gives its run back to wherever it came from (plan or pack).
4. Expired packs stop counting. Unused runs in them are lost.
5. "Out of QC runs" appears only when the plan allowance **and** all active packs are used up.

## How extra storage works

1. Storage limit = **plan storage + all active storage add-ons**.
2. Each add-on has a start date and an end date (one month, renewed by hand for now).
3. When an add-on ends, the limit drops. If the company is over it, new uploads are blocked. **Files are never deleted** (same rule as today).

## What gets built

1. **Database (one migration, shown to you first):**
    - A table of QC packs per company: runs bought, runs left, added on, expires on.
    - A table of storage add-ons per company: GB, starts on, ends on.
    - The QC check updated to use the plan first and then packs, with refunds going back to the right place.
    - The storage limit updated to include active add-ons.
2. **Plan & Usage tab:**
    - "QC packs: 60 runs left (expires 22 Oct 2027)".
    - "Storage: 3.2 GB / 51 GB (1 GB plan + 50 GB add-on, renews 22 Nov)".
3. **Pop-ups:** "Out of QC runs" and "Storage full" mention add-ons. The **Buy** button comes with payments later.
4. **How your team adds them:** SQL snippets in the runbook (add a pack, add or renew storage).

## Adding add-ons by hand (until payments exist)

Run these in the Supabase SQL Editor. Replace `<ORG_ID>`.

**Add a QC pack** (expires 12 months after today):
```sql
insert into qc_packs (organization_id, runs, note) values ('<ORG_ID>', 100, 'Paid ₹900 on 22 Oct 2026');
```

**Add extra storage** (one month from today):
```sql
insert into storage_addons (organization_id, gb, note) values ('<ORG_ID>', 50, 'Paid ₹400 on 22 Oct 2026');
```

**Renew extra storage** for another month:
```sql
update storage_addons set ends_at = ends_at + interval '1 month' where id = '<ADDON_ID>';
```

**See what a company has:**
```sql
select * from public.org_qc_packs('<ORG_ID>');
select gb, starts_at, ends_at from storage_addons where organization_id = '<ORG_ID>' order by ends_at;
```

## How we'll test it (Plan Test Org)

| # | Test | Expected |
| --- | --- | --- |
| 1 | Free, 5 daily runs used, add a 100-run pack, run a check | Works; pack shows 99 left |
| 2 | Pack used up, no runs left | "Out of QC runs" |
| 3 | Check fails while using a pack | Pack run is given back |
| 4 | Two packs | The one expiring first is used first |
| 5 | Expired pack | No longer counts |
| 6 | Business at 5,000 with a pack | Checks continue from the pack |
| 7 | Add +50 GB storage on Free | Limit shows 51 GB; uploads allowed |
| 8 | Storage add-on ends while over 1 GB | New uploads blocked; files kept |
| 9 | Switch plan with packs and storage add-ons | They stay |
| 10 | Plan & Usage tab | Shows packs, expiry, add-ons and renewal |
