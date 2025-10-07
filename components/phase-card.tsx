"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, CheckCircle, Clock, AlertCircle } from "lucide-react"

export interface PhaseData {
  phase: string
  step: number
  title: string
  status: "pending" | "running" | "completed" | "failed"
  message: string
  timestamp?: string
  hasDetails?: boolean
}

interface PhaseCardProps {
  phase: PhaseData
  jobId: string
  isExpanded: boolean
  onToggle: () => void
  onChatMessage: (message: string, phaseContext: string) => void
}

export function PhaseCard({ phase, jobId, isExpanded, onToggle, onChatMessage }: PhaseCardProps) {
  const [phaseDetails, setPhaseDetails] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [chatInput, setChatInput] = useState("")

  const fetchPhaseDetails = async () => {
    if (phaseDetails || !phase.hasDetails) return

    setLoading(true)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_RAILWAY_URL}/api/dedup/${jobId}/phase/${phase.phase}`
      )
      if (response.ok) {
        const data = await response.json()
        setPhaseDetails(data.details)
      }
    } catch (error) {
      console.error("Failed to fetch phase details:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleExpand = () => {
    if (!isExpanded && phase.status === "completed" && phase.hasDetails) {
      fetchPhaseDetails()
    }
    onToggle()
  }

  const handleChat = () => {
    if (!chatInput.trim()) return
    onChatMessage(chatInput, phase.phase)
    setChatInput("")
  }

  const getStatusIcon = () => {
    switch (phase.status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-[#00fff2]" />
      case "running":
        return <Clock className="w-5 h-5 text-[#00fff2] animate-pulse" />
      case "failed":
        return <AlertCircle className="w-5 h-5 text-[#ff3366]" />
      default:
        return <div className="w-5 h-5 border-2 border-[#00fff2]/30 rounded-full" />
    }
  }

  const canExpand = phase.status === "completed" && phase.hasDetails

  return (
    <div className="border border-[#00fff2]/30 bg-[#0a0e27]/60 mb-3 clip-corners">
      {/* Header */}
      <button
        onClick={handleExpand}
        disabled={!canExpand}
        className={`w-full flex items-center justify-between p-4 text-left transition-all ${
          canExpand ? "hover:bg-[#00fff2]/5 cursor-pointer" : "cursor-default"
        }`}
      >
        <div className="flex items-center gap-3 flex-1">
          {getStatusIcon()}
          <div className="flex-1">
            <div className="font-mono text-sm text-[#00fff2] font-bold uppercase tracking-wider">
              Step {phase.step}: {phase.title}
            </div>
            <div className="font-mono text-xs text-[#e0e0e0]/60 mt-1">{phase.message}</div>
          </div>
        </div>

        {canExpand && (
          <div className="ml-4">
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-[#00fff2]" />
            ) : (
              <ChevronRight className="w-5 h-5 text-[#00fff2]/60" />
            )}
          </div>
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-[#00fff2]/20 p-4">
          {loading && (
            <div className="text-center text-[#00fff2]/60 font-mono text-sm py-4">Loading details...</div>
          )}

          {phaseDetails && (
            <div className="space-y-4">
              {/* Phase-specific content rendering */}
              {phase.phase === "phase_2_extract" && (
                <ContactListView contacts={phaseDetails.contacts} />
              )}

              {phase.phase === "phase_3_validate" && (
                <EmailValidationView results={phaseDetails.results} logic={phaseDetails.validation_logic} />
              )}

              {phase.phase === "phase_4_detect" && (
                <DuplicateAnalysisView
                  pairs={phaseDetails.duplicate_pairs}
                  logic={phaseDetails.analysis_logic}
                  fields={phaseDetails.comparison_fields}
                />
              )}

              {/* Context-aware chat */}
              <div className="mt-4 pt-4 border-t border-[#00fff2]/20">
                <div className="font-mono text-xs text-[#00fff2]/60 uppercase mb-2">Ask about this step</div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") handleChat()
                    }}
                    placeholder={`Ask about ${phase.title.toLowerCase()}...`}
                    className="flex-1 px-3 py-2 bg-[#0a0e27] border border-[#00fff2]/30 text-[#e0e0e0] font-mono text-sm placeholder:text-[#00fff2]/40 focus:outline-none focus:border-[#00fff2]"
                  />
                  <button
                    onClick={handleChat}
                    className="px-4 py-2 bg-transparent border border-[#00fff2] text-[#00fff2] font-mono text-sm font-bold uppercase tracking-wider hover:bg-[#00fff2] hover:text-[#0a0e27] transition-all"
                  >
                    Ask
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Sub-components for rendering different phase details

function ContactListView({ contacts }: { contacts: any[] }) {
  const [showAll, setShowAll] = useState(false)
  const displayContacts = showAll ? contacts : contacts.slice(0, 10)

  return (
    <div>
      <div className="font-mono text-xs text-[#00fff2]/60 uppercase mb-3">
        Extracted Contacts ({contacts.length} total)
      </div>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {displayContacts.map((contact, idx) => (
          <div key={idx} className="bg-[#0a0e27] border border-[#00fff2]/20 p-3 font-mono text-xs">
            <div className="text-[#00fff2]">{contact.name}</div>
            <div className="text-[#e0e0e0]/60 mt-1">
              {contact.email} • {contact.account}
            </div>
            {contact.title && <div className="text-[#e0e0e0]/40 mt-1">{contact.title}</div>}
          </div>
        ))}
      </div>
      {contacts.length > 10 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-3 text-[#00fff2] font-mono text-xs hover:underline"
        >
          {showAll ? "Show less" : `Show all ${contacts.length} contacts`}
        </button>
      )}
    </div>
  )
}

function EmailValidationView({ results, logic }: { results: any[]; logic: string }) {
  return (
    <div>
      <div className="font-mono text-xs text-[#00fff2]/60 uppercase mb-2">Validation Logic</div>
      <div className="bg-[#0a0e27] border border-[#00fff2]/20 p-3 font-mono text-xs text-[#e0e0e0]/80 mb-4">
        {logic}
      </div>

      <div className="font-mono text-xs text-[#00fff2]/60 uppercase mb-3">Validation Results</div>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {results.map((result, idx) => (
          <div key={idx} className="bg-[#0a0e27] border border-[#00fff2]/20 p-3 font-mono text-xs">
            <div className="text-[#00fff2]">{result.contact_name}</div>
            <div className="text-[#e0e0e0]/60 mt-1">{result.email}</div>
            <div className="mt-2">
              <span
                className={`px-2 py-1 text-xs ${
                  result.status === "Valid"
                    ? "bg-[#00fff2]/20 text-[#00fff2]"
                    : "bg-[#ff3366]/20 text-[#ff3366]"
                }`}
              >
                {result.status}
              </span>
              {result.reason && <span className="ml-2 text-[#e0e0e0]/40">{result.reason}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DuplicateAnalysisView({
  pairs,
  logic,
  fields,
}: {
  pairs: any[]
  logic: string
  fields: string[]
}) {
  return (
    <div>
      <div className="font-mono text-xs text-[#00fff2]/60 uppercase mb-2">Analysis Logic</div>
      <div className="bg-[#0a0e27] border border-[#00fff2]/20 p-3 font-mono text-xs text-[#e0e0e0]/80 mb-4">
        {logic}
      </div>

      <div className="font-mono text-xs text-[#00fff2]/60 uppercase mb-2">Fields Compared</div>
      <div className="flex flex-wrap gap-2 mb-4">
        {fields.map((field, idx) => (
          <span key={idx} className="px-2 py-1 bg-[#00fff2]/10 text-[#00fff2] font-mono text-xs">
            {field}
          </span>
        ))}
      </div>

      <div className="font-mono text-xs text-[#00fff2]/60 uppercase mb-3">
        Duplicate Pairs Found ({pairs.length})
      </div>
      <div className="space-y-4">
        {pairs.map((pair, idx) => (
          <div key={idx} className="bg-[#0a0e27] border border-[#ff3366]/40 p-4">
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div className="border border-[#00fff2]/30 p-3">
                <div className="font-mono text-xs text-[#00fff2]/60 mb-2">Contact A</div>
                <div className="text-[#00fff2] font-bold">{pair.contact_1?.name}</div>
                <div className="text-[#e0e0e0]/60 text-xs mt-1">{pair.contact_1?.email}</div>
                <div className="text-[#e0e0e0]/60 text-xs">{pair.contact_1?.phone}</div>
              </div>
              <div className="border border-[#00fff2]/30 p-3">
                <div className="font-mono text-xs text-[#00fff2]/60 mb-2">Contact B</div>
                <div className="text-[#00fff2] font-bold">{pair.contact_2?.name}</div>
                <div className="text-[#e0e0e0]/60 text-xs mt-1">{pair.contact_2?.email}</div>
                <div className="text-[#e0e0e0]/60 text-xs">{pair.contact_2?.phone}</div>
              </div>
            </div>
            <div className="bg-[#0a0e27]/80 p-3 border border-[#00fff2]/20">
              <div className="font-mono text-xs text-[#00fff2]/60 mb-1">Why are these duplicates?</div>
              <div className="text-[#e0e0e0]/80 text-xs">{pair.reasoning}</div>
            </div>
            <div className="mt-2 flex justify-between items-center">
              <span className="font-mono text-xs text-[#00fff2]">Confidence: {pair.confidence}</span>
              <span className="font-mono text-xs text-[#e0e0e0]/60">Canonical: {pair.canonical_name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
