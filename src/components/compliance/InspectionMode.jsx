import { useState, useMemo } from "react";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "safeguarding", label: "Safeguarding & MFH" },
  { key: "governance", label: "Reg44/45" },
  { key: "staffing", label: "Staffing & Training" },
  { key: "careplans", label: "Care Planning" },
  { key: "health", label: "Health & Education" },
  { key: "homeenv", label: "Home Environment" },
  { key: "complaints", label: "Complaints & Voice" },
  { key: "records", label: "Record Quality" },
  { key: "export", label: "Export" },
];

const RECORD_TYPES = [
  { key: "mfh", label: "Missing From Home" },
  { key: "bodymaps", label: "Body Maps" },
  { key: "handovers", label: "Shift Handovers" },
  { key: "reg44", label: "Regulation 44 Reports" },
  { key: "complaints", label: "Complaints" },
  { key: "significantevents", label: "Significant Events" },
];

function OverviewTab({ data, onSelectDetail }) {
  const { residents = [], homeChecks = [], accidentReports = [], staffProfiles = [] } = data;
  const activeResidents = residents.filter(r => r.status === "active").length;
  const highRisk = residents.filter(r => r.risk_level === "high" || r.risk_level === "critical").length;
  const openIncidents = accidentReports.filter(a => a.status === "open").length;
  const compliantStaff = staffProfiles.filter(s => s.dbs_expiry_date && new Date(s.dbs_expiry_date) > new Date()).length;
  const trainingPct = staffProfiles.length > 0 ? Math.round((compliantStaff / staffProfiles.length) * 100) : 0;

  return (
    <div className="space-y-3 sm:space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4">
        <button onClick={() => onSelectDetail("Active Residents", residents.filter(r => r.status === "active").map(r => `${r.display_name} (Risk: ${r.risk_level})`))} className="bg-blue-50 rounded-lg p-2.5 sm:p-4 text-center hover:bg-blue-100 transition-colors cursor-pointer">
          <p className="text-xs sm:text-sm text-muted-foreground mb-0.5 sm:mb-1">Active Residents</p>
          <p className="text-2xl sm:text-3xl font-bold text-blue-700">{activeResidents}</p>
        </button>
        <button onClick={() => onSelectDetail("Open Incidents", accidentReports.filter(a => a.status === "open").map(a => `${a.title || "Incident"} (${a.incident_date})`))} className="bg-red-50 rounded-lg p-2.5 sm:p-4 text-center hover:bg-red-100 transition-colors cursor-pointer">
          <p className="text-xs sm:text-sm text-muted-foreground mb-0.5 sm:mb-1">Open Incidents</p>
          <p className="text-2xl sm:text-3xl font-bold text-red-700">{openIncidents}</p>
        </button>
        <button onClick={() => onSelectDetail("High Risk Residents", residents.filter(r => r.risk_level === "high" || r.risk_level === "critical").map(r => `${r.display_name} (${r.risk_level})`))} className="bg-amber-50 rounded-lg p-2.5 sm:p-4 text-center hover:bg-amber-100 transition-colors cursor-pointer">
          <p className="text-xs sm:text-sm text-muted-foreground mb-0.5 sm:mb-1">High Risk</p>
          <p className="text-2xl sm:text-3xl font-bold text-amber-700">{highRisk}</p>
        </button>
        <button onClick={() => onSelectDetail("Home Checks", homeChecks.map(h => `${h.home_name || "Home"} (${h.check_date}): ${h.overall_result}`))} className="bg-green-50 rounded-lg p-2.5 sm:p-4 text-center hover:bg-green-100 transition-colors cursor-pointer">
          <p className="text-xs sm:text-sm text-muted-foreground mb-0.5 sm:mb-1">Home Checks</p>
          <p className="text-2xl sm:text-3xl font-bold text-green-700">{homeChecks.length}</p>
        </button>
        <button onClick={() => onSelectDetail("DBS Compliant Staff", staffProfiles.filter(s => s.dbs_expiry_date && new Date(s.dbs_expiry_date) > new Date()).map(s => `${s.full_name} (Valid until ${s.dbs_expiry_date})`))} className="bg-blue-50 rounded-lg p-2.5 sm:p-4 text-center hover:bg-blue-100 transition-colors cursor-pointer">
          <p className="text-xs sm:text-sm text-muted-foreground mb-0.5 sm:mb-1">DBS Compliant</p>
          <p className="text-2xl sm:text-3xl font-bold text-blue-700">{trainingPct}%</p>
        </button>
        <button onClick={() => onSelectDetail("All Staff", staffProfiles.map(s => `${s.full_name} (${s.role || "Staff"})`))} className="bg-purple-50 rounded-lg p-2.5 sm:p-4 text-center hover:bg-purple-100 transition-colors cursor-pointer">
          <p className="text-xs sm:text-sm text-muted-foreground mb-0.5 sm:mb-1">Staff Count</p>
          <p className="text-2xl sm:text-3xl font-bold text-purple-700">{staffProfiles.length}</p>
        </button>
      </div>
    </div>
  );
}

