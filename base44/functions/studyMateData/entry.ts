import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getSupabaseContext, sbSelect, sbInsert, sbUpdate, sbDelete, sbUpsert } from '../../shared/supabase.ts';

// Bounded data repository for the StudyMate app. The frontend performs all
// academic CRUD through this function. Every query is forced to the calling
// user's rows, and only whitelisted tables/fields are accepted.

const TABLES = {
  profiles: {
    columns: ["name", "email", "institution", "college", "course", "branch", "academic_year", "semester", "avatar_url", "attendance_threshold"]
  },
  subjects: {
    columns: ["name", "code", "faculty_name", "credits", "color"]
  },
  timetable: {
    columns: ["subject_id", "subject_name", "day_of_week", "start_time", "end_time", "room_number", "faculty_name", "notes"]
  },
  assignments: {
    columns: ["subject_id", "subject_name", "title", "description", "due_date", "priority", "status", "completed", "completed_at"]
  },
  exams: {
    columns: ["subject_id", "subject_name", "title", "exam_date", "start_time", "end_time", "location", "notes"]
  },
  attendance: {
    columns: ["subject_id", "subject_name", "classes_held", "classes_attended", "percentage", "alert_threshold"]
  },
  attendance_checkins: {
    columns: ["subject_id", "subject_name", "timetable_id", "date", "status"]
  },
  notes: {
    columns: ["subject_id", "subject_name", "title", "content", "file_url"]
  },
  study_tasks: {
    columns: ["subject_id", "subject_name", "title", "description", "priority", "due_date", "completed", "completed_at"]
  },
  reminders: {
    columns: ["title", "description", "reminder_time", "completed"]
  },
  notifications: {
    columns: ["title", "message", "type", "is_read", "link", "scheduled_for"]
  },
  chat_history: {
    columns: ["role", "content"]
  }
};

function sanitize(allowed, data) {
  const out = {};
  if (!data || typeof data !== "object") return out;
  for (const key of allowed) {
    if (data[key] !== undefined && data[key] !== null) out[key] = data[key];
  }
  return out;
}

function cleanFilter(allowed, filter) {
  const out = {};
  if (!filter || typeof filter !== "object") return out;
  const allowedAll = allowed.concat(["id"]);
  for (const key of allowedAll) {
    const v = filter[key];
    if (v !== null && v !== undefined && ["string", "number", "boolean"].includes(typeof v)) out[key] = v;
  }
  return out;
}

function cleanOrder(columns, order) {
  if (!order || typeof order !== "string") return "created_at.desc";
  const match = order.match(/^([a-z_]+)\.(asc|desc)$/);
  if (!match) return "created_at.desc";
  const col = match[1];
  const ok = columns.includes(col) || ["id", "created_at", "updated_at"].includes(col);
  return ok ? order : "created_at.desc";
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try { body = await req.json(); } catch (_) { body = {}; }

    const tableName = body.table;
    const op = body.op;
    if (!tableName || !TABLES[tableName]) return Response.json({ error: 'Unknown table' }, { status: 400 });
    const columns = TABLES[tableName].columns;

    const ctx = await getSupabaseContext(base44);
    const uid = user.id;

    switch (op) {
      case 'list': {
        const filters = cleanFilter(columns, body.filter);
        const rows = await sbSelect(ctx, tableName, { ...filters, user_id: uid }, {
          limit: Math.min(body.limit || 200, 500),
          order: cleanOrder(columns, body.order)
        });
        return Response.json({ data: rows });
      }
      case 'create': {
        const data = sanitize(columns, body.data);
        if (Object.keys(data).length === 0) return Response.json({ error: 'No valid fields' }, { status: 400 });
        const row = await sbInsert(ctx, tableName, { ...data, user_id: uid });
        return Response.json({ data: row });
      }
      case 'saveProfile': {
        if (tableName !== 'profiles') return Response.json({ error: 'Invalid op for table' }, { status: 400 });
        const data = sanitize(columns, body.data);
        const row = await sbUpsert(ctx, 'profiles', { ...data, user_id: uid, email: data.email || user.email }, 'user_id');
        return Response.json({ data: row });
      }
      case 'update': {
        if (!body.id) return Response.json({ error: 'id required' }, { status: 400 });
        const data = sanitize(columns, body.data);
        if (Object.keys(data).length === 0) return Response.json({ error: 'No valid fields' }, { status: 400 });
        const rows = await sbUpdate(ctx, tableName, { id: body.id, user_id: uid }, data);
        return Response.json({ data: rows[0] || null });
      }
      case 'delete': {
        if (!body.id) return Response.json({ error: 'id required' }, { status: 400 });
        await sbDelete(ctx, tableName, { id: body.id, user_id: uid });
        return Response.json({ ok: true });
      }
      case 'markAllRead': {
        if (tableName !== 'notifications') return Response.json({ error: 'Invalid op for table' }, { status: 400 });
        await sbUpdate(ctx, 'notifications', { user_id: uid, is_read: false }, { is_read: true });
        return Response.json({ ok: true });
      }
      default:
        return Response.json({ error: 'Unknown op' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}