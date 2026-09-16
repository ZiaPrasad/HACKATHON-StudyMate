import React, { useCallback, useRef, useState } from "react";
import PageShell from "@/components/PageShell";
import { askStudyMate, notifyDataChanged } from "@/lib/db";
import { createRecognizer, recognitionAvailable, speak, stopSpeaking, ttsEnabled, setTtsEnabled } from "@/lib/voice";
import AssistantOrb from "@/components/AssistantOrb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Volume2, VolumeX, Keyboard } from "lucide-react";

const SUGGESTIONS = [
  "What do I have today?",
  "Give me my daily briefing",
  "What should I study now?",
  "Can I skip Java tomorrow?",
  "What am I behind on?",
  "Create a study plan for this week",
];

const STATUS = {
  idle: "Ready — tap the mic or type",
  listening: "Listening…",
  thinking: "Thinking…",
  speaking: "Speaking…",
  success: "Done!",
  error: "Something went wrong — try again",
};

export default function AssistantPage() {
  const [messages, setMessages] = useState([]);
  const [mode, setMode] = useState("idle");
  const [input, setInput] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [error, setError] = useState("");
  const [confirmPending, setConfirmPending] = useState(null);
  const [tts, setTts] = useState(ttsEnabled());
  const recognizer = useRef(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const endRef = useRef(null);

  const history = () => messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));

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
        speak(res.response, () => setMode("idle"));
      } catch (e) {
        setMode("error");
        setError(e.message || "StudyMate is unavailable right now. Please try again.");
        setTimeout(() => setMode("idle"), 2500);
      }
    },
    [messages]
  );

  const send = (text) => {
    const msg = (text || "").trim();
    if (!msg || modeRef.current === "thinking" || modeRef.current === "listening") return;
    setInput("");
    runAsk(msg, false);
  };

  const startListening = () => {
    if (!recognitionAvailable()) return;
    stopSpeaking();
    setError("");
    setLiveTranscript("");
    if (recognizer.current) {
      try { recognizer.current.abort(); } catch (_) {}
    }
    const rec = createRecognizer({
      onText: (t) => setLiveTranscript(t),
      onEnd: (final) => {
        recognizer.current = null;
        setLiveTranscript("");
        if (final && modeRef.current === "listening") runAsk(final, false);
        else setMode("idle");
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
  };

  const toggleTts = () => {
    const next = !tts;
    setTts(next);
    setTtsEnabled(next);
    if (!next) stopSpeaking();
  };

  return (
    <PageShell
      title="StudyMate Assistant"
      description={STATUS[mode]}
      action={
        <Button variant={tts ? "secondary" : "ghost"} size="icon" onClick={toggleTts} aria-label={tts ? "Mute voice" : "Unmute voice"} title={tts ? "Mute voice" : "Unmute voice"}>
          {tts ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </Button>
      }
    >
      <div className="max-w-2xl mx-auto">
        {/* Chat area */}
        <div className="min-h-[300px] bg-card border rounded-2xl p-5 space-y-3">
          {messages.length === 0 && !liveTranscript && (
            <div className="py-10 text-center">
              <AssistantOrb state="idle" size={80} className="mx-auto orb-float" />
              <p className="mt-5 font-semibold">Hey! I'm StudyMate.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Speak or type — I'll understand, act on your records, and tell you what happened.
              </p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={"flex " + (m.role === "user" ? "justify-end" : "justify-start")}>
              {m.role === "assistant" && <AssistantOrb state="idle" size={30} className="mr-2 self-end shrink-0" />}
              <div
                className={"max-w-[80%] rounded-2xl px-4 py-2.5 text-sm " +
                  (m.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm")}
              >
                {m.content}
              </div>
            </div>
          ))}
          {liveTranscript && mode === "listening" && (
            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm bg-primary/70 text-primary-foreground rounded-br-sm animate-pulse">
                {liveTranscript}
              </div>
            </div>
          )}
          {mode === "thinking" && (
            <div className="flex justify-start items-center gap-2">
              <AssistantOrb state="thinking" size={30} />
              <div className="rounded-2xl px-4 py-2.5 text-sm bg-muted rounded-bl-sm flex gap-1.5 items-center">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "120ms" }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "240ms" }} />
              </div>
            </div>
          )}
          {error && <p className="text-xs text-destructive text-center">{error}</p>}
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

        {/* Mic */}
        <div className="flex justify-center mt-6">
          <button
            onClick={mode === "listening" ? () => { try { recognizer.current && recognizer.current.stop(); } catch (_) {} } : startListening}
            disabled={!recognitionAvailable()}
            className="disabled:opacity-40 disabled:cursor-not-allowed transition-transform active:scale-95"
            aria-label={mode === "listening" ? "Stop listening" : "Start listening"}
          >
            <AssistantOrb state={mode === "listening" ? "listening" : mode === "thinking" ? "thinking" : mode === "speaking" ? "speaking" : "idle"} size={72} />
          </button>
        </div>
        {!recognitionAvailable() && (
          <p className="text-xs text-muted-foreground text-center mt-3 flex items-center justify-center gap-1">
            <Keyboard className="w-3 h-3" /> Voice input isn't supported in this browser — type below instead.
          </p>
        )}

        {/* Suggestions */}
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2 justify-center mt-4">
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
        )}

        {/* Text input */}
        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2 mt-4">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Try: I missed the DBMS lecture today, finished my Java assignment, and I have an OS exam next Monday"
            aria-label="Message StudyMate"
            className="h-12"
          />
          <Button type="submit" size="icon" className="h-12 w-12" disabled={mode === "thinking" || !input.trim()} aria-label="Send">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </PageShell>
  );
}