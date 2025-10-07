/**
 * LangSmith API Client for cost tracking and trace monitoring
 * Fetches real-time token usage and costs from LangSmith
 */

const LANGSMITH_API_KEY = process.env.LANGSMITH_API_KEY || ""
const LANGSMITH_PROJECT = process.env.LANGSMITH_PROJECT || "sfdc-dedup-agent"
const LANGSMITH_ENDPOINT = "https://api.smith.langchain.com"

export interface LangSmithRun {
  id: string
  name: string
  run_type: string
  start_time: string
  end_time?: string
  status: string
  error?: string
  inputs: Record<string, unknown>
  outputs?: Record<string, unknown>
  total_tokens?: number
  prompt_tokens?: number
  completion_tokens?: number
  total_cost?: number
}

export interface ProjectCosts {
  total_runs: number
  total_tokens: number
  total_cost: number
  runs: LangSmithRun[]
  last_updated: string
}

/**
 * Fetch all runs for the SFDC dedup project
 */
export async function getProjectRuns(limit = 100): Promise<LangSmithRun[]> {
  const response = await fetch(
    `${LANGSMITH_ENDPOINT}/runs?project=${encodeURIComponent(LANGSMITH_PROJECT)}&limit=${limit}`,
    {
      headers: {
        "X-API-Key": LANGSMITH_API_KEY,
      },
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch LangSmith runs: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get cost summary for a specific job (by session_id or tags)
 */
export async function getJobCosts(jobId: string): Promise<{
  total_tokens: number
  total_cost: number
  runs: LangSmithRun[]
}> {
  const response = await fetch(
    `${LANGSMITH_ENDPOINT}/runs?project=${encodeURIComponent(LANGSMITH_PROJECT)}&filter=${encodeURIComponent(
      JSON.stringify({ session_id: jobId })
    )}`,
    {
      headers: {
        "X-API-Key": LANGSMITH_API_KEY,
      },
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch job costs: ${response.statusText}`)
  }

  const runs: LangSmithRun[] = await response.json()

  const totalTokens = runs.reduce((sum, run) => sum + (run.total_tokens || 0), 0)
  const totalCost = runs.reduce((sum, run) => sum + (run.total_cost || 0), 0)

  return {
    total_tokens: totalTokens,
    total_cost: totalCost,
    runs,
  }
}

/**
 * Get aggregate project costs
 */
export async function getProjectCosts(): Promise<ProjectCosts> {
  const runs = await getProjectRuns()

  const totalTokens = runs.reduce((sum, run) => sum + (run.total_tokens || 0), 0)
  const totalCost = runs.reduce((sum, run) => sum + (run.total_cost || 0), 0)

  return {
    total_runs: runs.length,
    total_tokens: totalTokens,
    total_cost: totalCost,
    runs,
    last_updated: new Date().toISOString(),
  }
}

/**
 * Calculate cost per 1K tokens based on Claude Sonnet pricing
 * Input: $3/MTok, Output: $15/MTok
 */
export function calculateClaudeCost(promptTokens: number, completionTokens: number): number {
  const inputCost = (promptTokens / 1_000_000) * 3.0
  const outputCost = (completionTokens / 1_000_000) * 15.0
  return inputCost + outputCost
}

/**
 * Format cost as currency
 */
export function formatCost(cost: number): string {
  return `$${cost.toFixed(4)}`
}
