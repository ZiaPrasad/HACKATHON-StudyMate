import React, { useState } from "react";
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
import { NotebookPen, Plus, Pencil, Trash2 } from "lucide-react";

const FIELDS = [
  { name: "title", label: "Title", required: true, placeholder: "e.g. Normalization notes", full: true },
  { name: "subject_name", label: "Subject", placeholder: "e.g. DBMS" },
  { name: "content", label: "Content", type: "textarea", full: true, rows: 8 },
];

export default function Notes() {
  const { rows: notes, loading } = useTable("notes");
  const { dialog, setDialog, deleteTarget, setDeleteTarget, busy, submit, confirmDelete } = useCrud("notes");
  const [viewing, setViewing] = useState(null);

  return (
    <PageShell
      title="Notes"
      description="Quick notes per subject. StudyMate uses them to suggest what to review."
      action={
        <Button onClick={() => setDialog({})}>
          <Plus className="w-4 h-4 mr-1.5" /> Add note
        </Button>
      }
    >
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{[1, 2, 3].map((i) => <div key={i} className="h-36 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : notes.length === 0 ? (
        <div className="border rounded-xl bg-card">
          <EmptyState
            icon={NotebookPen}
            title="No notes yet"
            hint={'Say "add a DBMS note: normalization is about reducing redundancy".'}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((n) => (
            <div
              key={n.id}
              className="group bg-card border rounded-xl p-5 shadow-sm cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => setViewing(n)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{n.title}</p>
                  {n.subject_name && <p className="text-xs text-primary mt-0.5">{n.subject_name}</p>}
                </div>
                <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDialog({ row: n })} aria-label="Edit note">
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(n)} aria-label="Delete note">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              {n.content && <p className="text-xs text-muted-foreground mt-2 line-clamp-3 whitespace-pre-wrap">{n.content}</p>}
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewing && viewing.title}</DialogTitle>
            <DialogDescription>{viewing && viewing.subject_name}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto text-sm whitespace-pre-wrap">{viewing && viewing.content}</div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog && dialog.row ? "Edit note" : "Add note"}</DialogTitle>
            <DialogDescription>Keep it short — StudyMate quotes your notes when suggesting revision.</DialogDescription>
          </DialogHeader>
          <RecordForm fields={FIELDS} initial={dialog && dialog.row ? dialog.row : {}} onSubmit={submit} onCancel={() => setDialog(null)} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this note?</AlertDialogTitle>
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