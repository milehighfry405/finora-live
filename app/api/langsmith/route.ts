import { NextRequest } from "next/server"

const LANGSMITH_API_KEY = process.env.LANGSMITH_API_KEY || "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"
const LANGSMITH_PROJECT = process.env.LANGSMITH_PROJECT || "sfdc-dedup-agent"
const LANGSMITH_ENDPOINT = "https://api.smith.langchain.com"

/**
 * GET /api/langsmith?jobId=xxx
 * Fetch LangSmith cost data for a specific job or entire project
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const jobId = searchParams.get("jobId")

    // For demo: Return mock data
    // TODO: Fix LangSmith API endpoint format
    return Response.json({
      job_id: jobId || "demo",
      total_runs: 0,
      total_tokens: 0,
      total_cost: 0,
      runs: [],
    })
  } catch (error) {
    console.error("LangSmith API error:", error)
    return Response.json(
      {
        job_id: "demo",
        total_runs: 0,
        total_tokens: 0,
        total_cost: 0,
        runs: [],
      },
      { status: 200 }
    )
  }
}
