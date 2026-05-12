import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { AlertCircle, Clock, Pill, Shield, CheckSquare } from "lucide-react";

const AlertCard = ({ icon: Icon, label, count, color = "text-primary" }) => (
  <div className="bg-card rounded-xl border border-border p-5">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-muted-foreground mb-1">{label}</p>
        <p className={`text-2xl font-bold ${color}`}>{count}</p>
      </div>
      <Icon className={`w-7 h-7 ${color} opacity-20`} />
    </div>
  </div>
);

export default function Care() {
  const { user } = useOutletContext();
  const isAdmin = user?.role === "admin";
  const isTeamLeader = user?.role === "team_leader";

  // Fetch all care data
  const { data: residents = [] } = useQuery({
    queryKey: ["care-residents"],
    queryFn: () => secureGateway.filter("Resident", { status: "active" }),
  });

  const { data: careProfiles = [] } = useQuery({
    queryKey: ["care-profiles"],
    queryFn: () => secureGateway.filter("CareProfile"),
  });

  const { data: carePlans = [] } = useQuery({
    queryKey: ["care-plans"],
    queryFn: () => secureGateway.filter("CarePlan"),
  });

  const { data: marEntries = [] } = useQuery({
    queryKey: ["mar-entries"],
    queryFn: () => secureGateway.filter("MAREntry", {}, "-scheduled_datetime", 500),
  });

  const { data: healthObservations = [] } = useQuery({
    queryKey: ["health-observations"],
    queryFn: () => secureGateway.filter("HealthObservation", {}, "-observation_datetime", 500),
  });

  const { data: safeguardingRecords = [] } = useQuery({
    queryKey: ["safeguarding"],
    queryFn: () => secureGateway.filter("SafeguardingRecord"),
  });

  const { data: homes = [] } = useQuery({
    queryKey: ["homes-care"],
    queryFn: () => secureGateway.filter("Home", { type: "adult" }),
  });

  const { data: personalCareRecords = [] } = useQuery({
    queryKey: ["personal-care"],
    queryFn: () => secureGateway.filter("PersonalCareRecord", {}, "-date", 500),
  });

  // Calculate KPIs
  const today = new Date().toISOString().split("T")[0];
  const twoWeeksAhead = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const sevenDaysAhead = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const thirtyDaysAhead = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  // Medication alerts - last 24 hours
  const yesterdayStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const medicationAlerts = marEntries.filter(entry =>
    entry.scheduled_datetime > yesterdayStart &&
    (entry.late_administration || ["refused", "omitted", "not_available"].includes(entry.outcome))
  ).length;

  // Care plan reviews due
  const carePlansDue = carePlans.filter(plan =>
    plan.review_due_date >= today && plan.review_due_date <= twoWeeksAhead && plan.status === "active"
  ).length;

  // Health alerts unactioned
  const healthAlerts = healthObservations.filter(obs =>
    !obs.within_normal_range && !obs.alert_actioned_by
  ).length;

  // Safeguarding open
  const safeguardingOpen = safeguardingRecords.filter(rec =>
    isAdmin || isTeamLeader ? rec.status === "open" : false
  ).length;

  // Care needs breakdown
  const careNeedsBreakdown = {
    low: careProfiles.filter(cp => cp.care_needs_level === "low").length,
    moderate: careProfiles.filter(cp => cp.care_needs_level === "moderate").length,
    high: careProfiles.filter(cp => cp.care_needs_level === "high").length,
    complex: careProfiles.filter(cp => cp.care_needs_level === "complex").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Care Module</h1>
        <p className="text-muted-foreground text-sm mt-1">Adult residential care management</p>
      </div>

      {/* Alert Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AlertCard icon={Pill} label="Medication Alerts (24h)" count={medicationAlerts} color="text-amber-600" />
        <AlertCard icon={Clock} label="Care Plans Due" count={carePlansDue} color="text-blue-600" />
        <AlertCard icon={AlertCircle} label="Health Alerts" count={healthAlerts} color="text-red-600" />
        {(isAdmin || isTeamLeader) && (
          <AlertCard icon={Shield} label="Open Safeguarding" count={safeguardingOpen} color="text-red-700" />
        )}
      </div>

      {/* Home Summary Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Care Homes Summary</h2>
        <div className="grid gap-4">
          {homes.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">
              No adult care homes configured
            </div>
          ) : homes.map(home => {
            const homeResidents = residents.filter(r => r.home_id === home.id);
            const homeProfiles = careProfiles.filter(cp => cp.home_id === home.id);
            const todayRecords = personalCareRecords.filter(
              rec => rec.home_id === home.id && rec.date === today
            );

            return (
              <div key={home.id} className="bg-card rounded-xl border border-border p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-base">{home.name}</h3>
                    <p className="text-sm text-muted-foreground">{homeResidents.length} residents</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {homeProfiles.some(cp => cp.has_dols && new Date(cp.dols_expiry) < new Date(thirtyDaysAhead)) && (
                      <span className="px-2 py-1 rounded-full bg-amber-500/10 text-amber-600 text-xs font-medium">DoLS Expiring</span>
                    )}
                    {homeProfiles.some(cp => cp.mha_status !== "not_applicable" && new Date(cp.mha_section_expiry) < new Date(sevenDaysAhead)) && (
                      <span className="px-2 py-1 rounded-full bg-red-500/10 text-red-600 text-xs font-medium">MHA Expiring</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Care Needs</p>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Low</span>
                        <span className="font-medium text-green-600">{homeProfiles.filter(cp => cp.care_needs_level === "low").length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Moderate</span>
                        <span className="font-medium text-amber-600">{homeProfiles.filter(cp => cp.care_needs_level === "moderate").length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>High</span>
                        <span className="font-medium text-red-600">{homeProfiles.filter(cp => cp.care_needs_level === "high").length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Complex</span>
                        <span className="font-medium text-red-700">{homeProfiles.filter(cp => cp.care_needs_level === "complex").length}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Personal Care Today</p>
                    <p className="text-lg font-bold">
                      {homeResidents.length > 0
                        ? Math.round((todayRecords.length / (homeResidents.length * 3)) * 100)
                        : 0}%
                    </p>
                    <p className="text-xs text-muted-foreground">{todayRecords.length} of {homeResidents.length * 3} shifts</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}