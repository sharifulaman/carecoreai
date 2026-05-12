import { useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import AvailabilityProfileTab from "./AvailabilityProfileTab";
import WeeklyPatternTab from "./WeeklyPatternTab";
import OverridesTab from "./OverridesTab";
import QualificationsTab from "./QualificationsTab";

export default function AvailabilityPanel({ staffMember, user, onClose, defaultTab = "profile" }) {
  const panelRef = useRef(null);

  const { data: myStaffProfiles = [] } = useQuery({
    queryKey: ["my-staff-profile-avail", user?.email],
    queryFn: () => base44.entities.StaffProfile.filter({ org_id: ORG_ID, email: user?.email }),
    enabled: !!user?.email,
  });
  const myStaffProfile = myStaffProfiles[0] || null;

  useEffect(() => {
    const handler = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div ref={panelRef} className="w-full max-w-[480px] h-full bg-card border-l border-border shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="font-semibold text-base">{staffMember.full_name}</h2>
            <p className="text-xs text-muted-foreground capitalize">{staffMember.role?.replace("_", " ")} · Availability Profile</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X className="w-5 h-5" /></button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue={defaultTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-5 mt-3 bg-muted rounded-lg shrink-0 h-9">
            <TabsTrigger value="profile" className="text-xs rounded-md flex-1">Profile</TabsTrigger>
            <TabsTrigger value="weekly" className="text-xs rounded-md flex-1">Weekly</TabsTrigger>
            <TabsTrigger value="overrides" className="text-xs rounded-md flex-1">Overrides</TabsTrigger>
            <TabsTrigger value="qualifications" className="text-xs rounded-md flex-1">Training</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            <TabsContent value="profile" className="mt-0">
              <AvailabilityProfileTab staffMember={staffMember} user={user} />
            </TabsContent>
            <TabsContent value="weekly" className="mt-0">
              <WeeklyPatternTab staffMember={staffMember} />
            </TabsContent>
            <TabsContent value="overrides" className="mt-0">
              <OverridesTab staffMember={staffMember} user={user} myStaffProfile={myStaffProfile} />
            </TabsContent>
            <TabsContent value="qualifications" className="mt-0">
              <QualificationsTab staffMember={staffMember} user={user} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}