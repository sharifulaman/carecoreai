import { X, CheckCircle2, XCircle, AlertTriangle, ExternalLink, Eye, FileText } from "lucide-react";

function DataTable({ headers, rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs text-slate-500">
            {headers.map((h, i) => <th key={i} className={h.center ? "text-center py-2 px-2 font-medium" : "text-left py-2 px-2 font-medium"}>{h.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
              {row.map((cell, j) => <td key={j} className={cell.center ? "py-2 px-2 text-center" : "py-2 px-2"}>{cell.content}</td>)}
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={headers.length} className="py-8 text-center text-slate-400">No records found.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function renderSectionView(sectionKey, data) {
  switch (sectionKey) {
    case "overview":
      return (
        <div className="space-y-1.5">
          {data.readinessChecks.map(check => (
            <div key={check.id} className="flex items-center gap-2.5 py-2 border-b border-slate-100 last:border-0">
              {check.passed ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
              <span className={`text-sm flex-1 ${check.passed ? "text-slate-600" : "text-slate-900 font-medium"}`}>{check.label}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${check.passed ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{check.passed ? "Passed" : "Failed"}</span>
            </div>
          ))}
        </div>
      );

    case "provider":
      const org = data.orgProfile || {};
      const fields = [
        { label: "Provider Legal Name", value: org.provider_legal_name },
        { label: "Trading Name", value: org.trading_name },
        { label: "Ofsted URN", value: org.ofsted_urn },
        { label: "Registration Date", value: org.registration_date },
        { label: "Registered Service Manager", value: org.registered_service_manager_name },
        { label: "Manager Qualification Held", value: org.registered_manager_qualification_held ? "Yes" : "No" },
      ];
      return (
        <div className="space-y-2">
          {fields.map(f => (
            <div key={f.label} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
              <span className="text-sm text-slate-500">{f.label}</span>
              {f.value ? <span className="text-sm font-medium text-slate-900">{f.value}</span> : <span className="text-sm text-red-600 font-medium">Missing</span>}
            </div>
          ))}
        </div>
      );

    case "children":
      return (
        <DataTable
          headers={[
            { label: "Name" }, { label: "Home" }, { label: "Accommodation" }, { label: "Placing LA" }, { label: "UASC", center: true },
          ]}
          rows={data.currentResidents.map(r => {
            const home = data.homes.find(h => h.id === r.home_id);
            return [
              { content: <span className="font-medium text-slate-900">{r.display_name || r.full_name}</span> },
              { content: <span className="text-slate-600">{home?.name || "—"}</span> },
              { content: r.accommodation_category ? <span className="text-slate-600 capitalize">{r.accommodation_category.replace(/_/g, " ")}</span> : <span className="text-red-600">Missing</span> },
              { content: r.placing_local_authority ? <span className="text-slate-600">{r.placing_local_authority}</span> : <span className="text-red-600">Missing</span> },
              { content: r.uasc ? <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">Yes</span> : r.uasc === false ? <span className="text-xs text-slate-400">No</span> : <span className="text-xs text-red-600">Unknown</span>, center: true },
            ];
          })}
        />
      );

    case "incidents":
      return (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2">Missing From Home Episodes ({data.mfhRecords.length})</p>
            <DataTable
              headers={[{ label: "Resident" }, { label: "Home" }, { label: "Reported" }, { label: "Status", center: true }, { label: "RHI", center: true }]}
              rows={data.mfhRecords.map(m => [
                { content: <span className="font-medium text-slate-900">{m.resident_name || "—"}</span> },
                { content: <span className="text-slate-600">{m.home_name || "—"}</span> },
                { content: <span className="text-slate-600">{m.reported_missing_datetime ? new Date(m.reported_missing_datetime).toLocaleDateString() : "—"}</span> },
                { content: <span className={`text-xs px-1.5 py-0.5 rounded ${m.status === "active" ? "bg-red-50 text-red-700" : m.status === "returned" ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-600"}`}>{m.status}</span>, center: true },
                { content: m.rhi_offered_by_la ? <span className="text-xs text-green-600">Yes</span> : m.rhi_offered_by_la === false ? <span className="text-xs text-red-600">No</span> : <span className="text-xs text-amber-600">Unknown</span>, center: true },
              ])}
            />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2">Complaints ({data.complaints.length})</p>
            <DataTable
              headers={[{ label: "Ref" }, { label: "Date" }, { label: "Type" }, { label: "Status", center: true }]}
              rows={data.complaints.map(c => [
                { content: <span className="font-mono text-xs text-slate-500">{c.complaint_id || c.id?.slice(0, 8)}</span> },
                { content: <span className="text-slate-600">{c.received_datetime ? new Date(c.received_datetime).toLocaleDateString() : "—"}</span> },
                { content: <span className="text-slate-600 capitalize">{c.complaint_type?.replace(/_/g, " ") || "—"}</span> },
                { content: <span className={`text-xs px-1.5 py-0.5 rounded capitalize ${c.status === "resolved" || c.status === "closed" ? "bg-green-50 text-green-700" : c.status === "investigating" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>{c.status}</span>, center: true },
              ])}
            />
          </div>
        </div>
      );

    case "safeguarding":
      const allegations = data.allegations || [];
      const exploitationRisks = data.exploitationRisks || [];
      return (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2">Allegations ({allegations.length})</p>
            <DataTable
              headers={[{ label: "Type" }, { label: "Date" }, { label: "Status" }, { label: "Investigation", center: true }]}
              rows={allegations.map(a => [
                { content: <span className="text-slate-600 capitalize">{a.allegation_type?.replace(/_/g, " ") || "—"}</span> },
                { content: <span className="text-slate-600">{a.allegation_date ? new Date(a.allegation_date).toLocaleDateString() : "—"}</span> },
                { content: <span className="text-slate-600">{a.status || "—"}</span> },
                { content: <span className={`text-xs px-1.5 py-0.5 rounded ${a.investigation_status === "closed" ? "bg-green-50 text-green-700" : a.investigation_status === "under_investigation" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>{a.investigation_status || "Missing"}</span>, center: true },
              ])}
            />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2">Exploitation Risk Assessments ({exploitationRisks.length})</p>
            {exploitationRisks.length === 0 ? (
              <p className="text-sm text-red-600 py-2">No exploitation risk assessments recorded.</p>
            ) : (
              <DataTable
                headers={[{ label: "Resident" }, { label: "Type" }, { label: "Risk Level", center: true }]}
                rows={exploitationRisks.map(e => [
                  { content: <span className="text-slate-600">{e.resident_name || "—"}</span> },
                  { content: <span className="text-slate-600 capitalize">{e.exploitation_type?.replace(/_/g, " ") || "—"}</span> },
                  { content: <span className={`text-xs px-1.5 py-0.5 rounded capitalize ${e.risk_level === "high" || e.risk_level === "critical" ? "bg-red-50 text-red-700" : e.risk_level === "medium" ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"}`}>{e.risk_level || "—"}</span>, center: true },
                ])}
              />
            )}
          </div>
        </div>
      );

    case "staffing":
      return (
        <DataTable
          headers={[{ label: "Name" }, { label: "Role" }, { label: "DBS Expiry" }, { label: "DBS Status", center: true }]}
          rows={data.staff.map(s => {
            const dbsValid = s.dbs_expiry && new Date(s.dbs_expiry) > new Date();
            return [
              { content: <span className="font-medium text-slate-900">{s.full_name}</span> },
              { content: <span className="text-slate-600 capitalize">{s.role?.replace(/_/g, " ")}</span> },
              { content: <span className="text-slate-600">{s.dbs_expiry || "—"}</span> },
              { content: <span className={`text-xs px-1.5 py-0.5 rounded ${dbsValid ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{dbsValid ? "Valid" : "Expired"}</span>, center: true },
            ];
          })}
        />
      );

    case "education":
      return (
        <div className="space-y-2">
          {data.currentResidents.map(r => {
            const edu = data.educationRecords.find(e => e.resident_id === r.id);
            const health = data.healthProfiles.find(h => h.resident_id === r.id);
            return (
              <div key={r.id} className="flex items-center gap-3 p-2.5 border border-slate-100 rounded-lg">
                <span className="text-sm font-medium text-slate-900 w-32 truncate">{r.display_name || r.full_name}</span>
                <div className="flex gap-2 flex-1">
                  <span className={`text-xs px-2 py-1 rounded ${edu ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{edu ? `Edu: ${edu.status || "Enrolled"}` : "No education record"}</span>
                  <span className={`text-xs px-2 py-1 rounded ${health ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{health ? "Health profile" : "No health profile"}</span>
                </div>
              </div>
            );
          })}
          {data.currentResidents.length === 0 && <p className="py-8 text-center text-slate-400">No residents in scope.</p>}
        </div>
      );

    case "premises":
      return (
        <DataTable
          headers={[{ label: "Home" }, { label: "Type" }, { label: "Gas Safety" }, { label: "Electrical Cert" }, { label: "Fire Risk", center: true }]}
          rows={data.homes.map(h => {
            const gasValid = h.gas_safety_expiry && new Date(h.gas_safety_expiry) > new Date();
            const elecValid = h.electrical_cert_expiry && new Date(h.electrical_cert_expiry) > new Date();
            const fireValid = h.fire_risk_assessment_expiry && new Date(h.fire_risk_assessment_expiry) > new Date();
            return [
              { content: <span className="font-medium text-slate-900">{h.name}</span> },
              { content: <span className="text-slate-600 capitalize">{h.type?.replace(/_/g, " ") || "—"}</span> },
              { content: gasValid ? <span className="text-xs text-green-600">{h.gas_safety_expiry}</span> : <span className="text-xs text-red-600">{h.gas_safety_expiry || "Missing"}</span> },
              { content: elecValid ? <span className="text-xs text-green-600">{h.electrical_cert_expiry}</span> : <span className="text-xs text-red-600">{h.electrical_cert_expiry || "Missing"}</span> },
              { content: fireValid ? <span className="text-xs text-green-600">Valid</span> : <span className="text-xs text-red-600">Expired</span>, center: true },
            ];
          })}
        />
      );

    case "support":
      return (
        <DataTable
          headers={[{ label: "Name" }, { label: "Social Worker" }, { label: "Placing LA" }, { label: "SW Contact", center: true }]}
          rows={data.currentResidents.map(r => [
            { content: <span className="font-medium text-slate-900">{r.display_name || r.full_name}</span> },
            { content: r.social_worker_name ? <span className="text-slate-600">{r.social_worker_name}</span> : <span className="text-red-600">Missing</span> },
            { content: r.placing_local_authority ? <span className="text-slate-600">{r.placing_local_authority}</span> : <span className="text-red-600">Missing</span> },
            { content: r.social_worker_phone || r.social_worker_email ? <span className="text-xs text-blue-600">Available</span> : <span className="text-xs text-slate-400">None</span>, center: true },
          ])}
        />
      );

    default:
      return <p className="text-sm text-slate-400">No detailed evidence view available for this section.</p>;
  }
}

export default function AnnexADetailModal({ modal, data, onClose }) {
  if (!modal) return null;
  const { title, icon: Icon, iconColor, type, sectionKey, checkLabel, sectionData, action } = modal;

  const renderContent = () => {
    switch (type) {
      case "readiness":
      case "checks":
        return (
          <div className="space-y-1.5">
            {data.readinessChecks.map(check => (
              <div key={check.id} className="flex items-center gap-2.5 py-2 border-b border-slate-100 last:border-0">
                {check.passed ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                <span className={`text-sm flex-1 ${check.passed ? "text-slate-600" : "text-slate-900 font-medium"}`}>{check.label}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${check.passed ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{check.passed ? "Passed" : "Failed"}</span>
              </div>
            ))}
            <div className="pt-3 text-xs text-slate-500">{data.passedChecks} of {data.totalChecks} checks passed ({Math.round((data.passedChecks / data.totalChecks) * 100)}% readiness)</div>
          </div>
        );

      case "gaps":
        const failed = data.readinessChecks.filter(c => !c.passed);
        return failed.length === 0 ? (
          <div className="text-center py-8"><CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" /><p className="text-sm text-slate-600">No critical gaps — all checks passed.</p></div>
        ) : (
          <div className="space-y-2">
            {failed.map(check => (
              <div key={check.id} className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-100 rounded-lg">
                <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{check.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Fix in: {check.fixTab} section</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Critical</span>
              </div>
            ))}
          </div>
        );

      case "residents":
        return renderSectionView("children", data);

      case "homes":
        return renderSectionView("premises", data);

      case "missing":
        return (
          <DataTable
            headers={[{ label: "Resident" }, { label: "Home" }, { label: "Reported" }, { label: "Status", center: true }, { label: "RHI", center: true }]}
            rows={data.mfhRecords.map(m => [
              { content: <span className="font-medium text-slate-900">{m.resident_name || "—"}</span> },
              { content: <span className="text-slate-600">{m.home_name || "—"}</span> },
              { content: <span className="text-slate-600">{m.reported_missing_datetime ? new Date(m.reported_missing_datetime).toLocaleDateString() : "—"}</span> },
              { content: <span className={`text-xs px-1.5 py-0.5 rounded ${m.status === "active" ? "bg-red-50 text-red-700" : m.status === "returned" ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-600"}`}>{m.status}</span>, center: true },
              { content: m.rhi_offered_by_la ? <span className="text-xs text-green-600">Yes</span> : m.rhi_offered_by_la === false ? <span className="text-xs text-red-600">No</span> : <span className="text-xs text-amber-600">Unknown</span>, center: true },
            ])}
          />
        );

      case "complaints":
        return (
          <DataTable
            headers={[{ label: "Ref" }, { label: "Date" }, { label: "Type" }, { label: "Home" }, { label: "Status", center: true }]}
            rows={data.complaints.map(c => [
              { content: <span className="font-mono text-xs text-slate-500">{c.complaint_id || c.id?.slice(0, 8)}</span> },
              { content: <span className="text-slate-600">{c.received_datetime ? new Date(c.received_datetime).toLocaleDateString() : "—"}</span> },
              { content: <span className="text-slate-600 capitalize">{c.complaint_type?.replace(/_/g, " ") || "—"}</span> },
              { content: <span className="text-slate-600">{c.home_name || "—"}</span> },
              { content: <span className={`text-xs px-1.5 py-0.5 rounded capitalize ${c.status === "resolved" || c.status === "closed" ? "bg-green-50 text-green-700" : c.status === "investigating" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>{c.status}</span>, center: true },
            ])}
          />
        );

      case "staff":
        return renderSectionView("staffing", data);

      case "education":
        return renderSectionView("education", data);

      case "export":
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-xs text-slate-500">Readiness Score</p>
                <p className={`text-2xl font-bold ${data.readinessScore >= 80 ? "text-green-600" : data.readinessScore >= 50 ? "text-amber-600" : "text-red-600"}`}>{data.readinessScore}%</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-xs text-slate-500">Checks Passed</p>
                <p className="text-2xl font-bold text-slate-900">{data.passedChecks}/{data.totalChecks}</p>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm font-medium text-amber-900">{data.readinessScore >= 80 ? "Ready to export" : "Review needed before export"}</p>
              <p className="text-xs text-amber-700 mt-1">{data.lastExportTime ? `Last exported: ${data.lastExportTime.toLocaleString()}` : "Not yet exported"}</p>
            </div>
          </div>
        );

      case "section":
        if (!sectionData) return <p className="text-sm text-slate-400">Section data not available.</p>;

        if (action === "fix") {
          return (
            <div className="space-y-3">
              {sectionData.gaps.length === 0 ? (
                <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-green-700">No gaps to fix. All evidence is complete.</span>
                </div>
              ) : (
                sectionData.gaps.map((g, i) => (
                  <div key={i} className="p-3 border border-amber-200 rounded-lg bg-amber-50">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{g}</p>
                        <p className="text-xs text-slate-500 mt-1">Navigate to the relevant section to update this data.</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          );
        }

        if (action === "note") {
          return (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500">Missing</p>
                  <p className="text-lg font-bold text-red-600">{sectionData.missing}</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500">Evidence</p>
                  <p className="text-lg font-bold text-blue-600">{sectionData.evidence}</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500">Complete</p>
                  <p className={`text-lg font-bold ${sectionData.completion >= 80 ? "text-green-600" : sectionData.completion >= 50 ? "text-amber-600" : "text-red-600"}`}>{sectionData.completion}%</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">Inspection Notes</label>
                <textarea placeholder="Add notes for this section..." rows={6} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400" />
              </div>
              <p className="text-xs text-slate-400">Notes are for internal review and will be included in the export pack.</p>
            </div>
          );
        }

        // action === "view"
        return renderSectionView(sectionData.key, data);

      case "fix":
        const check = data.readinessChecks.find(c => c.label === checkLabel);
        if (!check) return <p className="text-sm text-slate-400">Check not found.</p>;
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 p-3 bg-red-50 border border-red-100 rounded-lg">
              <XCircle className="w-5 h-5 text-red-500 shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-900">{check.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">Fix in: {check.fixTab} section</p>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-700 flex items-center gap-1.5"><ExternalLink className="w-3.5 h-3.5" /> Navigate to the {check.fixTab} section to resolve this gap.</p>
            </div>
          </div>
        );

      default:
        return <p className="text-sm text-slate-400">No data available.</p>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-lg max-w-3xl w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            {Icon && <Icon className={`w-5 h-5 ${iconColor || "text-slate-600"}`} />}
            <h3 className="font-semibold text-slate-900">{title}</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4">{renderContent()}</div>
      </div>
    </div>
  );
}