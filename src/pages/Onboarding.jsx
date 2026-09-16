import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { db, notifyDataChanged } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles } from "lucide-react";

const STEPS = [
  {
    key: "college",
    question: (name) => `Hi${name ? " " + name.split(" ")[0] : ""}! I'm StudyMate. Let's set up your academic life. What college do you attend?`,
    placeholder: "e.g. GNKC",
  },
  {
    key: "course",
    question: () => "What course are you studying?",
    placeholder: "e.g. BSc Computer Science",
  },
  {
    key: "academic_year",
    question: () => "Which year are you in?",
    placeholder: "e.g. Second year",
  },
  {
    key: "semester",
    question: () => "And your current semester?",
    placeholder: "e.g. Semester 3",
  },
];

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const current = STEPS[Math.min(step, STEPS.length - 1)];

  const advance = () => {
    setAnswers((a) => ({ ...a, [current.key]: value.trim() }));
    setValue("");
    setStep((s) => s + 1);
  };

  const finish = async (skipped) => {
    setBusy(true);
    setError("");
    try {
      await db.saveProfile({
        name: user && user.full_name ? user.full_name : undefined,
        email: user ? user.email : undefined,
        ...answers,
      });
      notifyDataChanged();
      navigate("/dashboard");
    } catch (e) {
      setError(e.message || "Could not save your profile. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (step >= STEPS.length) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 via-blue-500 to-sky-500 flex items-center justify-center mb-6">
          <Sparkles className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold font-heading mb-2">You're all set!</h1>
        <p className="text-muted-foreground text-sm mb-6">
          You can always update this later on your profile page — or just tell StudyMate.
        </p>
        <Button size="lg" onClick={() => finish(false)} disabled={busy}>
          {busy ? "Saving…" : "Go to my dashboard"}
        </Button>
        {error && <p className="text-sm text-destructive mt-4">{error}</p>}
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-12">
      <div className="bg-card border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 via-blue-500 to-sky-500 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{current.question(user && user.full_name)}</p>
        </div>
        <Input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") advance(); }}
          placeholder={current.placeholder}
          className="h-12"
        />
        <div className="flex items-center justify-between mt-4">
          <Button variant="ghost" size="sm" onClick={() => { setValue(""); setStep((s) => s + 1); }}>
            Skip
          </Button>
          <Button onClick={advance} disabled={!value.trim()}>
            {step === STEPS.length - 1 ? "Finish" : "Continue"}
          </Button>
        </div>
      </div>
      <div className="flex justify-center gap-1.5 mt-5">
        {STEPS.map((s, i) => (
          <span
            key={s.key}
            className={"h-1.5 rounded-full transition-all " + (i < step ? "w-6 bg-primary" : i === step ? "w-6 bg-primary/40" : "w-3 bg-border")}
          />
        ))}
      </div>
    </div>
  );
}