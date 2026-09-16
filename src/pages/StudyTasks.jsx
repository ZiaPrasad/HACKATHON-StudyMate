import React from "react";
import PageShell from "@/components/PageShell";
import { EmptyState } from "@/components/EmptyState";
import RecordForm from "@/components/RecordForm";
import { useCrud } from "@/hooks/useCrud";
import { useTable, daysUntil, fmtDate, db, notifyDataChanged } from "@/lib/db";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogAction, AlertDialogCancel, AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { ListChecks, Plus, Pencil, Trash2, CheckCircle2, Circle } from "lucide-react";

const FIELDS = [
  { name: "title", label: "Task", required: true, placeholder: "e.g. Review normalization", full: true },
  { name: "subject_name", label: "Subject", placeholder: "e.g. DBMS" },
  { name: "due_date", label: "Due date", type: "date" },
  { name: "priority", label: "Priority", type: "select", options: ["low", "medium", "high"] },
];

export default function StudyTasks() {
  const { rows: tasks, loading } = useTable("study_tasks");
  const { dialog, setDialog, deleteTarget, setDeleteTarget, busy, submit, confirmDelete } = useCrud("study_tasks");

  const toggleComplete = async (t) => {
    await db.update("study_tasks", t.id, {
      completed: !t.completed,
      completed_at: t.completed ? null : new Date().toISOString(),
    });
    notifyDataChanged();
  };

  const pending = tasks.filter((t) => !t.completed);
  const completed = tasks.filter((t) => t.completed);

  const Row = ({ t }) => {
    const d = daysUntil(t.due_date);
    const overdue = !t.completed && d != null && d < 0;
    return (
      <div className="group flex items-center gap-3 bg-card border rounded-xl p-4 shadow-sm">
        <button onClick={() => toggleComplete(t)} aria-label={t.completed ? "Mark pending" : "Mark complete"} className="shrink-0">
          {t.completed
            ? <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            : <Circle className="w-5 h-5 text-muted-foreground hover:text-emerald-600 transition-colors" />}
        </button>
        <div className="min-w-0 flex-1">
          <p className={"font-medium text-sm truncate " + (t.completed ? "line-through text-muted-foreground" : "")}>{t.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t.subject_name && t.subject_name + " · "}
            {t.due_date ? (overdue ? <span className="text-destructive font-medium">Overdue · due {fmtDate(t.due_date)}</span> : `Due ${fmtDate(t.due_date)}`) : "No due date"}
          </p>
        </div>
        {t.priority && (
          <span className={"text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full shrink-0 " +
            (t.priority === "high" ? "bg-red-100 text-red-700" : t.priority === "medium" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600")}>
            {t.priority}
          </span>
        )}
        <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDialog({ row: t })} aria-label="Edit task">
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(t)} aria-label="Delete task">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <PageShell
      title="Study Tasks"
      description="Small tasks that keep you moving. StudyMate can generate a plan for you."
      action={
        <Button onClick={() => setDialog({})}>
          <Plus className="w-4 h-4 mr-1.5" /> Add task
        </Button>
      }
    >
      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : tasks.length === 0 ? (
        <div className="border rounded-xl bg-card">
          <EmptyState
            icon={ListChecks}
            title="No study tasks"
            hint={'Say "create a study plan for my OS exam" and StudyMate will draft one.'}
          />
        </div>
      ) : (
        <div className="space-y-5">
          {pending.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pending ({pending.length})</p>
              {pending.map((t) => <Row key={t.id} t={t} />)}
            </div>
          )}
          {completed.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Completed</p>
              {completed.map((t) => <Row key={t.id} t={t} />)}
            </div>
          )}
        </div>
      )}

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog && dialog.row ? "Edit task" : "Add study task"}</DialogTitle>
            <DialogDescription>Tasks feed your "what should I do next" recommendations.</DialogDescription>
          </DialogHeader>
          <RecordForm fields={FIELDS} initial={dialog && dialog.row ? dialog.row : {}} onSubmit={submit} onCancel={() => setDialog(null)} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
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