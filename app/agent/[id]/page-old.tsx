"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  startJob,
  getJobStatus,
  getPendingApprovals,
  submitApproval,
  createWebSocket,
  type JobStatus,
  type DuplicatePair as RailwayDuplicatePair,
} from "@/lib/railway-api"

interface ChatMessage {
  id: string
  text: string
  sender: "agent" | "user" | "system"
  timestamp: string
  type?: "question" | "info" | "error" | "success"
}

interface LiveCosts {
  total_cost: number
  total_tokens: number
  total_runs: number
}

export default function AgentDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null)
  const [isJobRunning, setIsJobRunning] = useState(false)
  const [duplicatePairs, setDuplicatePairs] = useState<RailwayDuplicatePair[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState("")
  const [liveCosts, setLiveCosts] = useState<LiveCosts>({ total_cost: 0, total_tokens: 0, total_runs: 0 })
  const [isStarting, setIsStarting] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Fetch live costs periodically
  useEffect(() => {
    const fetchCosts = async () => {
      if (jobStatus?.job_id) {
        try {
          const response = await fetch(`/api/langsmith?jobId=${jobStatus.job_id}&type=job`)
          const data = await response.json()
          setLiveCosts({
            total_cost: data.total_cost || 0,
            total_tokens: data.total_tokens || 0,
            total_runs: data.total_runs || 0,
          })
        } catch (error) {
          console.error("Failed to fetch costs:", error)
        }
      }
    }

    fetchCosts()
    const interval = setInterval(fetchCosts, 5000) // Update every 5 seconds
    return () => clearInterval(interval)
  }, [jobStatus?.job_id])

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!jobStatus?.job_id || wsRef.current) return

    try {
      const ws = createWebSocket(jobStatus.job_id)
      wsRef.current = ws

      ws.onopen = () => {
        addMessage("🔗 WebSocket connected. Listening for real-time updates...", "system", "info")
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          handleWebSocketMessage(data)
        } catch (error) {
          console.error("WebSocket message error:", error)
        }
      }

      ws.onerror = (error) => {
        console.error("WebSocket error:", error)
        addMessage("⚠️ WebSocket connection error. Updates may be delayed.", "system", "error")
      }

      ws.onclose = () => {
        addMessage("WebSocket disconnected.", "system", "info")
        wsRef.current = null
      }
    } catch (error) {
      console.error("Failed to create WebSocket:", error)
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [jobStatus?.job_id])

  const handleWebSocketMessage = (message: any) => {
    // Backend sends: { type: "job_update", job_id: "...", data: {...} }
    const messageType = message.type
    const messageData = message.data || message.payload

    switch (messageType) {
      case "job_update":
        // Update job status from nested data object
        if (messageData) {
          setJobStatus((prev) => (prev ? { ...prev, ...messageData } : null))

          // Display progress message in chat
          if (messageData.progress?.message) {
            addMessage(messageData.progress.message, "agent", "info")
          }

          // Check if status changed to awaiting_approval
          if (messageData.status === "awaiting_approval") {
            addMessage("⚠️ Human approval required. Please review pending duplicates below.", "agent", "question")
            fetchPendingApprovals()
          }

          // Check if job completed
          if (messageData.status === "completed") {
            addMessage("✅ Job completed successfully!", "agent", "success")
            setIsJobRunning(false)
          }

          // Check for errors
          if (messageData.status === "failed" || messageData.error) {
            const errorMsg = messageData.error || messageData.message || "Job failed"
            addMessage(`❌ Error: ${errorMsg}`, "system", "error")
            setIsJobRunning(false)
          }
        }
        break
      case "status_update":
        // Legacy handler for old message format
        const statusPayload = messageData as Partial<JobStatus>
        setJobStatus((prev) => (prev ? { ...prev, ...statusPayload } : null))
        if (statusPayload.progress?.message) {
          addMessage(statusPayload.progress.message, "agent", "info")
        }
        break
      case "pending_approval":
        addMessage("⚠️ Human approval required. Please review pending duplicates below.", "agent", "question")
        fetchPendingApprovals()
        break
      case "error":
        const errorPayload = messageData as { message: string }
        addMessage(`❌ Error: ${errorPayload.message}`, "system", "error")
        setIsJobRunning(false)
        break
      case "completed":
        addMessage("✅ Job completed successfully!", "agent", "success")
        setIsJobRunning(false)
        break
      default:
        console.log("Unknown WebSocket message type:", messageType, message)
    }
  }

  const addMessage = (
    text: string,
    sender: "agent" | "user" | "system",
    type?: "question" | "info" | "error" | "success"
  ) => {
    const newMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random()}`,
      text,
      sender,
      timestamp: new Date().toISOString(),
      type,
    }
    setMessages((prev) => [...prev, newMessage])
  }

  const handleStartJob = async () => {
    try {
      setIsStarting(true)
      addMessage("🚀 Initializing deduplication agent...", "system", "info")

      const response = await startJob({
        batch_size: undefined, // Process all contacts
        auto_approve: false, // Human-in-the-loop
      })

      setJobStatus({
        job_id: response.job_id,
        status: "running",
        progress: {
          phase: "starting",
          current_step: 0,
          total_steps: 7,
          message: "Initializing...",
        },
        metrics: {
          total_contacts: 0,
          duplicates_found: 0,
          pending_approvals: 0,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      setIsJobRunning(true)
      addMessage(`✓ Job ${response.job_id} started successfully!`, "agent", "success")
      addMessage("Connecting to Salesforce...", "agent", "info")
    } catch (error) {
      addMessage(
        `Failed to start job: ${error instanceof Error ? error.message : "Unknown error"}`,
        "system",
        "error"
      )
      console.error("Start job error:", error)
    } finally {
      setIsStarting(false)
    }
  }

  const fetchPendingApprovals = async () => {
    if (!jobStatus?.job_id) return

    try {
      const approvals = await getPendingApprovals(jobStatus.job_id)
      setDuplicatePairs(approvals.duplicate_pairs)
      setJobStatus((prev) =>
        prev
          ? {
              ...prev,
              status: "awaiting_approval",
              metrics: {
                ...prev.metrics,
                pending_approvals: approvals.duplicate_pairs.length,
              },
            }
          : null
      )
    } catch (error) {
      console.error("Failed to fetch pending approvals:", error)
      addMessage("Failed to fetch pending approvals", "system", "error")
    }
  }

  const handleApproval = async (pairId: string, action: "approve" | "reject" | "skip") => {
    if (!jobStatus?.job_id) return

    try {
      const approved = action === "approve"
      const rejectedPairs = action === "reject" ? [pairId] : []

      await submitApproval({
        job_id: jobStatus.job_id,
        approved,
        rejected_pairs: rejectedPairs,
      })

      setDuplicatePairs((prev) => prev.filter((pair) => pair.pair_id !== pairId))

      const actionText = action === "approve" ? "approved" : action === "reject" ? "rejected" : "skipped"
      const emoji = action === "approve" ? "✓" : action === "reject" ? "✗" : "→"
      addMessage(`${emoji} Duplicate pair ${pairId} ${actionText}.`, "user", "success")

      // Resume job if all approvals processed
      if (duplicatePairs.length === 1) {
        addMessage("All approvals processed. Resuming job...", "agent", "info")
        setIsJobRunning(true)
      }
    } catch (error) {
      addMessage(
        `Failed to submit approval: ${error instanceof Error ? error.message : "Unknown error"}`,
        "system",
        "error"
      )
    }
  }

  const handleSendMessage = () => {
    if (!inputValue.trim()) return

    addMessage(inputValue, "user")
    const question = inputValue
    setInputValue("")

    // For demo: simulate intelligent responses
    setTimeout(() => {
      if (question.toLowerCase().includes("cost") || question.toLowerCase().includes("$")) {
        addMessage(
          `Current job cost: $${liveCosts.total_cost.toFixed(4)} (${liveCosts.total_tokens.toLocaleString()} tokens used)`,
          "agent",
          "info"
        )
      } else if (question.toLowerCase().includes("contact")) {
        addMessage(
          `Processing ${jobStatus?.metrics.total_contacts || 21} contacts from your Salesforce org. Found ${jobStatus?.metrics.duplicates_found || 0} potential duplicates.`,
          "agent",
          "info"
        )
      } else if (question.toLowerCase().includes("status")) {
        addMessage(
          `Job status: ${jobStatus?.status.toUpperCase() || "IDLE"}. ${jobStatus?.progress.message || "Ready to start."}`,
          "agent",
          "info"
        )
      } else {
        addMessage("I'm focused on deduplication right now. Try asking about cost, contacts, or status!", "agent", "info")
      }
    }, 500)
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return "just now"
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return date.toLocaleDateString()
  }

  const getStatusColor = () => {
    if (!jobStatus) return "text-[#00fff2]/40"
    switch (jobStatus.status) {
      case "running":
        return "text-[#00fff2]"
      case "awaiting_approval":
        return "text-[#ff3366]"
      case "completed":
        return "text-[#00ff88]"
      case "failed":
        return "text-[#ff3366]"
      default:
        return "text-[#00fff2]/60"
    }
  }

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

      {/* Animated scan line */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-[#00fff2] to-transparent opacity-30 animate-scan" />
      </div>

      <div className="relative">
        {/* Header */}
        <div className="border-b border-[#00fff2]/20 bg-[#0a0e27]/80 backdrop-blur-sm">
          <div className="max-w-full px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/")}
                className="text-[#00fff2] hover:text-[#00fff2]/80 font-mono text-sm transition-colors"
              >
                ← BACK
              </button>
              <div className="h-6 w-px bg-[#00fff2]/30" />
              <h1 className="font-mono text-2xl font-bold text-[#00fff2]">SFDC DEDUPLICATION AGENT</h1>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full ${isJobRunning ? "bg-[#00fff2] status-pulse" : "bg-[#00fff2]/40"}`}
              />
              <span className="font-mono text-xs text-[#00fff2]/60">{isJobRunning ? "RUNNING" : "IDLE"}</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex h-[calc(100vh-80px)]">
          {/* Left Sidebar - Agent Info */}
          <div className="w-[30%] border-r border-[#00fff2]/20 bg-[#0a0e27]/40 p-6 overflow-y-auto">
            {/* Job Status */}
            <div className="mb-6">
              <h2 className="font-mono text-sm text-[#00fff2]/60 mb-3 uppercase tracking-wider">Job Status</h2>
              {jobStatus ? (
                <div className="space-y-3">
                  <div className="border border-[#00fff2]/30 bg-[#0a0e27]/80 p-3 clip-corners">
                    <div className="text-xs font-mono text-[#00fff2]/60">JOB ID</div>
                    <div className="text-sm font-mono text-[#e0e0e0] mt-1">{jobStatus.job_id}</div>
                  </div>
                  <div className="border border-[#00fff2]/30 bg-[#0a0e27]/80 p-3 clip-corners">
                    <div className="text-xs font-mono text-[#00fff2]/60">STATUS</div>
                    <div className={`text-sm font-mono mt-1 uppercase ${getStatusColor()}`}>
                      {jobStatus.status.replace("_", " ")}
                    </div>
                  </div>
                  <div className="border border-[#00fff2]/30 bg-[#0a0e27]/80 p-3 clip-corners">
                    <div className="text-xs font-mono text-[#00fff2]/60">PROGRESS</div>
                    <div className="text-sm font-mono text-[#e0e0e0] mt-1">
                      Step {jobStatus.progress.current_step} / {jobStatus.progress.total_steps}
                    </div>
                    <div className="text-xs font-mono text-[#00fff2]/60 mt-1">{jobStatus.progress.message}</div>
                  </div>
                </div>
              ) : (
                <div className="border border-[#00fff2]/30 bg-[#0a0e27]/80 p-3 clip-corners">
                  <div className="text-sm font-mono text-[#00fff2]/60">No active job</div>
                </div>
              )}
            </div>

            {/* Live Costs - PROMINENT FOR DEMO */}
            <div className="mb-6">
              <h2 className="font-mono text-sm text-[#00fff2]/60 mb-3 uppercase tracking-wider flex items-center gap-2">
                <span>💰</span> Live Costs
              </h2>
              <div className="space-y-3">
                <div className="border border-[#00fff2]/30 bg-[#0a0e27]/80 p-3 clip-corners glow-border">
                  <div className="text-xs font-mono text-[#00fff2]/60">TOTAL COST</div>
                  <div className="text-2xl font-mono text-[#00fff2] mt-1">${liveCosts.total_cost.toFixed(4)}</div>
                </div>
                <div className="border border-[#00fff2]/30 bg-[#0a0e27]/80 p-3 clip-corners">
                  <div className="text-xs font-mono text-[#00fff2]/60">TOKENS USED</div>
                  <div className="text-lg font-mono text-[#e0e0e0] mt-1">{liveCosts.total_tokens.toLocaleString()}</div>
                </div>
                <div className="border border-[#00fff2]/30 bg-[#0a0e27]/80 p-3 clip-corners">
                  <div className="text-xs font-mono text-[#00fff2]/60">API CALLS</div>
                  <div className="text-lg font-mono text-[#e0e0e0] mt-1">{liveCosts.total_runs}</div>
                </div>
              </div>
              <div className="mt-3 p-2 bg-[#00fff2]/5 border-l-2 border-[#00fff2]/30">
                <div className="text-xs font-mono text-[#00fff2]/60">
                  💡 Scalable to millions of contacts
                </div>
              </div>
            </div>

            {/* Metrics */}
            {jobStatus && (
              <div className="mb-6">
                <h2 className="font-mono text-sm text-[#00fff2]/60 mb-3 uppercase tracking-wider">Metrics</h2>
                <div className="space-y-3">
                  <div className="border border-[#00fff2]/30 bg-[#0a0e27]/80 p-3 clip-corners">
                    <div className="text-xs font-mono text-[#00fff2]/60">TOTAL CONTACTS</div>
                    <div className="text-2xl font-mono text-[#00fff2] mt-1">
                      {jobStatus.metrics.total_contacts?.toLocaleString() || 0}
                    </div>
                  </div>
                  <div className="border border-[#00fff2]/30 bg-[#0a0e27]/80 p-3 clip-corners">
                    <div className="text-xs font-mono text-[#00fff2]/60">DUPLICATES FOUND</div>
                    <div className="text-2xl font-mono text-[#00fff2] mt-1">
                      {jobStatus.metrics.duplicates_found || 0}
                    </div>
                  </div>
                  <div className="border border-[#00fff2]/30 bg-[#0a0e27]/80 p-3 clip-corners">
                    <div className="text-xs font-mono text-[#00fff2]/60">PENDING APPROVALS</div>
                    <div className="text-2xl font-mono text-[#ff3366] mt-1">
                      {jobStatus.metrics.pending_approvals || 0}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Activity Feed */}
            <div>
              <h2 className="font-mono text-sm text-[#00fff2]/60 mb-3 uppercase tracking-wider">Recent Activity</h2>
              <div className="space-y-2">
                {messages
                  .slice(-5)
                  .reverse()
                  .map((msg) => (
                    <div key={msg.id} className="border-l-2 border-[#00fff2]/30 pl-3 py-2">
                      <div className="text-xs font-mono text-[#e0e0e0]/80">
                        {msg.text.slice(0, 60)}
                        {msg.text.length > 60 ? "..." : ""}
                      </div>
                      <div className="text-xs font-mono text-[#00fff2]/40 mt-1">{formatTimestamp(msg.timestamp)}</div>
                    </div>
                  ))}
                {messages.length === 0 && <div className="text-xs font-mono text-[#00fff2]/40">No activity yet</div>}
              </div>
            </div>
          </div>

          {/* Right Content Area */}
          <div className="w-[70%] flex flex-col">
            {/* Idle State - Show START JOB button */}
            {!jobStatus && (
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center">
                  <div className="mb-8">
                    <div className="mb-6 inline-block">
                      <div className="w-32 h-32 border-2 border-[#00fff2] rounded-full flex items-center justify-center glow-border">
                        <div className="text-6xl">🤖</div>
                      </div>
                    </div>
                    <h2 className="font-mono text-3xl font-bold text-[#00fff2] mb-4">AGENT READY</h2>
                    <p className="font-mono text-sm text-[#00fff2]/60 mb-2">
                      AI-Powered Salesforce Deduplication
                    </p>
                    <p className="font-mono text-xs text-[#00fff2]/40">
                      Human-in-the-loop workflow • Real-time cost tracking • Scalable to millions
                    </p>
                  </div>
                  <button
                    onClick={handleStartJob}
                    disabled={isStarting}
                    className="px-12 py-4 bg-transparent border-2 border-[#00fff2] text-[#00fff2] font-mono text-lg font-bold uppercase tracking-wider hover:bg-[#00fff2] hover:text-[#0a0e27] hover:shadow-[0_0_30px_rgba(0,255,242,0.6)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed clip-corners"
                  >
                    {isStarting ? "INITIALIZING..." : "► START JOB"}
                  </button>
                </div>
              </div>
            )}

            {/* Active State - Show chat and approvals */}
            {jobStatus && (
              <>
                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"} animate-fadeIn`}
                    >
                      <div
                        className={`max-w-[80%] px-4 py-3 border-l-2 ${
                          message.sender === "user"
                            ? "bg-[#1a1f3a]/80 border-[#00fff2] text-[#e0e0e0]"
                            : message.type === "error"
                              ? "bg-[#ff3366]/10 border-[#ff3366] text-[#e0e0e0]"
                              : message.type === "success"
                                ? "bg-[#00ff88]/10 border-[#00ff88] text-[#e0e0e0]"
                                : "bg-[#0a0e27]/80 border-[#00fff2]/50 text-[#e0e0e0]"
                        }`}
                      >
                        <div className="font-mono text-sm">{message.text}</div>
                        <div className="font-mono text-xs text-[#00fff2]/40 mt-2">
                          {formatTimestamp(message.timestamp)}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Pending Approvals Section */}
                  {duplicatePairs.length > 0 && (
                    <div className="space-y-4 pt-4 border-t border-[#00fff2]/20 animate-fadeIn">
                      <h3 className="font-mono text-lg font-bold text-[#ff3366] uppercase tracking-wider">
                        ⚠ Pending Approvals
                      </h3>
                      {duplicatePairs.map((pair) => (
                        <div key={pair.pair_id} className="border border-[#ff3366]/40 bg-[#0a0e27]/60 p-4 clip-corners">
                          <div className="flex items-center justify-between mb-4">
                            <span className="font-mono text-xs text-[#00fff2]/60">DUPLICATE PAIR: {pair.pair_id}</span>
                            <span className="font-mono text-sm text-[#00fff2]">CONFIDENCE: {pair.confidence}</span>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mb-4">
                            {/* Contact A */}
                            <div className="border border-[#00fff2]/30 bg-[#0a0e27]/80 p-3">
                              <div className="font-mono text-xs text-[#00fff2]/60 mb-2">CONTACT A</div>
                              <div className="space-y-1">
                                <div className="font-mono text-sm text-[#e0e0e0]">{pair.contact_1.Name}</div>
                                <div className="font-mono text-xs text-[#e0e0e0]/60">
                                  {pair.contact_1.Email || "No email"}
                                </div>
                                <div className="font-mono text-xs text-[#e0e0e0]/60">
                                  {pair.contact_1.Account?.Name || "No company"}
                                </div>
                              </div>
                            </div>

                            {/* Contact B */}
                            <div className="border border-[#00fff2]/30 bg-[#0a0e27]/80 p-3">
                              <div className="font-mono text-xs text-[#00fff2]/60 mb-2">CONTACT B</div>
                              <div className="space-y-1">
                                <div className="font-mono text-sm text-[#e0e0e0]">{pair.contact_2.Name}</div>
                                <div className="font-mono text-xs text-[#e0e0e0]/60">
                                  {pair.contact_2.Email || "No email"}
                                </div>
                                <div className="font-mono text-xs text-[#e0e0e0]/60">
                                  {pair.contact_2.Account?.Name || "No company"}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* AI Reasoning */}
                          <div className="mb-4 p-3 bg-[#0a0e27]/60 border-l-2 border-[#00fff2]/30">
                            <div className="text-xs font-mono text-[#00fff2]/60 mb-1">AI REASONING:</div>
                            <div className="text-xs font-mono text-[#e0e0e0]/80">{pair.reasoning}</div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleApproval(pair.pair_id, "approve")}
                              className="flex-1 py-2 px-4 bg-transparent border border-[#00fff2] text-[#00fff2] font-mono text-sm uppercase tracking-wider hover:bg-[#00fff2] hover:text-[#0a0e27] transition-all"
                            >
                              ✓ Approve Merge
                            </button>
                            <button
                              onClick={() => handleApproval(pair.pair_id, "reject")}
                              className="flex-1 py-2 px-4 bg-transparent border border-[#ff3366] text-[#ff3366] font-mono text-sm uppercase tracking-wider hover:bg-[#ff3366] hover:text-[#0a0e27] transition-all"
                            >
                              ✗ Reject
                            </button>
                            <button
                              onClick={() => handleApproval(pair.pair_id, "skip")}
                              className="flex-1 py-2 px-4 bg-transparent border border-[#00fff2]/30 text-[#00fff2]/60 font-mono text-sm uppercase tracking-wider hover:bg-[#00fff2]/10 transition-all"
                            >
                              → Skip
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="border-t border-[#00fff2]/20 bg-[#0a0e27]/80 backdrop-blur-sm p-6">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") handleSendMessage()
                      }}
                      placeholder="Ask about costs, status, or contacts..."
                      className="flex-1 px-4 py-3 bg-[#0a0e27] border border-[#00fff2]/30 text-[#e0e0e0] font-mono text-sm placeholder:text-[#00fff2]/40 focus:outline-none focus:border-[#00fff2] focus:shadow-[0_0_15px_rgba(0,255,242,0.3)] transition-all duration-300"
                    />
                    <button
                      onClick={handleSendMessage}
                      className="px-6 py-3 bg-transparent border border-[#00fff2] text-[#00fff2] font-mono text-sm font-bold uppercase tracking-wider hover:bg-[#00fff2] hover:text-[#0a0e27] hover:shadow-[0_0_20px_rgba(0,255,242,0.4)] transition-all duration-300"
                    >
                      SEND
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
