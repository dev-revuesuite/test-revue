import { randomUUID } from "node:crypto"

import type { SupabaseClient } from "@supabase/supabase-js"

import { getConfiguredAppOrigin, withBasePath } from "@/lib/base-path"
import { getUserPermissions } from "@/lib/get-user-permissions"
import { sendInviteEmail } from "@/lib/invite-email"
import { hasPermission, type PermissionKey } from "@/lib/permissions"

/**
 * Creates (or refreshes) invitation rows and emails the invite links.
 * Runs with the caller's own Supabase session, so RLS on `invitations` and the
 * permission checks below both apply. Joining happens in the database
 * (`accept_invitation`), never here.
 */

export const INVITE_VALID_DAYS = 7

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export class InvitationServiceError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
    this.name = "InvitationServiceError"
  }
}

function escapeIlike(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_")
}

async function assertCan(
  supabase: SupabaseClient,
  userId: string,
  organizationId: string,
  key: PermissionKey
): Promise<void> {
  const { isOrgOwner, permissions } = await getUserPermissions(supabase, userId, organizationId)
  if (!isOrgOwner && !hasPermission(permissions, key)) {
    throw new InvitationServiceError("You don't have permission to send these invites.", 403)
  }
}

async function loadInviteContext(
  supabase: SupabaseClient,
  userId: string,
  organizationId: string
): Promise<{ organizationName: string; inviterName: string | null }> {
  const [{ data: org }, { data: profile }] = await Promise.all([
    supabase.from("organizations").select("name").eq("id", organizationId).maybeSingle(),
    supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
  ])
  return {
    organizationName: org?.name || "a Revue workspace",
    inviterName: profile?.full_name?.trim() || null,
  }
}

/** Creates the invitation, or gives an existing one a new link and expiry. */
async function upsertInvitation(
  supabase: SupabaseClient,
  userId: string,
  target: {
    organizationId: string
    email: string
    name: string | null
    role: "designer" | "client"
    clientId: string | null
  }
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomUUID()
  const expiresAt = new Date(Date.now() + INVITE_VALID_DAYS * 24 * 60 * 60 * 1000)

  let lookup = supabase
    .from("invitations")
    .select("id")
    .eq("organization_id", target.organizationId)
    .ilike("email", escapeIlike(target.email))
  lookup = target.clientId ? lookup.eq("client_id", target.clientId) : lookup.is("client_id", null)
  const { data: existing, error: lookupError } = await lookup.maybeSingle()
  if (lookupError) {
    throw new InvitationServiceError("Couldn't prepare the invite. Please try again.", 500)
  }

  const fields = {
    token,
    expires_at: expiresAt.toISOString(),
    status: "pending",
    role: target.role,
    name: target.name,
    invited_by: userId,
  }

  const { error } = existing
    ? await supabase.from("invitations").update(fields).eq("id", existing.id)
    : await supabase.from("invitations").insert({
        ...fields,
        organization_id: target.organizationId,
        email: target.email,
        client_id: target.clientId,
      })

  if (error) {
    console.error("[invitations] Failed to save invitation:", error.message)
    throw new InvitationServiceError("Couldn't prepare the invite. Please try again.", 500)
  }
  return { token, expiresAt }
}

function inviteUrl(origin: string, token: string): string {
  return `${getConfiguredAppOrigin(origin)}${withBasePath(`/invite/${token}`)}`
}

/** Emails (or re-emails) the invite link for a pending team member. */
export async function sendMemberInvite(
  supabase: SupabaseClient,
  userId: string,
  memberId: string,
  origin: string
): Promise<{ sent: boolean; email: string }> {
  const { data: member } = await supabase
    .from("organization_members")
    .select("id, organization_id, email, name, user_id, role")
    .eq("id", memberId)
    .maybeSingle()

  if (!member) {
    throw new InvitationServiceError("Team member not found.", 404)
  }
  await assertCan(supabase, userId, member.organization_id, "add_team_member")

  if (member.user_id) {
    throw new InvitationServiceError("This person has already joined.", 409)
  }
  if (member.role === "client") {
    throw new InvitationServiceError("Clients are invited from their client's contacts.", 400)
  }
  const email = member.email?.trim() ?? ""
  if (!EMAIL_PATTERN.test(email)) {
    throw new InvitationServiceError("This member has no valid email address.", 400)
  }

  const { token, expiresAt } = await upsertInvitation(supabase, userId, {
    organizationId: member.organization_id,
    email,
    name: member.name?.trim() || null,
    role: "designer",
    clientId: null,
  })
  const context = await loadInviteContext(supabase, userId, member.organization_id)

  const sent = await sendInviteEmail({
    to: email,
    inviteUrl: inviteUrl(origin, token),
    organizationName: context.organizationName,
    inviterName: context.inviterName,
    clientName: null,
    expiresAt,
  })
  return { sent, email }
}

