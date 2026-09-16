import { useState } from "react";
import { db, notifyDataChanged } from "@/lib/db";
import { useToast } from "@/components/ui/use-toast";

// Shared create/update/delete helper for the CRUD pages.
export function useCrud(table) {
  const [dialog, setDialog] = useState(null); // null | {} (create) | { row } (edit)
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const submit = async (payload) => {
    setBusy(true);
    try {
      if (dialog && dialog.row) {
        await db.update(table, dialog.row.id, payload);
      } else {
        await db.create(table, payload);
      }
      notifyDataChanged();
      setDialog(null);
    } catch (e) {
      toast({ title: "Something went wrong", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await db.remove(table, deleteTarget.id);
      notifyDataChanged();
      setDeleteTarget(null);
    } catch (e) {
      toast({ title: "Couldn't delete", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return { dialog, setDialog, deleteTarget, setDeleteTarget, busy, submit, confirmDelete };
}