"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { X, Copy, Check, Mail, Link2, Users, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { apiPath, withBasePath } from "@/lib/base-path";
import type { ShareCandidate } from "@/types/share-creative";

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  projectId?: string;
  creativeId?: string;
  creativeName: string;
  onSuccess?: (message: string) => void;
}

function avatarColor(name: string): string {
  const colors = [
    "bg-orange-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-blue-500",
    "bg-teal-500",
    "bg-amber-500",
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}

export function ShareDialog({
  open,
  onClose,
  projectId,
  creativeId,
  creativeName,
  onSuccess,
}: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<ShareCandidate[]>([]);
  const [sharePath, setSharePath] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shareLink = useMemo(() => {
    if (!sharePath || typeof window === "undefined") return "";
    return `${window.location.origin}${withBasePath(sharePath)}`;
  }, [sharePath]);

  const loadCandidates = useCallback(async () => {
    if (!projectId || !creativeId) {
      setCandidates([]);
      setSharePath("");
      setError("Missing project or creative context");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ creativeId });
      const response = await fetch(
        `${apiPath(`/api/projects/${projectId}/share-creative`)}?${params}`,
        { cache: "no-store" }
      );

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        candidates?: ShareCandidate[];
        sharePath?: string;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to load share options");
      }

      setCandidates(payload?.candidates || []);
      setSharePath(payload?.sharePath || "");
      setSelectedMembers([]);
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Failed to load share options";
      setError(message);
      setCandidates([]);
      setSharePath("");
    } finally {
      setLoading(false);
    }
  }, [projectId, creativeId]);

  useEffect(() => {
    if (open) {
      void loadCandidates();
    } else {
      setCopied(false);
      setSelectedMembers([]);
      setError(null);
    }
  }, [open, loadCandidates]);

  const handleCopyLink = async () => {
    if (!shareLink) return;

    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy link to clipboard");
    }
  };

  const toggleMember = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleSendInvites = async () => {
    if (!projectId || !creativeId || selectedMembers.length === 0) return;

    setSending(true);
    setError(null);

    try {
      const response = await fetch(
        apiPath(`/api/projects/${projectId}/share-creative`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creativeId,
            recipientMemberIds: selectedMembers,
          }),
        }
      );

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        granted?: number;
        notified?: number;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to share creative");
      }

      const count = payload?.notified ?? selectedMembers.length;
      onSuccess?.(
        count === 1
          ? "Shared with 1 person"
          : `Shared with ${count} people`
      );
      onClose();
    } catch (sendError) {
      const message =
        sendError instanceof Error
          ? sendError.message
          : "Failed to share creative";
      setError(message);
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  const teamCandidates = candidates.filter((member) => member.kind === "team");
  const clientCandidates = candidates.filter((member) => member.kind === "client");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg overflow-hidden bg-white dark:bg-[#1e1e1e] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-[#333]">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Share &quot;{creativeName}&quot;
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Invite people to view and collaborate on this creative
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6 min-w-0">
          <div className="min-w-0">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Share Link
            </label>
            <div className="flex gap-2 min-w-0">
              <div className="flex-1 min-w-0 flex items-center gap-2 overflow-hidden px-3 py-2.5 bg-gray-100 dark:bg-[#2a2a2a] border border-gray-200 dark:border-[#444]">
                <Link2 className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="min-w-0 flex-1 truncate text-sm text-gray-600 dark:text-gray-300">
                  {shareLink || "Loading link..."}
                </span>
              </div>
              <Button
                onClick={handleCopyLink}
                disabled={!shareLink}
                className={cn(
                  "shrink-0 gap-2 transition-all",
                  copied
                    ? "bg-green-500 hover:bg-green-600"
                    : "bg-[#5C6ECD] hover:bg-[#4A5BC7]"
                )}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </Button>
            </div>

            <div className="flex items-center gap-2 mt-3 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-[#252525] border border-gray-200 dark:border-[#444]">
              <Lock className="w-4 h-4 shrink-0 text-[#5C6ECD]" />
              Login required — recipients must have access to this project
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              <Users className="w-4 h-4" />
              People
            </label>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500 dark:text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading team and client contacts...
              </div>
            ) : candidates.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 dark:border-[#444] px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                No one else is available to share with yet.
              </div>
            ) : (
              <div className="space-y-4 max-h-[260px] overflow-y-auto">
                {teamCandidates.length > 0 && (
                  <ShareCandidateGroup
                    title="Team"
                    members={teamCandidates}
                    selectedMembers={selectedMembers}
                    onToggle={toggleMember}
                  />
                )}
                {clientCandidates.length > 0 && (
                  <ShareCandidateGroup
                    title="Client"
                    members={clientCandidates}
                    selectedMembers={selectedMembers}
                    onToggle={toggleMember}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1a1a1a]">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={sending}
            className="border-gray-300 dark:border-[#444]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSendInvites}
            disabled={selectedMembers.length === 0 || sending || loading}
            className="bg-[#5C6ECD] hover:bg-[#4A5BC7] text-white gap-2"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Mail className="w-4 h-4" />
            )}
            Share
            {selectedMembers.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-xs">
                {selectedMembers.length}
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ShareCandidateGroup({
  title,
  members,
  selectedMembers,
  onToggle,
}: {
  title: string;
  members: ShareCandidate[];
  selectedMembers: string[];
  onToggle: (memberId: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {title}
      </p>
      {members.map((member) => (
        <button
          key={member.id}
          type="button"
          onClick={() => onToggle(member.id)}
          className={cn(
            "w-full flex items-center gap-3 p-3 transition-colors",
            selectedMembers.includes(member.id)
              ? "bg-[#5C6ECD]/10 border border-[#5C6ECD]"
              : "bg-gray-50 dark:bg-[#2a2a2a] border border-transparent hover:border-gray-200 dark:hover:border-[#444]"
          )}
        >
          <Avatar className="h-9 w-9">
            {member.avatarUrl ? (
              <AvatarImage src={member.avatarUrl} alt={member.name} />
            ) : null}
            <AvatarFallback
              className={`${avatarColor(member.name)} text-white text-sm`}
            >
              {member.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {member.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {member.email}
            </p>
          </div>
          {member.hasAccess && (
            <span className="text-[10px] uppercase tracking-wide font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
              Has access
            </span>
          )}
          <div
            className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0",
              selectedMembers.includes(member.id)
                ? "bg-[#5C6ECD] border-[#5C6ECD]"
                : "border-gray-300 dark:border-[#555]"
            )}
          >
            {selectedMembers.includes(member.id) && (
              <Check className="w-3 h-3 text-white" />
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
