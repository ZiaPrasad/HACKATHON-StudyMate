import React, { useState } from "react";
import PageShell from "@/components/PageShell";
import { useTable, db, notifyDataChanged } from "@/lib/db";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { recognitionAvailable, ttsEnabled, setTtsEnabled } from "@/lib/voice";
import {
  requestNotificationPermission, notificationPermission, notificationsSupported,
} from "@/lib/alertsService";
import { Volume2, BellRing, Percent, Globe, LogOut, Mic } from "lucide-react";

function Section({ icon: Icon, title, description, children }) {
  return (
    <div className="bg-card border rounded-xl p-6 shadow-sm">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="font-semibold text-sm">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export default function Settings() {
  const { user, logout } = useAuth();
  const { rows: profiles } = useTable("profiles");
  const { toast } = useToast();
  const profile = profiles[0];
  const [tts, setTts] = useState(ttsEnabled());
  const [threshold, setThreshold] = useState(profile && profile.attendance_threshold != null ? String(profile.attendance_threshold) : "75");
  const [busy, setBusy] = useState(false);

  const perm = notificationPermission();

  const toggleTts = () => {
    const next = !tts;
    setTts(next);
    setTtsEnabled(next);
  };

  const enableNotifications = async () => {
    await requestNotificationPermission();
    toast({ title: "Notifications enabled", description: "StudyMate will alert you about classes, deadlines, and exams." });
  };

  const saveThreshold = async () => {
    const value = Number(threshold);
    if (isNaN(value) || value < 0 || value > 100) {
      toast({ title: "Enter a value between 0 and 100", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await db.saveProfile({ attendance_threshold: value });
      notifyDataChanged();
      toast({ title: "Threshold saved", description: `StudyMate will warn you below ${value}% attendance.` });
    } catch (e) {
      toast({ title: "Couldn't save", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown";

  return (
    <PageShell title="Settings" description="Tune how StudyMate works for you.">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-4xl">
        <Section icon={Volume2} title="Voice" description="Spoken responses from your assistant.">
          <div className="flex items-center justify-between">
            <p className="text-sm">Speak responses aloud</p>
            <Button variant={tts ? "default" : "outline"} size="sm" onClick={toggleTts}>
              {tts ? "On" : "Off"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
            <Mic className="w-3.5 h-3.5" />
            {recognitionAvailable() ? "Voice input is supported in this browser." : "Voice input isn't supported in this browser — text input always works."}
          </p>
        </Section>

        <Section icon={BellRing} title="Notifications" description="Proactive alerts while the app is open.">
          {notificationsSupported() ? (
            <div className="flex items-center justify-between">
              <p className="text-sm">
                Permission: <span className={perm === "granted" ? "text-emerald-600 font-medium" : "text-muted-foreground"}>{perm}</span>
              </p>
              {perm !== "granted" && (
                <Button size="sm" onClick={enableNotifications} disabled={perm === "denied"}>
                  Enable
                </Button>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Not supported in this browser — reminders will appear on your dashboard.</p>
          )}
          {perm === "denied" && (
            <p className="text-xs text-muted-foreground mt-2">Blocked by your browser settings — allow notifications for this site to re-enable.</p>
          )}
        </Section>

        <Section icon={Percent} title="Attendance threshold" description="StudyMate warns you when attendance drops below this.">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label htmlFor="threshold">Threshold (%)</Label>
              <Input id="threshold" type="number" min="0" max="100" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
            </div>
            <Button onClick={saveThreshold} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
          </div>
        </Section>

        <Section icon={Globe} title="Timezone" description="StudyMate resolves dates and times using this zone.">
          <p className="text-sm font-medium">{timezone}</p>
          <p className="text-xs text-muted-foreground mt-1">Detected automatically from your device.</p>
        </Section>

        <Section icon={LogOut} title="Account" description={user ? user.email : ""}>
          <Button variant="outline" onClick={() => logout()}>Log out</Button>
        </Section>
      </div>
    </PageShell>
  );
}