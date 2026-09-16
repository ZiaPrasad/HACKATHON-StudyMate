import React, { useEffect } from "react";
import { NavLink, Outlet, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useTable } from "@/lib/db";
import { runAlertChecks, requestNotificationPermission, notificationPermission, notificationsSupported } from "@/lib/alertsService";
import FloatingAssistant from "@/components/FloatingAssistant";
import Logo from "@/components/Logo";
import { isLocalMode } from "@/lib/supabaseClient";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import {
  GraduationCap, Lightbulb, BookOpen, CalendarDays, ClipboardList, FileText,
  ListChecks, NotebookPen, AlarmClock, Bell, User, Settings, LogOut, BellRing,
} from "lucide-react";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: GraduationCap },
  { to: "/assistant", label: "Assistant", icon: Lightbulb },
  { to: "/subjects", label: "Subjects", icon: BookOpen },
  { to: "/timetable", label: "Timetable", icon: CalendarDays },
  { to: "/assignments", label: "Assignments", icon: ClipboardList },
  { to: "/exams", label: "Exams", icon: FileText },
  { to: "/attendance", label: "Attendance", icon: ListChecks },
  { to: "/notes", label: "Notes", icon: NotebookPen },
  { to: "/study-tasks", label: "Study Tasks", icon: ListChecks },
  { to: "/reminders", label: "Reminders", icon: AlarmClock },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { rows: profiles, loading: profilesLoading } = useTable("profiles");
  const { rows: unread } = useTable("notifications", { is_read: false });
  const unreadCount = unread.length;

  // Provision the Supabase schema once per session (admin only; silent for others)
  useEffect(() => {
    if (!isLocalMode() && !sessionStorage.getItem("studymate:db-provisioned")) {
      sessionStorage.setItem("studymate:db-provisioned", "1");
      base44.functions.invoke("supabaseSetup", {}).catch(() => {});
    }
  }, []);

  // Expose navigation for notification clicks + run proactive alert checks
  useEffect(() => {
    window.__studymateNavigate = navigate;
    runAlertChecks();
    const timer = setInterval(runAlertChecks, 60000);
    return () => {
      clearInterval(timer);
      delete window.__studymateNavigate;
    };
  }, [navigate]);

  // First visit → conversational onboarding until a profile exists
  if (!profilesLoading && profiles.length === 0 && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  const linkClass = ({ isActive }) =>
    "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors " +
    (isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent");

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar (desktop) */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-60 border-r bg-card p-4">
        <div className="px-2 py-3">
          <Logo height={34} />
        </div>
        <nav className="flex-1 overflow-y-auto mt-2 space-y-1">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass}>
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.to === "/notifications" && unreadCount > 0 && (
                <span className="text-[10px] bg-destructive text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center">{unreadCount}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <Button variant="ghost" className="justify-start text-muted-foreground" onClick={() => logout()}>
          <LogOut className="w-4 h-4 mr-2" /> Log out
        </Button>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-40 bg-card border-b px-4 py-3 flex items-center justify-between">
        <Logo height={26} />
        <Button variant="ghost" size="icon" aria-label="Logout" onClick={() => logout()}>
          <LogOut className="w-4 h-4" />
        </Button>
      </header>

      <main className="lg:pl-60 pb-24 lg:pb-8">
        <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
          {notificationsSupported() && notificationPermission() === "default" && (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border bg-card p-4">
              <div className="flex items-center gap-3">
                <BellRing className="w-5 h-5 text-primary" />
                <p className="text-sm text-muted-foreground">
                  Turn on notifications so StudyMate can alert you before classes, deadlines, and exams.
                </p>
              </div>
              <Button size="sm" onClick={requestNotificationPermission}>Enable</Button>
            </div>
          )}
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t flex overflow-x-auto">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              "flex flex-col items-center gap-1 px-3.5 py-2 text-[10px] whitespace-nowrap " +
              (isActive ? "text-primary" : "text-muted-foreground")
            }
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <FloatingAssistant />
    </div>
  );
}