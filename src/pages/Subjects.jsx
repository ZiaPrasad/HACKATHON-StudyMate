import React from "react";
import PageShell from "@/components/PageShell";
import { EmptyState } from "@/components/EmptyState";
import RecordForm from "@/components/RecordForm";
import { useCrud } from "@/hooks/useCrud";
import { useTable } from "@/lib/db";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogAction, AlertDialogCancel, AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { BookOpen, Plus, Pencil, Trash2 } from "lucide-react";

const FIELDS = [
  { name: "name", label: "Subject name", required: true, placeholder: "e.g. DBMS" },
  { name: "code", label: "Subject code", placeholder: "e.g. CS201" },
  { name: "faculty_name", label: "Faculty", placeholder: "Prof. Sharma" },
  { name: "credits", label: "Credits", type: "number", placeholder: "4" },
];

export default function Subjects() {
  const { rows: subjects, loading } = useTable("subjects");
  const { dialog, setDialog, deleteTarget, setDeleteTarget, busy, submit, confirmDelete } = useCrud("subjects");

  return (
    <PageShell
      title="Subjects"
      description="Your courses for this semester. Add them here, or just tell StudyMate."
      action={
        <Button onClick={() => setDialog({})}>
          <Plus className="w-4 h-4 mr-1.5" /> Add subject
        </Button>
      }
    >
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : subjects.length === 0 ? (
        <div className="border rounded-xl bg-card">
          <EmptyState
            icon={BookOpen}
            title="No subjects yet"
            hint={'Say "I have DBMS, Java and OS this semester" and StudyMate will add them for you.'}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((s) => (
            <div key={s.id} className="group bg-card border rounded-xl p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold" style={{ background: s.color || "#2575FC" }}>
                    {(s.name || "?").slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[s.code, s.faculty_name].filter(Boolean).join(" · ") || "No details"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDialog({ row: s })} aria-label={"Edit " + s.name}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(s)} aria-label={"Delete " + s.name}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              {s.credits != null && (
                <p className="text-xs text-muted-foreground mt-3">{s.credits} credits</p>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog && dialog.row ? "Edit subject" : "Add subject"}</DialogTitle>
            <DialogDescription>Changes here are instantly available to your AI assistant.</DialogDescription>
          </DialogHeader>
          <RecordForm fields={FIELDS} initial={dialog && dialog.row ? dialog.row : {}} onSubmit={submit} onCancel={() => setDialog(null)} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget && deleteTarget.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the subject. This cannot be undone.
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