import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

interface Message {
  id: number
  text: string
  sender: 'user' | 'ai'
}

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json() as { messages: Message[] }

    // Convert messages to Claude format
    const claudeMessages = messages.map((msg: Message) => ({
      role: msg.sender === 'user' ? 'user' as const : 'assistant' as const,
      content: msg.text,
    }))

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: claudeMessages,
    })

    const assistantMessage = response.content[0].type === 'text'
      ? response.content[0].text
      : 'Unable to process response'

    return NextResponse.json({
      message: assistantMessage
    })
  } catch (error) {
    console.error('Error calling Claude API:', error)
    return NextResponse.json(
      { error: 'Failed to get response from AI' },
      { status: 500 }
    )
  }
}
