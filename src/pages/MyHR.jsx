import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { User, FileText, Calendar, BookOpen, FolderOpen, CalendarDays } from "lucide-react";
import MyDetailsSection from "@/components/sw/MyDetailsSection";
import MyPayslipsSection from "@/components/sw/MyPayslipsSection";
import MyLeaveSection from "@/components/sw/MyLeaveSection";
import MyTrainingSection from "@/components/sw/MyTrainingSection";
import MyDocumentsSection from "@/components/sw/MyDocumentsSection";
import MyShiftsSection from "@/components/sw/MyShiftsSection";

const TABS = [
  { key: "details", label: "My Details", icon: User },
  { key: "payslips", label: "My Payslips", icon: FileText },
  { key: "leave", label: "My Leave", icon: Calendar },
  { key: "training", label: "My Training", icon: BookOpen },
  { key: "documents", label: "My Documents", icon: FolderOpen },
  { key: "shifts", label: "My Shifts", icon: CalendarDays },
];

export default function MyHR() {
  const { user, staffProfile: contextProfile } = useOutletContext();
  const [activeTab, setActiveTab] = useState("details");

  const { data: profileArr = [] } = useQuery({
    queryKey: ["sw-staff-profile", user?.email],
    queryFn: () => secureGateway.filter("StaffProfile", { email: user?.email }),
    enabled: !!user?.email && !contextProfile,
    staleTime: 5 * 60 * 1000,
  });
  const myProfile = contextProfile || profileArr[0] || null;

  const { data: org = null } = useQuery({
    queryKey: ["organisation"],
    queryFn: () => secureGateway.filter("Organisation"),
    select: d => d?.[0] || null,
    staleTime: 10 * 60 * 1000,
  });

  if (!myProfile) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
        Staff profile not found. Please contact your administrator.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">My HR</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your personal details, payslips, leave, training and documents.
        </p>
      </div>

      {/* Tab nav — scrollable on mobile */}
      <div className="overflow-x-auto">
        <div className="flex gap-0 border-b border-border min-w-max">
          {TABS.map(t => {
            const Icon = t.icon;
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="pb-8">
        {activeTab === "details" && (
          <MyDetailsSection myProfile={myProfile} user={user} />
        )}
        {activeTab === "payslips" && (
          <MyPayslipsSection myProfile={myProfile} org={org} />
        )}
        {activeTab === "leave" && (
          <MyLeaveSection myProfile={myProfile} org={org} />
        )}
        {activeTab === "training" && (
          <MyTrainingSection myProfile={myProfile} />
        )}
        {activeTab === "documents" && (
          <MyDocumentsSection myProfile={myProfile} />
        )}
        {activeTab === "shifts" && (
          <MyShiftsSection myProfile={myProfile} user={user} />
        )}
      </div>
    </div>
  );
}