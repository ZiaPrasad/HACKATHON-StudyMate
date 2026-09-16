import React from "react";
import PageShell from "@/components/PageShell";
import { EmptyState } from "@/components/EmptyState";
import RecordForm from "@/components/RecordForm";
import { useTable, db, notifyDataChanged } from "@/lib/db";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { User } from "lucide-react";

const FIELDS = [
  { name: "name", label: "Full name", placeholder: "e.g. Aarav Sharma" },
  { name: "institution", label: "Institution", placeholder: "e.g. Delhi University" },
  { name: "college", label: "College", placeholder: "e.g. GNKC" },
  { name: "course", label: "Course", placeholder: "e.g. BSc Computer Science" },
  { name: "branch", label: "Branch", placeholder: "e.g. Computer Science" },
  { name: "academic_year", label: "Year", placeholder: "e.g. Second year" },
  { name: "semester", label: "Semester", placeholder: "e.g. Semester 3" },
];

export default function Profile() {
  const { user } = useAuth();
  const { rows: profiles, loading } = useTable("profiles");
  const { toast } = useToast();
  const profile = profiles[0];

  const initials = (profile && profile.name ? profile.name : user && user.full_name ? user.full_name : "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const submit = async (payload) => {
    await db.saveProfile({ ...(profile || {}), ...payload, email: user ? user.email : undefined });
    notifyDataChanged();
    toast({ title: "Profile saved", description: "StudyMate now knows you a little better." });
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="h-64 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  if (!profile) {
    return (
      <PageShell title="Profile">
        <div className="border rounded-xl bg-card">
          <EmptyState icon={User} title="No profile yet" hint="Complete onboarding or add your details below." />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Profile" description="StudyMate uses this to personalize briefings and plans.">
      <div className="max-w-2xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-700 via-blue-600 to-sky-500 text-white flex items-center justify-center text-xl font-bold">
            {initials}
          </div>
          <div>
            <p className="font-semibold text-lg">{profile.name || user.full_name || "Student"}</p>
            <p className="text-sm text-muted-foreground">{user ? user.email : ""}</p>
          </div>
        </div>
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <RecordForm fields={FIELDS} initial={profile} onSubmit={submit} submitLabel="Save profile" />
        </div>
      </div>
    </PageShell>
  );
}