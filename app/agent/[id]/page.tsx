"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { PhaseCard, PhaseData } from "@/components/phase-card"
import { startJob, getJobStatus, submitApproval } from "@/lib/railway-api"

interface JobStatus {
  job_id: string
  status: string
  progress: {
    phase: string
    current_step: number
    total_steps: number
    message: string
  }
  metrics: {
    total_contacts: number
    duplicates_found: number
    pending_approvals: number
  }
  phase_details?: Record<string, any>
  pending_approval?: any
  created_at: string
  updated_at: string
}

interface DuplicatePair {
  pair_id: string
  account_name: string
  confidence: string
  reasoning: string
  canonical_name: string
  contact_1: any
  contact_2: any
}

export default function AgentPageV2() {
  const params = useParams()
  const router = useRouter()
  const agentId = params.id as string

  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [isJobRunning, setIsJobRunning] = useState(false)
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null)
  const [phases, setPhases] = useState<PhaseData[]>([])
  const [duplicatePairs, setDuplicatePairs] = useState<DuplicatePair[]>([])
  const [chatMessages, setChatMessages] = useState<Array<{ text: string; sender: string; phase?: string }>>([])

  // Map progress phase to display data
  const phaseMap: Record<string, { step: number; title: string }> = {
    phase_1_connect: { step: 1, title: "Connect to Salesforce" },
    phase_2_extract: { step: 2, title: "Extract Contacts" },
    phase_3_validate: { step: 3, title: "Validate Email Addresses" },
    phase_4_detect: { step: 4, title: "Analyze for Duplicates" },
    phase_5_mark: { step: 5, title: "Prepare Duplicate Marking" },
    awaiting_approval: { step: 5, title: "Human Approval Required" },
    phase_6_update: { step: 6, title: "Update Salesforce" },
    phase_7_reports: { step: 7, title: "Generate Reports" },
    completed: { step: 7, title: "Job Complete" },
  }

  // Polling for job status (fallback if WebSocket doesn't work)
  useEffect(() => {
    if (!jobStatus?.job_id || !isJobRunning) return

    const pollInterval = setInterval(async () => {
      try {
        const status = await getJobStatus(jobStatus.job_id)
        console.log("🔄 Poll result - Status:", status.status, "Progress:", status.progress)
        setJobStatus(status)

        // Update phases based on progress
        if (status.progress) {
          updatePhases(status.progress)
        }

        // Check for approval needed
        if (status.status === "awaiting_approval") {
          console.log("🔔 Status is awaiting_approval, fetching pending approvals...")
          fetchPendingApprovals()
        }

        // Check if completed
        if (status.status === "completed" || status.status === "failed") {
          setIsJobRunning(false)
          addChatMessage(
            status.status === "completed"
              ? "✅ Job completed successfully!"
              : `❌ Error: ${status.error || "Job failed"}`,
            "system"
          )
        }
      } catch (error) {
        console.error("Polling error:", error)
      }
    }, 2000) // Poll every 2 seconds

    return () => clearInterval(pollInterval)
  }, [jobStatus?.job_id, isJobRunning])

  // WebSocket connection
  useEffect(() => {
    if (!jobStatus?.job_id) return

    const ws = new WebSocket(
      `${process.env.NEXT_PUBLIC_RAILWAY_URL?.replace("https://", "wss://").replace("http://", "ws://")}/ws/${jobStatus.job_id}`
    )

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        handleWebSocketMessage(message)
      } catch (error) {
        console.error("WebSocket message error:", error)
      }
    }

    return () => ws.close()
  }, [jobStatus?.job_id])

  const handleWebSocketMessage = (message: any) => {
    const messageType = message.type
    const messageData = message.data || message.payload

    if (messageType === "job_update" && messageData) {
      setJobStatus((prev) => (prev ? { ...prev, ...messageData } : null))

      // Update phases based on progress
      if (messageData.progress) {
        updatePhases(messageData.progress)
      }

      // Check for approval needed
      if (messageData.status === "awaiting_approval") {
        fetchPendingApprovals()
      }

      // Check if completed
      if (messageData.status === "completed") {
        setIsJobRunning(false)
        addChatMessage("✅ Job completed successfully!", "system")
      }

      // Check for errors
      if (messageData.status === "failed" || messageData.error) {
        setIsJobRunning(false)
        addChatMessage(`❌ Error: ${messageData.error || "Job failed"}`, "system")
      }
    }
  }

  const updatePhases = (progress: any) => {
    const currentPhase = progress.phase
    const phaseInfo = phaseMap[currentPhase]

    if (!phaseInfo) return

    setPhases((prev) => {
      const existing = prev.find((p) => p.phase === currentPhase)

      if (existing) {
        // Update existing phase
        return prev.map((p) =>
          p.phase === currentPhase
            ? {
                ...p,
                message: progress.message,
                status: jobStatus?.status === "running" ? "running" : "completed",
              }
            : p
        )
      } else {
        // Add new phase
        return [
          ...prev,
          {
            phase: currentPhase,
            step: phaseInfo.step,
            title: phaseInfo.title,
            status: "running",
            message: progress.message,
            timestamp: new Date().toISOString(),
            hasDetails: ["phase_2_extract", "phase_3_validate", "phase_4_detect"].includes(currentPhase),
          },
        ]
      }
    })
  }

  const handleStartJob = async () => {
    console.log("🚀 START JOB CLICKED")
    setIsStarting(true)
    try {
      console.log("🚀 Calling startJob API...")
      const response = await startJob({
        batch_size: null,
        owner_filter: null,
        auto_approve: false,
      })
      console.log("🚀 startJob response:", response)

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
      console.log("🚀 Job state updated, isJobRunning=true, job_id:", response.job_id)
      addChatMessage("Job started successfully!", "system")
    } catch (error) {
      console.error("❌ START JOB ERROR:", error)
      addChatMessage(
        `Failed to start job: ${error instanceof Error ? error.message : "Unknown error"}`,
        "system"
      )
      console.error("Start job error:", error)
    } finally {
      console.log("🚀 setIsStarting(false)")
      setIsStarting(false)
    }
  }

  const fetchPendingApprovals = async () => {
    if (!jobStatus?.job_id) {
      console.log("❌ No job_id, skipping fetchPendingApprovals")
      return
    }

    console.log("📡 Fetching pending approvals for job:", jobStatus.job_id)
    const railwayUrl = process.env.NEXT_PUBLIC_RAILWAY_URL || "https://web-production-77576.up.railway.app"
    const url = `${railwayUrl}/api/dedup/pending/${jobStatus.job_id}`
    console.log("📡 URL:", url)

    try {
      const response = await fetch(url)
      console.log("📡 Response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("📡 Received data:", data)
        console.log("📡 Duplicate pairs count:", data.duplicate_pairs?.length)
        console.log("📡 First duplicate pair:", data.duplicate_pairs?.[0])
        console.log("📡 Contact 1 data:", data.duplicate_pairs?.[0]?.contact_1)
        console.log("📡 Contact 2 data:", data.duplicate_pairs?.[0]?.contact_2)

        setDuplicatePairs(data.duplicate_pairs || [])

        // Auto-expand the approval phase
        setExpandedPhase("awaiting_approval")
        addChatMessage(`⚠️ Found ${data.duplicate_pairs?.length || 0} duplicate pair(s) requiring your approval`, "system")
      } else {
        console.error("❌ Response not ok:", response.status, response.statusText)
        const text = await response.text()
        console.error("❌ Response body:", text)
      }
    } catch (error) {
      console.error("❌ Failed to fetch pending approvals:", error)
    }
  }

  const handleApproval = async (pairId: string, action: "approve" | "reject") => {
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

      const emoji = action === "approve" ? "✓" : "✗"
      addChatMessage(`${emoji} Duplicate pair ${action}ed`, "user")

      // Resume if all done
      if (duplicatePairs.length === 1) {
        addChatMessage("All approvals processed. Resuming job...", "system")
        setIsJobRunning(true)
      }
    } catch (error) {
      console.error("Approval error:", error)
      addChatMessage("Failed to submit approval", "system")
    }
  }

  const handlePhaseChat = (message: string, phaseContext: string) => {
    addChatMessage(message, "user", phaseContext)

    // Simple context-aware responses
    // In a real app, this would call Claude API with phase details as context
    setTimeout(() => {
      const phaseDetails = jobStatus?.phase_details?.[phaseContext]
      let response = "I can help you understand this step."

      if (phaseContext === "phase_2_extract" && phaseDetails) {
        if (message.toLowerCase().includes("how many") || message.toLowerCase().includes("count")) {
          response = `I extracted ${phaseDetails.total_contacts} contacts from ${phaseDetails.total_owners} account owner(s).`
        } else if (message.toLowerCase().includes("show") || message.toLowerCase().includes("list")) {
          response = `The contacts include: ${phaseDetails.contacts.slice(0, 3).map((c: any) => c.name).join(", ")}... (expand this step to see all)`
        }
      } else if (phaseContext === "phase_3_validate" && phaseDetails) {
        if (message.toLowerCase().includes("logic") || message.toLowerCase().includes("how")) {
          response = phaseDetails.validation_logic
        }
      } else if (phaseContext === "phase_4_detect" && phaseDetails) {
        if (message.toLowerCase().includes("why") || message.toLowerCase().includes("how")) {
          response = phaseDetails.analysis_logic
        } else if (message.toLowerCase().includes("show") || message.toLowerCase().includes("what")) {
          response = `Found ${phaseDetails.total_duplicates_found} duplicate pair(s). Expand this step to see the full analysis.`
        }
      }

      addChatMessage(response, "agent", phaseContext)
    }, 500)
  }

  const addChatMessage = (text: string, sender: string, phase?: string) => {
    setChatMessages((prev) => [...prev, { text, sender, phase }])
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0e27] to-[#1a1e3f] text-[#e0e0e0]">
      {/* Header */}
      <div className="border-b border-[#00fff2]/30 bg-[#0a0e27]/80 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-2 text-[#00fff2] hover:text-[#00fff2]/80 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-mono text-sm uppercase tracking-wider">Back</span>
            </button>

            <h1 className="font-mono text-2xl font-bold text-[#00fff2] uppercase tracking-wider">
              SFDC Deduplication Agent
            </h1>

            <div className="w-20" /> {/* Spacer for center alignment */}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Job Info & Start Button */}
          <div className="lg:col-span-1">
            <div className="border border-[#00fff2]/30 bg-[#0a0e27]/60 p-6 clip-corners">
              <h2 className="font-mono text-lg font-bold text-[#00fff2] uppercase tracking-wider mb-4">
                Job Control
              </h2>

              {!jobStatus && (
                <button
                  onClick={handleStartJob}
                  disabled={isStarting}
                  className="w-full px-6 py-3 bg-[#00fff2] text-[#0a0e27] font-mono font-bold uppercase tracking-wider hover:bg-[#00fff2]/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isStarting ? "Starting..." : "Start Job"}
                </button>
              )}

              {jobStatus && (
                <div className="space-y-3">
                  <div>
                    <div className="font-mono text-xs text-[#00fff2]/60 uppercase mb-1">Status</div>
                    <div className="font-mono text-sm text-[#00fff2]">{jobStatus.status}</div>
                  </div>

                  <div>
                    <div className="font-mono text-xs text-[#00fff2]/60 uppercase mb-1">Progress</div>
                    <div className="font-mono text-sm text-[#e0e0e0]">
                      Step {jobStatus.progress.current_step} / {jobStatus.progress.total_steps}
                    </div>
                  </div>

                  {jobStatus.metrics.total_contacts > 0 && (
                    <div>
                      <div className="font-mono text-xs text-[#00fff2]/60 uppercase mb-1">Contacts</div>
                      <div className="font-mono text-sm text-[#e0e0e0]">{jobStatus.metrics.total_contacts}</div>
                    </div>
                  )}

                  {jobStatus.metrics.duplicates_found > 0 && (
                    <div>
                      <div className="font-mono text-xs text-[#00fff2]/60 uppercase mb-1">Duplicates</div>
                      <div className="font-mono text-sm text-[#ff3366]">
                        {jobStatus.metrics.duplicates_found}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Chat Messages */}
            {chatMessages.length > 0 && (
              <div className="mt-6 border border-[#00fff2]/30 bg-[#0a0e27]/60 p-4 clip-corners">
                <h3 className="font-mono text-sm font-bold text-[#00fff2] uppercase tracking-wider mb-3">
                  Activity Log
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`font-mono text-xs p-2 ${
                        msg.sender === "user"
                          ? "bg-[#00fff2]/10 text-[#00fff2]"
                          : msg.sender === "agent"
                            ? "bg-[#0a0e27] text-[#e0e0e0]"
                            : "bg-[#0a0e27]/50 text-[#e0e0e0]/60"
                      }`}
                    >
                      {msg.text}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Phase Progress */}
          <div className="lg:col-span-2">
            <div className="border border-[#00fff2]/30 bg-[#0a0e27]/60 p-6 clip-corners">
              <h2 className="font-mono text-lg font-bold text-[#00fff2] uppercase tracking-wider mb-6">
                Workflow Progress
              </h2>

              {phases.length === 0 && (
                <div className="text-center text-[#00fff2]/60 font-mono text-sm py-8">
                  Start a job to begin the deduplication workflow
                </div>
              )}

              {phases.map((phase) => (
                <PhaseCard
                  key={phase.phase}
                  phase={phase}
                  jobId={jobStatus?.job_id || ""}
                  isExpanded={expandedPhase === phase.phase}
                  onToggle={() => setExpandedPhase(expandedPhase === phase.phase ? null : phase.phase)}
                  onChatMessage={handlePhaseChat}
                />
              ))}

              {/* Approval UI */}
              {jobStatus?.status === "awaiting_approval" && duplicatePairs.length > 0 && (
                <div className="mt-6 border border-[#ff3366]/40 bg-[#0a0e27]/80 p-6">
                  <h3 className="font-mono text-lg font-bold text-[#ff3366] uppercase tracking-wider mb-4">
                    ⚠ Approval Required
                  </h3>

                  <div className="space-y-4">
                    {duplicatePairs.map((pair) => (
                      <div key={pair.pair_id} className="border border-[#00fff2]/30 bg-[#0a0e27] p-4">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="border border-[#00fff2]/20 p-3">
                            <div className="font-mono text-xs text-[#00fff2]/60 mb-2">Contact A</div>
                            <div className="text-[#00fff2] font-bold">{pair.contact_1?.name || "Unknown"}</div>
                            <div className="text-[#e0e0e0]/60 text-xs mt-1">{pair.contact_1?.email || "No email"}</div>
                          </div>
                          <div className="border border-[#00fff2]/20 p-3">
                            <div className="font-mono text-xs text-[#00fff2]/60 mb-2">Contact B</div>
                            <div className="text-[#00fff2] font-bold">{pair.contact_2?.name || "Unknown"}</div>
                            <div className="text-[#e0e0e0]/60 text-xs mt-1">{pair.contact_2?.email || "No email"}</div>
                          </div>
                        </div>

                        <div className="bg-[#0a0e27]/60 p-3 mb-4">
                          <div className="font-mono text-xs text-[#00fff2]/60 mb-1">Reasoning</div>
                          <div className="text-[#e0e0e0]/80 text-xs">{pair.reasoning}</div>
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={() => handleApproval(pair.pair_id, "approve")}
                            className="flex-1 px-4 py-2 bg-[#00fff2] text-[#0a0e27] font-mono font-bold uppercase hover:bg-[#00fff2]/80"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleApproval(pair.pair_id, "reject")}
                            className="flex-1 px-4 py-2 border border-[#ff3366] text-[#ff3366] font-mono font-bold uppercase hover:bg-[#ff3366]/10"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
