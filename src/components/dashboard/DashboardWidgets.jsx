import React from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays, CalendarClock, ClipboardList, FileText, ListChecks,
  AlarmClock, Bell, HeartPulse, ChevronRight, AlertTriangle,
} from "lucide-react";
import { daysUntil, fmtDate, fmtTime, todayName } from "@/lib/db";
import { EmptyState } from "@/components/EmptyState";

export function WidgetCard({ title, icon: Icon, link, children }) {
  return (
    <div className="bg-card border rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 font-semibold text-sm">
          {Icon && <Icon className="w-4 h-4 text-primary" />} {title}
        </div>
        {link && (
          <Link to={link} className="text-xs text-muted-foreground hover:text-primary flex items-center">
            View all <ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

export function NextClassCard({ timetable }) {
  const today = (timetable || [])
    .filter((t) => t.day_of_week === todayName() && t.start_time)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const next = today.find((t) => {
    const [h, m] = t.start_time.split(":").map(Number);
    return h * 60 + m >= nowMin;
  });
  return (
    <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-sky-500 text-white rounded-xl p-5 shadow-lg shadow-blue-500/20 sm:col-span-2">
      <p className="text-xs uppercase tracking-widest opacity-80 mb-2">Next class</p>
      {next ? (
        <>
          <p className="text-2xl font-bold">{next.subject_name}</p>
          <p className="text-sm opacity-90 mt-1">
            {fmtTime(next.start_time)}
            {next.end_time ? " – " + fmtTime(next.end_time) : ""}
            {next.room_number ? " · Room " + next.room_number : ""}
            {next.faculty_name ? " · " + next.faculty_name : ""}
          </p>
        </>
      ) : (
        <p className="text-sm opacity-90 mt-1">
          {today.length ? "No more classes today. Nice work!" : "No classes scheduled today."}
        </p>
      )}
    </div>
  );
}

export function TodayClassesCard({ timetable }) {
  const today = (timetable || [])
    .filter((t) => t.day_of_week === todayName())
    .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));
  return (
    <WidgetCard title="Today's classes" icon={CalendarDays} link="/timetable">
      {today.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No classes today" hint={'Say "add a DBMS lecture tomorrow at 10" to add one.'} />
      ) : (
        <ul className="space-y-2.5">
          {today.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="font-medium truncate">{t.subject_name}</span>
              <span className="text-xs text-muted-foreground shrink-0">
                {fmtTime(t.start_time)}{t.room_number ? ` · ${t.room_number}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}

export function UpcomingAssignmentsCard({ assignments }) {
  const pending = (assignments || [])
    .filter((a) => !a.completed)
    .sort((a, b) => (a.due_date || "9999").localeCompare(b.due_date || "9999"))
    .slice(0, 5);
  return (
    <WidgetCard title="Upcoming assignments" icon={ClipboardList} link="/assignments">
      {pending.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Nothing pending" hint="All caught up on assignments." />
      ) : (
        <ul className="space-y-2.5">
          {pending.map((a) => {
            const d = daysUntil(a.due_date);
            return (
              <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium truncate">
                  {a.title}
                  {a.subject_name && <span className="text-muted-foreground font-normal"> · {a.subject_name}</span>}
                </span>
                <span className={"text-xs shrink-0 " + (d != null && d < 0 ? "text-destructive font-medium" : "text-muted-foreground")}>
                  {d == null ? "No date" : d < 0 ? "Overdue" : d === 0 ? "Today" : d === 1 ? "Tomorrow" : fmtDate(a.due_date)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </WidgetCard>
  );
}

export function UpcomingExamsCard({ exams }) {
  const upcoming = (exams || [])
    .filter((e) => daysUntil(e.exam_date) != null && daysUntil(e.exam_date) >= 0)
    .sort((a, b) => a.exam_date.localeCompare(b.exam_date))
    .slice(0, 5);
  return (
    <WidgetCard title="Upcoming exams" icon={FileText} link="/exams">
      {upcoming.length === 0 ? (
        <EmptyState icon={FileText} title="No exams scheduled" />
      ) : (
        <ul className="space-y-2.5">
          {upcoming.map((e) => {
            const d = daysUntil(e.exam_date);
            return (
              <li key={e.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium truncate">{e.title}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {d === 0 ? "Today" : d === 1 ? "Tomorrow" : `in ${d} days`}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </WidgetCard>
  );
}

export function AttendanceOverviewCard({ attendance }) {
  return (
    <WidgetCard title="Attendance" icon={ListChecks} link="/attendance">
      {(attendance || []).length === 0 ? (
        <EmptyState icon={ListChecks} title="No attendance tracked yet" hint={'Say "I missed the DBMS class today" and it gets tracked.'} />
      ) : (
        <ul className="space-y-2.5">
          {attendance.map((s) => {
            const t = s.alert_threshold != null ? Number(s.alert_threshold) : 75;
            const p = Number(s.percentage) || 0;
            const risk = p < t;
            return (
              <li key={s.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium truncate">{s.subject_name}</span>
                <span className={"text-xs font-medium shrink-0 " + (risk ? "text-destructive" : "text-emerald-600")}>
                  {p}% {risk && <AlertTriangle className="w-3 h-3 inline ml-0.5" />}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </WidgetCard>
  );
}

export function PendingTasksCard({ studyTasks }) {
  const pending = (studyTasks || []).filter((t) => !t.completed).slice(0, 5);
  return (
    <WidgetCard title="Study tasks" icon={ListChecks} link="/study-tasks">
      {pending.length === 0 ? (
        <EmptyState icon={ListChecks} title="No pending tasks" hint={'Say "create a study plan for this week".'} />
      ) : (
        <ul className="space-y-2.5">
          {pending.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="font-medium truncate">{t.title}</span>
              <span className="text-xs text-muted-foreground shrink-0">
                {t.due_date ? fmtDate(t.due_date) : t.priority || ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}

export function RemindersCard({ reminders }) {
  const upcoming = (reminders || [])
    .filter((r) => !r.completed && r.reminder_time && new Date(r.reminder_time) > new Date())
    .sort((a, b) => new Date(a.reminder_time) - new Date(b.reminder_time))
    .slice(0, 5);
  return (
    <WidgetCard title="Reminders" icon={AlarmClock} link="/reminders">
      {upcoming.length === 0 ? (
        <EmptyState icon={AlarmClock} title="No upcoming reminders" hint={'Say "remind me to study Java at 8 PM".'} />
      ) : (
        <ul className="space-y-2.5">
          {upcoming.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="font-medium truncate">{r.title}</span>
              <span className="text-xs text-muted-foreground shrink-0">
                {new Date(r.reminder_time).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}

export function NotificationsCard({ notifications }) {
  const recent = (notifications || []).slice(0, 5);
  const unread = (notifications || []).filter((n) => !n.is_read).length;
  return (
    <WidgetCard title={unread > 0 ? `Notifications (${unread} new)` : "Notifications"} icon={Bell} link="/notifications">
      {recent.length === 0 ? (
        <EmptyState icon={Bell} title="Nothing yet" hint="StudyMate will alert you here and via browser notifications." />
      ) : (
        <ul className="space-y-2.5">
          {recent.map((n) => (
            <li key={n.id} className="flex items-start gap-2 text-sm">
              <span className={"mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 " + (n.is_read ? "bg-border" : "bg-primary")} />
              <div className="min-w-0">
                <p className="font-medium truncate">{n.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{n.message}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}

export function HealthSummaryCard({ assignments, attendance, exams, studyTasks, onAsk }) {
  const overdueAssignments = (assignments || []).filter((a) => !a.completed && daysUntil(a.due_date) != null && daysUntil(a.due_date) < 0).length;
  const examsThisWeek = (exams || []).filter((e) => { const d = daysUntil(e.exam_date); return d != null && d >= 0 && d <= 7; }).length;
  const lowAttendance = (attendance || []).filter((s) => {
    const t = s.alert_threshold != null ? Number(s.alert_threshold) : 75;
    return s.classes_held > 0 && Number(s.percentage) < t;
  }).length;
  const overdueTasks = (studyTasks || []).filter((t) => !t.completed && t.due_date && daysUntil(t.due_date) < 0).length;

  const stats = [
    { label: "Overdue assignments", value: overdueAssignments, bad: overdueAssignments > 0 },
    { label: "Exams this week", value: examsThisWeek, warn: examsThisWeek > 0 },
    { label: "Attendance risks", value: lowAttendance, bad: lowAttendance > 0 },
    { label: "Overdue tasks", value: overdueTasks, bad: overdueTasks > 0 },
  ];

  return (
    <div className="bg-card border rounded-xl p-5 shadow-sm sm:col-span-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 font-semibold text-sm">
          <HeartPulse className="w-4 h-4 text-primary" /> Academic health
        </div>
        <button onClick={onAsk} className="text-xs font-medium text-primary hover:underline">
          Ask StudyMate what to do next
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg bg-muted/50 p-3 text-center">
            <p className={"text-2xl font-bold " + (s.bad ? "text-destructive" : s.warn ? "text-amber-500" : "text-foreground")}>
              {s.value}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1.5">
        <CalendarClock className="w-3.5 h-3.5" />
        {overdueAssignments + overdueTasks + lowAttendance === 0
          ? "Looking healthy. Keep it up!"
          : "Ask StudyMate for a prioritized plan to get back on track."}
      </p>
    </div>
  );
}