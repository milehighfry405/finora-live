"use client"

import { useState, useRef, useEffect } from "react"

interface Message {
  id: number
  text: string
  sender: "user" | "ai"
}

export default function Home() {
  const [isChatMode, setIsChatMode] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isHovered, setIsHovered] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleStart = () => {
    setIsChatMode(true)
    // Add welcome message from AI
    setTimeout(() => {
      setMessages([
        {
          id: 1,
          text: "System initialized. How can I assist you today?",
          sender: "ai",
        },
      ])
    }, 500)
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return

    const newMessage: Message = {
      id: messages.length + 1,
      text: inputValue,
      sender: "user",
    }

    const updatedMessages = [...messages, newMessage]
    setMessages(updatedMessages)
    setInputValue("")

    // Call Claude API
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: updatedMessages,
        }),
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      const aiResponse: Message = {
        id: updatedMessages.length + 1,
        text: data.message,
        sender: "ai",
      }
      setMessages((prev) => [...prev, aiResponse])
    } catch (error) {
      console.error('Error:', error)
      const errorResponse: Message = {
        id: updatedMessages.length + 1,
        text: "Sorry, I encountered an error. Please try again.",
        sender: "ai",
      }
      setMessages((prev) => [...prev, errorResponse])
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-gradient-to-b from-[#0a0e27] via-[#1a1f3a] to-[#0f1419]">
      {/* Factory Grid Pattern Overlay */}
      <div
        className="absolute inset-0 opacity-20"
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

      {/* Robot Agent - transitions between center and top-left */}
      <div
        className={`absolute transition-all duration-500 ease-in-out ${
          isChatMode
            ? "top-6 left-6 w-20 h-20"
            : "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-60 h-60"
        }`}
      >
        <div className="relative">
          <div className="absolute inset-0 blur-3xl bg-[#00fff2] opacity-20 animate-pulse-slow" />
          <svg
            width={isChatMode ? 80 : 240}
            height={isChatMode ? 80 : 240}
            viewBox="0 0 240 240"
            className="relative animate-float"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g className="animate-subtle-pulse">
              <rect x="70" y="100" width="100" height="80" rx="8" fill="#1a1f3a" stroke="#00fff2" strokeWidth="2" />
              <rect x="80" y="60" width="80" height="50" rx="6" fill="#0a0e27" stroke="#00fff2" strokeWidth="2" />
              <line x1="120" y1="60" x2="120" y2="40" stroke="#00fff2" strokeWidth="2" className="animate-antenna" />
              <circle cx="120" cy="40" r="4" fill="#00fff2" className="animate-ping-slow" />
              <circle cx="100" cy="80" r="6" fill="#00fff2" className="animate-blink" />
              <circle cx="140" cy="80" r="6" fill="#00fff2" className="animate-blink" />
              {/* Derpy Smile on the face */}
              <path d="M 90 95 Q 120 105 150 95" stroke="#00fff2" strokeWidth="2" fill="none" strokeLinecap="round" />
              <rect x="40" y="110" width="25" height="60" rx="4" fill="#1a1f3a" stroke="#00fff2" strokeWidth="2" className="animate-arm-left" />
              <rect x="175" y="110" width="25" height="60" rx="4" fill="#1a1f3a" stroke="#00fff2" strokeWidth="2" className="animate-arm-right" />
              <rect x="85" y="180" width="30" height="50" rx="4" fill="#1a1f3a" stroke="#00fff2" strokeWidth="2" />
              <rect x="125" y="180" width="30" height="50" rx="4" fill="#1a1f3a" stroke="#00fff2" strokeWidth="2" />
            </g>
          </svg>
        </div>
      </div>

      {/* Landing Mode */}
      {!isChatMode && (
        <>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-12">
            <div className="h-60" /> {/* Spacer for robot */}

            {/* START Button */}
            <button
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              onClick={handleStart}
              className="group relative px-16 py-5 font-mono text-2xl font-bold tracking-wider transition-all duration-300 hover:scale-105"
            >
              <div className={`absolute inset-0 bg-[#00fff2] blur-xl transition-opacity duration-300 ${isHovered ? "opacity-60" : "opacity-20"}`} />
              <div className="absolute inset-0 bg-[#0a0e27] border-2 border-[#00fff2] clip-corners" />
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#00fff2]" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#00fff2]" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#00fff2]" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#00fff2]" />
              <span className="relative z-10 text-[#00fff2] drop-shadow-[0_0_10px_rgba(0,255,242,0.5)]">START</span>
              {isHovered && (
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute w-full h-full bg-gradient-to-b from-transparent via-[#00fff2] to-transparent opacity-30 animate-button-scan" />
                </div>
              )}
            </button>

            <p className="font-mono text-sm tracking-widest text-[#00fff2] opacity-60">INITIALIZE SYSTEM</p>
          </div>

          {/* Corner UI Elements */}
          <div className="absolute top-6 left-6 font-mono text-xs text-[#00fff2] opacity-40">
            <div>SYS_v2.4.1</div>
            <div className="mt-1">STATUS: READY</div>
          </div>

          <div className="absolute top-6 right-6 font-mono text-xs text-[#00fff2] opacity-40 text-right">
            <div>AGENT_ONLINE</div>
            <div className="mt-1 flex items-center justify-end gap-2">
              <span>CONN</span>
              <div className="w-2 h-2 rounded-full bg-[#00fff2] animate-pulse" />
            </div>
          </div>
        </>
      )}

      {/* Chat Mode */}
      {isChatMode && (
        <div className="flex flex-col h-screen pt-32 pb-6 px-6">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto mb-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"} animate-fadeIn`}
              >
                <div
                  className={`max-w-[70%] px-4 py-3 font-mono text-sm border-l-2 ${
                    message.sender === "user"
                      ? "bg-[#1a1f3a] border-[#00fff2] text-[#e0e0e0]"
                      : "bg-[#0a0e27] border-[#00fff2] text-[#e0e0e0]"
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="relative flex gap-3 items-center">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter message..."
              className="flex-1 px-4 py-3 bg-[#0a0e27] border border-[#00fff2]/30 text-[#e0e0e0] font-mono text-sm placeholder:text-[#00fff2]/40 focus:outline-none focus:border-[#00fff2] focus:shadow-[0_0_15px_rgba(0,255,242,0.3)] transition-all duration-300"
            />
            <button
              onClick={handleSendMessage}
              className="group relative px-6 py-3 bg-transparent border border-[#00fff2] text-[#00fff2] font-mono text-sm font-bold uppercase tracking-wider transition-all duration-300 hover:bg-[#00fff2] hover:text-[#0a0e27] hover:shadow-[0_0_20px_rgba(0,255,242,0.4)] active:scale-95"
            >
              <span className="relative z-10">SEND</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
