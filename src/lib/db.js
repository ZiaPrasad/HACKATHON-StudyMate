import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { supabase, isLocalMode } from "@/lib/supabaseClient";

const DATA_EVENT = "studymate:data-changed";

export function notifyDataChanged() {
  window.dispatchEvent(new Event(DATA_EVENT));
}

// ---------------- HOSTED MODE (Base44 backend functions) ----------------
async function invoke(op) {
  const res = await base44.functions.invoke("studyMateData", op);
  return res.data;
}

const hostedDb = {
  list: async (table, filter = {}, limit = 400, order) => {
    const body = await invoke({ table, op: "list", filter, limit, order });
    return body.data || [];
  },
  create: async (table, data) => {
    const body = await invoke({ table, op: "create", data });
    return body.data;
  },
  update: async (table, id, data) => {
    const body = await invoke({ table, op: "update", id, data });
    return body.data;
  },
  remove: async (table, id) => invoke({ table, op: "delete", id }),
  saveProfile: async (data) => {
    const body = await invoke({ table: "profiles", op: "saveProfile", data });
    return body.data;
  },
  markAllRead: async () => invoke({ table: "notifications", op: "markAllRead" }),
};

// ---------------- LOCAL MODE (direct Supabase, RLS-protected) ----------------
async function currentUser() {
  const { data } = await supabase.auth.getUser();
  if (!data?.user) throw new Error("Not authenticated");
  return data.user;
}

function unwrap(result, what) {
  if (result.error) throw new Error(`${what} failed: ${result.error.message}`);
  return result.data;
}

const localDb = {
  list: async (table, filter = {}, limit = 400, order) => {
    await currentUser();
    let q = supabase.from(table).select("*").limit(limit);
    for (const [k, v] of Object.entries(filter)) q = q.eq(k, v);
    if (order) {
      const [col, dir] = order.split(".");
      q = q.order(col, { ascending: dir !== "desc" });
    }
    return (await q).data || [];
  },
  create: async (table, data) => {
    const user = await currentUser();
    return unwrap(await supabase.from(table).insert({ ...data, user_id: user.id }).select().single(), `Creating ${table}`);
  },
  update: async (table, id, data) => {
    const user = await currentUser();
    return unwrap(await supabase.from(table).update(data).eq("id", id).eq("user_id", user.id).select().single(), `Updating ${table}`);
  },
  remove: async (table, id) => {
    const user = await currentUser();
    unwrap(await supabase.from(table).delete().eq("id", id).eq("user_id", user.id), `Deleting ${table}`);
    return { ok: true };
  },
  saveProfile: async (data) => {
    const user = await currentUser();
    return unwrap(
      await supabase
        .from("profiles")
        .upsert({ ...data, user_id: user.id, email: data.email || user.email }, { onConflict: "user_id" })
        .select()
        .single(),
      "Saving profile"
    );
  },
  markAllRead: async () => {
    const user = await currentUser();
    unwrap(await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false), "Updating notifications");
    return { ok: true };
  },
};

export const db = isLocalMode() ? localDb : hostedDb;

export async function askStudyMate(message, history = [], confirmed = false) {
  if (isLocalMode()) {
    const { data, error } = await supabase.functions.invoke("studymate-ai", { body: { message, confirmed } });
    if (error) throw new Error(error.message || "Assistant request failed");
    return data;
  }
  const res = await base44.functions.invoke("studyMateAI", { message, history, confirmed });
  return res.data;
}

export function useTable(table, filter = {}, order) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const filterKey = JSON.stringify(filter);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await db.list(table, JSON.parse(filterKey), 400, order);
      setRows(data);
    } catch (e) {
      setError(e.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [table, filterKey, order]);

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener(DATA_EVENT, handler);
    return () => window.removeEventListener(DATA_EVENT, handler);
  }, [load]);

  return { rows, loading, error, reload: load };
}

// ------- date helpers -------
export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function todayName() {
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date().getDay()];
}

export function fmtDate(d) {
  if (!d) return "—";
  const date = new Date(d.length === 10 ? d + "T00:00:00" : d);
  if (isNaN(date)) return "—";
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function fmtTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr.length === 10 ? dateStr + "T00:00:00" : dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((d - now) / 86400000);
}