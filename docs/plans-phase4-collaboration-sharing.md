# Plans phase 4: collaboration and sharing (plan, not built yet)

## What the sheet says, and what we're building

| Feature | Free | Plus | Business | Enterprise | This phase |
| --- | --- | --- | --- | --- | --- |
| Creative Mode | ✓ | ✓ | ✓ | ✓ | Nothing to build |
| Productive Mode | — | ✓ | ✓ | ✓ | **Lock on Free** |
| Internal comments | ✓ | ✓ | ✓ | ✓ | **Fix the leak** (all plans) |
| Guest reviewers | 2 | 20 | Unlimited | Unlimited | **Limit client users** |
| Approval workflow | — | ✓ | ✓ | ✓ | Skipped; manager question 8 |
| Role-based permissions | — | Limited | ✓ | ✓ | **Lock on Free**; Plus unlimited for now |
| Share links | ✓ | ✓ | ✓ | ✓ | Nothing to build |
| Downloads and exports (original file, Download All, PNG with AI boxes) | — | ✓ | ✓ | ✓ | **Lock on Free** |
| PDF export, JPG export, design report | — | ✓ | ✓ | ✓ | Later (don't exist yet) |
| Watermark-free export | — | ✓ | ✓ | ✓ | Nothing (Free can't export) |

Like everything before, limits only apply to organizations with plan limits switched on.

## 1. Team-comment leak (security fix, all plans)

**Problem:** in Productive Mode, a client's screen hides team comments, but the app still sends them to the client's browser.

**Fix:** a database rule. In a Productive project, a client user can't read team comments, their replies, or the drawings attached to them.
- Creative Mode is unchanged: clients see everything, as designed.
- Team members are unchanged.
- Live updates follow the same rule.

## 2. A shared "plan lock" foundation

- **Database:** one function, "does this organization's plan include feature X?". It reads the plan's feature list and honours the limits switch.
- **App:** the active organization's plan features load once per page, so every screen can ask "is X included?".
- **Lock style:** a lock icon plus **"Available on Plus"**. No button until payments exist.

## 3. Productive Mode

- **Brief form:** on Free, the "Productive" option shows the lock and can't be selected.
- **Database:** creating a project in Productive mode, or switching a project to it, is refused on Free.
- **Existing Productive projects on Free keep working.**

## 4. Role-based permissions

- **On Free:** "Add New Role" and editing roles show the lock. The database refuses creating or changing roles.
- **The built-in "Full Access" role** still exists on Free and can be assigned to members.
- **New members start with no access** and see: *"Ask your organization admin to assign you a role."* Today they're silently sent to the Account page; the message is added there.
- **Plus:** full roles with no limit, until "Limited" is defined.

## 5. Guest reviewers (client users)

- **Limit:** Free 2, Plus 20, Business and Enterprise unlimited.
- **Counts:** client users who have **joined**. Invited contacts who haven't signed up don't count.
- **When full:**
  - A new client still signs up fine, but isn't linked to the organization, so they get no access. Signup never breaks, same approach as team members.
  - The owner sees *"Guest reviewer limit reached (2 of 2)"* when adding client contacts or sharing with a new client.
- **Organizations already over the limit** keep their existing clients.
- **Plan & Usage tab:** a "Guest reviewers: 1 / 2" bar.

## 6. Downloads and exports on Free

**Locked on Free:**
- "Download" (original file) in Revue and Quick Analysis
- "Download with AI boxes"
- "Download All" (zip) in Master Drive

**Server:** the "Download All" route refuses on Free.

**Viewing and share links stay available.**

## Not in this phase

- Approval workflow (manager question).
- PDF export, JPG export, design report.
- Plus "Limited" roles.

## Database changes (one migration, shown before applying)

1. A feature-check function per organization.
2. A rule hiding team comments, replies and drawings from clients in Productive projects.
3. A rule refusing new Productive projects on Free.
4. A rule refusing role creation and changes on Free, apart from the built-in Full Access role.
5. A guest-reviewer limit when a client user joins. When full, the client is skipped instead of raising an error, so signup isn't affected.
6. Guest reviewers added to the Plan & Usage data.

## How we'll test it (Plan Test Org, Free, limits on)

1. **Leak:** in a Productive project, log in as a client and check that team comments aren't in the page data (browser dev tools, Network tab). Team members still see them.
2. **Productive Mode:** locked in the brief form; an existing Productive project still opens and works.
3. **Roles:** "Add New Role" is locked; Full Access can still be assigned; a new member without a role sees the message.
4. **Guest reviewers:** with 2 clients joined, a 3rd client signs up fine but gets no access, and the owner sees the limit message.
5. **Downloads:** all three download buttons are locked on Free, and "Download All" is refused by the server.
6. **Switch to Plus:** everything unlocks.
