"use client"

import { useState } from "react"
import AgentCard from "./agent-card"

export interface Agent {
  id: string
  name: string
  description: string
  status: "online" | "offline"
  lastActivity: string
  endpoint: string
}

const initialAgents: Agent[] = [
  {
    id: "sfdc-dedup",
    name: "SFDC Deduplication Agent",
    description: "AI-powered Salesforce dedup with human-in-the-loop • Real-time cost tracking • Scalable to millions",
    status: "online",
    lastActivity: "Ready to start",
    endpoint: "https://web-production-77576.up.railway.app",
  },
]

export default function AgentDashboard() {
  const [agents] = useState<Agent[]>(initialAgents)

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#1a1f3a] to-[#0f1419]">
      {/* Factory Grid Pattern Overlay */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, #00fff2 1px, transparent 1px),
            linear-gradient(to bottom, #00fff2 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Animated scan line effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-[#00fff2] to-transparent opacity-30 animate-scan" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header Section */}
        <header className="mb-12">
          <div className="flex items-start justify-between border-b border-[#00fff2]/20 pb-6">
            <div>
              <h1 className="font-mono text-4xl font-bold tracking-tight text-[#00fff2] mb-2">
                AGENT CONTROL SYSTEM
              </h1>
              <p className="text-[#00fff2]/60 font-mono text-sm">
                OPERATIONAL STATUS: <span className="text-[#00fff2]">ACTIVE</span>
              </p>
            </div>
            <div className="text-right font-mono text-xs text-[#00fff2]/60 space-y-1">
              <div>SYSTEM TIME: {new Date().toLocaleTimeString()}</div>
              <div>
                ACCESS LEVEL: <span className="text-[#00fff2]">AUTHORIZED</span>
              </div>
            </div>
          </div>
        </header>

        {/* Stats Bar */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="border border-[#00fff2]/30 bg-[#0a0e27]/80 backdrop-blur-sm p-4 clip-corners">
            <div className="text-2xl font-bold text-[#00fff2] font-mono">{agents.length}</div>
            <div className="text-xs text-[#00fff2]/60 font-mono">TOTAL AGENTS</div>
          </div>
          <div className="border border-[#00fff2]/30 bg-[#0a0e27]/80 backdrop-blur-sm p-4 clip-corners">
            <div className="text-2xl font-bold text-[#00fff2] font-mono">
              {agents.filter((a) => a.status === "online").length}
            </div>
            <div className="text-xs text-[#00fff2]/60 font-mono">ONLINE</div>
          </div>
          <div className="border border-[#00fff2]/30 bg-[#0a0e27]/80 backdrop-blur-sm p-4 clip-corners">
            <div className="text-2xl font-bold text-[#00fff2]/40 font-mono">
              {agents.filter((a) => a.status === "offline").length}
            </div>
            <div className="text-xs text-[#00fff2]/60 font-mono">OFFLINE</div>
          </div>
          <div className="border border-[#00fff2]/30 bg-[#0a0e27]/80 backdrop-blur-sm p-4 clip-corners">
            <div className="text-2xl font-bold text-[#00fff2] font-mono">100%</div>
            <div className="text-xs text-[#00fff2]/60 font-mono">UPTIME</div>
          </div>
        </div>

        {/* Agent Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </div>
    </div>
  )
}
