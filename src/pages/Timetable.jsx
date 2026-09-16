import React from "react";
import PageShell from "@/components/PageShell";
import { EmptyState } from "@/components/EmptyState";
import RecordForm from "@/components/RecordForm";
import { useCrud } from "@/hooks/useCrud";
import { useTable, DAYS, fmtTime } from "@/lib/db";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogAction, AlertDialogCancel, AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { CalendarDays, Plus, Pencil, Trash2, MapPin } from "lucide-react";

const FIELDS = [
  { name: "subject_name", label: "Subject", required: true, placeholder: "e.g. DBMS" },
  { name: "day_of_week", label: "Day", type: "select", options: DAYS, required: true },
  { name: "start_time", label: "Start time", type: "time", required: true },
  { name: "end_time", label: "End time", type: "time" },
  { name: "room_number", label: "Room", placeholder: "e.g. Room 204" },
  { name: "faculty_name", label: "Faculty", placeholder: "Prof. Sharma" },
];

export default function Timetable() {
  const { rows: slots, loading } = useTable("timetable");
  const { dialog, setDialog, deleteTarget, setDeleteTarget, busy, submit, confirmDelete } = useCrud("timetable");

  return (
    <PageShell
      title="Timetable"
      description="Your weekly class schedule. StudyMate uses it for alerts and attendance."
      action={
        <Button onClick={() => setDialog({})}>
          <Plus className="w-4 h-4 mr-1.5" /> Add class
        </Button>
      }
    >
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : slots.length === 0 ? (
        <div className="border rounded-xl bg-card">
          <EmptyState
            icon={CalendarDays}
            title="Your timetable is empty"
            hint={'Say "I have a DBMS lecture every Tuesday at 10" and StudyMate will schedule it.'}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
          {DAYS.map((day) => {
            const daySlots = slots
              .filter((s) => s.day_of_week === day)
              .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));
            return (
              <div key={day} className="bg-card border rounded-xl p-3 min-h-[120px]">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">{day}</p>
                <div className="space-y-2">
                  {daySlots.length === 0 && <p className="text-xs text-muted-foreground/50">—</p>}
                  {daySlots.map((s) => (
                    <div key={s.id} className="group rounded-lg bg-muted/60 p-2.5">
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-xs font-semibold leading-tight">{s.subject_name}</p>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setDialog({ row: s })} className="p-1 hover:text-primary" aria-label={"Edit " + s.subject_name}>
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button onClick={() => setDeleteTarget(s)} className="p-1 hover:text-destructive" aria-label={"Delete " + s.subject_name}>
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{fmtTime(s.start_time)}</p>
                      {s.room_number && (
                        <p className="text-[11px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                          <MapPin className="w-2.5 h-2.5" /> {s.room_number}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog && dialog.row ? "Edit class" : "Add class"}</DialogTitle>
            <DialogDescription>Classes appear here and in your daily briefing.</DialogDescription>
          </DialogHeader>
          <RecordForm fields={FIELDS} initial={dialog && dialog.row ? dialog.row : {}}
            onSubmit={(p) => submit({ day_of_week: dialog && dialog.row ? dialog.row.day_of_week : undefined, ...p })}
            onCancel={() => setDialog(null)} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this class?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && `${deleteTarget.subject_name} on ${deleteTarget.day_of_week} at ${fmtTime(deleteTarget.start_time)} will be removed permanently.`}
            </AlertDialogDescription>
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