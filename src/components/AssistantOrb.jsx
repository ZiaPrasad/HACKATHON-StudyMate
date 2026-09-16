import React from "react";
import { Mic, Loader2, AudioLines, Check, AlertTriangle } from "lucide-react";

// StudyMate assistant orb — the agent's visual identity in brand blues.
// idle: solid blue orb with mic · listening: bright pulsing ring + wave bars
// thinking: rotating spinner · speaking: animated waveform
// success: brief positive blue flash · error: clear warning state.

export default function AssistantOrb({ state = "idle", size = 64, className = "" }) {
  const iconSize = Math.round(size * 0.42);
  const base =
    state === "error"
      ? "bg-gradient-to-br from-rose-600 to-red-500 shadow-lg shadow-rose-500/40"
      : state === "success"
      ? "bg-gradient-to-br from-sky-400 to-blue-600 shadow-lg shadow-blue-500/40"
      : "bg-gradient-to-br from-blue-700 via-blue-600 to-sky-500 shadow-lg shadow-blue-500/40";
  return (
    <div
      className={`relative flex items-center justify-center rounded-full transition-transform ${base} ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`StudyMate assistant ${state}`}
    >
      {state === "listening" && (
        <>
          <span className="absolute inset-0 rounded-full animate-ping bg-sky-400/40" aria-hidden="true" />
          <span className="flex items-end gap-1" aria-hidden="true">
            <span className="wave-bar" />
            <span className="wave-bar" />
            <span className="wave-bar" />
            <span className="wave-bar" />
          </span>
        </>
      )}
      {state === "idle" && <Mic className="text-white" style={{ width: iconSize, height: iconSize }} aria-hidden="true" />}
      {state === "thinking" && <Loader2 className="animate-spin text-white" style={{ width: iconSize, height: iconSize }} aria-hidden="true" />}
      {state === "speaking" && (
        <AudioLines className="text-white animate-pulse" style={{ width: iconSize, height: iconSize }} aria-hidden="true" />
      )}
      {state === "success" && <Check className="text-white" style={{ width: iconSize, height: iconSize }} aria-hidden="true" />}
      {state === "error" && <AlertTriangle className="text-white" style={{ width: iconSize, height: iconSize }} aria-hidden="true" />}
    </div>
  );
}