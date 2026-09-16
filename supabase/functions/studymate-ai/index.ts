// StudyMate AI — Supabase Edge Function (Groq)
// Direct port of the Base44 `studyMateAI` backend function. Loads the
// student's real academic records from Supabase, reasons over them with the
// Groq LLM, parses structured actions, executes them against Supabase, and
// returns a conversational response. The Groq key never reaches the browser.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") ?? "";
const GROQ_MODEL = Deno.env.get("GROQ_MODEL") || "llama-3.3-70b-versatile";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_ALIASES = { sun: "Sunday", mon: "Monday", tue: "Tuesday", tues: "Tuesday", wed: "Wednesday", thu: "Thursday", thur: "Thursday", thurs: "Thursday", fri: "Friday", sat: "Saturday" };

function pct(attended, held) {
  if (!held || held <= 0) return 0;
  return Math.round((attended / held) * 1000) / 10;
}

function nowISO() {
  return new Date().toISOString();
}

function pickField(data, keys) {
  for (const k of keys) {
    if (data[k] != null && data[k] !== "") return data[k];
  }
  return null;
}

function normalizeTime(t) {
  if (t == null || t === "") return null;
  const s = String(t).trim().toLowerCase();
  let m = s.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/);
  if (m) {
    let h = parseInt(m[1], 10);
    if (m[3] === "pm" && h < 12) h += 12;
    if (m[3] === "am" && h === 12) h = 0;
    return String(h).padStart(2, "0") + ":" + m[2];
  }
  m = s.match(/^(\d{1,2})\s*(am|pm)?$/);
  if (m) {
    let h = parseInt(m[1], 10);
    if (m[2] === "pm" && h < 12) h += 12;
    if (m[2] === "am" && h === 12) h = 0;
    return String(h).padStart(2, "0") + ":00";
  }
  return null;
}

function normalizeDate(d) {
  if (d == null || d === "") return null;
  const s = String(d).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[0];
  const dt = new Date(s);
  if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
  return null;
}

function normalizeDateTime(v) {
  if (v == null || v === "") return null;
  const dt = new Date(String(v).trim());
  if (!isNaN(dt.getTime())) return dt.toISOString();
  return null;
}

function normalizeDay(v) {
  if (v == null || v === "") return null;
  const s = String(v).trim().toLowerCase();
  for (const alias of Object.keys(DAY_ALIASES)) {
    if (s === alias || s.startsWith(alias)) return DAY_ALIASES[alias];
  }
  for (const day of DAY_NAMES) {
    if (s === day.toLowerCase() || day.toLowerCase().startsWith(s)) return day;
  }
  const d = normalizeDate(v);
  if (d) return DAY_NAMES[new Date(d + "T00:00:00").getDay()];
  return null;
}

