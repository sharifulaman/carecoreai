import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, formatDistanceToNow } from "date-fns";
import {
  Loader2, PackageOpen, ChevronLeft, QrCode, Printer, Download,
  AlertTriangle, Wrench, FileText, ShieldCheck, History, Eye,
  MapPin, Calendar, DollarSign, Tag, User, Clock, CheckCircle,
  XCircle, AlertCircle, Upload, ExternalLink, RefreshCw, Lock,
  Activity, Building2, Zap
} from "lucide-react";
import ReportIssueModal from "@/components/assets/ReportIssueModal";

// ─── Helpers ────────────────────────────────────────────────────────────────

const CONDITION_STYLES = {
  excellent: { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
  good:      { bg: "bg-blue-100",    text: "text-blue-700",    border: "border-blue-200",    dot: "bg-blue-500" },
  fair:      { bg: "bg-amber-100",   text: "text-amber-700",   border: "border-amber-200",   dot: "bg-amber-500" },
  poor:      { bg: "bg-red-100",     text: "text-red-700",     border: "border-red-200",     dot: "bg-red-500" },
};

const STATUS_STYLES = {
  active:          { bg: "bg-emerald-100", text: "text-emerald-700", label: "Active" },
  under_warranty:  { bg: "bg-blue-100",    text: "text-blue-700",    label: "Under Warranty" },
  needs_repair:    { bg: "bg-amber-100",   text: "text-amber-700",   label: "Needs Repair" },
  out_of_service:  { bg: "bg-red-100",     text: "text-red-700",     label: "Out of Service" },
};

const MAINT_STATUS_STYLES = {
  reported:             { bg: "bg-red-100",    text: "text-red-700",    label: "Reported" },
  in_progress:          { bg: "bg-blue-100",   text: "text-blue-700",   label: "In Progress" },
  awaiting_contractor:  { bg: "bg-amber-100",  text: "text-amber-700",  label: "Awaiting Contractor" },
  completed:            { bg: "bg-green-100",  text: "text-green-700",  label: "Completed" },
  cancelled:            { bg: "bg-gray-100",   text: "text-gray-500",   label: "Cancelled" },
};

function StatusBadge({ status, map, className = "" }) {
  const s = map[status] || { bg: "bg-gray-100", text: "text-gray-600", label: status };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text} ${className}`}>
      {s.label || status?.replace(/_/g, " ")}
    </span>
  );
}

function InfoRow({ label, value, mono = false }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start justify-between py-3 border-b border-gray-100 last:border-0 gap-4">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex-shrink-0 pt-0.5">{label}</span>
      <span className={`text-sm text-gray-800 text-right ${mono ? "font-mono" : "font-medium"}`}>{value}</span>
    </div>
  );
}

function SectionCard({ title, children, action }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="font-bold text-gray-900 text-sm">{title}</h3>
        {action}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

// ─── QR Code Download helper ─────────────────────────────────────────────────
function downloadQR(assetId, assetName) {
  const url = `${window.location.origin}/assets/${assetId}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
  const a = document.createElement("a");
  a.href = qrSrc;
  a.download = `QR-${assetName || assetId}.png`;
  a.target = "_blank";
  a.click();
}

// ─── Print Label helper ───────────────────────────────────────────────────────
function printLabel(asset) {
  const url = `${window.location.origin}/assets/${asset.id}`;
  const content = `<!DOCTYPE html><html><head><title>Asset Label</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; }
    .label { width: 240px; border: 2px solid #1e40af; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
    .brand { font-size: 9px; font-weight: 900; color: #1e40af; letter-spacing: 2px; text-transform: uppercase; }
    img { width: 110px; height: 110px; }
    .name { font-size: 13px; font-weight: 700; color: #111827; text-align: center; }
    .id { font-size: 8px; font-family: monospace; color: #6b7280; text-align: center; word-break: break-all; }
    .row { display: flex; gap: 4px; flex-wrap: wrap; justify-content: center; }
    .badge { font-size: 9px; px: 6px; padding: 2px 6px; border-radius: 6px; background: #eff6ff; color: #1d4ed8; font-weight: 600; text-transform: capitalize; }
    .scan { font-size: 8px; color: #9ca3af; margin-top: 4px; }
    @media print { @page { margin: 5mm; } }
  </style></head><body>
  <div class="label">
    <div class="brand">CareCore AI</div>
    <img src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}" alt="QR" />
    <div class="name">${asset.asset_name || "Asset"}</div>
    <div class="id">ID: ${asset.asset_id || asset.id}</div>
    <div class="row">
      ${asset.category ? `<div class="badge">${asset.category}</div>` : ""}
      ${asset.location_in_home ? `<div class="badge">${asset.location_in_home.replace(/_/g," ")}</div>` : ""}
      ${asset.condition ? `<div class="badge">${asset.condition}</div>` : ""}
    </div>
    <div class="scan">Scan to view full asset details</div>
  </div>
  <script>window.onload=()=>{window.print();}<\/script></body></html>`;
  const w = window.open("", "_blank", "width=350,height=600");
  w.document.write(content);
  w.document.close();
}