interface ClientContact {
  name?: string | null
  email?: string | null
}

/**
 * Emails invite links to a client's contacts who haven't joined yet.
 * Contacts with an open invite are skipped unless `resend` is true, so this can
 * run after every client save without emailing people twice.
 */
export async function sendClientContactInvites(
  supabase: SupabaseClient,
  userId: string,
  clientId: string,
  origin: string,
  { resend = false }: { resend?: boolean } = {}
): Promise<{ sent: number; skipped: number; failed: number }> {
  const { data: client } = await supabase
    .from("clients")
    .select("id, organization_id, name, contacts")
    .eq("id", clientId)
    .maybeSingle()

  if (!client) {
    throw new InvitationServiceError("Client not found.", 404)
  }
  await assertCan(supabase, userId, client.organization_id, "add_client")

  const contacts = new Map<string, string | null>()
  for (const contact of (Array.isArray(client.contacts) ? client.contacts : []) as ClientContact[]) {
    const email = contact?.email?.trim() ?? ""
    if (!EMAIL_PATTERN.test(email)) continue
    const key = email.toLowerCase()
    if (!contacts.has(key)) contacts.set(key, contact?.name?.trim() || null)
  }
  if (contacts.size === 0) return { sent: 0, skipped: 0, failed: 0 }

  // Who already has access to this client.
  const { data: clientUsers } = await supabase
    .from("client_users")
    .select("user_id")
    .eq("client_id", clientId)
  const joinedIds = (clientUsers ?? []).map((row) => row.user_id)
  const joinedEmails = new Set<string>()
  const [{ data: clientMembers }, { data: profiles }] = await Promise.all([
    supabase
      .from("organization_members")
      .select("email")
      .eq("organization_id", client.organization_id)
      .eq("client_id", clientId)
      .not("user_id", "is", null),
    joinedIds.length > 0
      ? supabase.from("profiles").select("email").in("id", joinedIds)
      : Promise.resolve({ data: [] as { email: string | null }[] }),
  ])
  for (const row of [...(clientMembers ?? []), ...(profiles ?? [])]) {
    if (row.email) joinedEmails.add(row.email.toLowerCase())
  }

  // Who already has an open invite for this client.
  const openInvites = new Set<string>()
  if (!resend) {
    const { data: invites } = await supabase
      .from("invitations")
      .select("email, status, expires_at")
      .eq("client_id", clientId)
    const now = Date.now()
    for (const inv of invites ?? []) {
      const open =
        inv.status === "pending" && (!inv.expires_at || new Date(inv.expires_at).getTime() >= now)
      if (open) openInvites.add(inv.email.toLowerCase())
    }
  }

  const context = await loadInviteContext(supabase, userId, client.organization_id)
  let sent = 0
  let skipped = 0
  let failed = 0

  for (const [email, name] of contacts) {
    if (joinedEmails.has(email) || openInvites.has(email)) {
      skipped++
      continue
    }
    try {
      const { token, expiresAt } = await upsertInvitation(supabase, userId, {
        organizationId: client.organization_id,
        email,
        name,
        role: "client",
        clientId,
      })
      const ok = await sendInviteEmail({
        to: email,
        inviteUrl: inviteUrl(origin, token),
        organizationName: context.organizationName,
        inviterName: context.inviterName,
        clientName: client.name,
        expiresAt,
      })
      if (ok) sent++
      else failed++
    } catch (error) {
      console.error("[invitations] Client contact invite failed:", error)
      failed++
    }
  }

  return { sent, skipped, failed }
}
