import React from "react";
import PageShell from "@/components/PageShell";
import { EmptyState } from "@/components/EmptyState";
import RecordForm from "@/components/RecordForm";
import { useCrud } from "@/hooks/useCrud";
import { useTable, db, notifyDataChanged } from "@/lib/db";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogAction, AlertDialogCancel, AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { AlarmClock, Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
import moment from "moment";

const FIELDS = [
  { name: "title", label: "What should I remind you about?", required: true, placeholder: "e.g. Study DBMS", full: true },
  { name: "reminder_time", label: "When", type: "datetime-local", required: true, full: true },
];

export default function Reminders() {
  const { rows: reminders, loading } = useTable("reminders");
  const { dialog, setDialog, deleteTarget, setDeleteTarget, busy, submit, confirmDelete } = useCrud("reminders");

  const shown = [...reminders].sort((a, b) =>
    new Date(a.reminder_time || 0) - new Date(b.reminder_time || 0)
  );

  const toggleDone = async (r) => {
    await db.update("reminders", r.id, { completed: !r.completed });
    notifyDataChanged();
  };

  return (
    <PageShell
      title="Reminders"
      description="StudyMate notifies you here and via browser notifications while the app is open."
      action={
        <Button onClick={() => setDialog({})}>
          <Plus className="w-4 h-4 mr-1.5" /> Add reminder
        </Button>
      }
    >
      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : shown.length === 0 ? (
        <div className="border rounded-xl bg-card">
          <EmptyState
            icon={AlarmClock}
            title="No reminders"
            hint={'Say "remind me to study Java at 8 PM tonight".'}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((r) => {
            const past = r.reminder_time && new Date(r.reminder_time) < new Date();
            return (
              <div key={r.id} className="group flex items-center gap-3 bg-card border rounded-xl p-4 shadow-sm">
                <button onClick={() => toggleDone(r)} aria-label={r.completed ? "Mark pending" : "Mark done"} className="shrink-0">
                  {r.completed
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    : <Circle className="w-5 h-5 text-muted-foreground hover:text-emerald-600 transition-colors" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={"font-medium text-sm truncate " + (r.completed ? "line-through text-muted-foreground" : "")}>{r.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {r.reminder_time ? moment(r.reminder_time).calendar() : "No time set"}
                    {past && !r.completed && " · passed"}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(r)} aria-label="Delete reminder">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a reminder</DialogTitle>
            <DialogDescription>You'll get a browser notification when it's time.</DialogDescription>
          </DialogHeader>
          <RecordForm
            fields={FIELDS}
            initial={dialog && dialog.row ? dialog.row : {}}
            onSubmit={(p) =>
              submit({
                ...p,
                reminder_time: p.reminder_time ? new Date(p.reminder_time).toISOString() : undefined,
              })
            }
            onCancel={() => setDialog(null)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this reminder?</AlertDialogTitle>
            <AlertDialogDescription>{deleteTarget && deleteTarget.title} will be removed permanently.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={busy} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}