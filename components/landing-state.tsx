"use client"

import { useState } from "react"

export default function LandingState() {
  const [isHovered, setIsHovered] = useState(false)

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

      {/* Center Content */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-12">
        {/* Animated Robot SVG */}
        <div className="relative">
          {/* Glow effect behind robot */}
          <div className="absolute inset-0 blur-3xl bg-[#00fff2] opacity-20 animate-pulse-slow" />

          <svg
            width="240"
            height="240"
            viewBox="0 0 240 240"
            className="relative animate-float"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Robot Body */}
            <g className="animate-subtle-pulse">
              {/* Main Body */}
              <rect x="70" y="100" width="100" height="80" rx="8" fill="#1a1f3a" stroke="#00fff2" strokeWidth="2" />

              {/* Head */}
              <rect x="80" y="60" width="80" height="50" rx="6" fill="#0a0e27" stroke="#00fff2" strokeWidth="2" />

              {/* Antenna */}
              <line x1="120" y1="60" x2="120" y2="40" stroke="#00fff2" strokeWidth="2" className="animate-antenna" />
              <circle cx="120" cy="40" r="4" fill="#00fff2" className="animate-ping-slow" />

              {/* Eyes */}
              <circle cx="100" cy="80" r="6" fill="#00fff2" className="animate-blink" />
              <circle cx="140" cy="80" r="6" fill="#00fff2" className="animate-blink" />

              {/* Chest Panel */}
              <rect
                x="95"
                y="120"
                width="50"
                height="40"
                rx="4"
                fill="#0a0e27"
                stroke="#00fff2"
                strokeWidth="1"
                opacity="0.6"
              />

              {/* Chest Lines */}
              <line x1="105" y1="130" x2="135" y2="130" stroke="#00fff2" strokeWidth="1" opacity="0.4" />
              <line x1="105" y1="140" x2="135" y2="140" stroke="#00fff2" strokeWidth="1" opacity="0.4" />
              <line x1="105" y1="150" x2="135" y2="150" stroke="#00fff2" strokeWidth="1" opacity="0.4" />

              {/* Arms */}
              <rect
                x="40"
                y="110"
                width="25"
                height="60"
                rx="4"
                fill="#1a1f3a"
                stroke="#00fff2"
                strokeWidth="2"
                className="animate-arm-left"
              />
              <rect
                x="175"
                y="110"
                width="25"
                height="60"
                rx="4"
                fill="#1a1f3a"
                stroke="#00fff2"
                strokeWidth="2"
                className="animate-arm-right"
              />

              {/* Legs */}
              <rect x="85" y="180" width="30" height="50" rx="4" fill="#1a1f3a" stroke="#00fff2" strokeWidth="2" />
              <rect x="125" y="180" width="30" height="50" rx="4" fill="#1a1f3a" stroke="#00fff2" strokeWidth="2" />
            </g>
          </svg>
        </div>

        {/* START Button */}
        <button
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="group relative px-16 py-5 font-mono text-2xl font-bold tracking-wider transition-all duration-300 hover:scale-105"
        >
          {/* Button glow effect */}
          <div
            className={`absolute inset-0 bg-[#00fff2] blur-xl transition-opacity duration-300 ${isHovered ? "opacity-60" : "opacity-20"}`}
          />

          {/* Button border and background */}
          <div className="absolute inset-0 bg-[#0a0e27] border-2 border-[#00fff2] clip-corners" />

          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#00fff2]" />
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#00fff2]" />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#00fff2]" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#00fff2]" />

          {/* Button text */}
          <span className="relative z-10 text-[#00fff2] drop-shadow-[0_0_10px_rgba(0,255,242,0.5)]">START</span>

          {/* Animated scan line on hover */}
          {isHovered && (
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute w-full h-full bg-gradient-to-b from-transparent via-[#00fff2] to-transparent opacity-30 animate-button-scan" />
            </div>
          )}
        </button>

        {/* Subtitle text */}
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
    </div>
  )
}