function ChildrenTab({ data }) {
  const { residents = [], homes = [] } = data;
  const homeMap = Object.fromEntries(homes.map(h => [h.id, h]));

  const calcAge = (dob) => {
    if (!dob) return null;
    const d = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    if (today < new Date(today.getFullYear(), d.getMonth(), d.getDate())) age--;
    return age;
  };

  return (
    <div className="border border-border rounded-lg overflow-x-auto">
      <table className="w-full text-sm min-w-[800px]">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="text-left px-4 py-3 font-semibold">Name</th>
            <th className="text-left px-4 py-3 font-semibold">Age</th>
            <th className="text-left px-4 py-3 font-semibold">Home</th>
            <th className="text-left px-4 py-3 font-semibold">Risk</th>
            <th className="text-left px-4 py-3 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {residents.length === 0 ? (
            <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No residents.</td></tr>
          ) : residents.map(r => (
            <tr key={r.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3 font-medium">{r.display_name}</td>
              <td className="px-4 py-3">{calcAge(r.dob)}</td>
              <td className="px-4 py-3">{homeMap[r.home_id]?.name || "—"}</td>
              <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded capitalize font-medium ${r.risk_level === "critical" ? "bg-red-700/10 text-red-700" : r.risk_level === "high" ? "bg-red-500/10 text-red-600" : r.risk_level === "medium" ? "bg-amber-500/10 text-amber-600" : "bg-green-500/10 text-green-600"}`}>{r.risk_level || "low"}</span></td>
              <td className="px-4 py-3 capitalize text-xs">{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecordsTab({ data }) {
  const [selectedType, setSelectedType] = useState("mfh");
  const { homes = [], mfhRecords = [], bodyMaps = [], handovers = [], reg44Reports = [], complaints = [], significantEvents = [] } = data;
  const homeMap = Object.fromEntries(homes.map(h => [h.id, h]));

  const renderMFHTable = () => {
    const records = mfhRecords;
    if (!records || records.length === 0) {
      return <div className="text-center text-muted-foreground py-6">No records found.</div>;
    }
    return (
      <div className="border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 font-semibold">YP Name</th>
              <th className="text-left px-4 py-3 font-semibold">Home</th>
              <th className="text-left px-4 py-3 font-semibold">Reported</th>
              <th className="text-left px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {records.map(r => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium">{r.resident_name}</td>
                <td className="px-4 py-3">{r.home_name}</td>
                <td className="px-4 py-3 text-xs">{new Date(r.reported_missing_datetime).toLocaleDateString()}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded ${r.status === "active" ? "bg-red-500/10 text-red-600" : "bg-green-500/10 text-green-600"}`}>{r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderBodyMapsTable = () => {
    const records = bodyMaps;
    if (!records || records.length === 0) {
      return <div className="text-center text-muted-foreground py-6">No records found.</div>;
    }
    return (
      <div className="border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 font-semibold">YP Name</th>
              <th className="text-left px-4 py-3 font-semibold">Home</th>
              <th className="text-left px-4 py-3 font-semibold">Recorded</th>
              <th className="text-left px-4 py-3 font-semibold">Marks</th>
              <th className="text-left px-4 py-3 font-semibold">Concern</th>
            </tr>
          </thead>
          <tbody>
            {records.map(r => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium">{r.resident_name}</td>
                <td className="px-4 py-3">{r.home_name}</td>
                <td className="px-4 py-3 text-xs">{new Date(r.recorded_datetime).toLocaleDateString()}</td>
                <td className="px-4 py-3">{r.mark_count}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded ${r.safeguarding_concern ? "bg-red-500/10 text-red-600" : "bg-green-500/10 text-green-600"}`}>{r.safeguarding_concern ? "Yes" : "No"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderHandoversTable = () => {
    const records = handovers;
    if (!records || records.length === 0) {
      return <div className="text-center text-muted-foreground py-6">No records found.</div>;
    }
    return (
      <div className="border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 font-semibold">YP Name</th>
              <th className="text-left px-4 py-3 font-semibold">Home</th>
              <th className="text-left px-4 py-3 font-semibold">Date</th>
              <th className="text-left px-4 py-3 font-semibold">Shift</th>
              <th className="text-left px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {records.map(r => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium">{r.resident_name}</td>
                <td className="px-4 py-3">{r.home_name}</td>
                <td className="px-4 py-3 text-xs">{r.date}</td>
                <td className="px-4 py-3 capitalize text-xs">{r.shift}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded capitalize ${r.status === "acknowledged" ? "bg-green-500/10 text-green-600" : "bg-amber-500/10 text-amber-600"}`}>{r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderReg44Table = () => {
    const records = reg44Reports;
    if (!records || records.length === 0) {
      return <div className="text-center text-muted-foreground py-6">No records found.</div>;
    }
    return (
      <div className="border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 font-semibold">Home</th>
              <th className="text-left px-4 py-3 font-semibold">Visit Month</th>
              <th className="text-left px-4 py-3 font-semibold">Rating</th>
              <th className="text-left px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {records.map(r => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium">{r.home_name}</td>
                <td className="px-4 py-3 text-xs">{r.visit_month}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded capitalize ${r.overall_rating === "outstanding" ? "bg-green-500/10 text-green-600" : r.overall_rating === "good" ? "bg-blue-500/10 text-blue-600" : "bg-amber-500/10 text-amber-600"}`}>{r.overall_rating}</span></td>
                <td className="px-4 py-3 capitalize text-xs">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderComplaintsTable = () => {
    const records = complaints;
    if (!records || records.length === 0) {
      return <div className="text-center text-muted-foreground py-6">No records found.</div>;
    }
    return (
      <div className="border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 font-semibold">YP Name</th>
              <th className="text-left px-4 py-3 font-semibold">Home</th>
              <th className="text-left px-4 py-3 font-semibold">Received</th>
              <th className="text-left px-4 py-3 font-semibold">Severity</th>
              <th className="text-left px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {records.map(r => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium">{r.resident_name}</td>
                <td className="px-4 py-3">{r.home_name}</td>
                <td className="px-4 py-3 text-xs">{new Date(r.received_datetime).toLocaleDateString()}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded capitalize ${r.severity === "serious" ? "bg-red-500/10 text-red-600" : r.severity === "moderate" ? "bg-amber-500/10 text-amber-600" : "bg-blue-500/10 text-blue-600"}`}>{r.severity}</span></td>
                <td className="px-4 py-3 capitalize text-xs">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderSignificantEventsTable = () => {
    const records = significantEvents;
    if (!records || records.length === 0) {
      return <div className="text-center text-muted-foreground py-6">No records found.</div>;
    }
    return (
      <div className="border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 font-semibold">YP Name</th>
              <th className="text-left px-4 py-3 font-semibold">Home</th>
              <th className="text-left px-4 py-3 font-semibold">Event Date</th>
              <th className="text-left px-4 py-3 font-semibold">Event Type</th>
              <th className="text-left px-4 py-3 font-semibold">Ofsted Notified</th>
            </tr>
          </thead>
          <tbody>
            {records.map(r => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium">{r.resident_name}</td>
                <td className="px-4 py-3">{r.home_name}</td>
                <td className="px-4 py-3 text-xs">{new Date(r.event_datetime).toLocaleDateString()}</td>
                <td className="px-4 py-3 capitalize text-xs">{r.event_type.replace(/_/g, ' ')}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded ${r.ofsted_notified ? "bg-blue-500/10 text-blue-600" : "bg-muted text-muted-foreground"}`}>{r.ofsted_notified ? "Yes" : "No"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {RECORD_TYPES.map(type => (
          <button
            key={type.key}
            onClick={() => setSelectedType(type.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selectedType === type.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {selectedType === "mfh" && renderMFHTable()}
      {selectedType === "bodymaps" && renderBodyMapsTable()}
      {selectedType === "handovers" && renderHandoversTable()}
      {selectedType === "reg44" && renderReg44Table()}
      {selectedType === "complaints" && renderComplaintsTable()}
      {selectedType === "significantevents" && renderSignificantEventsTable()}
    </div>
  );
}

function StaffTab({ data }) {
  const { staffProfiles = [] } = data;

  return (
    <div className="border border-border rounded-lg overflow-x-auto">
      <table className="w-full text-sm min-w-[700px]">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="text-left px-4 py-3 font-semibold">Name</th>
            <th className="text-left px-4 py-3 font-semibold">Role</th>
            <th className="text-left px-4 py-3 font-semibold">DBS Status</th>
            <th className="text-left px-4 py-3 font-semibold">DBS Expiry</th>
          </tr>
        </thead>
        <tbody>
          {staffProfiles.length === 0 ? (
            <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">No staff.</td></tr>
          ) : staffProfiles.map(s => {
            const dbsExpired = s.dbs_expiry_date && new Date(s.dbs_expiry_date) < new Date();
            return (
              <tr key={s.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium">{s.full_name}</td>
                <td className="px-4 py-3 capitalize text-xs">{s.role}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded ${dbsExpired ? "bg-red-500/10 text-red-600" : "bg-green-500/10 text-green-600"}`}>{dbsExpired ? "Expired" : "Valid"}</span></td>
                <td className="px-4 py-3 text-xs">{s.dbs_expiry_date || "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SafeguardingTab({ data, onSelectDetail }) {
  const { mfhRecords = [], accidentReports = [], bodyMaps = [], significantEvents = [] } = data;
  const activeMFH = mfhRecords.filter(m => m.status === "active");
  const openIncidents = accidentReports.filter(a => a.status === "open");
  const concerns = bodyMaps.filter(b => b.safeguarding_concern);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <button onClick={() => onSelectDetail("Active Missing From Home", activeMFH.map(m => `${m.resident_name} - Last seen: ${m.last_seen_datetime}`))} className="bg-red-50 rounded-lg p-4 text-center hover:bg-red-100 transition-colors cursor-pointer">
          <p className="text-sm text-muted-foreground mb-1">Active MFH</p>
          <p className="text-3xl font-bold text-red-700">{activeMFH.length}</p>
        </button>
        <button onClick={() => onSelectDetail("Open Incidents", openIncidents.map(i => `${i.title || "Incident"} (${i.incident_date})`))} className="bg-amber-50 rounded-lg p-4 text-center hover:bg-amber-100 transition-colors cursor-pointer">
          <p className="text-sm text-muted-foreground mb-1">Open Incidents</p>
          <p className="text-3xl font-bold text-amber-700">{openIncidents.length}</p>
        </button>
        <button onClick={() => onSelectDetail("Safeguarding Concerns", concerns.map(c => `${c.resident_name} (${c.recorded_datetime})`))} className="bg-red-50 rounded-lg p-4 text-center hover:bg-red-100 transition-colors cursor-pointer">
          <p className="text-sm text-muted-foreground mb-1">Safeguarding Concerns</p>
          <p className="text-3xl font-bold text-red-700">{concerns.length}</p>
        </button>
      </div>
      <div>
        <h4 className="font-semibold mb-3">Significant Events ({significantEvents.length})</h4>
        <div className="border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold">YP</th>
                <th className="text-left px-4 py-3 text-xs font-semibold">Event Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {significantEvents.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">No events recorded.</td></tr>
              ) : significantEvents.slice(0, 15).map(e => (
                <tr key={e.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-xs">{new Date(e.event_datetime).toLocaleDateString()}</td>
                  <td className="px-4 py-3 font-medium">{e.resident_name}</td>
                  <td className="px-4 py-3 text-xs capitalize">{e.event_type.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-600">{e.status || "Open"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function GovernanceTab({ data, onSelectDetail }) {
  const { reg44Reports = [], reg45Reviews = [] } = data;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => onSelectDetail("Regulation 44 Reports", reg44Reports.map(r => `${r.home_name} - ${r.visit_month} (${r.overall_rating})`))} className="bg-blue-50 rounded-lg p-4 text-center hover:bg-blue-100 transition-colors cursor-pointer">
          <p className="text-sm text-muted-foreground mb-1">Reg44 Reports</p>
          <p className="text-3xl font-bold text-blue-700">{reg44Reports.length}</p>
        </button>
        <button onClick={() => onSelectDetail("Regulation 45 Reviews", reg45Reviews.map(r => `${r.home_name} - ${r.review_year}`))} className="bg-purple-50 rounded-lg p-4 text-center hover:bg-purple-100 transition-colors cursor-pointer">
          <p className="text-sm text-muted-foreground mb-1">Reg45 Reviews</p>
          <p className="text-3xl font-bold text-purple-700">{reg45Reviews.length}</p>
        </button>
      </div>
      <div>
        <h4 className="font-semibold mb-3">Recent Reg44 Reports</h4>
        <div className="border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold">Home</th>
                <th className="text-left px-4 py-3 text-xs font-semibold">Visit Month</th>
                <th className="text-left px-4 py-3 text-xs font-semibold">Rating</th>
                <th className="text-left px-4 py-3 text-xs font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {reg44Reports.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">No reports.</td></tr>
              ) : reg44Reports.slice(0, 15).map(r => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{r.home_name}</td>
                  <td className="px-4 py-3 text-xs">{r.visit_month}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded capitalize ${r.overall_rating === "outstanding" ? "bg-green-500/10 text-green-600" : r.overall_rating === "good" ? "bg-blue-500/10 text-blue-600" : "bg-amber-500/10 text-amber-600"}`}>{r.overall_rating}</span></td>
                  <td className="px-4 py-3 capitalize text-xs">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StaffingTab({ data, onSelectDetail }) {
  const { staffProfiles = [], trainingRecords = [] } = data;
  const trained = staffProfiles.filter(s => trainingRecords.some(t => t.staff_id === s.id && new Date(t.expiry_date) > new Date())).length;
  const dbsCompliant = staffProfiles.filter(s => s.dbs_expiry_date && new Date(s.dbs_expiry_date) > new Date()).length;
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <button onClick={() => onSelectDetail("All Staff", staffProfiles.map(s => `${s.full_name} (${s.role || "Staff"})`))} className="bg-blue-50 rounded-lg p-4 text-center hover:bg-blue-100 transition-colors cursor-pointer">
          <p className="text-sm text-muted-foreground mb-1">Total Staff</p>
          <p className="text-3xl font-bold text-blue-700">{staffProfiles.length}</p>
        </button>
        <button onClick={() => onSelectDetail("Training Current", trained ? staffProfiles.filter(s => trainingRecords.some(t => t.staff_id === s.id && new Date(t.expiry_date) > new Date())).map(s => `${s.full_name}`) : ["No trained staff"])} className={`rounded-lg p-4 text-center hover:opacity-80 transition-opacity cursor-pointer ${trained < staffProfiles.length ? "bg-amber-50" : "bg-green-50"}`}>
          <p className="text-sm text-muted-foreground mb-1">Training Current</p>
          <p className={`text-3xl font-bold ${trained < staffProfiles.length ? "text-amber-700" : "text-green-700"}`}>{trained}/{staffProfiles.length}</p>
        </button>
        <button onClick={() => onSelectDetail("DBS Valid", dbsCompliant ? staffProfiles.filter(s => s.dbs_expiry_date && new Date(s.dbs_expiry_date) > new Date()).map(s => `${s.full_name} (Valid until ${s.dbs_expiry_date})`) : ["No DBS valid staff"])} className={`rounded-lg p-4 text-center hover:opacity-80 transition-opacity cursor-pointer ${dbsCompliant < staffProfiles.length ? "bg-red-50" : "bg-green-50"}`}>
          <p className="text-sm text-muted-foreground mb-1">DBS Valid</p>
          <p className={`text-3xl font-bold ${dbsCompliant < staffProfiles.length ? "text-red-700" : "text-green-700"}`}>{dbsCompliant}/{staffProfiles.length}</p>
        </button>
      </div>
      <div>
        <h4 className="font-semibold mb-3">Staff Status</h4>
        <div className="border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold">DBS Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold">Training</th>
              </tr>
            </thead>
            <tbody>
              {staffProfiles.slice(0, 15).map(s => {
                const dbsExpired = s.dbs_expiry_date && new Date(s.dbs_expiry_date) < new Date();
                const trained = trainingRecords.some(t => t.staff_id === s.id && new Date(t.expiry_date) > new Date());
                return (
                  <tr key={s.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">{s.full_name}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded ${dbsExpired ? "bg-red-500/10 text-red-600" : "bg-green-500/10 text-green-600"}`}>{dbsExpired ? "Expired" : "Valid"}</span></td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded ${trained ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"}`}>{trained ? "Current" : "Overdue"}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CarePlansTab({ data, onSelectDetail }) {
  const { placementPlans = [], pathwayPlans = [], supportPlans = [], ilsPlans = [] } = data;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <button onClick={() => onSelectDetail("Placement Plans", placementPlans.map(p => `${p.resident_name} - ${p.status}`))} className="bg-blue-50 rounded-lg p-4 text-center hover:bg-blue-100 transition-colors cursor-pointer">
          <p className="text-sm text-muted-foreground mb-1">Placement Plans</p>
          <p className="text-3xl font-bold text-blue-700">{placementPlans.length}</p>
        </button>
        <button onClick={() => onSelectDetail("Pathway Plans", pathwayPlans.map(p => `${p.resident_name} - ${p.status}`))} className="bg-purple-50 rounded-lg p-4 text-center hover:bg-purple-100 transition-colors cursor-pointer">
          <p className="text-sm text-muted-foreground mb-1">Pathway Plans</p>
          <p className="text-3xl font-bold text-purple-700">{pathwayPlans.length}</p>
        </button>
        <button onClick={() => onSelectDetail("Support Plans", supportPlans.map(p => `${p.resident_name} - ${p.status}`))} className="bg-green-50 rounded-lg p-4 text-center hover:bg-green-100 transition-colors cursor-pointer">
          <p className="text-sm text-muted-foreground mb-1">Support Plans</p>
          <p className="text-3xl font-bold text-green-700">{supportPlans.length}</p>
        </button>
        <button onClick={() => onSelectDetail("ILS Plans", ilsPlans.map(p => `${p.resident_name} - ${p.status}`))} className="bg-orange-50 rounded-lg p-4 text-center hover:bg-orange-100 transition-colors cursor-pointer">
          <p className="text-sm text-muted-foreground mb-1">ILS Plans</p>
          <p className="text-3xl font-bold text-orange-700">{ilsPlans.length}</p>
        </button>
      </div>
      <p className="text-sm text-muted-foreground">Care plan data summary. Detailed records available in Residents module.</p>
    </div>
  );
}

function HealthTab({ data, onSelectDetail }) {
  const { dashboardAppointments = [] } = data;
  return (
    <div className="space-y-6">
      <button onClick={() => onSelectDetail("Recent Appointments", dashboardAppointments.map(a => `${a.resident_name} - ${a.appointment_type} (${a.appointment_date})`))} className="bg-green-50 rounded-lg p-4 text-center hover:bg-green-100 transition-colors cursor-pointer w-full">
        <p className="text-sm text-muted-foreground mb-1">Recent Appointments</p>
        <p className="text-3xl font-bold text-green-700">{dashboardAppointments.length}</p>
      </button>
      <p className="text-sm text-muted-foreground">Health, education and wellbeing appointment tracking. Full records in Health & Education modules.</p>
    </div>
  );
}

function HomeEnvTab({ data, onSelectDetail }) {
  const { homeChecks = [], sleepChecks = [] } = data;
  const lastWeek = new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000);
  const checksLast7 = homeChecks.filter(c => new Date(c.check_date) >= lastWeek).length;
  const sleepLast7 = sleepChecks.filter(s => new Date(s.date) >= lastWeek && s.status === "completed").length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => onSelectDetail("Home Checks (Last 7 Days)", homeChecks.filter(c => new Date(c.check_date) >= lastWeek).map(c => `${c.home_name} - ${c.check_date} (${c.overall_result})`))} className="bg-blue-50 rounded-lg p-4 text-center hover:bg-blue-100 transition-colors cursor-pointer">
          <p className="text-sm text-muted-foreground mb-1">Home Checks (Last 7 Days)</p>
          <p className="text-3xl font-bold text-blue-700">{checksLast7}</p>
        </button>
        <button onClick={() => onSelectDetail("Sleep Checks (Last 7 Days)", sleepChecks.filter(s => new Date(s.date) >= lastWeek && s.status === "completed").map(s => `${s.home_name} - ${s.date}`))} className="bg-purple-50 rounded-lg p-4 text-center hover:bg-purple-100 transition-colors cursor-pointer">
          <p className="text-sm text-muted-foreground mb-1">Sleep Checks (Last 7 Days)</p>
          <p className="text-3xl font-bold text-purple-700">{sleepLast7}</p>
        </button>
      </div>
      <p className="text-sm text-muted-foreground">Home environment and safety checks. Full details in House Management module.</p>
    </div>
  );
}

function ComplaintsTab({ data, onSelectDetail }) {
  const { complaints = [] } = data;
  const overdueCount = complaints.filter(c => {
    const target = new Date(c.received_datetime);
    target.setDate(target.getDate() + 28);
    return target < new Date() && c.status !== "closed";
  }).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => onSelectDetail("Total Complaints", complaints.map(c => `${c.title || "Complaint"} (${c.received_datetime}) - ${c.status}`))} className="bg-blue-50 rounded-lg p-4 text-center hover:bg-blue-100 transition-colors cursor-pointer">
          <p className="text-sm text-muted-foreground mb-1">Total Complaints</p>
          <p className="text-3xl font-bold text-blue-700">{complaints.length}</p>
        </button>
        <button onClick={() => onSelectDetail("Overdue Complaints", complaints.filter(c => { const target = new Date(c.received_datetime); target.setDate(target.getDate() + 28); return target < new Date() && c.status !== "closed"; }).map(c => `${c.title || "Complaint"} (Received ${c.received_datetime})`))} className={`rounded-lg p-4 text-center hover:opacity-80 transition-opacity cursor-pointer ${overdueCount === 0 ? "bg-green-50" : "bg-red-50"}`}>
          <p className="text-sm text-muted-foreground mb-1">Overdue (28 days)</p>
          <p className={`text-3xl font-bold ${overdueCount === 0 ? "text-green-700" : "text-red-700"}`}>{overdueCount}</p>
        </button>
      </div>
      <p className="text-sm text-muted-foreground">Complaints and voice records. Full details in Residents {`>`} Complaints module.</p>
    </div>
  );
}

function RecordQualityTab({ data, onSelectDetail }) {
  const { dailyLogs = [] } = data;
  const lastWeek = new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentLogs = dailyLogs.filter(l => new Date(l.date) >= lastWeek).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => onSelectDetail("Total Daily Logs", dailyLogs.map(l => `${l.home_name} - ${l.date}`))} className="bg-blue-50 rounded-lg p-4 text-center hover:bg-blue-100 transition-colors cursor-pointer">
          <p className="text-sm text-muted-foreground mb-1">Total Daily Logs</p>
          <p className="text-3xl font-bold text-blue-700">{dailyLogs.length}</p>
        </button>
        <button onClick={() => onSelectDetail("Logs (Last 7 Days)", dailyLogs.filter(l => new Date(l.date) >= lastWeek).map(l => `${l.home_name} - ${l.date}`))} className="bg-green-50 rounded-lg p-4 text-center hover:bg-green-100 transition-colors cursor-pointer">
          <p className="text-sm text-muted-foreground mb-1">Logs (Last 7 Days)</p>
          <p className="text-3xl font-bold text-green-700">{recentLogs}</p>
        </button>
      </div>
      <p className="text-sm text-muted-foreground">Record quality and audit trail completeness. Full logging available in Daily Logs module.</p>
    </div>
  );
}

function ExportTab({ onExport }) {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          Download complete compliance documentation for Ofsted review.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" /> Reg44 Reports
        </Button>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" /> Complaints Log
        </Button>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" /> MFH Records
        </Button>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" /> Training Records
        </Button>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" /> Significant Events
        </Button>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" /> Staff DBS
        </Button>
      </div>

      <Button className="w-full gap-2" onClick={onExport}>
        <Download className="w-4 h-4" /> Download Complete Compliance Pack
      </Button>
    </div>
  );
}

function DetailModal({ title, items, onClose }) {
  if (!items) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4">
          {Array.isArray(items) && items.length === 0 ? (
            <p className="text-muted-foreground text-sm">No items to display.</p>
          ) : Array.isArray(items) ? (
            <div className="space-y-2 text-sm">
              {items.map((item, idx) => (
                <div key={idx} className="p-2 bg-muted/30 rounded">
                  {typeof item === 'string' ? item : JSON.stringify(item)}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm">{items}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InspectionMode({ onExit, data }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedDetail, setSelectedDetail] = useState(null);

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-navy text-white border-b border-navy-light p-3 sm:p-4 flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-2xl font-bold">Ofsted Inspection Mode</h1>
          <p className="text-xs sm:text-sm text-blue-100 mt-0.5 sm:mt-1">Read-only compliance dashboard</p>
        </div>
        <Button variant="ghost" onClick={onExit} className="text-white hover:bg-white/10 shrink-0">
          <X className="w-4 sm:w-5 h-4 sm:h-5" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-border bg-card sticky top-12 sm:top-16 overflow-x-auto overflow-y-hidden scrollbar-none">
        <div className="flex gap-0 max-w-7xl mx-auto min-w-max sm:min-w-0 touch-pan-x">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm border-b-2 font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-3 sm:p-6">
        {activeTab === "overview" && <OverviewTab data={data} onSelectDetail={(title, items) => setSelectedDetail({ title, items })} />}
        {activeTab === "safeguarding" && <SafeguardingTab data={data} onSelectDetail={(title, items) => setSelectedDetail({ title, items })} />}
        {activeTab === "governance" && <GovernanceTab data={data} onSelectDetail={(title, items) => setSelectedDetail({ title, items })} />}
        {activeTab === "staffing" && <StaffingTab data={data} onSelectDetail={(title, items) => setSelectedDetail({ title, items })} />}
        {activeTab === "careplans" && <CarePlansTab data={data} onSelectDetail={(title, items) => setSelectedDetail({ title, items })} />}
        {activeTab === "health" && <HealthTab data={data} onSelectDetail={(title, items) => setSelectedDetail({ title, items })} />}
        {activeTab === "homeenv" && <HomeEnvTab data={data} onSelectDetail={(title, items) => setSelectedDetail({ title, items })} />}
        {activeTab === "complaints" && <ComplaintsTab data={data} onSelectDetail={(title, items) => setSelectedDetail({ title, items })} />}
        {activeTab === "records" && <RecordQualityTab data={data} onSelectDetail={(title, items) => setSelectedDetail({ title, items })} />}
        {activeTab === "export" && <ExportTab onExport={() => {}} />}
      </div>

      {selectedDetail && <DetailModal title={selectedDetail.title} items={selectedDetail.items} onClose={() => setSelectedDetail(null)} />}
      </div>
      );
      }