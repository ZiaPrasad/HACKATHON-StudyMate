import React from "react";
import PageShell from "@/components/PageShell";
import { EmptyState } from "@/components/EmptyState";
import RecordForm from "@/components/RecordForm";
import { useCrud } from "@/hooks/useCrud";
import { useTable, daysUntil, fmtDate, fmtTime } from "@/lib/db";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogAction, AlertDialogCancel, AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { FileText, Plus, Pencil, Trash2, MapPin, Clock } from "lucide-react";

const FIELDS = [
  { name: "title", label: "Exam title", required: true, placeholder: "e.g. OS Midterm", full: true },
  { name: "subject_name", label: "Subject", placeholder: "e.g. Operating Systems" },
  { name: "exam_date", label: "Date", type: "date", required: true },
  { name: "start_time", label: "Start time", type: "time" },
  { name: "end_time", label: "End time", type: "time" },
  { name: "location", label: "Location", placeholder: "e.g. Exam Hall 2" },
];

export default function Exams() {
  const { rows: exams, loading } = useTable("exams");
  const { dialog, setDialog, deleteTarget, setDeleteTarget, busy, submit, confirmDelete } = useCrud("exams");

  const sorted = [...exams].sort((a, b) => (a.exam_date || "").localeCompare(b.exam_date || ""));
  const upcoming = sorted.filter((e) => daysUntil(e.exam_date) >= 0);
  const past = sorted.filter((e) => daysUntil(e.exam_date) < 0);

  const ExamCard = ({ e }) => {
    const d = daysUntil(e.exam_date);
    return (
      <div className="group bg-card border rounded-xl p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold truncate">{e.title}</p>
            {e.subject_name && <p className="text-xs text-muted-foreground mt-0.5">{e.subject_name}</p>}
          </div>
          {d != null && d >= 0 && (
            <span className={"text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 " +
              (d === 0 ? "bg-red-100 text-red-700" : d <= 3 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700")}>
              {d === 0 ? "Today" : d === 1 ? "Tomorrow" : `in ${d} days`}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> {fmtDate(e.exam_date)}</span>
          {e.start_time && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {fmtTime(e.start_time)}{e.end_time ? " – " + fmtTime(e.end_time) : ""}</span>}
          {e.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {e.location}</span>}
        </div>
        <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDialog({ row: e })} aria-label="Edit exam">
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(e)} aria-label="Delete exam">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <PageShell
      title="Exams"
      description="StudyMate counts down and warns you before each one."
      action={
        <Button onClick={() => setDialog({})}>
          <Plus className="w-4 h-4 mr-1.5" /> Add exam
        </Button>
      }
    >
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{[1, 2].map((i) => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : upcoming.length === 0 && past.length === 0 ? (
        <div className="border rounded-xl bg-card">
          <EmptyState
            icon={FileText}
            title="No exams scheduled"
            hint={'Say "I have an OS exam next Monday" and StudyMate will track it.'}
          />
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {upcoming.map((e) => <ExamCard key={e.id} e={e} />)}
            </div>
          )}
          {past.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Past</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 opacity-60">
                {past.map((e) => <ExamCard key={e.id} e={e} />)}
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog && dialog.row ? "Edit exam" : "Add exam"}</DialogTitle>
            <DialogDescription>Exams feed your study plans and alerts.</DialogDescription>
          </DialogHeader>
          <RecordForm fields={FIELDS} initial={dialog && dialog.row ? dialog.row : {}} onSubmit={submit} onCancel={() => setDialog(null)} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this exam?</AlertDialogTitle>
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