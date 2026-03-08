"use client"

import { useRouter } from "next/navigation"
import { FolderOpen, ArrowRight, Building2 } from "lucide-react"

interface ClientCard {
  id: string
  name: string
  logoUrl: string
  industry: string
  projectCount: number
}

interface ClientPortalContentProps {
  clients: ClientCard[]
  userName: string
  organizationName: string
}

export function ClientPortalContent({ clients, userName, organizationName }: ClientPortalContentProps) {
  const router = useRouter()

  const firstName = userName.split(" ")[0]

  return (
    <main className="flex-1 overflow-auto bg-background">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Welcome */}
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {firstName}
          </h1>
          <p className="text-muted-foreground mt-1">
            Select a workspace to view your projects and creatives
          </p>
        </div>

        {/* Client Cards */}
        {clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-1">No workspaces yet</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              You haven&apos;t been added to any client workspaces yet. Contact your design team to get started.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map((client) => (
              <button
                key={client.id}
                onClick={() => router.push(`/room?client=${client.id}`)}
                className="group relative bg-card border border-border rounded-2xl p-6 text-left hover:border-[#5C6ECD]/40 hover:shadow-lg hover:shadow-[#5C6ECD]/5 transition-all duration-200"
              >
                {/* Logo */}
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-white border border-border flex items-center justify-center p-2 mb-4 group-hover:border-[#5C6ECD]/30 transition-colors">
                  {client.logoUrl ? (
                    <img
                      src={client.logoUrl}
                      alt={client.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-xl font-bold text-[#5C6ECD]">
                      {client.name.charAt(0)}
                    </span>
                  )}
                </div>

                {/* Info */}
                <h3 className="text-lg font-semibold text-foreground mb-1 group-hover:text-[#5C6ECD] transition-colors">
                  {client.name}
                </h3>
                {client.industry && (
                  <p className="text-xs text-muted-foreground mb-3">{client.industry}</p>
                )}

                {/* Project count */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FolderOpen className="w-4 h-4" />
                  <span>{client.projectCount} {client.projectCount === 1 ? "project" : "projects"}</span>
                </div>

                {/* Arrow */}
                <div className="absolute top-6 right-6 w-8 h-8 rounded-full bg-muted flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:bg-[#5C6ECD]/10">
                  <ArrowRight className="w-4 h-4 text-[#5C6ECD]" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
