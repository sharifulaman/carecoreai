import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { base44 } from "@/api/base44Client";
import { format, addDays } from "date-fns";
import { AlertTriangle, Clock, CheckCircle2, XCircle, Plus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ORG_ID } from "@/lib/roleConfig";

const DEADLINE_BADGES = {
  seventy_two_hours: { label: "72 Hours", color: "bg-red-100 text-red-700", icon: "⏰" },
  ten_working_days: { label: "10 Working Days", color: "bg-amber-100 text-amber-700", icon: "📋" },
  as_soon_as_practicable: { label: "ASAP", color: "bg-blue-100 text-blue-700", icon: "📌" },
  one_month: { label: "1 Month", color: "bg-purple-100 text-purple-700", icon: "📅" },
};

const CHANGE_TYPE_GROUPS = {
  "Premises Changes": [
    "additional_premises_acquired",
    "premises_no_longer_in_use",
    "premises_significantly_altered",
    "additional_premises_first_use",
    "premises_returned_to_use_after_temporary_closure",
    "premises_extended",
  ],
  "Organisational Changes": [
    "registered_provider_name_change",
    "organisation_name_or_address_change",
    "director_manager_secretary_change",
    "nominated_individual_change",
    "partnership_membership_change",
    "company_ownership_change",
  ],
  "Management Changes": [
    "new_person_carrying_on",
    "person_ceased_carrying_on",
    "new_person_managing",
    "person_ceased_managing",
    "trustee_in_bankruptcy_appointed",
    "liquidator_appointed",
    "composition_or_arrangement_with_creditors",
  ],
};