Deno.serve(async (req) => {
  try {
    if (!GROQ_API_KEY) {
      return new Response(JSON.stringify({ error: "GROQ_API_KEY secret is not set. Run: supabase secrets set GROQ_API_KEY=..." }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    // Verify the caller via their Supabase Auth JWT
    const authHeader = req.headers.get("Authorization") ?? "";
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }
    const uid = user.id;
    const email = user.email ?? null;

    let body: { message?: string; confirmed?: boolean } = {};
    try { body = await req.json(); } catch (_) { body = {}; }
    const message = (body.message || "").trim();
    const confirmed = !!body.confirmed;
    if (!message) {
      return new Response(JSON.stringify({ error: "Message is required" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // Service-role client for data access (bypasses RLS; every call filters by uid)
    const svc = createClient(SUPABASE_URL, SERVICE_KEY);

    const sel = async (table: string, limit: number, descCol = "created_at") => {
      const { data, error } = await svc.from(table).select("*").eq("user_id", uid).order(descCol, { ascending: false }).limit(limit);
      if (error) throw new Error(`Supabase read failed on ${table}: ${error.message}`);
      return data ?? [];
    };
    const ins = async (table: string, row: Record<string, unknown>) => {
      const { data, error } = await svc.from(table).insert({ ...row, user_id: uid }).select().single();
      if (error) throw new Error(`Supabase insert failed on ${table}: ${error.message}`);
      return data;
    };
    const upd = async (table: string, id: string, patch: Record<string, unknown>) => {
      const { error } = await svc.from(table).update(patch).eq("id", id).eq("user_id", uid);
      if (error) throw new Error(`Supabase update failed on ${table}: ${error.message}`);
    };
    const del = async (table: string, id: string) => {
      const { error } = await svc.from(table).delete().eq("id", id).eq("user_id", uid);
      if (error) throw new Error(`Supabase delete failed on ${table}: ${error.message}`);
    };

    // ---- Load the student's real academic data ----
    const [profileRows, subjects, timetable, assignments, exams, attendance, notes, studyTasks, reminders, chatRows] = await Promise.all([
      sel("profiles", 1),
      sel("subjects", 500),
      sel("timetable", 500),
      sel("assignments", 500),
      sel("exams", 500),
      sel("attendance", 500),
      sel("notes", 500),
      sel("study_tasks", 500),
      sel("reminders", 500),
      sel("chat_history", 10),
    ]);
    const profile = profileRows[0] || {};
    const recentHistory = chatRows.slice().reverse().map((r) => ({ role: r.role, content: r.content }));

    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const dayOfWeek = DAY_NAMES[now.getDay()];
    const currentTime = now.toTimeString().slice(0, 5);
    const threshold = profile.attendance_threshold != null ? Number(profile.attendance_threshold) : 75;

    const llmCtx = {
      now: { date: today, dayOfWeek, time: currentTime, iso: now.toISOString() },
      attendanceThreshold: threshold,
      profile: {
        name: profile.name || null,
        email,
        course: profile.course || null,
        college: profile.college || null,
        semester: profile.semester || null,
      },
      subjects: subjects.map((s) => ({ id: s.id, name: s.name, code: s.code, faculty_name: s.faculty_name, credits: s.credits })),
      timetable: timetable.map((t) => ({ id: t.id, subject_name: t.subject_name, day_of_week: t.day_of_week, start_time: t.start_time, end_time: t.end_time, room_number: t.room_number, faculty_name: t.faculty_name })),
      assignments: assignments.map((a) => ({ id: a.id, subject_name: a.subject_name, title: a.title, due_date: a.due_date, priority: a.priority, completed: a.completed, status: a.status })),
      exams: exams.map((e) => ({ id: e.id, subject_name: e.subject_name, title: e.title, exam_date: e.exam_date, start_time: e.start_time, location: e.location })),
      attendance: attendance.map((a) => ({ id: a.id, subject_name: a.subject_name, classes_held: a.classes_held, classes_attended: a.classes_attended, percentage: a.percentage, alert_threshold: a.alert_threshold })),
      notes: notes.map((n) => ({ id: n.id, subject_name: n.subject_name, title: n.title, content: (n.content || "").slice(0, 300) })),
      studyTasks: studyTasks.map((t) => ({ id: t.id, subject_name: t.subject_name, title: t.title, due_date: t.due_date, priority: t.priority, completed: t.completed })),
      reminders: reminders.map((r) => ({ id: r.id, title: r.title, reminder_time: r.reminder_time, completed: r.completed })),
      recentHistory,
    };

    const systemPrompt = `You are StudyMate, an AI academic agent for a student. You understand natural language, reason over the student's REAL academic records, and take actions on their behalf.

CORE PRINCIPLE: The student should not have to manually maintain their academic life. They speak or type, you understand, you ACT on the real database, and you confirm conversationally.

CURRENT CONTEXT (real data, do not invent):
${JSON.stringify(llmCtx)}

RULES:
1. Use ONLY the real records above. If information does not exist, say it is not available. Never invent subjects, classes, assignments, or grades.
2. Resolve relative dates from now.date: "today"=now.date, "tomorrow"=now.date+1, "tonight"=same day evening, "this week"/"next week"/"Monday"/"Friday" etc. into concrete YYYY-MM-DD dates. Output ISO dates in actions.
3. Resolve subject names loosely (case-insensitive, partial match, or by code). Use the closest matching subject id when an action references a subject.
4. For LOW-RISK actions (add, update, complete, mark present/absent, create reminder/task/note, study plans): execute immediately WITHOUT asking confirmation. Just do it and confirm in your response.
5. For DESTRUCTIVE actions (DELETE_*): set "confirm": true on the action and ask a short confirmation question in your response. Do NOT claim it is done. The user will confirm separately.
6. DUPLICATE PREVENTION: before creating a record, check the real data for an obvious match (same subject + same day/time for timetable, same subject + same title for assignment, same subject + same date for exam). If a likely duplicate exists, do not create it; mention the existing record instead.
7. ACADEMIC INTELLIGENCE: for questions like "can I skip X tomorrow?", compute projected attendance from the real attendance numbers and the threshold, and answer with the projected percentage. For "what should I do next?" / "daily briefing" / "how am I doing?", reason across exams, assignments, attendance, overdue tasks and give a concise prioritized answer.
8. MISSED CLASS: if the student says they missed a class, mark absent, then check that subject's notes and pending tasks and suggest a short recovery action (offer to create a study task).
9. RESPONSE STYLE: short, conversational, clear, action-oriented. Never write long paragraphs for simple commands. e.g. "Got it. DBMS lecture added tomorrow at 10 AM." Do not say "I have successfully processed...".
10. You may detect and return MULTIPLE actions from one message (e.g. "I missed DBMS and finished my Java assignment" -> MARK_ABSENT + COMPLETE_ASSIGNMENT).
11. If the message is just a question/search, return actions: [] and answer from the real data.
12. For reminders, "remind me to study DBMS at 8 PM tonight" -> reminder_time as full ISO datetime (combine the resolved date with the time). Title = "Study DBMS".
13. For study plans, return a CREATE_STUDY_PLAN action with data.tasks = [{subject_name, title, due_date, priority}] for each task to create.
14. If the user is confirming a previous destructive question ("yes delete it"), return the DELETE action without confirm:true.
15. FORMATS: use the exact field names from ACTION DATA FIELDS. start_time/end_time as 24h "HH:MM" (e.g. "10:00"). due_date/exam_date as "YYYY-MM-DD". day_of_week as the full English day name (e.g. "Monday"). reminder_time as a full ISO datetime.
16. When an action targets an existing record shown in the context, include its "id" and "entity" in the action data alongside the identifying fields.

ACTION TYPES (use exactly these strings in "type"):
ADD_SUBJECT, UPDATE_SUBJECT, DELETE_SUBJECT,
ADD_TIMETABLE, UPDATE_TIMETABLE, DELETE_TIMETABLE,
ADD_ASSIGNMENT, UPDATE_ASSIGNMENT, COMPLETE_ASSIGNMENT, DELETE_ASSIGNMENT,
ADD_EXAM, UPDATE_EXAM, DELETE_EXAM,
ADD_ATTENDANCE, UPDATE_ATTENDANCE, MARK_PRESENT, MARK_ABSENT,
ADD_NOTE, UPDATE_NOTE, DELETE_NOTE,
ADD_STUDY_TASK, UPDATE_STUDY_TASK, COMPLETE_STUDY_TASK, DELETE_STUDY_TASK,
ADD_REMINDER, UPDATE_REMINDER, DELETE_REMINDER,
CREATE_STUDY_PLAN, PRIORITIZE_TASKS, NO_ACTION

ACTION DATA FIELDS (only include known fields; the executor fills subject_id from subject_name):
- ADD_SUBJECT: {name, code?, faculty_name?, credits?, color?}
- ADD_TIMETABLE: {subject_name, day_of_week, start_time, end_time?, room_number?, faculty_name?, notes?}
- ADD_ASSIGNMENT: {subject_name, title, due_date?, priority?, description?}
- ADD_EXAM: {subject_name, title, exam_date, start_time?, end_time?, location?, notes?}
- ADD_ATTENDANCE: {subject_name, classes_held?, classes_attended?, alert_threshold?}
- UPDATE_ATTENDANCE: {subject_name, classes_held, classes_attended}
- MARK_PRESENT / MARK_ABSENT: {subject_name, date?}
- ADD_NOTE: {subject_name, title, content?}
- ADD_STUDY_TASK: {subject_name, title, due_date?, priority?, description?}
- ADD_REMINDER: {title, reminder_time (ISO datetime), description?}
- COMPLETE_ASSIGNMENT / COMPLETE_STUDY_TASK: {subject_name?, title?}
- CREATE_STUDY_PLAN: {tasks: [{subject_name, title, due_date?, priority?}]}
- DELETE_*: {subject_name?, title?, day_of_week?, exam_date?} (enough to identify the record)

Respond with ONLY a single JSON object, no markdown fences, in the shape: {"response": string, "actions": [{"type": string, "data": object, "confirm"?: boolean}]}. The "response" is what you say to the student. For destructive actions you are NOT yet confirming, make the response a short confirmation question and set confirm:true on those actions.`;

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
      }),
    });
    if (!groqRes.ok) {
      const detail = await groqRes.text();
      return new Response(JSON.stringify({ error: `Groq API error (${groqRes.status}): ${detail.slice(0, 300)}` }), { status: 502, headers: { "Content-Type": "application/json" } });
    }
    const groqJson = await groqRes.json();
    let parsed: { response?: string; actions?: unknown[] };
    try {
      parsed = JSON.parse(groqJson.choices?.[0]?.message?.content || "{}");
    } catch (_) {
      parsed = { response: "Sorry, I had trouble processing that. Could you rephrase?", actions: [] };
    }
    const responseText = parsed.response || "I'm not sure how to help with that.";
    const actions = Array.isArray(parsed.actions) ? parsed.actions : [];

    // ---- Execute actions ----
    const results: Array<{ type: string; ok: boolean; skipped?: boolean; detail: string }> = [];
    const pendingDestructive: Array<{ type: string; data: Record<string, unknown> }> = [];
    let finalResponse = responseText;

    const findSubject = (name: string) => {
      if (!name) return null;
      const n = name.toLowerCase().trim();
      return subjects.find((s) => (s.name || "").toLowerCase() === n || (s.code || "").toLowerCase() === n)
        || subjects.find((s) => (s.name || "").toLowerCase().includes(n) || n.includes((s.name || "").toLowerCase()));
    };

    const resolveSubjectId = async (name: string, createIfMissing = false, color?: string) => {
      const subj = findSubject(name);
      if (subj) return subj;
      if (createIfMissing && name) {
        const created = await ins("subjects", { name, color: color || "#2575FC" });
        subjects.push(created);
        return created;
      }
      return null;
    };

    for (const action of actions as Array<Record<string, unknown>>) {
      const type = String(action.type || "");
      const data: Record<string, unknown> = { ...((action.data as Record<string, unknown>) || {}) };
      for (const k of Object.keys(action)) {
        if (k !== "type" && k !== "data" && k !== "confirm" && data[k] == null) data[k] = action[k];
      }
      try {
        // Hard safety: any DELETE requires explicit confirmation
        if (type && type.indexOf("DELETE") === 0 && !confirmed) {
          pendingDestructive.push({ type, data });
          results.push({ type, ok: false, skipped: true, detail: "Awaiting confirmation" });
          continue;
        }

        switch (type) {
          case "ADD_SUBJECT": {
            const dup = findSubject(String(data.name || ""));
            if (dup) { results.push({ type, ok: false, skipped: true, detail: "Subject already exists" }); break; }
            await ins("subjects", { name: data.name, code: data.code, faculty_name: data.faculty_name, credits: data.credits, color: data.color || "#2575FC" });
            results.push({ type, ok: true, detail: "Subject added" });
            break;
          }
          case "UPDATE_SUBJECT": {
            const subj = findSubject(String(data.subject_name || data.name || ""));
            if (!subj) { results.push({ type, ok: false, detail: "Subject not found" }); break; }
            const patch: Record<string, unknown> = {};
            for (const k of ["name", "code", "faculty_name", "credits", "color"]) if (data[k] != null) patch[k] = data[k];
            if (Object.keys(patch).length > 0) await upd("subjects", subj.id, patch);
            results.push({ type, ok: true, detail: "Subject updated" });
            break;
          }
          case "DELETE_SUBJECT": {
            const subj = findSubject(String(data.subject_name || data.name || ""));
            if (!subj) { results.push({ type, ok: false, detail: "Subject not found" }); break; }
            await del("subjects", subj.id);
            results.push({ type, ok: true, detail: "Subject deleted" });
            break;
          }
          case "ADD_TIMETABLE": {
            const subjectName = pickField(data, ["subject_name", "subject", "name"]) as string;
            const dayOfWeek = normalizeDay(pickField(data, ["day_of_week", "day", "date"]) as string);
            const startTime = normalizeTime(pickField(data, ["start_time", "time", "start", "at"]) as string);
            const endTime = normalizeTime(pickField(data, ["end_time", "end"]) as string);
            if (!subjectName || !dayOfWeek || !startTime) { results.push({ type, ok: false, detail: "Missing fields" }); break; }
            const subj = await resolveSubjectId(subjectName, true, data.color as string);
            const dup = timetable.find((t) => (t.subject_name || "").toLowerCase() === subjectName.toLowerCase() && t.day_of_week === dayOfWeek && t.start_time === startTime);
            if (dup) { results.push({ type, ok: false, skipped: true, detail: "Already in timetable" }); break; }
            const rec = await ins("timetable", {
              subject_id: subj ? subj.id : null,
              subject_name: subjectName,
              day_of_week: dayOfWeek,
              start_time: startTime,
              end_time: endTime,
              room_number: pickField(data, ["room_number", "room"]),
              faculty_name: pickField(data, ["faculty_name", "faculty"]) || (subj && subj.faculty_name),
              notes: data.notes,
            });
            timetable.push(rec);
            results.push({ type, ok: true, detail: "Timetable entry added" });
            break;
          }
          case "UPDATE_TIMETABLE": {
            const match = timetable.find((t) => (t.subject_name || "").toLowerCase() === String(data.subject_name || "").toLowerCase() && (!data.day_of_week || t.day_of_week === data.day_of_week));
            if (!match) { results.push({ type, ok: false, detail: "Timetable entry not found" }); break; }
            const patch: Record<string, unknown> = {};
            for (const k of ["day_of_week", "start_time", "end_time", "room_number", "faculty_name", "notes"]) if (data[k] != null) patch[k] = data[k];
            if (Object.keys(patch).length > 0) await upd("timetable", match.id, patch);
            results.push({ type, ok: true, detail: "Timetable updated" });
            break;
          }
          case "DELETE_TIMETABLE": {
            const match = timetable.find((t) => (t.subject_name || "").toLowerCase() === String(data.subject_name || "").toLowerCase() && (!data.day_of_week || t.day_of_week === data.day_of_week));
            if (!match) { results.push({ type, ok: false, detail: "Timetable entry not found" }); break; }
            await del("timetable", match.id);
            results.push({ type, ok: true, detail: "Timetable entry deleted" });
            break;
          }
          case "ADD_ASSIGNMENT": {
            const title = pickField(data, ["title", "name"]) as string;
            if (!title) { results.push({ type, ok: false, detail: "Missing title" }); break; }
            const subjectName = pickField(data, ["subject_name", "subject"]) as string;
            const dueDate = normalizeDate(pickField(data, ["due_date", "due", "date", "deadline"]) as string);
            const subj = await resolveSubjectId(subjectName, true);
            const dup = assignments.find((a) => (a.subject_name || "").toLowerCase() === (subjectName || "").toLowerCase() && (a.title || "").toLowerCase() === title.toLowerCase());
            if (dup) { results.push({ type, ok: false, skipped: true, detail: "Assignment already exists" }); break; }
            const rec = await ins("assignments", {
              subject_id: subj ? subj.id : null,
              subject_name: subjectName,
              title,
              description: data.description,
              due_date: dueDate,
              priority: data.priority || "medium",
              status: "pending",
              completed: false,
            });
            assignments.push(rec);
            results.push({ type, ok: true, detail: "Assignment added" });
            break;
          }
          case "UPDATE_ASSIGNMENT": {
            const match = assignments.find((a) => (data.title && (a.title || "").toLowerCase() === String(data.title).toLowerCase()) || (data.subject_name && (a.subject_name || "").toLowerCase() === String(data.subject_name).toLowerCase()));
            if (!match) { results.push({ type, ok: false, detail: "Assignment not found" }); break; }
            const patch: Record<string, unknown> = {};
            for (const k of ["title", "description", "due_date", "priority"]) if (data[k] != null) patch[k] = data[k];
            if (Object.keys(patch).length > 0) await upd("assignments", match.id, patch);
            results.push({ type, ok: true, detail: "Assignment updated" });
            break;
          }
          case "COMPLETE_ASSIGNMENT": {
            const match = assignments.find((a) => !a.completed && ((data.title && (a.title || "").toLowerCase().includes(String(data.title).toLowerCase())) || (data.subject_name && (a.subject_name || "").toLowerCase() === String(data.subject_name).toLowerCase())));
            if (!match) { results.push({ type, ok: false, detail: "No matching pending assignment" }); break; }
            await upd("assignments", match.id, { completed: true, status: "completed", completed_at: nowISO() });
            match.completed = true;
            results.push({ type, ok: true, detail: "Assignment completed" });
            break;
          }
          case "DELETE_ASSIGNMENT": {
            const match = assignments.find((a) => (data.title && (a.title || "").toLowerCase().includes(String(data.title).toLowerCase())) || (data.subject_name && (a.subject_name || "").toLowerCase() === String(data.subject_name).toLowerCase()));
            if (!match) { results.push({ type, ok: false, detail: "Assignment not found" }); break; }
            await del("assignments", match.id);
            results.push({ type, ok: true, detail: "Assignment deleted" });
            break;
          }
          case "ADD_EXAM": {
            const examDate = normalizeDate(pickField(data, ["exam_date", "date", "on"]) as string);
            if (!examDate) { results.push({ type, ok: false, detail: "Missing exam date" }); break; }
            const subjectName = pickField(data, ["subject_name", "subject"]) as string;
            const subj = await resolveSubjectId(subjectName, true);
            const dup = exams.find((e) => (e.subject_name || "").toLowerCase() === (subjectName || "").toLowerCase() && e.exam_date === examDate);
            if (dup) { results.push({ type, ok: false, skipped: true, detail: "Exam already exists on that date" }); break; }
            const rec = await ins("exams", {
              subject_id: subj ? subj.id : null,
              subject_name: subjectName,
              title: pickField(data, ["title", "name"]) || (subjectName ? subjectName + " Exam" : "Exam"),
              exam_date: examDate,
              start_time: normalizeTime(pickField(data, ["start_time", "time", "start"]) as string),
              end_time: normalizeTime(pickField(data, ["end_time", "end"]) as string),
              location: pickField(data, ["location", "room", "venue"]),
              notes: data.notes,
            });
            exams.push(rec);
            results.push({ type, ok: true, detail: "Exam added" });
            break;
          }
          case "UPDATE_EXAM": {
            const match = exams.find((e) => (e.subject_name || "").toLowerCase() === String(data.subject_name || "").toLowerCase() && (!data.exam_date || e.exam_date === data.exam_date));
            if (!match) { results.push({ type, ok: false, detail: "Exam not found" }); break; }
            const patch: Record<string, unknown> = {};
            for (const k of ["title", "exam_date", "start_time", "end_time", "location", "notes"]) if (data[k] != null) patch[k] = data[k];
            if (Object.keys(patch).length > 0) await upd("exams", match.id, patch);
            results.push({ type, ok: true, detail: "Exam updated" });
            break;
          }
          case "DELETE_EXAM": {
            const match = exams.find((e) => (e.subject_name || "").toLowerCase() === String(data.subject_name || "").toLowerCase() && (!data.exam_date || e.exam_date === data.exam_date));
            if (!match) { results.push({ type, ok: false, detail: "Exam not found" }); break; }
            await del("exams", match.id);
            results.push({ type, ok: true, detail: "Exam deleted" });
            break;
          }
          case "ADD_ATTENDANCE": {
            const subjectName = String(data.subject_name || "");
            const subj = await resolveSubjectId(subjectName, true);
            const held = Number(data.classes_held) || 0;
            const attended = Number(data.classes_attended) || 0;
            const existing = attendance.find((a) => (a.subject_name || "").toLowerCase() === subjectName.toLowerCase());
            if (existing) {
              await upd("attendance", existing.id, { classes_held: held, classes_attended: attended, percentage: pct(attended, held), alert_threshold: data.alert_threshold ?? existing.alert_threshold });
            } else {
              const rec = await ins("attendance", { subject_id: subj ? subj.id : null, subject_name: subjectName, classes_held: held, classes_attended: attended, percentage: pct(attended, held), alert_threshold: data.alert_threshold ?? threshold });
              attendance.push(rec);
            }
            results.push({ type, ok: true, detail: "Attendance set" });
            break;
          }
          case "UPDATE_ATTENDANCE": {
            const match = attendance.find((a) => (a.subject_name || "").toLowerCase() === String(data.subject_name || "").toLowerCase());
            if (!match) { results.push({ type, ok: false, detail: "Attendance record not found" }); break; }
            const held = data.classes_held != null ? Number(data.classes_held) : match.classes_held;
            const attended = data.classes_attended != null ? Number(data.classes_attended) : match.classes_attended;
            await upd("attendance", match.id, { classes_held: held, classes_attended: attended, percentage: pct(attended, held) });
            results.push({ type, ok: true, detail: "Attendance updated" });
            break;
          }
          case "MARK_PRESENT":
          case "MARK_ABSENT": {
            const subjName = pickField(data, ["subject_name", "subject"]) as string;
            if (!subjName) { results.push({ type, ok: false, detail: "Missing subject" }); break; }
            const subj = findSubject(subjName);
            const status = type === "MARK_PRESENT" ? "present" : "absent";
            const date = normalizeDate(data.date as string) || today;
            const subjId = subj ? subj.id : null;
            let rec = attendance.find((a) => (a.subject_name || "").toLowerCase() === subjName.toLowerCase());
            if (!rec) {
              rec = await ins("attendance", { subject_id: subjId, subject_name: subjName, classes_held: 0, classes_attended: 0, percentage: 0, alert_threshold: threshold });
              attendance.push(rec);
            }
            const newHeld = (rec.classes_held || 0) + 1;
            const newAttended = (rec.classes_attended || 0) + (status === "present" ? 1 : 0);
            await upd("attendance", rec.id, { classes_held: newHeld, classes_attended: newAttended, percentage: pct(newAttended, newHeld) });
            rec.classes_held = newHeld; rec.classes_attended = newAttended; rec.percentage = pct(newAttended, newHeld);
            await ins("attendance_checkins", { subject_id: subjId, subject_name: subjName, date, status });
            results.push({ type, ok: true, detail: "Marked " + status });
            break;
          }
          case "ADD_NOTE": {
            if (!data.title) { results.push({ type, ok: false, detail: "Missing title" }); break; }
            const subj = await resolveSubjectId(String(data.subject_name || ""), true);
            const rec = await ins("notes", { subject_id: subj ? subj.id : null, subject_name: data.subject_name, title: data.title, content: data.content || "" });
            notes.push(rec);
            results.push({ type, ok: true, detail: "Note added" });
            break;
          }
          case "UPDATE_NOTE": {
            const match = notes.find((n) => (data.title && (n.title || "").toLowerCase() === String(data.title).toLowerCase()) || (data.subject_name && (n.subject_name || "").toLowerCase() === String(data.subject_name).toLowerCase()));
            if (!match) { results.push({ type, ok: false, detail: "Note not found" }); break; }
            const patch: Record<string, unknown> = {};
            for (const k of ["title", "content", "file_url"]) if (data[k] != null) patch[k] = data[k];
            if (Object.keys(patch).length > 0) await upd("notes", match.id, patch);
            results.push({ type, ok: true, detail: "Note updated" });
            break;
          }
          case "DELETE_NOTE": {
            const match = notes.find((n) => (n.title || "").toLowerCase() === String(data.title || "").toLowerCase());
            if (!match) { results.push({ type, ok: false, detail: "Note not found" }); break; }
            await del("notes", match.id);
            results.push({ type, ok: true, detail: "Note deleted" });
            break;
          }
          case "ADD_STUDY_TASK": {
            const title = pickField(data, ["title", "task", "name"]) as string;
            if (!title) { results.push({ type, ok: false, detail: "Missing title" }); break; }
            const subjectName = pickField(data, ["subject_name", "subject"]) as string;
            const dueDate = normalizeDate(pickField(data, ["due_date", "due", "date"]) as string);
            const subj = await resolveSubjectId(subjectName, true);
            const dup = studyTasks.find((t) => (t.subject_name || "").toLowerCase() === (subjectName || "").toLowerCase() && (t.title || "").toLowerCase() === title.toLowerCase() && !t.completed);
            if (dup) { results.push({ type, ok: false, skipped: true, detail: "Task already exists" }); break; }
            const rec = await ins("study_tasks", { subject_id: subj ? subj.id : null, subject_name: subjectName, title, description: data.description, priority: data.priority || "medium", due_date: dueDate, completed: false });
            studyTasks.push(rec);
            results.push({ type, ok: true, detail: "Study task added" });
            break;
          }
          case "UPDATE_STUDY_TASK": {
            const match = studyTasks.find((t) => (t.title || "").toLowerCase() === String(data.title || "").toLowerCase());
            if (!match) { results.push({ type, ok: false, detail: "Task not found" }); break; }
            const patch: Record<string, unknown> = {};
            for (const k of ["title", "description", "priority", "due_date"]) if (data[k] != null) patch[k] = data[k];
            if (Object.keys(patch).length > 0) await upd("study_tasks", match.id, patch);
            results.push({ type, ok: true, detail: "Task updated" });
            break;
          }
          case "COMPLETE_STUDY_TASK": {
            const match = studyTasks.find((t) => !t.completed && ((data.title && (t.title || "").toLowerCase().includes(String(data.title).toLowerCase())) || (data.subject_name && (t.subject_name || "").toLowerCase() === String(data.subject_name).toLowerCase())));
            if (!match) { results.push({ type, ok: false, detail: "No matching pending task" }); break; }
            await upd("study_tasks", match.id, { completed: true, completed_at: nowISO() });
            match.completed = true;
            results.push({ type, ok: true, detail: "Task completed" });
            break;
          }
          case "DELETE_STUDY_TASK": {
            const match = studyTasks.find((t) => (data.title && (t.title || "").toLowerCase().includes(String(data.title).toLowerCase())) || (data.subject_name && (t.subject_name || "").toLowerCase() === String(data.subject_name).toLowerCase()));
            if (!match) { results.push({ type, ok: false, detail: "Task not found" }); break; }
            await del("study_tasks", match.id);
            results.push({ type, ok: true, detail: "Task deleted" });
            break;
          }
          case "ADD_REMINDER": {
            let reminderTime = normalizeDateTime(pickField(data, ["reminder_time", "time", "when", "datetime"]) as string);
            if (!reminderTime) {
              const d = normalizeDate(pickField(data, ["date", "day"]) as string) || today;
              const t = normalizeTime(pickField(data, ["time", "at", "start_time"]) as string) || "09:00";
              reminderTime = new Date(d + "T" + t + ":00").toISOString();
            }
            const rec = await ins("reminders", { title: pickField(data, ["title", "name"]) || "Reminder", description: data.description, reminder_time: reminderTime, completed: false });
            reminders.push(rec);
            results.push({ type, ok: true, detail: "Reminder added" });
            break;
          }
          case "UPDATE_REMINDER": {
            const match = reminders.find((r) => (r.title || "").toLowerCase() === String(data.title || "").toLowerCase());
            if (!match) { results.push({ type, ok: false, detail: "Reminder not found" }); break; }
            const patch: Record<string, unknown> = {};
            for (const k of ["title", "description", "reminder_time", "completed"]) if (data[k] != null) patch[k] = data[k];
            if (Object.keys(patch).length > 0) await upd("reminders", match.id, patch);
            results.push({ type, ok: true, detail: "Reminder updated" });
            break;
          }
          case "DELETE_REMINDER": {
            const match = reminders.find((r) => (r.title || "").toLowerCase() === String(data.title || "").toLowerCase());
            if (!match) { results.push({ type, ok: false, detail: "Reminder not found" }); break; }
            await del("reminders", match.id);
            results.push({ type, ok: true, detail: "Reminder deleted" });
            break;
          }
          case "CREATE_STUDY_PLAN": {
            const tasks = Array.isArray(data.tasks) ? data.tasks : [];
            let created = 0;
            for (const t of tasks as Array<Record<string, unknown>>) {
              if (!t.title) continue;
              const subj = await resolveSubjectId(String(t.subject_name || ""), true);
              await ins("study_tasks", { subject_id: subj ? subj.id : null, subject_name: t.subject_name, title: t.title, priority: t.priority || "medium", due_date: t.due_date, completed: false });
              created++;
            }
            results.push({ type, ok: true, detail: created + " study tasks created" });
            break;
          }
          case "PRIORITIZE_TASKS":
          case "NO_ACTION":
            results.push({ type, ok: true, detail: "No database change" });
            break;
          default:
            results.push({ type, ok: false, detail: "Unknown action" });
        }
      } catch (e) {
        results.push({ type, ok: false, detail: (e && e.message) || "Action failed" });
      }
    }

    const failures = results.filter((r) => r.ok === false && !r.skipped);
    if (failures.length > 0) {
      const notes = failures.map((f) => f.type + ": " + f.detail).join("; ");
      finalResponse = responseText + " However, I couldn't complete everything: " + notes + ".";
    }

    // ---- Persist chat history ----
    try {
      await ins("chat_history", { role: "user", content: message });
      await ins("chat_history", { role: "assistant", content: finalResponse });
    } catch (_) { /* non-fatal */ }

    return new Response(JSON.stringify({
      response: finalResponse,
      actions: results,
      pendingDestructive,
      needsConfirmation: pendingDestructive.length > 0,
    }), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});