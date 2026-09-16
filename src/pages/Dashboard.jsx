import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useTable } from "@/lib/db";
import {
  NextClassCard, TodayClassesCard, UpcomingAssignmentsCard, UpcomingExamsCard,
  AttendanceOverviewCard, PendingTasksCard, RemindersCard, NotificationsCard,
  HealthSummaryCard,
} from "@/components/dashboard/DashboardWidgets";
import { Button } from "@/components/ui/button";
import { Mic } from "lucide-react";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const { user } = useAuth();
  const { rows: profiles } = useTable("profiles");
  const { rows: timetable } = useTable("timetable");
  const { rows: assignments } = useTable("assignments");
  const { rows: exams } = useTable("exams");
  const { rows: attendance } = useTable("attendance");
  const { rows: studyTasks } = useTable("study_tasks");
  const { rows: reminders } = useTable("reminders");
  const { rows: notifications } = useTable("notifications");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 900);
    return () => clearTimeout(t);
  }, []);

  const profile = profiles[0];
  const firstName = (profile && profile.name) || (user && user.full_name) || "there";

  const openAssistant = () => window.dispatchEvent(new Event("studymate:open-assistant"));

  if (!ready) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold">
            {greeting()}, {firstName.split(" ")[0]}!
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Here's your academic life at a glance.</p>
        </div>
        <Button onClick={openAssistant} className="shrink-0">
          <Mic className="w-4 h-4 mr-2" /> Talk to StudyMate
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <NextClassCard timetable={timetable} />
        <HealthSummaryCard
          assignments={assignments}
          attendance={attendance}
          exams={exams}
          studyTasks={studyTasks}
          onAsk={openAssistant}
        />
        <TodayClassesCard timetable={timetable} />
        <UpcomingAssignmentsCard assignments={assignments} />
        <UpcomingExamsCard exams={exams} />
        <AttendanceOverviewCard attendance={attendance} />
        <PendingTasksCard studyTasks={studyTasks} />
        <RemindersCard reminders={reminders} />
        <NotificationsCard notifications={notifications} />
      </div>
    </div>
  );
}