// Proactive alerts: runs while the StudyMate app is open. Checks real
// database records and fires browser notifications + creates notification
// rows for upcoming classes, due reminders, deadlines, exams, and
// attendance risk. Deduped per browser session to avoid spam.

import { db } from "./db";

const fired = new Set();
function keyOnce(k) {
  if (fired.has(k)) return false;
  fired.add(k);
  return true;
}

export function notificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationPermission() {
  return notificationsSupported() ? Notification.permission : "unsupported";
}

export async function requestNotificationPermission() {
  if (notificationsSupported() && Notification.permission === "default") {
    try {
      await Notification.requestPermission();
    } catch (_) {}
  }
}

function fireBrowserNotification(title, body, link) {
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  try {
    const n = new Notification(title, {
      body,
      tag: title + body,
      icon: "https://media.base44.com/images/public/6aa5372e2a8ad145b4249ca0/3366af95f_image.png",
    });
    n.onclick = () => {
      window.focus();
      if (link && window.__studymateNavigate) window.__studymateNavigate(link);
      n.close();
    };
  } catch (_) {}
}

async function safeList(table) {
  try {
    return await db.list(table, {}, 200);
  } catch (_) {
    return [];
  }
}

function record(title, message, type, link) {
  db.create("notifications", { title, message, type, link }).catch(() => {});
}

export async function runAlertChecks() {
  const [timetable, assignments, exams, attendance, reminders] = await Promise.all([
    safeList("timetable"),
    safeList("assignments"),
    safeList("exams"),
    safeList("attendance"),
    safeList("reminders"),
  ]);

  const now = new Date();
  const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][now.getDay()];
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // 1. Class starting within 10 minutes
  for (const slot of timetable) {
    if (slot.day_of_week !== dayName || !slot.start_time) continue;
    const [h, m] = slot.start_time.split(":").map(Number);
    const diff = h * 60 + m - nowMinutes;
    if (diff >= 0 && diff <= 10) {
      const k = `class-${slot.id}-${now.toDateString()}`;
      if (keyOnce(k)) {
        const msg = `Your ${slot.subject_name} lecture starts ${diff === 0 ? "now" : `in ${diff} minutes`}.`;
        fireBrowserNotification(`StudyMate — ${slot.subject_name}`, msg, "/timetable");
        record(slot.subject_name + " lecture", msg, "class", "/timetable");
      }
    }
  }

  // 2. Reminders that are due
  for (const r of reminders) {
    if (r.completed || !r.reminder_time) continue;
    if (new Date(r.reminder_time) <= now) {
      const k = `reminder-${r.id}`;
      if (keyOnce(k)) {
        const msg = `Time to ${r.title.toLowerCase().startsWith("study") ? r.title.toLowerCase() : r.title}.`;
        fireBrowserNotification("StudyMate reminder", r.title, "/reminders");
        record("Reminder: " + r.title, `StudyMate reminder: ${r.title}.`, "reminder", "/reminders");
        db.update("reminders", r.id, { completed: true }).catch(() => {});
      }
    }
  }

  // 3. Assignments due within 24 hours
  for (const a of assignments) {
    if (a.completed || !a.due_date) continue;
    const due = new Date(a.due_date + "T23:59:59");
    const hours = (due - now) / 3600000;
    if (hours >= 0 && hours <= 24) {
      const k = `assignment-${a.id}-${a.due_date}`;
      if (keyOnce(k)) {
        const msg = `Your ${a.subject_name ? a.subject_name + " " : ""}assignment "${a.title}" is due ${hours < 2 ? "very soon" : "within a day"}.`;
        fireBrowserNotification("Assignment due soon", msg, "/assignments");
        record("Assignment due: " + a.title, msg, "assignment", "/assignments");
      }
    }
  }

  // 4. Exams within the next 3 days
  for (const e of exams) {
    if (!e.exam_date) continue;
    const d = new Date(e.exam_date + "T00:00:00");
    const days = Math.round((d - new Date(now.toDateString())) / 86400000);
    if (days >= 0 && days <= 3) {
      const k = `exam-${e.id}-${days}`;
      if (keyOnce(k)) {
        const msg = days === 0 ? `Your ${e.title} is today. Good luck!` : `Your ${e.title} is in ${days} ${days === 1 ? "day" : "days"}.`;
        fireBrowserNotification("Exam coming up", msg, "/exams");
        record(e.title, msg, "exam", "/exams");
      }
    }
  }

  // 5. Attendance below threshold
  for (const s of attendance) {
    const t = s.alert_threshold != null ? Number(s.alert_threshold) : 75;
    if (s.classes_held > 0 && Number(s.percentage) < t) {
      const k = `attendance-${s.id}`;
      if (keyOnce(k)) {
        const msg = `Your ${s.subject_name} attendance is ${s.percentage}%, below your ${t}% threshold.`;
        fireBrowserNotification("Attendance warning", msg, "/attendance");
        record("Attendance risk: " + s.subject_name, msg, "attendance", "/attendance");
      }
    }
  }
}