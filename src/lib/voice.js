// Voice service: browser Speech Recognition + Text-to-Speech.
// Voice is never the only input — text input is always available.

const TTS_KEY = "studymate:tts";

export function ttsEnabled() {
  return localStorage.getItem(TTS_KEY) !== "off";
}

export function setTtsEnabled(on) {
  localStorage.setItem(TTS_KEY, on ? "on" : "off");
}

export function recognitionAvailable() {
  return typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function createRecognizer(handlers = {}) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const rec = new SR();
  rec.lang = navigator.language || "en-US";
  rec.interimResults = true;
  rec.continuous = false;
  let finalText = "";
  rec.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finalText += r[0].transcript;
      else interim += r[0].transcript;
    }
    if (handlers.onText) handlers.onText((finalText + interim).trim());
  };
  rec.onend = () => {
    if (handlers.onEnd) handlers.onEnd(finalText.trim());
  };
  rec.onerror = (e) => {
    if (handlers.onError) handlers.onError(e.error);
  };
  return rec;
}

export function speak(text, onEnd) {
  if (!ttsEnabled() || typeof window === "undefined" || !("speechSynthesis" in window)) {
    if (onEnd) onEnd();
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.02;
  u.onend = () => onEnd && onEnd();
  u.onerror = () => onEnd && onEnd();
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}