import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { ShieldCheck, BookOpen, MessageSquare, AlertTriangle, GraduationCap } from "lucide-react";
import PolicyHubMain from "@/components/staff/policy/PolicyHubMain";
import YPVoiceFeedback from "@/components/compliance-quality/yp-voice/YPVoiceFeedback";
import InternalAuditTab from "@/components/compliance-quality/internal-audit/InternalAuditTab";
import LegalRestrictionsTab from "@/components/residents/legal/LegalRestrictionsTab";
import TrainingMatrixTab from "@/components/staff/policy/TrainingMatrixTab";

export default function QualityAssurancePlaceholder({ staffProfile, user, staff = [], homes = [], residents = [] }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => searchParams.get("qaTab") || localStorage.getItem("ch-qa-tab") || "qa");

  useEffect(() => {
    const tab = searchParams.get("qaTab");
    if (tab) {
      setActiveTab(tab);
      searchParams.delete("qaTab");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    localStorage.setItem("ch-qa-tab", activeTab);
  }, [activeTab]);

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-0 border-b border-border overflow-x-auto scrollbar-none">
        {[
          { key: "qa",         label: "Internal Audit", icon: ShieldCheck },
          { key: "yp-voice",   label: "YP Voice & Feedback", icon: MessageSquare },
          { key: "policy-hub", label: "Policy Hub",        icon: BookOpen },
          { key: "training-matrix", label: "Training Matrix", icon: GraduationCap },
          { key: "warning-letters", label: "Warning Letters", icon: AlertTriangle },
        ].map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === t.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Internal Audit */}
      {activeTab === "qa" && (
        <InternalAuditTab user={user} staffProfile={staffProfile} homes={homes} />
      )}

      {/* YP Voice & Feedback */}
      {activeTab === "yp-voice" && (
        <YPVoiceFeedback staffProfile={staffProfile} user={user} staff={staff} homes={homes} />
      )}

      {/* Policy Hub */}
      {activeTab === "policy-hub" && (
        <PolicyHubMain staffProfile={staffProfile} user={user} staff={staff} homes={homes} />
      )}

      {/* Training Matrix */}
      {activeTab === "training-matrix" && (
        <TrainingMatrixTab staffProfile={staffProfile} />
      )}

      {/* Warning Letters */}
      {activeTab === "warning-letters" && (
        <LegalRestrictionsTab
          residents={residents}
          homes={homes}
          staff={staff}
          isAdminOrTL={["team_leader", "registered_manager", "admin_manager", "admin"].includes(staffProfile?.role)}
          staffProfile={staffProfile}
          user={user}
          defaultSection="warnings"
          hideTabs={true}
        />
      )}
    </div>
  );
}