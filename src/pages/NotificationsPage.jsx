import React from "react";
import PageShell from "@/components/PageShell";
import { useTable, db, notifyDataChanged } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { Bell, CheckCheck, CalendarDays, ClipboardList, FileText, ListChecks, AlarmClock, Sparkles } from "lucide-react";
import moment from "moment";

const TYPE_ICONS = {
  class: CalendarDays,
  assignment: ClipboardList,
  exam: FileText,
  attendance: ListChecks,
  reminder: AlarmClock,
  system: Bell,
  recommendation: Sparkles,
};

export default function NotificationsPage() {
  const { rows: notifications, loading } = useTable("notifications");

  const markRead = async (n) => {
    if (n.is_read) return;
    await db.update("notifications", n.id, { is_read: true });
    notifyDataChanged();
  };

  const markAll = async () => {
    await db.markAllRead();
    notifyDataChanged();
  };

  const unread = notifications.filter((n) => !n.is_read).length;

  return (
    <PageShell
      title="Notifications"
      description="Everything StudyMate has proactively flagged for you."
      action={
        unread > 0 ? (
          <Button variant="outline" onClick={markAll}>
            <CheckCheck className="w-4 h-4 mr-1.5" /> Mark all read
          </Button>
        ) : null
      }
    >
      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : notifications.length === 0 ? (
        <div className="border rounded-xl bg-card">
          <EmptyState
            icon={Bell}
            title="No notifications yet"
            hint="Class alerts, deadline warnings, exam reminders, and attendance risks will appear here."
          />
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const Icon = TYPE_ICONS[n.type] || Bell;
            return (
              <button
                key={n.id}
                onClick={() => markRead(n)}
                className={"w-full text-left flex items-start gap-3 border rounded-xl p-4 shadow-sm transition-colors " +
                  (n.is_read ? "bg-card opacity-70" : "bg-card border-primary/30 hover:border-primary/60")}
              >
                <div className={"w-9 h-9 rounded-full flex items-center justify-center shrink-0 " + (n.is_read ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary")}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm flex items-center gap-2">
                    {n.title}
                    {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                </div>
                <span className="text-[11px] text-muted-foreground shrink-0">{moment(n.created_at).fromNow()}</span>
              </button>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}