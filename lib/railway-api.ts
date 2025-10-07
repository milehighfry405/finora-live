/**
 * Railway API Client for SFDC Deduplication Agent
 * Connects to FastAPI backend deployed on Railway
 */

const RAILWAY_API_URL = process.env.NEXT_PUBLIC_RAILWAY_API_URL || "https://web-production-77576.up.railway.app"

export interface StartJobRequest {
  batch_size?: number
  owner_filter?: string[]
  auto_approve?: boolean
}

export interface JobStatus {
  job_id: string
  status: "pending" | "running" | "awaiting_approval" | "completed" | "failed" | "cancelled"
  progress: {
    phase: string
    current_step: number
    total_steps: number
    message: string
  }
  metrics: {
    total_contacts?: number
    duplicates_found?: number
    pending_approvals?: number
  }
  created_at: string
  updated_at: string
  error?: string
}

export interface DuplicatePair {
  pair_id: string
  account_name: string
  confidence: string
  reasoning: string
  canonical_name: string
  contact_1: {
    Id: string
    Name: string
    Email?: string
    Account?: { Name: string }
  }
  contact_2: {
    Id: string
    Name: string
    Email?: string
    Account?: { Name: string }
  }
}

export interface PendingApproval {
  job_id: string
  stage: "duplicate_marking" | "salesforce_update"
  total_updates: number
  duplicate_pairs: DuplicatePair[]
  message: string
}

export interface ApprovalRequest {
  job_id: string
  approved: boolean
  rejected_pairs?: string[]
}

/**
 * Start a new deduplication job
 */
export async function startJob(request: StartJobRequest = {}): Promise<{ job_id: string; status: string; message: string }> {
  const url = `${RAILWAY_API_URL}/api/dedup/start`
  console.log("🌐 startJob API call to:", url)
  console.log("🌐 Request body:", request)

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  })

  console.log("🌐 Response status:", response.status, response.statusText)

  if (!response.ok) {
    const errorText = await response.text()
    console.error("🌐 Error response body:", errorText)
    throw new Error(`Failed to start job: ${response.statusText} - ${errorText}`)
  }

  const data = await response.json()
  console.log("🌐 Response data:", data)
  return data
}

/**
 * Get job status
 */
export async function getJobStatus(jobId: string): Promise<JobStatus> {
  const response = await fetch(`${RAILWAY_API_URL}/api/dedup/status/${jobId}`)

  if (!response.ok) {
    throw new Error(`Failed to get job status: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get pending approvals for a job
 */
export async function getPendingApprovals(jobId: string): Promise<PendingApproval> {
  const response = await fetch(`${RAILWAY_API_URL}/api/dedup/pending/${jobId}`)

  if (!response.ok) {
    throw new Error(`Failed to get pending approvals: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Submit approval decision
 */
export async function submitApproval(request: ApprovalRequest): Promise<{ job_id: string; status: string; message: string }> {
  const response = await fetch(`${RAILWAY_API_URL}/api/dedup/approve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    throw new Error(`Failed to submit approval: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Create WebSocket connection for real-time updates
 */
export function createWebSocket(jobId: string): WebSocket {
  const wsUrl = RAILWAY_API_URL.replace("https://", "wss://").replace("http://", "ws://")
  return new WebSocket(`${wsUrl}/ws/updates/${jobId}`)
}
