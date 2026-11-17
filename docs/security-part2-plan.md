# Security fix part 2 (plan, not built yet)

Database rules only. No app code changes are expected.

## The holes and the fixes

| # | Table | Problem today | New rule | Who still writes it (checked in the code) |
| --- | --- | --- | --- | --- |
| 1 | `client_users` (which clients a user belongs to) | **Any logged-in user** can add, change or delete rows for **any company**. A trigger then makes them a client member of that company | Add or change: the company owner, or members with `add_client`. Read: members of that company | Signup linking (`link_user_to_client`, `link_existing_users_for_client`). These run as secure functions, so the rules don't block them. No app screen writes this table directly |
| 2 | `project_client_users` (which clients can see a project) | Any logged-in user can add, remove or read **any** row | Add or remove: the owner or `add_brief` for that project's company (the person added must be a client of that company). Read: that company's team, plus client users of the project's own client company (Room and Revue need the full list) | New brief (`studio-header.tsx:1178`), Share (`share-creative-service.ts:317`, team only: the code already refuses clients) |
| 3 | `iterations` (versions) | An extra rule lets any logged-in user add a version to **any** design | Remove that extra rule. The existing rule (owner or `add_brief`) stays | New version in Revue, first version on upload. Both are already done by users with `add_brief` |
| 4 | `organization_members` | Anyone can add a member with role "client" to **any** company | Client members can only be added by the owner or `add_client` | No app screen does this. Linking at signup uses the secure functions |
| 5 | `invitations` | Any logged-in user can read and change **every** invitation | Read: the invited person (their own email) or the company owner. Accept: only the invited person. Create: the owner or `add_team_member` / `add_client` | Signup marks your own invitation as accepted (`signup-form.tsx:102`) |

## What stays the same

- Signup, login and client linking work as today.
- Creating briefs, sharing with clients, and clients sharing with other clients from the same client company.
- Clients still see their projects (Room, Revue, client portal).
- Uploading new versions (people with `add_brief`).

## Rollback

A recovery file with the exact current rules, read from the database before the change. As with the storage fix, the first recovery step is a narrower fix, not reopening the holes.

## How we'll test it

| # | Test | Expected |
| --- | --- | --- |
| 1 | New client signs up with an invited email | Linked to the company, sees their projects |
| 2 | Create a brief with client users selected | Works; those clients see the project |
| 3 | Share a design with a client (as owner) | Works |
| 4 | Client opens a project that has an access list they're not on | Not visible (as before) |
| 5 | Owner uploads a new version | Works |
| 6 | Clients open Room, Revue and the client portal | Work as before |
| 7 | Crafted request: logged-in user adds themselves as a client of another company | Refused |
| 8 | Crafted request: add or remove a client on another company's project | Refused |
| 9 | Crafted request: add a version to another company's design | Refused |
| 10 | Crafted request: read or change someone else's invitation | Refused |
