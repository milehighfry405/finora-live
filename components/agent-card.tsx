"use client"

import { useRouter } from "next/navigation"
import type { Agent } from "./agent-dashboard"

interface AgentCardProps {
  agent: Agent
}

export default function AgentCard({ agent }: AgentCardProps) {
  const router = useRouter()
  const isOnline = agent.status === "online"

  const handleConnect = () => {
    router.push(`/agent/${agent.id}`)
  }

  return (
    <div
      className={`group relative border bg-[#0a0e27]/60 backdrop-blur-sm p-6 transition-all duration-300 hover:scale-[1.02] clip-corners ${
        isOnline
          ? "border-[#00fff2]/50 hover:border-[#00fff2] glow-border"
          : "border-[#00fff2]/20 hover:border-[#00fff2]/40"
      }`}
    >
      {/* Corner accent */}
      <div className="absolute top-0 right-0 w-3 h-3 bg-[#00fff2]" />

      {/* Status Indicator */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${
              isOnline ? "bg-[#00fff2] status-pulse" : "bg-[#00fff2]/40"
            }`}
          />
          <span className="font-mono text-xs uppercase tracking-wider text-[#00fff2]/60">
            {agent.status}
          </span>
        </div>
        <div className="font-mono text-xs text-[#00fff2]/60">ID: {agent.id.slice(0, 8)}</div>
      </div>

      {/* Agent Name */}
      <h3 className="mb-2 font-mono text-xl font-bold text-[#e0e0e0] group-hover:text-[#00fff2] transition-colors">
        {agent.name}
      </h3>

      {/* Description */}
      <p className="mb-4 text-sm text-[#e0e0e0]/70 leading-relaxed">{agent.description}</p>

      {/* Metadata */}
      <div className="mb-4 space-y-2 border-t border-[#00fff2]/20 pt-4">
        <div className="flex justify-between text-xs font-mono">
          <span className="text-[#00fff2]/60">LAST ACTIVITY:</span>
          <span className="text-[#e0e0e0]">{agent.lastActivity}</span>
        </div>
        <div className="flex justify-between text-xs font-mono">
          <span className="text-[#00fff2]/60">ENDPOINT:</span>
          <span className="text-[#e0e0e0] truncate ml-2 max-w-[180px]" title={agent.endpoint}>
            {agent.endpoint.replace("https://", "")}
          </span>
        </div>
      </div>

      {/* Connect Button */}
      <button
        onClick={handleConnect}
        className={`w-full font-mono text-sm uppercase tracking-wider transition-all py-3 border ${
          isOnline
            ? "bg-transparent border-[#00fff2] text-[#00fff2] hover:bg-[#00fff2] hover:text-[#0a0e27] hover:shadow-[0_0_20px_rgba(0,255,242,0.5)]"
            : "bg-transparent border-[#00fff2]/30 text-[#00fff2]/40 cursor-not-allowed"
        }`}
        disabled={!isOnline}
      >
        {isOnline ? "> CONNECT" : "> OFFLINE"}
      </button>

      {/* Scan line effect on hover */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00fff2]/5 to-transparent animate-pulse-slow" />
      </div>
    </div>
  )
}
