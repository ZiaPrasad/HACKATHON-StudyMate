import React, { useState } from "react";
import PageShell from "@/components/PageShell";
import { EmptyState } from "@/components/EmptyState";
import RecordForm from "@/components/RecordForm";
import { useCrud } from "@/hooks/useCrud";
import { useTable, daysUntil, fmtDate } from "@/lib/db";
import { db, notifyDataChanged } from "@/lib/db";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogAction, AlertDialogCancel, AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { ClipboardList, Plus, Pencil, Trash2, CheckCircle2, Circle } from "lucide-react";

const FIELDS = [
  { name: "title", label: "Title", required: true, placeholder: "e.g. ER diagram submission", full: true },
  { name: "subject_name", label: "Subject", placeholder: "e.g. DBMS" },
  { name: "due_date", label: "Due date", type: "date" },
  { name: "priority", label: "Priority", type: "select", options: ["low", "medium", "high"] },
  { name: "description", label: "Description", type: "textarea", full: true },
];

const FILTERS = ["Pending", "Completed", "All"];

export default function Assignments() {
  const { rows: assignments, loading } = useTable("assignments");
  const { dialog, setDialog, deleteTarget, setDeleteTarget, busy, submit, confirmDelete } = useCrud("assignments");
  const [filter, setFilter] = useState("Pending");

  const toggleComplete = async (a) => {
    await db.update("assignments", a.id, {
      completed: !a.completed,
      status: a.completed ? "pending" : "completed",
      completed_at: a.completed ? null : new Date().toISOString(),
    });
    notifyDataChanged();
  };

  const shown = assignments.filter((a) =>
    filter === "All" ? true : filter === "Pending" ? !a.completed : a.completed
  );

  return (
    <PageShell
      title="Assignments"
      description="Deadlines StudyMate watches for you. Say “I finished my Java assignment” to tick one off."
      action={
        <Button onClick={() => setDialog({})}>
          <Plus className="w-4 h-4 mr-1.5" /> Add assignment
        </Button>
      }
    >
      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={"text-xs px-3 py-1.5 rounded-full border transition-colors " +
              (filter === f ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent")}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : shown.length === 0 ? (
        <div className="border rounded-xl bg-card">
          <EmptyState
            icon={ClipboardList}
            title={filter === "Completed" ? "No completed assignments yet" : "No assignments here"}
            hint={'Say "I have a Java assignment due Friday" and StudyMate will add it.'}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((a) => {
            const d = daysUntil(a.due_date);
            const overdue = !a.completed && d != null && d < 0;
            return (
              <div key={a.id} className="group flex items-center gap-3 bg-card border rounded-xl p-4 shadow-sm">
                <button onClick={() => toggleComplete(a)} aria-label={a.completed ? "Mark pending" : "Mark complete"} className="shrink-0">
                  {a.completed
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    : <Circle className="w-5 h-5 text-muted-foreground hover:text-emerald-600 transition-colors" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={"font-medium text-sm truncate " + (a.completed ? "line-through text-muted-foreground" : "")}>{a.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {a.subject_name && a.subject_name + " · "}
                    {a.due_date ? (overdue ? <span className="text-destructive font-medium">Overdue · due {fmtDate(a.due_date)}</span> : `Due ${fmtDate(a.due_date)}`) : "No due date"}
                  </p>
                </div>
                {a.priority && (
                  <span className={"text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full shrink-0 " +
                    (a.priority === "high" ? "bg-red-100 text-red-700" : a.priority === "medium" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600")}>
                    {a.priority}
                  </span>
                )}
                <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDialog({ row: a })} aria-label="Edit assignment">
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(a)} aria-label="Delete assignment">
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
            <DialogTitle>{dialog && dialog.row ? "Edit assignment" : "Add assignment"}</DialogTitle>
            <DialogDescription>StudyMate will remind you before the deadline.</DialogDescription>
          </DialogHeader>
          <RecordForm fields={FIELDS} initial={dialog && dialog.row ? dialog.row : {}} onSubmit={submit} onCancel={() => setDialog(null)} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this assignment?</AlertDialogTitle>
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