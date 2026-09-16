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
import { ListChecks, Plus, Pencil, Trash2, Check, X, AlertTriangle } from "lucide-react";

const FIELDS = [
  { name: "subject_name", label: "Subject", required: true, placeholder: "e.g. DBMS" },
  { name: "classes_held", label: "Classes held", type: "number" },
  { name: "classes_attended", label: "Classes attended", type: "number" },
  { name: "alert_threshold", label: "Alert threshold (%)", type: "number" },
];

const pct = (attended, held) => (held > 0 ? Math.round((attended / held) * 1000) / 10 : 0);

export default function Attendance() {
  const { rows: records, loading } = useTable("attendance");
  const { dialog, setDialog, deleteTarget, setDeleteTarget, busy, submit, confirmDelete } = useCrud("attendance");

  const mark = async (r, present) => {
    const held = (r.classes_held || 0) + 1;
    const attended = (r.classes_attended || 0) + (present ? 1 : 0);
    await db.update("attendance", r.id, {
      classes_held: held,
      classes_attended: attended,
      percentage: pct(attended, held),
    });
    await db.create("attendance_checkins", {
      subject_id: r.subject_id,
      subject_name: r.subject_name,
      date: new Date().toISOString().slice(0, 10),
      status: present ? "present" : "absent",
    });
    notifyDataChanged();
  };

  return (
    <PageShell
      title="Attendance"
      description="Tell StudyMate you made it to class — or missed it — and it stays accurate."
      action={
        <Button onClick={() => setDialog({})}>
          <Plus className="w-4 h-4 mr-1.5" /> Track subject
        </Button>
      }
    >
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{[1, 2, 3].map((i) => <div key={i} className="h-44 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : records.length === 0 ? (
        <div className="border rounded-xl bg-card">
          <EmptyState
            icon={ListChecks}
            title="No attendance tracked yet"
            hint={'Say "I missed the DBMS class today" and StudyMate records it.'}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {records.map((r) => {
            const t = r.alert_threshold != null ? Number(r.alert_threshold) : 75;
            const p = Number(r.percentage) || 0;
            const risk = p < t;
            return (
              <div key={r.id} className="group bg-card border rounded-xl p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{r.subject_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {r.classes_attended || 0} of {r.classes_held || 0} classes attended
                    </p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDialog({ row: r })} aria-label="Edit attendance">
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(r)} aria-label="Delete attendance record">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="mt-4 flex items-baseline gap-2">
                  <p className={"text-3xl font-bold " + (risk ? "text-destructive" : "text-emerald-600")}>{p}%</p>
                  {risk && (
                    <span className="flex items-center gap-1 text-xs text-destructive">
                      <AlertTriangle className="w-3.5 h-3.5" /> below {t}%
                    </span>
                  )}
                </div>
                <div className="h-2 rounded-full bg-muted mt-2 overflow-hidden">
                  <div
                    className={"h-full rounded-full transition-all " + (risk ? "bg-destructive" : "bg-emerald-500")}
                    style={{ width: Math.min(p, 100) + "%" }}
                  />
                </div>

                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => mark(r, true)}>
                    <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Present
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => mark(r, false)}>
                    <X className="w-3.5 h-3.5 mr-1 text-destructive" /> Absent
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
            <DialogTitle>{dialog && dialog.row ? "Edit attendance" : "Track a subject"}</DialogTitle>
            <DialogDescription>Set totals manually, or just mark present/absent day by day.</DialogDescription>
          </DialogHeader>
          <RecordForm
            fields={FIELDS}
            initial={dialog && dialog.row ? dialog.row : { alert_threshold: 75 }}
            onSubmit={(p) =>
              submit({
                ...p,
                percentage: p.classes_held && p.classes_attended != null
                  ? pct(Number(p.classes_attended), Number(p.classes_held))
                  : 0,
              })
            }
            onCancel={() => setDialog(null)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stop tracking {deleteTarget && deleteTarget.subject_name}?</AlertDialogTitle>
            <AlertDialogDescription>The attendance record will be removed permanently.</AlertDialogDescription>
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