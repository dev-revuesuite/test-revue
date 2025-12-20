"use client";

import { useState } from "react";
import { X, Copy, Check, Mail, Link2, Users, Globe, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  creativeName: string;
}

// Mock team members
const teamMembers = [
  { id: "1", name: "Mike Johnson", email: "mike@example.com", avatar: "M", color: "bg-orange-500" },
  { id: "2", name: "Andrea Smith", email: "andrea@example.com", avatar: "A", color: "bg-green-500" },
  { id: "3", name: "Nina Patel", email: "nina@example.com", avatar: "N", color: "bg-purple-500" },
  { id: "4", name: "Sarah Chen", email: "sarah@example.com", avatar: "S", color: "bg-pink-500" },
  { id: "5", name: "David Wilson", email: "david@example.com", avatar: "D", color: "bg-blue-500" },
];

type AccessLevel = "view" | "comment" | "edit";

export function ShareDialog({ open, onClose, creativeName }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [accessLevel, setAccessLevel] = useState<AccessLevel>("comment");
  const [linkAccess, setLinkAccess] = useState<"restricted" | "anyone">("restricted");

  const shareLink = `https://revue.app/share/abc123xyz`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleMember = (memberId: string) => {
    setSelectedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleSendInvites = () => {
    // In real app, this would send invites
    console.log("Sending invites to:", selectedMembers, emailInput);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg bg-white dark:bg-[#1e1e1e] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-[#333]">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Share "{creativeName}"
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Invite people to view or collaborate on this creative
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Copy Link Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Share Link
            </label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2.5 bg-gray-100 dark:bg-[#2a2a2a] border border-gray-200 dark:border-[#444]">
                <Link2 className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
                  {shareLink}
                </span>
              </div>
              <Button
                onClick={handleCopyLink}
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

            {/* Link Access Toggle */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setLinkAccess("restricted")}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors",
                  linkAccess === "restricted"
                    ? "bg-[#5C6ECD]/10 text-[#5C6ECD] border border-[#5C6ECD]"
                    : "bg-gray-100 dark:bg-[#2a2a2a] text-gray-600 dark:text-gray-400 border border-transparent hover:border-gray-300 dark:hover:border-[#444]"
                )}
              >
                <Lock className="w-4 h-4" />
                Restricted
              </button>
              <button
                onClick={() => setLinkAccess("anyone")}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors",
                  linkAccess === "anyone"
                    ? "bg-[#5C6ECD]/10 text-[#5C6ECD] border border-[#5C6ECD]"
                    : "bg-gray-100 dark:bg-[#2a2a2a] text-gray-600 dark:text-gray-400 border border-transparent hover:border-gray-300 dark:hover:border-[#444]"
                )}
              >
                <Globe className="w-4 h-4" />
                Anyone with link
              </button>
            </div>
          </div>

          {/* Email Invite Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Invite by Email
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="pl-10 h-11 bg-white dark:bg-[#2a2a2a] border-gray-200 dark:border-[#444]"
                />
              </div>
              <select
                value={accessLevel}
                onChange={(e) => setAccessLevel(e.target.value as AccessLevel)}
                className="h-11 px-3 bg-gray-100 dark:bg-[#2a2a2a] border border-gray-200 dark:border-[#444] text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
              >
                <option value="view">Can view</option>
                <option value="comment">Can comment</option>
                <option value="edit">Can edit</option>
              </select>
            </div>
          </div>

          {/* Team Members Section */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              <Users className="w-4 h-4" />
              Team Members
            </label>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {teamMembers.map((member) => (
                <button
                  key={member.id}
                  onClick={() => toggleMember(member.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 transition-colors",
                    selectedMembers.includes(member.id)
                      ? "bg-[#5C6ECD]/10 border border-[#5C6ECD]"
                      : "bg-gray-50 dark:bg-[#2a2a2a] border border-transparent hover:border-gray-200 dark:hover:border-[#444]"
                  )}
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className={`${member.color} text-white text-sm`}>
                      {member.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {member.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {member.email}
                    </p>
                  </div>
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                    selectedMembers.includes(member.id)
                      ? "bg-[#5C6ECD] border-[#5C6ECD]"
                      : "border-gray-300 dark:border-[#555]"
                  )}>
                    {selectedMembers.includes(member.id) && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1a1a1a]">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-gray-300 dark:border-[#444]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSendInvites}
            disabled={selectedMembers.length === 0 && !emailInput}
            className="bg-[#5C6ECD] hover:bg-[#4A5BC7] text-white gap-2"
          >
            <Mail className="w-4 h-4" />
            Send Invites
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
