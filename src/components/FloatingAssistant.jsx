import React, { useCallback, useEffect, useRef, useState } from "react";
import { askStudyMate, notifyDataChanged } from "@/lib/db";
import { createRecognizer, recognitionAvailable, speak, stopSpeaking, ttsEnabled, setTtsEnabled } from "@/lib/voice";
import AssistantOrb from "@/components/AssistantOrb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Send, Volume2, VolumeX, Radio, Keyboard } from "lucide-react";

const SUGGESTIONS = [
  "What do I have today?",
  "Give me my daily briefing",
  "What should I study now?",
  "How is my attendance?",
];

const STATUS = {
  idle: "Tap the mic and speak, or type below",
  listening: "Listening…",
  thinking: "Thinking…",
  speaking: "Speaking…",
  success: "Done!",
  error: "Something went wrong — try again",
};

export default function FloatingAssistant() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("idle");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [error, setError] = useState("");
  const [confirmPending, setConfirmPending] = useState(null);
  const [wake, setWake] = useState(false);
  const [tts, setTts] = useState(ttsEnabled());
  const recognizer = useRef(null);
  const wakeRec = useRef(null);
  const voiceInitiated = useRef(false);
  const endRef = useRef(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const history = () => messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));

  useEffect(() => {
    if (endRef.current) endRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  // External open requests (e.g. dashboard "Ask StudyMate" buttons)
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("studymate:open-assistant", handler);
    return () => window.removeEventListener("studymate:open-assistant", handler);
  }, []);

  const runAsk = useCallback(
    async (messageText, confirmed) => {
      setConfirmPending(null);
      setMessages((prev) => [...prev, { role: "user", content: confirmed ? "Yes, go ahead" : messageText }]);
      setMode("thinking");
      setError("");
      try {
        const res = await askStudyMate(messageText, history(), confirmed);
        setMessages((prev) => [...prev, { role: "assistant", content: res.response }]);
        if (res.actions && res.actions.some((a) => a.ok)) notifyDataChanged();
        if (res.needsConfirmation) setConfirmPending(messageText);
        if (res.actions && res.actions.some((a) => a.ok)) {
          setMode("success");
          setTimeout(() => setMode("speaking"), 900);
        } else {
          setMode("speaking");
        }
        speak(res.response, () => {
          setMode("idle");
          if (voiceInitiated.current) {
            voiceInitiated.current = false;
            setTimeout(() => setOpen(false), 1500);
          }
        });
      } catch (e) {
        setMode("error");
        setError(e.message || "StudyMate is unavailable right now. Please try again.");
        setTimeout(() => setMode("idle"), 2500);
      }
    },
    [messages]
  );

  const send = useCallback(
    (text) => {
      const msg = (text || "").trim();
      if (!msg || modeRef.current === "thinking" || modeRef.current === "listening") return;
      setInput("");
      runAsk(msg, false);
    },
    [runAsk]
  );

  const startListening = useCallback(() => {
    if (!recognitionAvailable()) return;
    stopSpeaking();
    setError("");
    setLiveTranscript("");
    voiceInitiated.current = true;
    if (recognizer.current) {
      try { recognizer.current.abort(); } catch (_) {}
    }
    const rec = createRecognizer({
      onText: (t) => setLiveTranscript(t),
      onEnd: (final) => {
        recognizer.current = null;
        setLiveTranscript("");
        if (final && modeRef.current === "listening") {
          runAsk(final, false);
        } else {
          setMode("idle");
        }
      },
      onError: () => {
        recognizer.current = null;
        setLiveTranscript("");
        setMode("idle");
      },
    });
    if (!rec) return;
    recognizer.current = rec;
    setMode("listening");
    try { rec.start(); } catch (_) { setMode("idle"); }
  }, [runAsk]);

  // Wake word ("Hey StudyMate") — continuous recognition while the tab is open.
  useEffect(() => {
    if (!wake) {
      if (wakeRec.current) {
        try { wakeRec.current.onend = null; wakeRec.current.stop(); } catch (_) {}
        wakeRec.current = null;
      }
      return;
    }
    if (!recognitionAvailable()) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      const text = Array.from(e.results).map((r) => r[0].transcript).join(" ").toLowerCase();
      if (text.includes("study mate") || text.includes("studymate")) {
        try { rec.onend = null; rec.stop(); } catch (_) {}
        setOpen(true);
        setTimeout(() => startListening(), 500);
      }
    };
    rec.onend = () => {
      if (wake) {
        try { rec.start(); } catch (_) {}
      }
    };
    try { rec.start(); } catch (_) {}
    wakeRec.current = rec;
    return () => {
      try { rec.onend = null; rec.stop(); } catch (_) {}
    };
  }, [wake, startListening]);

  const toggleTts = () => {
    const next = !tts;
    setTts(next);
    setTtsEnabled(next);
    if (!next) stopSpeaking();
  };

  const orbState = open ? mode : "idle";

  const panel = (
    <div
      className="fixed z-50 inset-x-0 bottom-0 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[400px] max-h-[85vh] sm:max-h-[75vh] flex flex-col bg-card border rounded-t-2xl sm:rounded-2xl shadow-2xl"
      role="dialog"
      aria-label="StudyMate assistant"
    >
      <div className="flex items-center gap-3 p-4 border-b">
        <AssistantOrb state={mode} size={40} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold leading-tight">StudyMate</p>
          <p className="text-xs text-muted-foreground truncate">{STATUS[mode]}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={toggleTts} aria-label={tts ? "Mute voice" : "Unmute voice"} title={tts ? "Mute voice" : "Unmute voice"}>
          {tts ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </Button>
        <Button
          variant={wake ? "secondary" : "ghost"}
          size="icon"
          onClick={() => setWake((w) => !w)}
          disabled={!recognitionAvailable()}
          aria-label="Toggle wake word"
          title='Wake word mode: say "Hey StudyMate"'
        >
          <Radio className={"w-4 h-4 " + (wake ? "text-primary animate-pulse" : "")} />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Minimize assistant">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && !liveTranscript && (
          <div className="py-6 text-center">
            <AssistantOrb state="idle" size={72} className="mx-auto orb-float" />
            <p className="mt-4 font-medium">Hey! I'm StudyMate.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Tell me about classes, assignments, exams — I'll keep your academic life organized.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-xs px-3 py-1.5 rounded-full border bg-background hover:bg-accent transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={"flex " + (m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={
                "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm " +
                (m.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-muted rounded-bl-sm")
              }
            >
              {m.content}
            </div>
          </div>
        ))}
        {liveTranscript && mode === "listening" && (
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl px-3.5 py-2 text-sm bg-primary/70 text-primary-foreground rounded-br-sm animate-pulse">
              {liveTranscript}
            </div>
          </div>
        )}
        {mode === "thinking" && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-3.5 py-2 text-sm bg-muted rounded-bl-sm flex gap-1.5 items-center">
              <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "120ms" }} />
              <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "240ms" }} />
            </div>
          </div>
        )}
        {error && (
          <p className="text-xs text-destructive text-center">{error}</p>
        )}
        {confirmPending && (
          <div className="flex justify-center gap-2 pt-1">
            <Button size="sm" onClick={() => runAsk(confirmPending, true)}>Yes, do it</Button>
            <Button size="sm" variant="outline" onClick={() => {
              setConfirmPending(null);
              setMessages((prev) => [...prev, { role: "assistant", content: "Okay, I left that untouched." }]);
            }}>Cancel</Button>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="p-4 pt-2 border-t space-y-3">
        <div className="flex justify-center">
          <button
            onClick={mode === "listening" ? () => { try { recognizer.current?.stop(); } catch (_) {} } : startListening}
            disabled={!recognitionAvailable()}
            className="disabled:opacity-40 disabled:cursor-not-allowed transition-transform active:scale-95"
            aria-label={mode === "listening" ? "Stop listening" : "Start listening"}
          >
            <AssistantOrb state={mode === "listening" ? "listening" : "idle"} size={64} />
          </button>
        </div>
        {!recognitionAvailable() && (
          <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
            <Keyboard className="w-3 h-3" /> Voice input isn't supported in this browser — type below instead.
          </p>
        )}
        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='Try: "Add a DBMS lecture tomorrow at 10"'
            aria-label="Message StudyMate"
          />
          <Button type="submit" size="icon" disabled={mode === "thinking" || !input.trim()} aria-label="Send">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 orb-float transition-transform active:scale-95"
          aria-label="Open StudyMate assistant"
        >
          <AssistantOrb state={orbState} size={62} className={wake ? "ring-4 ring-sky-300/40 ring-offset-2" : ""} />
        </button>
      )}
      {open && panel}
    </>
  );
}