function CountdownTimer({ deadline, isSeventy2Hours }) {
  const [remaining, setRemaining] = useState(0);

  React.useEffect(() => {
    const update = () => {
      const now = new Date();
      const deadlineDate = new Date(deadline);
      const diff = deadlineDate - now;
      const hours = Math.max(0, Math.ceil(diff / (1000 * 60 * 60)));
      setRemaining(hours);
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [deadline]);

  if (!isSeventy2Hours) return null;
  const isUrgent = remaining < 24;
  return (
    <span className={`text-sm font-bold px-2 py-1 rounded ${isUrgent ? "bg-red-500 text-white animate-pulse" : "bg-amber-100 text-amber-700"}`}>
      {remaining} hours remaining
    </span>
  );
}

export default function Reg34ChangeNotifications({ staffProfile }) {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterChangeType, setFilterChangeType] = useState("all");
  const [filterHome, setFilterHome] = useState("all");

  const { data: records = [] } = useQuery({
    queryKey: ["reg34-notifications"],
    queryFn: () => secureGateway.filter("Reg34ChangeNotification", { org_id: ORG_ID }, "-created_date", 500),
    staleTime: 60000,
  });

  const { data: homes = [] } = useQuery({
    queryKey: ["reg34-homes"],
    queryFn: () => secureGateway.filter("Home", { status: "active" }),
    staleTime: 300000,
  });

  // KPI calculations
  const kpis = useMemo(() => {
    const thisYear = new Date().getFullYear();
    const pending72 = records.filter(r => r.deadline_type === "seventy_two_hours" && !r.notification_sent).length;
    const overdue = records.filter(r => r.is_overdue).length;
    const onTime = records.filter(r => r.status === "notified_on_time" && new Date(r.notification_sent_date).getFullYear() === thisYear).length;
    const late = records.filter(r => r.status === "notified_late" && new Date(r.notification_sent_date).getFullYear() === thisYear).length;
    const total = records.filter(r => new Date(r.created_date).getFullYear() === thisYear).length;
    return { pending72, overdue, onTime, late, total };
  }, [records]);

  const urgent72h = records.filter(r => r.deadline_type === "seventy_two_hours" && !r.notification_sent).sort((a, b) => new Date(a.notification_deadline) - new Date(b.notification_deadline));

  const filteredRecords = records.filter(r => {
    const statusMatch = filterStatus === "all" || r.status === filterStatus;
    const typeMatch = filterChangeType === "all" || r.change_type === filterChangeType;
    const homeMatch = filterHome === "all" || r.home_id === filterHome;
    return statusMatch && typeMatch && homeMatch;
  });

  const exportNoticeGenerator = (record) => {
    const orgProfile = { provider_legal_name: "CareCore AI Ltd", ofsted_urn: "UR123456" }; // Would be fetched in real app
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Regulation 34 Notice</title>
  <style>
    body { font-family: "Times New Roman", serif; padding: 40px; line-height: 1.5; color: #333; }
    h1 { text-align: center; margin: 0 0 30px 0; font-size: 18px; }
    .header { margin-bottom: 40px; }
    .letterhead { margin-bottom: 30px; }
    .date { text-align: right; margin-bottom: 20px; }
    .salutation { margin-bottom: 20px; }
    .signature { margin-top: 40px; }
    table { margin: 15px 0; }
    td { padding: 8px; border-bottom: 1px solid #ccc; }
    .footer { margin-top: 50px; font-size: 12px; text-align: center; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <div class="letterhead">
      <strong>${orgProfile.provider_legal_name}</strong><br/>
      Ofsted URN: ${orgProfile.ofsted_urn}
    </div>
    <div class="date">${format(new Date(), "d MMMM yyyy")}</div>
  </div>

  <p>Ofsted<br/>Piccadilly Gate<br/>Store Street<br/>Manchester<br/>M1 2WD</p>

  <p><strong>Re: Notice of Change — ${orgProfile.provider_legal_name}</strong><br/>
  Ofsted URN: ${orgProfile.ofsted_urn}<br/>
  Regulation 34 of the Supported Accommodation (England) Regulations 2023</p>

  <div class="salutation">
    <p>Dear Sir/Madam,</p>
    <p>I am writing to notify you of the following change in accordance with Regulation 34 of the Supported Accommodation (England) Regulations 2023.</p>
  </div>

  <table>
    <tr><td><strong>Nature of Change:</strong></td><td>${record.change_type_description}</td></tr>
    <tr><td><strong>Date of Change:</strong></td><td>${format(new Date(record.change_event_date), "d MMMM yyyy")}</td></tr>
    ${record.home_name ? `<tr><td><strong>Premises:</strong></td><td>${record.home_name}, ${record.home_address}</td></tr>` : ""}
  </table>

  <p>${record.notification_content || "Further details as per above."}</p>

  ${record.first_accommodation_date ? `<p>A child was first accommodated at the above premises on ${format(new Date(record.first_accommodation_date), "d MMMM yyyy")}. This notification is submitted within the 72-hour period required by Regulation 34(4).</p>` : ""}

  <p>If you require any further information please do not hesitate to contact us.</p>

  <div class="signature">
    <p>Yours faithfully,</p><br/><br/>
    <p><strong>${record.approved_by_name || "Registered Service Manager"}</strong><br/>
    Registered Service Manager / Nominated Individual<br/>
    ${orgProfile.provider_legal_name}</p>
  </div>

  <div class="footer">
    <p>Generated ${format(new Date(), "d MMMM yyyy HH:mm")}</p>
  </div>
</body>
</html>`;
    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">Regulation 34 — Notice of Changes</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          The registered person must notify Ofsted in writing of specified changes. New premises: 72 hours. Premises no longer in use: 10 working days. Organisational changes: as soon as reasonably practicable.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-xs text-red-600 font-medium">72-Hour Pending</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{kpis.pending72}</p>
        </div>
        <div className="bg-red-50 border border-red-300 rounded-xl p-4">
          <p className="text-xs text-red-600 font-medium">Overdue</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{kpis.overdue}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-xs text-green-600 font-medium">On Time This Year</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{kpis.onTime}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs text-amber-600 font-medium">Late This Year</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{kpis.late}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground font-medium">Total This Year</p>
          <p className="text-2xl font-bold mt-1">{kpis.total}</p>
        </div>
      </div>

      {/* Urgent 72-hour alert */}
      {urgent72h.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-red-600 uppercase">⚠️ URGENT 72-HOUR DEADLINES</p>
          <div className="space-y-2">
            {urgent72h.map(r => (
              <div key={r.id} className="bg-red-50 border border-red-300 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-red-900">{r.home_name || "Organisational Change"}</p>
                    <p className="text-sm text-red-700 mt-1">{r.change_type_description}</p>
                    <p className="text-xs text-red-600 mt-2">Deadline: {format(new Date(r.notification_deadline), "d MMM yyyy HH:mm")}</p>
                  </div>
                  <CountdownTimer deadline={r.notification_deadline} isSeventy2Hours={true} />
                </div>
                <Button className="mt-3 bg-red-600 hover:bg-red-700 text-white" size="sm">
                  Record Notification
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="border border-border rounded-lg px-3 py-2 text-sm bg-card"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="pending_notification">Pending Notification</option>
          <option value="notified_on_time">On Time</option>
          <option value="notified_late">Late</option>
          <option value="overdue">Overdue</option>
        </select>

        <select
          value={filterChangeType}
          onChange={e => setFilterChangeType(e.target.value)}
          className="border border-border rounded-lg px-3 py-2 text-sm bg-card"
        >
          <option value="all">All Change Types</option>
          {Object.entries(CHANGE_TYPE_GROUPS).map(([group, types]) => (
            <optgroup key={group} label={group}>
              {types.map(type => (
                <option key={type} value={type}>{type.replace(/_/g, " ")}</option>
              ))}
            </optgroup>
          ))}
        </select>

        <select
          value={filterHome}
          onChange={e => setFilterHome(e.target.value)}
          className="border border-border rounded-lg px-3 py-2 text-sm bg-card"
        >
          <option value="all">All Homes</option>
          {homes.map(h => (
            <option key={h.id} value={h.id}>{h.name}</option>
          ))}
        </select>

        <Button className="ml-auto" size="sm">
          <Plus className="w-4 h-4 mr-2" /> New Change Notification
        </Button>
      </div>

      {/* Main table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="text-left px-4 py-3 text-xs font-semibold">Change Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold">Home / Premises</th>
              <th className="text-left px-4 py-3 text-xs font-semibold">Change Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold">Deadline Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold">Deadline</th>
              <th className="text-left px-4 py-3 text-xs font-semibold">Notified</th>
              <th className="text-left px-4 py-3 text-xs font-semibold">On Time</th>
              <th className="text-left px-4 py-3 text-xs font-semibold">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.map(r => (
              <tr key={r.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3 text-xs capitalize">{r.change_type.replace(/_/g, " ")}</td>
                <td className="px-4 py-3 text-xs">{r.home_name || "—"}</td>
                <td className="px-4 py-3 text-xs">{format(new Date(r.change_event_date), "dd MMM yyyy")}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DEADLINE_BADGES[r.deadline_type]?.color}`}>
                    {DEADLINE_BADGES[r.deadline_type]?.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs">{format(new Date(r.notification_deadline), "dd MMM yyyy")}</td>
                <td className="px-4 py-3 text-xs">{r.notification_sent ? format(new Date(r.notification_sent_date), "dd MMM") : "—"}</td>
                <td className="px-4 py-3">
                  {r.notification_within_deadline ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : r.notification_sent ? <XCircle className="w-4 h-4 text-red-600" /> : "—"}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    r.status === "notified_on_time" ? "bg-green-100 text-green-700" :
                    r.status === "notified_late" ? "bg-amber-100 text-amber-700" :
                    r.status === "overdue" ? "bg-red-100 text-red-700" :
                    "bg-blue-100 text-blue-700"
                  }`}>{r.status}</span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => exportNoticeGenerator(r)}
                    className="text-xs text-primary hover:underline"
                  >
                    <Download className="w-3 h-3 inline mr-1" /> Notice
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredRecords.length === 0 && (
          <div className="p-12 text-center text-muted-foreground text-sm">No change notifications found.</div>
        )}
      </div>
    </div>
  );
}