import React from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Mic, Sparkles, Database, Bell, ArrowRight } from "lucide-react";
import Logo from "@/components/Logo";

const FLOW = [
  { icon: Mic, title: "You speak", text: '"Hey StudyMate, I have a DBMS lecture tomorrow at 10."' },
  { icon: Sparkles, title: "StudyMate understands", text: "Natural language, your subjects, your dates — no forms." },
  { icon: Database, title: "StudyMate acts", text: "Your real academic records are updated instantly." },
  { icon: Bell, title: "You get notified", text: "Before classes, deadlines, and exams — proactively." },
];

export default function Landing() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo height={36} />
          <Button asChild variant="ghost">
            <Link to="/login">Log in</Link>
          </Button>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
          <Logo height={64} className="mx-auto mb-8" />
          <p className="inline-flex items-center gap-1.5 text-xs font-medium text-primary border rounded-full px-3 py-1 mb-6">
            <Sparkles className="w-3.5 h-3.5" /> Your AI academic agent
          </p>
          <h1 className="text-4xl sm:text-6xl font-bold font-heading tracking-tight leading-tight">
            Your Academic Life,{" "}
            <span className="bg-gradient-to-r from-blue-700 via-blue-500 to-sky-400 bg-clip-text text-transparent">
              On Autopilot.
            </span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            StudyMate is an AI academic agent that understands what you say, manages your academic
            records, reminds you what matters, and helps you decide what to do next.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg" className="h-12 px-8 text-base">
              <Link to="/register">
                Get Started <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-8 text-base">
              <Link to="/login">
                <Mic className="w-4 h-4 mr-2" /> Talk to StudyMate
              </Link>
            </Button>
          </div>
        </section>

        {/* Concept flow */}
        <section className="border-y bg-card">
          <div className="max-w-6xl mx-auto px-6 py-14">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {FLOW.map((f, i) => (
                <div key={f.title} className="relative">
                  <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
                    <f.icon className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">Step {i + 1}</p>
                  <h3 className="font-semibold mb-1.5">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Voice-first pitch */}
        <section className="max-w-6xl mx-auto px-6 py-20 text-center">
          <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-blue-700 via-blue-600 to-sky-500 shadow-xl shadow-blue-500/30 flex items-center justify-center orb-float">
            <Mic className="w-10 h-10 text-white" />
          </div>
          <h2 className="mt-8 text-2xl sm:text-3xl font-bold font-heading">
            You don't open StudyMate. StudyMate is there when you need it.
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            Ask what's next. Say you missed a class. Mention an exam. StudyMate listens, updates
            your records, and speaks back — in seconds.
          </p>
        </section>

        {/* Closing */}
        <section className="border-t bg-gradient-to-br from-blue-700 via-blue-600 to-sky-500 text-white">
          <div className="max-w-6xl mx-auto px-6 py-16 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold font-heading">Less Maintenance. More Studying.</h2>
            <Button asChild size="lg" variant="secondary" className="mt-6 h-12 px-8 text-base">
              <Link to="/register">Get Started</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-b py-6 text-center text-sm text-muted-foreground">
        StudyMate — Your AI Academic Agent
      </footer>
    </div>
  );
}