// ─── Tab: Overview ────────────────────────────────────────────────────────────
function OverviewTab({ asset }) {
  const today = new Date();
  const warrantyDate = asset.warranty_expiry ? new Date(asset.warranty_expiry) : null;
  const daysLeft = warrantyDate ? Math.ceil((warrantyDate - today) / (1000 * 60 * 60 * 24)) : null;

  return (
    <div className="space-y-4">
      <SectionCard title="Asset Information">
        <InfoRow label="Asset Name" value={asset.asset_name} />
        <InfoRow label="Asset ID" value={asset.asset_id} mono />
        <InfoRow label="Serial Number" value={asset.serial_number} mono />
        <InfoRow label="Category" value={asset.category ? asset.category.charAt(0).toUpperCase() + asset.category.slice(1) : null} />
        <InfoRow label="Supplier / Brand" value={asset.supplier} />
        <InfoRow label="Purchase Date" value={asset.purchase_date ? format(new Date(asset.purchase_date), "dd MMMM yyyy") : null} />
        <InfoRow label="Purchase Cost" value={asset.purchase_cost != null ? `£${Number(asset.purchase_cost).toLocaleString("en-GB", { minimumFractionDigits: 2 })}` : null} />
        <InfoRow label="Notes" value={asset.notes} />
      </SectionCard>

      <SectionCard title="Location">
        <InfoRow label="Home" value={asset.home_name} />
        <InfoRow label="Room / Area" value={asset.location_in_home?.replace(/_/g, " ")} />
        <InfoRow label="Assigned Room" value={asset.assigned_room} />
      </SectionCard>

      <SectionCard title="Warranty & Service">
        <InfoRow label="Warranty Expiry" value={warrantyDate ? format(warrantyDate, "dd MMMM yyyy") : null} />
        {daysLeft !== null && (
          <div className="py-3 border-b border-gray-100">
            <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
              daysLeft > 90 ? "bg-green-100 text-green-700" :
              daysLeft > 0  ? "bg-amber-100 text-amber-700" :
                              "bg-red-100 text-red-700"
            }`}>
              {daysLeft > 0 ? `${daysLeft} days remaining` : "Warranty Expired"}
            </span>
          </div>
        )}
        <InfoRow label="Next Service Due" value={asset.next_service_due ? format(new Date(asset.next_service_due), "dd MMMM yyyy") : null} />
      </SectionCard>
    </div>
  );
}

// ─── Tab: Maintenance ─────────────────────────────────────────────────────────
function MaintenanceTab({ asset, user, onReportIssue }) {
  const { data: issues = [], isLoading } = useQuery({
    queryKey: ["asset-maintenance", asset.id],
    queryFn: () => base44.entities.PropertyMaintenance.filter({ asset_id: asset.id }, "-reported_at", 50),
    enabled: !!asset.id,
  });

  const open = issues.filter(i => i.status !== "completed" && i.status !== "cancelled");
  const closed = issues.filter(i => i.status === "completed" || i.status === "cancelled");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-gray-900">{open.length} Open Request{open.length !== 1 ? "s" : ""}</p>
          <p className="text-xs text-gray-500">{closed.length} completed</p>
        </div>
        <button
          onClick={onReportIssue}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700"
        >
          <AlertTriangle className="w-4 h-4" /> Report Issue
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : issues.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-7 h-7 text-green-600" />
          </div>
          <p className="text-sm font-semibold text-gray-700 mb-1">No issues reported</p>
          <p className="text-xs text-gray-400">This asset has no maintenance history</p>
        </div>
      ) : (
        <div className="space-y-3">
          {issues.map(issue => (
            <div key={issue.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="text-sm font-semibold text-gray-900 flex-1">{issue.issue_title || "Issue"}</p>
                <StatusBadge status={issue.status || "reported"} map={MAINT_STATUS_STYLES} />
              </div>
              {issue.description && <p className="text-xs text-gray-500 mb-2">{issue.description}</p>}
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1"><User className="w-3 h-3" />{issue.reported_by || "Unknown"}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />
                  {issue.reported_at ? formatDistanceToNow(new Date(issue.reported_at), { addSuffix: true }) : "—"}
                </span>
                <span className={`px-2 py-0.5 rounded-full font-bold capitalize text-[10px] ${
                  { high: "bg-red-100 text-red-700", urgent: "bg-red-200 text-red-800", medium: "bg-amber-100 text-amber-700", low: "bg-slate-100 text-slate-600" }[issue.priority] || "bg-gray-100 text-gray-600"
                }`}>{issue.priority || "medium"}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Documents ───────────────────────────────────────────────────────────
function DocumentsTab({ asset, user, canUpload }) {
  const fileRef = useRef(null);
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["asset-docs", asset.id],
    queryFn: () => base44.entities.AssetDocument.filter({ asset_id: asset.id }, "-created_date", 50),
    enabled: !!asset.id,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      setUploading(true);
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        return base44.entities.AssetDocument.create({
          asset_id: asset.id,
          asset_name: asset.asset_name,
          file_name: file.name,
          file_url,
          file_type: file.type,
          uploaded_by: user?.email || null,
          org_id: "default",
        });
      } finally {
        setUploading(false);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["asset-docs", asset.id] }),
  });

  const DOC_ICONS = { "application/pdf": "📄", "image/jpeg": "🖼️", "image/png": "🖼️", "application/msword": "📝" };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{docs.length} document{docs.length !== 1 ? "s" : ""}</p>
        {canUpload && (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-60"
          >
            <Upload className="w-4 h-4" />
            {uploading ? "Uploading..." : "Upload Document"}
          </button>
        )}
        <input ref={fileRef} type="file" className="hidden" onChange={e => e.target.files?.[0] && uploadMutation.mutate(e.target.files[0])} />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : docs.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-500 mb-1">No documents yet</p>
          <p className="text-xs text-gray-400">Upload invoices, manuals, warranties, and certificates</p>
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map(doc => (
            <div key={doc.id} className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-200 transition-colors">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                {DOC_ICONS[doc.file_type] || "📎"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{doc.file_name || "Document"}</p>
                <p className="text-xs text-gray-400">
                  {doc.uploaded_by || "Unknown"} · {doc.created_date ? formatDistanceToNow(new Date(doc.created_date), { addSuffix: true }) : "—"}
                </p>
              </div>
              {doc.file_url && (
                <a href={doc.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-blue-600 font-semibold hover:underline flex-shrink-0">
                  <Download className="w-3.5 h-3.5" /> Download
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Compliance ──────────────────────────────────────────────────────────
function ComplianceTab({ asset }) {
  const today = new Date();
  const patExpiry = asset.pat_expiry ? new Date(asset.pat_expiry) : null;
  const inspectionDate = asset.inspection_date ? new Date(asset.inspection_date) : null;
  const patDaysLeft = patExpiry ? Math.ceil((patExpiry - today) / (1000 * 60 * 60 * 24)) : null;

  const patStatus = !patExpiry ? "unknown" : patDaysLeft > 30 ? "pass" : patDaysLeft > 0 ? "warning" : "fail";
  const patStyles = { pass: "bg-green-100 text-green-700", warning: "bg-amber-100 text-amber-700", fail: "bg-red-100 text-red-700", unknown: "bg-gray-100 text-gray-500" };
  const patLabels = { pass: "Valid", warning: "Expiring Soon", fail: "Expired", unknown: "Not Recorded" };

  return (
    <div className="space-y-4">
      <SectionCard title="PAT Testing">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-gray-500">Portable Appliance Testing</p>
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${patStyles[patStatus]}`}>
            {patLabels[patStatus]}
          </span>
        </div>
        <InfoRow label="PAT Test Date" value={asset.pat_test_date ? format(new Date(asset.pat_test_date), "dd MMMM yyyy") : null} />
        <InfoRow label="PAT Expiry" value={patExpiry ? format(patExpiry, "dd MMMM yyyy") : null} />
        {patDaysLeft !== null && (
          <div className="pt-2">
            <p className={`text-xs font-semibold ${patDaysLeft > 0 ? (patDaysLeft > 30 ? "text-green-600" : "text-amber-600") : "text-red-600"}`}>
              {patDaysLeft > 0 ? `${patDaysLeft} days until PAT expiry` : "PAT certificate has expired"}
            </p>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Inspection Records">
        <InfoRow label="Last Inspection Date" value={inspectionDate ? format(inspectionDate, "dd MMMM yyyy") : null} />
        <InfoRow label="Inspection Result" value={asset.inspection_result} />
        <InfoRow label="Inspector" value={asset.inspector_name} />
        <InfoRow label="Safety Status" value={asset.safety_status} />
        <InfoRow label="Next Inspection Due" value={asset.next_inspection_due ? format(new Date(asset.next_inspection_due), "dd MMMM yyyy") : null} />
        {!asset.inspection_date && (
          <div className="py-4 text-center">
            <p className="text-xs text-gray-400">No inspection records recorded for this asset</p>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ─── Tab: Audit Trail ─────────────────────────────────────────────────────────
function AuditTrailTab({ asset }) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["asset-audit", asset.id],
    queryFn: () => base44.entities.AssetAuditLog.filter({ asset_id: asset.id }, "-created_date", 100),
    enabled: !!asset.id,
  });

  const ACTION_ICONS = {
    created: { icon: "✨", bg: "bg-blue-100", text: "text-blue-700" },
    updated: { icon: "✏️", bg: "bg-amber-100", text: "text-amber-700" },
    moved:   { icon: "📦", bg: "bg-purple-100", text: "text-purple-700" },
    repaired:{ icon: "🔧", bg: "bg-green-100", text: "text-green-700" },
    disposed:{ icon: "🗑️", bg: "bg-red-100",   text: "text-red-700" },
  };

  // Synthetic audit from asset timestamps when no formal log exists
  const syntheticLogs = [];
  if (asset.created_date) syntheticLogs.push({ id: "syn-create", action: "created", actor: asset.created_by || "System", timestamp: asset.created_date, comment: "Asset record created" });
  if (asset.updated_date && asset.updated_date !== asset.created_date) syntheticLogs.push({ id: "syn-update", action: "updated", actor: "System", timestamp: asset.updated_date, comment: "Asset record updated" });

  const allLogs = logs.length > 0 ? logs : syntheticLogs;

  return (
    <div className="space-y-3">
      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : allLogs.length === 0 ? (
        <div className="text-center py-12">
          <History className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No audit trail entries yet</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-px bg-gray-200" />
          <div className="space-y-4">
            {allLogs.map((log, i) => {
              const style = ACTION_ICONS[log.action] || { icon: "📋", bg: "bg-gray-100", text: "text-gray-600" };
              return (
                <div key={log.id || i} className="flex gap-4 pl-2">
                  <div className={`w-8 h-8 rounded-xl ${style.bg} flex items-center justify-center text-sm flex-shrink-0 z-10 ring-2 ring-white`}>
                    {style.icon}
                  </div>
                  <div className="flex-1 bg-white rounded-xl border border-gray-200 p-3.5">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className={`text-xs font-bold uppercase tracking-wide ${style.text}`}>{log.action || "Action"}</p>
                      <p className="text-xs text-gray-400 flex-shrink-0">
                        {log.timestamp ? formatDistanceToNow(new Date(log.timestamp), { addSuffix: true }) : "—"}
                      </p>
                    </div>
                    <p className="text-sm text-gray-700 mb-1.5">{log.comment || log.description || "No details"}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" />{log.actor || log.user || "Unknown"}</span>
                      {log.role && <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{log.role}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Scan History ────────────────────────────────────────────────────────
function ScanHistoryTab({ asset }) {
  const { data: scans = [], isLoading } = useQuery({
    queryKey: ["asset-scans", asset.id],
    queryFn: () => base44.entities.AssetScanLog.filter({ asset_id: asset.id }, "-scanned_at", 100),
    enabled: !!asset.id,
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Scans", value: scans.length, icon: <Activity className="w-4 h-4 text-blue-600" />, bg: "bg-blue-50" },
          { label: "Last Scanned", value: scans[0]?.scanned_at ? formatDistanceToNow(new Date(scans[0].scanned_at), { addSuffix: true }) : "Never", icon: <Clock className="w-4 h-4 text-purple-600" />, bg: "bg-purple-50" },
          { label: "Unique Users", value: new Set(scans.map(s => s.user_id).filter(Boolean)).size, icon: <User className="w-4 h-4 text-green-600" />, bg: "bg-green-50" },
        ].map(card => (
          <div key={card.label} className={`${card.bg} rounded-xl p-3 text-center`}>
            <div className="flex justify-center mb-1.5">{card.icon}</div>
            <p className="text-lg font-bold text-gray-900">{card.value}</p>
            <p className="text-xs text-gray-500">{card.label}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : scans.length === 0 ? (
        <div className="text-center py-10">
          <QrCode className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No scans recorded yet</p>
          <p className="text-xs text-gray-300 mt-1">Scans will appear here after the QR code is scanned</p>
        </div>
      ) : (
        <div className="space-y-2">
          {scans.map((scan, i) => (
            <div key={scan.id || i} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-3.5">
              <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <QrCode className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-700">{scan.user_name || scan.user_email || "Anonymous"}</p>
                <p className="text-xs text-gray-400 truncate">{scan.device ? scan.device.slice(0, 50) + "..." : "Unknown device"}</p>
              </div>
              <p className="text-xs text-gray-400 flex-shrink-0">
                {scan.scanned_at ? format(new Date(scan.scanned_at), "dd MMM · HH:mm") : "—"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
const TABS = [
  { id: "overview",    label: "Overview",    icon: Eye },
  { id: "maintenance", label: "Maintenance", icon: Wrench },
  { id: "documents",   label: "Documents",   icon: FileText },
  { id: "compliance",  label: "Compliance",  icon: ShieldCheck },
  { id: "audit",       label: "Audit Trail", icon: History },
  { id: "scans",       label: "Scan History",icon: Activity },
];

export default function AssetProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [showReportIssue, setShowReportIssue] = useState(false);

  // Get logged-in user if available
  const [user, setUser] = useState(null);
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("user");
      if (stored) setUser(JSON.parse(stored));
    } catch (_) {}
  }, []);

  // Determine role rank
  const ROLE_RANK = { admin: 99, rsm: 50, regional_manager: 40, team_manager: 30, admin_manager: 30, team_leader: 20, support_worker: 10 };
  const roleRank = ROLE_RANK[user?.role] ?? 0;
  const canUploadDocs = roleRank >= 20;
  const canEdit = roleRank >= 30;

  // Fetch asset — try with auth first, then fall back to no-auth
  const { data: asset, isLoading, error } = useQuery({
    queryKey: ["asset-profile", id],
    queryFn: async () => {
      const API_BASE = import.meta.env.DEV ? '/api' : (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api").replace(/\/$/, "");
      const token = sessionStorage.getItem("access_token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      // Try authenticated first; if 401, retry without auth header
      let res = await fetch(`${API_BASE}/entities/HomeAsset/${id}`, { headers, credentials: "include" });
      if (res.status === 401 && token) {
        delete headers["Authorization"];
        res = await fetch(`${API_BASE}/entities/HomeAsset/${id}`, { headers, credentials: "include" });
      }
      if (!res.ok) {
        const err = new Error("Asset not found");
        err.status = res.status;
        throw err;
      }
      const payload = await res.json();
      return payload?.data ?? payload;
    },
    enabled: !!id,
    retry: 0,
  });

  // Log scan
  useEffect(() => {
    if (!asset?.id) return;
    base44.entities.AssetScanLog.create({
      asset_id: asset.id,
      asset_name: asset.asset_name,
      user_id: user?.id || null,
      user_email: user?.email || null,
      user_name: user?.full_name || null,
      scanned_at: new Date().toISOString(),
      device: navigator.userAgent,
      ip_address: null,
    }).catch(() => {}); // Fail silently
  }, [asset?.id, user?.id]);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <QrCode className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-sm font-semibold text-gray-700">Loading asset profile...</p>
          <p className="text-xs text-gray-400 mt-1">CareCore AI Asset Tracker</p>
        </div>
      </div>
    );
  }

  // ── Not found ────────────────────────────────────────────────────────────────
  if (error || !asset) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8 text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <PackageOpen className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Asset Not Found</h2>
          <p className="text-sm text-gray-500 mb-6">This QR code may be invalid or the asset has been removed.</p>
          <p className="text-xs text-gray-300 font-mono mb-4">ID: {id}</p>
          <div className="flex items-center justify-center gap-1 text-xs text-blue-600 font-bold">
            <Building2 className="w-3.5 h-3.5" /> CareCore AI
          </div>
        </div>
      </div>
    );
  }

  const condStyle = CONDITION_STYLES[asset.condition] || { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200", dot: "bg-gray-400" };
  const statusStyle = STATUS_STYLES[asset.status] || { bg: "bg-gray-100", text: "text-gray-600", label: asset.status };
  const qrUrl = `${window.location.origin}/assets/${asset.id}`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center">
            <Building2 className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-xs font-bold text-blue-700 tracking-wide">CareCore AI</span>
        </div>
        {user && (
          <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-700">
            {(user.full_name || user.email || "?")[0].toUpperCase()}
          </div>
        )}
      </div>

      {/* Login Banner (unauthenticated) */}
      {!user && (
        <div className="bg-blue-600 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-white">
            <Lock className="w-4 h-4 flex-shrink-0" />
            <p className="text-xs font-medium">Log in to report issues, request maintenance & more</p>
          </div>
          <a href="/" className="flex-shrink-0 px-3 py-1.5 bg-white text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-50">
            Log In
          </a>
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-white border-b border-gray-200 px-4 pt-5 pb-0">
        <div className="flex gap-4 mb-5">
          {/* Asset photo or placeholder */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {asset.photo_url
              ? <img src={asset.photo_url} alt={asset.asset_name} className="w-full h-full object-cover" />
              : <PackageOpen className="w-9 h-9 text-blue-400" />
            }
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 leading-tight mb-1.5">{asset.asset_name || "Unnamed Asset"}</h1>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${condStyle.bg} ${condStyle.text} ${condStyle.border}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${condStyle.dot}`} />
                {asset.condition ? asset.condition.charAt(0).toUpperCase() + asset.condition.slice(1) : "Unknown"}
              </span>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${statusStyle.bg} ${statusStyle.text}`}>
                {statusStyle.label}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
              {asset.home_name && (
                <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{asset.home_name}</span>
              )}
              {asset.location_in_home && (
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{asset.location_in_home.replace(/_/g, " ")}</span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pb-0 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
          {user && (
            <>
              <button
                onClick={() => setShowReportIssue(true)}
                className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700"
              >
                <AlertTriangle className="w-3.5 h-3.5" /> Report Issue
              </button>
              <button
                onClick={() => { setShowReportIssue(true); setActiveTab("maintenance"); }}
                className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600"
              >
                <Wrench className="w-3.5 h-3.5" /> Maintenance
              </button>
            </>
          )}
          <button
            onClick={() => printLabel(asset)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 bg-gray-800 text-white rounded-xl text-xs font-bold hover:bg-gray-900"
          >
            <Printer className="w-3.5 h-3.5" /> Print Label
          </button>
          <button
            onClick={() => downloadQR(asset.id, asset.asset_name)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 border-2 border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50"
          >
            <Download className="w-3.5 h-3.5" /> QR
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 mt-4 overflow-x-auto scrollbar-none -mx-4 px-4">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4 py-5 max-w-2xl mx-auto">
        {activeTab === "overview"    && <OverviewTab asset={asset} />}
        {activeTab === "maintenance" && <MaintenanceTab asset={asset} user={user} onReportIssue={() => setShowReportIssue(true)} />}
        {activeTab === "documents"   && <DocumentsTab asset={asset} user={user} canUpload={canUploadDocs} />}
        {activeTab === "compliance"  && <ComplianceTab asset={asset} />}
        {activeTab === "audit"       && <AuditTrailTab asset={asset} />}
        {activeTab === "scans"       && <ScanHistoryTab asset={asset} />}
      </div>

      {/* QR Code Card (bottom of overview) */}
      {activeTab === "overview" && (
        <div className="px-4 pb-8 max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col items-center text-center">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Asset QR Code</p>
            <div className="bg-white border border-gray-200 rounded-xl p-3 mb-3 inline-block">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrUrl)}`}
                alt="Asset QR Code"
                className="w-40 h-40"
              />
            </div>
            <p className="text-xs font-mono text-gray-400 mb-1 break-all px-4">{qrUrl}</p>
            <p className="text-xs text-gray-400 mb-4">Scan to open this asset profile on any device</p>
            <div className="flex gap-2">
              <button onClick={() => printLabel(asset)} className="flex items-center gap-1.5 px-4 py-2 bg-gray-800 text-white rounded-xl text-xs font-bold hover:bg-gray-900">
                <Printer className="w-3.5 h-3.5" /> Print Label
              </button>
              <button onClick={() => downloadQR(asset.id, asset.asset_name)} className="flex items-center gap-1.5 px-4 py-2 border-2 border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50">
                <Download className="w-3.5 h-3.5" /> Download QR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Issue Modal */}
      {showReportIssue && (
        <ReportIssueModal
          asset={asset}
          user={user}
          onClose={() => setShowReportIssue(false)}
          onSuccess={() => setActiveTab("maintenance")}
        />
      )}
    </div>
  );
}
