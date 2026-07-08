import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import {
  MessageSquare, ClipboardList, FileText, Settings2, Plus, Eye, MoreHorizontal,
  Download, Edit, CheckCircle2, Clock, Users, Layers, ChevronRight, X,
  AlertTriangle, Flag, Send, Save, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import YPVoiceFormModal from "./YPVoiceFormModal";
import YPVoiceTemplateManager from "./YPVoiceTemplateManager";
import SWPAFeedbackTab from "../swpa-feedback/SWPAFeedbackTab";

const STATUS_BADGES = {
  draft:             "bg-amber-100 text-amber-700",
  submitted:         "bg-green-100 text-green-700",
  in_review:         "bg-blue-100 text-blue-700",
  signed_off:        "bg-emerald-100 text-emerald-700",
  changes_requested: "bg-orange-100 text-orange-700",
  archived:          "bg-muted text-muted-foreground",
};

const TEMPLATE_META = {
  voice_feedback:  { label: "Voice Feedback",        icon: MessageSquare, color: "bg-blue-100 text-blue-600",   accent: "border-l-blue-400"   },
  meeting_record:  { label: "Monthly Meeting Record", icon: ClipboardList, color: "bg-purple-100 text-purple-600", accent: "border-l-purple-400" },
  questionnaire:   { label: "Feedback Questionnaire", icon: FileText,      color: "bg-orange-100 text-orange-600", accent: "border-l-orange-400" },
};

export default function YPVoiceFeedback({ staffProfile, user, staff = [], homes = [] }) {
  const qc = useQueryClient();
  const staffRole = staffProfile?.role || (user?.role === "admin" ? "admin" : "support_worker");
  const canManageTemplates = ["admin", "rsm", "regional_manager", "team_manager", "hr_manager"].includes(staffRole);

  const [activeTab, setActiveTab]   = useState("voice_feedback");
  const [showForm, setShowForm]     = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [viewRecord, setViewRecord] = useState(null);

  // Queries
  const { data: templates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ["yp-feedback-templates"],
    queryFn: () => base44.entities.YPFeedbackTemplate.filter({ org_id: ORG_ID }, "-created_date", 50),
    staleTime: 5 * 60 * 1000,
  });

  const { data: submissions = [], isLoading: loadingSubmissions } = useQuery({
    queryKey: ["yp-feedback-submissions"],
    queryFn: () => base44.entities.YPFeedbackSubmission.filter({ org_id: ORG_ID }, "-created_date", 200),
    staleTime: 2 * 60 * 1000,
  });

  const { data: residents = [] } = useQuery({
    queryKey: ["ch-residents"],
    queryFn: () => secureGateway.filter("Resident", {}, "-created_date", 500),
    staleTime: 5 * 60 * 1000,
  });

  // Seed default templates if none exist
  const seedMutation = useMutation({
    mutationFn: async () => {
      const defaults = [
        { org_id: ORG_ID, name: "Young People's Voice Feedback", category: "voice_feedback", description: "Ongoing feedback form capturing young people's views on safety, support, and wellbeing.", frequency: "Every 3 months", status: "active", active_version_number: "2.3" },
        { org_id: ORG_ID, name: "Monthly Young People's Meeting Record", category: "meeting_record", description: "Monthly meeting record capturing issues raised, topics discussed, and agreed actions.", frequency: "Monthly", status: "active", active_version_number: "1.8" },
        { org_id: ORG_ID, name: "Young Person's Feedback Questionnaire", category: "questionnaire", description: "Quarterly questionnaire capturing detailed feedback across all areas of a young person's life.", frequency: "Quarterly", status: "active", active_version_number: "2.1" },
      ];
      for (const t of defaults) {
        await base44.entities.YPFeedbackTemplate.create(t);
      }
      qc.invalidateQueries({ queryKey: ["yp-feedback-templates"] });
    },
  });

  // KPI calculations
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString().split("T")[0];
  const weekEnd   = endOfWeek(now, { weekStartsOn: 1 }).toISOString().split("T")[0];
  const monthStart = startOfMonth(now).toISOString().split("T")[0];
  const monthEnd   = endOfMonth(now).toISOString().split("T")[0];

  const kpis = useMemo(() => {
    const dueThisWeek = submissions.filter(s =>
      s.due_date && s.due_date >= weekStart && s.due_date <= weekEnd && s.status === "draft"
    ).length;
    const submittedThisMonth = submissions.filter(s =>
      s.submitted_at && s.submitted_at.split("T")[0] >= monthStart && s.submitted_at.split("T")[0] <= monthEnd
      && ["submitted","in_review","signed_off"].includes(s.status)
    ).length;
    const meetingsHeld = submissions.filter(s =>
      s.template_category === "meeting_record" && s.status === "signed_off" &&
      s.submitted_at && s.submitted_at.split("T")[0] >= monthStart
    ).length;
    const activeTemplates = templates.filter(t => t.status === "active").length;
    return { dueThisWeek, submittedThisMonth, meetingsHeld, activeTemplates };
  }, [submissions, templates, weekStart, weekEnd, monthStart, monthEnd]);

  const activeTemplatesByCategory = useMemo(() => {
    const map = {};
    templates.forEach(t => { if (t.status === "active") map[t.category] = t; });
    return map;
  }, [templates]);

  // Tab filtered submissions
  const tabSubmissions = useMemo(() =>
    submissions.filter(s => activeTab === "all" ? true : s.template_category === activeTab)
      .slice(0, 20),
    [submissions, activeTab]
  );

  const tabs = [
    { key: "voice_feedback",   label: "Voice Feedback",         icon: MessageSquare },
    { key: "meeting_record",   label: "Monthly Meeting Record", icon: ClipboardList },
    { key: "questionnaire",    label: "Feedback Questionnaire", icon: FileText },
    { key: "swpa_feedback",    label: "Social Worker/PA Feedback", icon: Users },
    { key: "template_manager", label: "Template Manager",       icon: Settings2 },
  ];

  const handleNewSubmission = () => {
    if (templates.length === 0) {
      toast.error("No templates available to create a submission.");
      return;
    }
    setShowForm(true);
  };

  const handleReview = async (sub) => {
    await base44.entities.YPFeedbackSubmission.update(sub.id, {
      status: "in_review",
      reviewed_by_id: staffProfile?.id,
      reviewed_by_name: staffProfile?.full_name,
      reviewed_at: new Date().toISOString(),
    });
    qc.invalidateQueries({ queryKey: ["yp-feedback-submissions"] });
    toast.success("Marked as In Review");
  };

  const handleSignOff = async (sub) => {
    await base44.entities.YPFeedbackSubmission.update(sub.id, {
      status: "signed_off",
      reviewed_by_id: staffProfile?.id,
      reviewed_by_name: staffProfile?.full_name,
      reviewed_at: new Date().toISOString(),
    });
    qc.invalidateQueries({ queryKey: ["yp-feedback-submissions"] });
    toast.success("Signed off");
  };

  const exportSubmission = (sub) => {
    const win = window.open("", "_blank");
    const r = sub.response_json || {};
    const printDate = format(new Date(), "dd MMM yyyy HH:mm");
    const submittedDate = sub.submitted_at ? format(new Date(sub.submitted_at), "dd MMM yyyy HH:mm") : "Draft";

    // ── Voice Feedback ──────────────────────────────────────────────
    const VF_QUESTIONS = [
      "Do you feel safe and comfortable in your home and neighbourhood?",
      "Do you feel listened to and respected by your support worker?",
      "Do you feel confident that the adults supporting you understand you, have the right skills, and work well together to meet your needs?",
      "Do you have your own space that you feel proud of and live in comfortable, well-maintained, and stable accommodation?",
      "Do you receive high-quality support from your worker who advocates for you and helps maintain your health and wellbeing?",
      "Do you have a strong, trusting, and meaningful support system with the adults around you, and can you rely on them for support?",
      "Do you feel supported to learn and develop the skills you need for independent living?",
      "Do you feel positive about your future and the opportunities available to you because of the support you have received?",
    ];

    // ── Questionnaire ────────────────────────────────────────────────
    const QS_SECTIONS = [
      { title: "About You", questions: ["How would you describe how things are going for you right now, in general?"] },
      { title: "Feeling Safe and Supported", questions: ["Do you feel safe in the place where you live?", "Can you tell us more about why or why not?", "Who do you feel you can talk to when something is bothering you?", "Is there anything that would make you feel safer or more comfortable where you live?"] },
      { title: "Daily Life and Wellbeing", questions: ["What do you enjoy most about your day-to-day life?", "What things are hard or stressful now?", "Is there something you wish was different about your school, college, or training?"] },
      { title: "Relationships and Support", questions: ["Who makes you feel supported, heard, or cared about?", "Are there times you feel left out or not listened to?", "Can you share what happened?"] },
      { title: "Your Voice Matters", questions: ["If there's one thing the organisation could do better for you, what would it be?", "What helps you feel included in decisions about your care and your life?", "Have you had any experiences with us, good or bad, that you'd like to tell us about?"] },
      { title: "Final Thoughts", questions: ["Is there anything else you'd like to share with us?"] },
    ];

    // ── Response badge colour ────────────────────────────────────────
    const badgeStyle = (val) => {
      const v = (val || "").toLowerCase();
      if (v === "yes")        return "background:#d1fae5;color:#065f46;";
      if (v === "no")         return "background:#fee2e2;color:#991b1b;";
      if (v === "sometimes")  return "background:#fef3c7;color:#92400e;";
      return "background:#f1f5f9;color:#475569;";
    };

    // ── Build responses HTML per category ───────────────────────────
    let responsesHTML = "";

    if (sub.template_category === "voice_feedback") {
      responsesHTML = VF_QUESTIONS.map((q, i) => {
        const resp    = r[`q${i+1}_response`] || "";
        const comment = r[`q${i+1}_comment`]  || "";
        return `
          <div style="margin-bottom:14px;padding:14px 16px;border:1px solid #e2e8f0;border-radius:10px;background:#fafafa;page-break-inside:avoid;">
            <p style="margin:0 0 8px;font-size:12.5px;font-weight:600;color:#1e293b;">${i+1}. ${q}</p>
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
              ${resp ? `<span style="display:inline-block;padding:3px 12px;border-radius:20px;font-size:11.5px;font-weight:600;${badgeStyle(resp)}">${resp}</span>` : `<span style="color:#94a3b8;font-size:11.5px;font-style:italic;">No response</span>`}
              ${comment ? `<span style="font-size:11.5px;color:#475569;">— ${comment}</span>` : ""}
            </div>
          </div>`;
      }).join("");

      // Signatures
      if (r.signature || r.staff_signature) {
        responsesHTML += `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:20px;padding-top:16px;border-top:1px solid #e2e8f0;">
            <div>
              <p style="font-size:10px;color:#64748b;margin:0 0 4px;">Young Person Signature</p>
              <p style="font-size:13px;font-weight:500;margin:0;border-bottom:1px solid #cbd5e1;padding-bottom:6px;">${r.signature || ""}</p>
            </div>
            <div>
              <p style="font-size:10px;color:#64748b;margin:0 0 4px;">Staff Signature</p>
              <p style="font-size:13px;font-weight:500;margin:0;border-bottom:1px solid #cbd5e1;padding-bottom:6px;">${r.staff_signature || ""}</p>
            </div>
          </div>`;
      }

    } else if (sub.template_category === "questionnaire") {
      responsesHTML = QS_SECTIONS.map((sec, si) => {
        const rows = sec.questions.map((q, qi) => {
          const ans = r[`s${si+1}_q${qi+1}`] || "";
          if (!ans) return "";
          return `
            <div style="margin-bottom:12px;">
              <p style="margin:0 0 4px;font-size:11.5px;color:#64748b;">${q}</p>
              <p style="margin:0;font-size:12.5px;color:#1e293b;background:#f8fafc;border-left:3px solid #6366f1;padding:6px 10px;border-radius:0 6px 6px 0;">${ans}</p>
            </div>`;
        }).join("");
        if (!rows) return "";
        return `
          <div style="margin-bottom:16px;page-break-inside:avoid;">
            <h3 style="margin:0 0 10px;font-size:12.5px;font-weight:700;color:#4f46e5;background:#eef2ff;padding:6px 12px;border-radius:6px;">${sec.title}</h3>
            ${rows}
          </div>`;
      }).join("");

      if (r.yp_signature) {
        responsesHTML += `
          <div style="margin-top:20px;padding-top:16px;border-top:1px solid #e2e8f0;max-width:300px;">
            <p style="font-size:10px;color:#64748b;margin:0 0 4px;">Young Person Signature</p>
            <p style="font-size:13px;font-weight:500;margin:0;border-bottom:1px solid #cbd5e1;padding-bottom:6px;">${r.yp_signature}</p>
          </div>`;
      }

    } else if (sub.template_category === "meeting_record") {
      const topicsHTML = Array.isArray(r.topics_discussed) && r.topics_discussed.length
        ? r.topics_discussed.map(t => `<span style="display:inline-block;background:#ede9fe;color:#5b21b6;font-size:11px;padding:3px 10px;border-radius:20px;margin:2px;">${t}</span>`).join("")
        : `<span style="color:#94a3b8;font-size:11.5px;font-style:italic;">None recorded</span>`;

      const actionsHTML = Array.isArray(r.agreed_actions) && r.agreed_actions.filter(a => a.action).length
        ? `<table style="width:100%;border-collapse:collapse;font-size:11.5px;margin-top:6px;">
            <thead><tr style="background:#f1f5f9;">
              <th style="text-align:left;padding:7px 10px;border:1px solid #e2e8f0;font-weight:600;">Action</th>
              <th style="text-align:left;padding:7px 10px;border:1px solid #e2e8f0;font-weight:600;">Responsible</th>
              <th style="text-align:left;padding:7px 10px;border:1px solid #e2e8f0;font-weight:600;">Target Date</th>
            </tr></thead>
            <tbody>${r.agreed_actions.filter(a => a.action).map(a => `
              <tr>
                <td style="padding:7px 10px;border:1px solid #e2e8f0;">${a.action}</td>
                <td style="padding:7px 10px;border:1px solid #e2e8f0;">${a.responsible || "—"}</td>
                <td style="padding:7px 10px;border:1px solid #e2e8f0;">${a.target_date || "—"}</td>
              </tr>`).join("")}</tbody>
          </table>`
        : `<p style="color:#94a3b8;font-size:11.5px;font-style:italic;">No actions recorded</p>`;

      const field = (label, val) => val
        ? `<div style="margin-bottom:12px;"><p style="font-size:10px;color:#64748b;margin:0 0 3px;">${label}</p><p style="font-size:12.5px;color:#1e293b;margin:0;">${val}</p></div>`
        : "";

      responsesHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px;">
          ${field("Staff Position Facilitating", r.facilitator_position)}
          ${field("Young People Attending",      r.yp_attending)}
          ${field("Young People Absent",         r.yp_absent)}
        </div>
        <div style="margin-bottom:18px;">
          <p style="font-size:11px;font-weight:700;color:#374151;margin:0 0 8px;text-transform:uppercase;letter-spacing:.5px;">Topics Discussed</p>
          <div>${topicsHTML}</div>
        </div>
        ${r.issues_raised ? `
          <div style="margin-bottom:18px;">
            <p style="font-size:11px;font-weight:700;color:#374151;margin:0 0 6px;text-transform:uppercase;letter-spacing:.5px;">Issues Raised / Discussions</p>
            <p style="font-size:12px;color:#1e293b;background:#f8fafc;padding:10px 14px;border-radius:8px;border:1px solid #e2e8f0;white-space:pre-wrap;margin:0;">${r.issues_raised}</p>
          </div>` : ""}
        <div style="margin-bottom:18px;">
          <p style="font-size:11px;font-weight:700;color:#374151;margin:0 0 8px;text-transform:uppercase;letter-spacing:.5px;">Agreed Actions</p>
          ${actionsHTML}
        </div>
        ${r.other_comments ? `
          <div style="margin-bottom:18px;">
            <p style="font-size:11px;font-weight:700;color:#374151;margin:0 0 6px;text-transform:uppercase;letter-spacing:.5px;">Any Other Comments</p>
            <p style="font-size:12px;color:#1e293b;background:#f8fafc;padding:10px 14px;border-radius:8px;border:1px solid #e2e8f0;margin:0;">${r.other_comments}</p>
          </div>` : ""}
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;padding-top:16px;border-top:1px solid #e2e8f0;">
          ${field("Staff Name",       r.staff_name)}
          ${field("Chairperson Name", r.chair_name)}
          ${field("Next Meeting",     r.next_meeting_date)}
        </div>`;
    }

    // ── Status badge ─────────────────────────────────────────────────
    const statusColors = {
      draft:     "background:#fef3c7;color:#92400e;",
      submitted: "background:#d1fae5;color:#065f46;",
      in_review: "background:#dbeafe;color:#1e40af;",
      signed_off:"background:#ecfdf5;color:#065f46;",
    };
    const statusStyle = statusColors[sub.status] || "background:#f1f5f9;color:#475569;";

    // ── Flags ────────────────────────────────────────────────────────
    const flagsHTML = [
      sub.concern_flagged  ? `<span style="display:inline-flex;align-items:center;gap:5px;background:#fee2e2;color:#991b1b;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;">⚑ Concern Flagged</span>` : "",
      sub.action_required  ? `<span style="display:inline-flex;align-items:center;gap:5px;background:#fef3c7;color:#92400e;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;">⚠ Action Required</span>` : "",
    ].filter(Boolean).join("&nbsp;");

    // ── Category accent colour ────────────────────────────────────────
    const accentColor = {
      voice_feedback: "#3b82f6",
      meeting_record: "#8b5cf6",
      questionnaire:  "#f59e0b",
    }[sub.template_category] || "#3b82f6";

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${sub.template_name}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'Segoe UI',Arial,sans-serif;color:#1e293b;background:#fff;font-size:13px;}
    @page{margin:20mm 15mm;size:A4;}
    @media print{
      .no-print{display:none!important;}
      body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    }
    .page{max-width:800px;margin:0 auto;padding:32px 36px;}

    /* Header band */
    .header-band{background:${accentColor};height:6px;border-radius:4px;margin-bottom:28px;}

    /* Doc header */
    .doc-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;}
    .doc-title{font-size:22px;font-weight:700;color:#0f172a;line-height:1.2;}
    .doc-subtitle{font-size:13px;color:#64748b;margin-top:4px;}
    .doc-logo{font-size:11px;color:#94a3b8;text-align:right;line-height:1.6;}

    /* Meta grid */
    .meta-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:24px;}
    .meta-cell{padding:12px 16px;border-right:1px solid #e2e8f0;}
    .meta-cell:last-child{border-right:none;}
    .meta-cell:nth-child(n+4){border-top:1px solid #e2e8f0;}
    .meta-label{font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;}
    .meta-value{font-size:13px;font-weight:600;color:#1e293b;}

    /* Status badge */
    .status-badge{display:inline-block;padding:3px 12px;border-radius:20px;font-size:11.5px;font-weight:700;${statusStyle}}

    /* Flags row */
    .flags-row{display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap;}

    /* Section heading */
    .section-heading{font-size:14px;font-weight:700;color:#0f172a;padding-bottom:8px;border-bottom:2px solid ${accentColor};margin-bottom:16px;}

    /* Review notes */
    .review-box{background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px 16px;margin-top:24px;}
    .review-box-title{font-size:12px;font-weight:700;color:#1d4ed8;margin-bottom:6px;}
    .review-box-by{font-size:10.5px;color:#64748b;margin-top:6px;}

    /* Print footer */
    .print-footer{margin-top:32px;padding-top:14px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:10px;color:#94a3b8;}
  </style>
</head>
<body>
<div class="page">

  <div class="header-band"></div>

  <!-- Document header -->
  <div class="doc-header">
    <div>
      <div class="doc-title">${sub.template_name}</div>
      <div class="doc-subtitle">${sub.resident_name || "—"} &nbsp;·&nbsp; ${sub.home_name || "—"}</div>
    </div>
    <div class="doc-logo">
      CareCoreAI<br/>
      <span style="font-size:10px;">Ref: ${sub.id ? sub.id.slice(0,8).toUpperCase() : "—"}</span>
    </div>
  </div>

  <!-- Meta grid -->
  <div class="meta-grid">
    <div class="meta-cell">
      <div class="meta-label">Status</div>
      <div class="meta-value"><span class="status-badge">${(sub.status || "draft").replace(/_/g, " ")}</span></div>
    </div>
    <div class="meta-cell">
      <div class="meta-label">Date</div>
      <div class="meta-value">${r.date || "—"}</div>
    </div>
    <div class="meta-cell">
      <div class="meta-label">Submitted</div>
      <div class="meta-value">${submittedDate}</div>
    </div>
    <div class="meta-cell">
      <div class="meta-label">Young Person</div>
      <div class="meta-value">${sub.resident_name || "—"}</div>
    </div>
    <div class="meta-cell">
      <div class="meta-label">Home / Placement</div>
      <div class="meta-value">${sub.home_name || "—"}</div>
    </div>
    <div class="meta-cell">
      <div class="meta-label">Staff Member</div>
      <div class="meta-value">${sub.submitted_by_name || sub.last_updated_by_name || "—"}</div>
    </div>
    <div class="meta-cell">
      <div class="meta-label">Form Version</div>
      <div class="meta-value">v${sub.template_version || "1.0"}</div>
    </div>
    ${sub.reviewed_by_name ? `
    <div class="meta-cell">
      <div class="meta-label">Reviewed By</div>
      <div class="meta-value">${sub.reviewed_by_name}</div>
    </div>` : ""}
    ${sub.reviewed_at ? `
    <div class="meta-cell">
      <div class="meta-label">Reviewed At</div>
      <div class="meta-value">${format(new Date(sub.reviewed_at), "dd MMM yyyy HH:mm")}</div>
    </div>` : ""}
  </div>

  <!-- Flags -->
  ${flagsHTML ? `<div class="flags-row">${flagsHTML}</div>` : ""}

  <!-- Responses -->
  <div class="section-heading">Responses</div>
  ${responsesHTML || `<p style="color:#94a3b8;font-style:italic;">No responses recorded.</p>`}

  <!-- Review notes -->
  ${sub.review_notes ? `
  <div class="review-box">
    <div class="review-box-title">📋 Review Notes</div>
    <p style="font-size:12.5px;color:#1e40af;">${sub.review_notes}</p>
    <div class="review-box-by">— ${sub.reviewed_by_name || "Reviewer"} &nbsp;·&nbsp; ${sub.reviewed_at ? format(new Date(sub.reviewed_at), "dd MMM yyyy") : ""}</div>
  </div>` : ""}

  <!-- Print footer -->
  <div class="print-footer">
    <span>Generated: ${printDate}</span>
    <span>${sub.template_name} &nbsp;·&nbsp; ${sub.template_category?.replace(/_/g, " ") || ""}</span>
    <span>CareCoreAI Compliance System</span>
  </div>

</div>
</body>
</html>`;

    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
  };


  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" /> Young People's Voice &amp; Feedback
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Capture feedback, meetings, participation records and quality assurance evidence in one place.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canManageTemplates && (
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => { setActiveTab("template_manager"); }}>
              <Settings2 className="w-3.5 h-3.5" /> Manage Templates
            </Button>
          )}
          <Button size="sm" className="gap-1.5 text-xs" onClick={handleNewSubmission}>
            <Plus className="w-3.5 h-3.5" /> New Submission
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Due This Week",         value: kpis.dueThisWeek,        icon: Clock,         color: "text-blue-600",   bg: "bg-blue-50",    sub: "Submissions" },
          { label: "Submitted This Month",  value: kpis.submittedThisMonth, icon: CheckCircle2,  color: "text-green-600",  bg: "bg-green-50",   sub: "Submissions" },
          { label: "Meetings Held",         value: kpis.meetingsHeld,       icon: Users,         color: "text-purple-600", bg: "bg-purple-50",  sub: "This Month"  },
          { label: "Active Templates",      value: kpis.activeTemplates,    icon: Layers,        color: "text-orange-600", bg: "bg-orange-50",  sub: "Templates"   },
        ].map(({ label, value, icon: Icon, color, bg, sub }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
            <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs font-medium text-foreground">{sub}</p>
              <p className="text-[11px] text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border overflow-x-auto scrollbar-none">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Social Worker/PA Feedback Tab */}
      {activeTab === "swpa_feedback" && (
        <SWPAFeedbackTab user={user} staffProfile={staffProfile} />
      )}

      {/* Template Manager Tab */}
      {activeTab === "template_manager" && (
        <YPVoiceTemplateManager
          templates={templates}
          staffProfile={staffProfile}
          canManage={canManageTemplates}
          onRefresh={() => qc.invalidateQueries({ queryKey: ["yp-feedback-templates"] })}
          onSeedDefaults={() => seedMutation.mutate()}
          seedingDefaults={seedMutation.isPending}
        />
      )}

      {/* Form tabs */}
      {activeTab !== "template_manager" && activeTab !== "swpa_feedback" && (
        <div className="grid grid-cols-1 xl:grid-cols-[260px_1fr] gap-4">
          {/* Left: Form Library */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold">Form Library</h3>
              {canManageTemplates && (
                <button onClick={() => setActiveTab("template_manager")} className="text-xs text-primary hover:underline flex items-center gap-1">
                  <Plus className="w-3 h-3" /> New
                </button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">Organise and manage live forms for young people.</p>

            {loadingTemplates ? (
              <div className="text-xs text-muted-foreground py-4 text-center">Loading templates...</div>
            ) : templates.length === 0 ? (
              <div className="text-center py-6 space-y-3">
                <p className="text-xs text-muted-foreground">No templates yet.</p>
              </div>
            ) : (
              templates.map(tmpl => {
                const meta = TEMPLATE_META[tmpl.category] || TEMPLATE_META.voice_feedback;
                const Icon = meta.icon;
                const isActive = activeTab === tmpl.category;
                return (
                  <div key={tmpl.id} className={`border rounded-xl p-3 ${isActive ? "border-primary/40 bg-primary/5" : "border-border"}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg ${meta.color} flex items-center justify-center shrink-0`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold leading-tight">{tmpl.name}</p>
                          <p className="text-[10px] text-muted-foreground capitalize">{tmpl.frequency || "Ongoing"}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">Active</span>
                        <span className="text-[10px] text-muted-foreground">v{tmpl.active_version_number}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      <button onClick={() => { setActiveTab(tmpl.category); setShowForm(true); }} className="flex items-center gap-1 text-[11px] text-primary hover:underline font-medium">
                        <Edit className="w-3 h-3" /> Open
                      </button>
                      <span className="text-muted-foreground text-[10px]">·</span>
                      <button onClick={() => setActiveTab(tmpl.category)} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
                        <Eye className="w-3 h-3" /> Preview
                      </button>
                    </div>
                  </div>
                );
              })
            )}
            <p className="text-[10px] text-muted-foreground italic mt-2 border-t border-border pt-2">
              All templates can be edited by authorised admins. Changes apply to future submissions only.
            </p>
          </div>

          {/* Right: submissions list + recent table */}
          <div className="space-y-4">
            {/* Current tab info */}
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  {(() => {
                    const meta = TEMPLATE_META[activeTab];
                    if (!meta) return null;
                    const Icon = meta.icon;
                    return (
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${meta.color.split(" ")[1]}`} />
                        <h3 className="text-sm font-semibold">{meta.label}</h3>
                        {activeTemplatesByCategory[activeTab] && (
                          <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                            v{activeTemplatesByCategory[activeTab].active_version_number}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>
                <Button size="sm" className="gap-1.5 text-xs" onClick={() => setShowForm(true)}>
                  <Plus className="w-3.5 h-3.5" /> New {TEMPLATE_META[activeTab]?.label}
                </Button>
              </div>

              {/* Submissions for this category */}
              {loadingSubmissions ? (
                <div className="py-8 text-center text-xs text-muted-foreground">Loading submissions...</div>
              ) : tabSubmissions.length === 0 ? (
                <div className="py-10 text-center">
                  <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No submissions yet for this form type.</p>
                  <Button size="sm" variant="outline" className="mt-3 text-xs gap-1" onClick={() => setShowForm(true)}>
                    <Plus className="w-3 h-3" /> Create First Submission
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {tabSubmissions.map(sub => (
                    <div key={sub.id} className={`border-l-4 ${TEMPLATE_META[sub.template_category]?.accent || "border-l-border"} bg-muted/20 rounded-r-xl p-3 flex items-center gap-3`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-semibold">
                            {sub.template_category === "meeting_record"
                              ? sub.response_json?.yp_attending || "—"
                              : sub.resident_name || "—"}
                          </p>
                          <span className="text-[10px] text-muted-foreground">{sub.home_name || "—"}</span>
                          {sub.concern_flagged && <Flag className="w-3 h-3 text-red-500" />}
                          {sub.action_required && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {sub.submitted_at ? format(new Date(sub.submitted_at), "dd MMM yyyy HH:mm") : "Draft"} · {sub.submitted_by_name || "—"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_BADGES[sub.status] || "bg-muted text-muted-foreground"}`}>
                          {sub.status?.replace(/_/g, " ")}
                        </span>
                        <button onClick={() => setViewRecord(sub)} className="text-muted-foreground hover:text-foreground" title="View">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => exportSubmission(sub)} className="text-muted-foreground hover:text-foreground" title="Export PDF">
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        {canManageTemplates && sub.status === "submitted" && (
                          <button onClick={() => handleReview(sub)} className="text-blue-500 hover:text-blue-700 text-[10px] font-medium">Review</button>
                        )}
                        {canManageTemplates && sub.status === "in_review" && (
                          <button onClick={() => handleSignOff(sub)} className="text-green-600 hover:text-green-700 text-[10px] font-medium">Sign Off</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Submissions Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold">Recent Submissions</h3>
                <button onClick={() => qc.invalidateQueries({ queryKey: ["yp-feedback-submissions"] })} className="text-muted-foreground hover:text-foreground">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[700px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      <th className="text-left px-4 py-2.5 font-semibold">Form</th>
                      <th className="text-left px-4 py-2.5 font-semibold">Young Person</th>
                      <th className="text-left px-4 py-2.5 font-semibold">Home</th>
                      <th className="text-left px-4 py-2.5 font-semibold">Status</th>
                      <th className="text-left px-4 py-2.5 font-semibold">Last Updated</th>
                      <th className="text-left px-4 py-2.5 font-semibold">Updated By</th>
                      <th className="text-left px-4 py-2.5 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.slice(0, 10).length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No submissions yet.</td></tr>
                    ) : submissions.slice(0, 10).map(sub => (
                      <tr key={sub.id} className="border-b border-border/50 last:border-0 hover:bg-muted/10 cursor-pointer" onClick={() => setViewRecord(sub)}>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            {(() => { const I = TEMPLATE_META[sub.template_category]?.icon || FileText; return <I className={`w-3.5 h-3.5 ${TEMPLATE_META[sub.template_category]?.color?.split(" ")[1] || "text-muted-foreground"}`} />; })()}
                            <span className="font-medium truncate max-w-[120px]">{sub.template_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          {sub.template_category === "meeting_record"
                            ? sub.response_json?.yp_attending || "—"
                            : sub.resident_name || "—"}
                        </td>
                        <td className="px-4 py-2.5">{sub.home_name || "—"}</td>
                        <td className="px-4 py-2.5">
                          <span className={`px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_BADGES[sub.status] || "bg-muted text-muted-foreground"}`}>
                            {sub.status?.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {sub.updated_date ? format(new Date(sub.updated_date), "dd/MM/yyyy HH:mm") : "—"}
                        </td>
                        <td className="px-4 py-2.5">{sub.submitted_by_name || sub.last_updated_by_name || "—"}</td>
                        <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <button onClick={() => setViewRecord(sub)} title="View" className="text-muted-foreground hover:text-foreground"><Eye className="w-3.5 h-3.5" /></button>
                            <button onClick={() => exportSubmission(sub)} title="Download PDF" className="text-muted-foreground hover:text-foreground"><Download className="w-3.5 h-3.5" /></button>
                            {sub.status === "draft" && (
                              <button onClick={() => { setEditRecord(sub); setShowForm(true); }} title="Edit Draft" className="text-muted-foreground hover:text-primary"><Edit className="w-3.5 h-3.5" /></button>
                            )}
                            {canManageTemplates && sub.status === "submitted" && (
                              <button onClick={() => handleReview(sub)} className="text-blue-500 hover:text-blue-700 font-medium text-[10px]">Review</button>
                            )}
                            {canManageTemplates && sub.status === "in_review" && (
                              <button onClick={() => handleSignOff(sub)} className="text-green-600 hover:text-green-700 font-medium text-[10px]">Sign Off</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <YPVoiceFormModal
          templates={templates}
          defaultCategory={activeTab !== "template_manager" ? activeTab : "voice_feedback"}
          residents={residents}
          homes={homes}
          staff={staff}
          staffProfile={staffProfile}
          editRecord={editRecord}
          onClose={() => { setShowForm(false); setEditRecord(null); }}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["yp-feedback-submissions"] });
            setShowForm(false);
            setEditRecord(null);
          }}
        />
      )}

      {viewRecord && (
        <YPVoiceViewModal record={viewRecord} onClose={() => setViewRecord(null)} onExport={() => exportSubmission(viewRecord)} />
      )}
    </div>
  );
}

// Label maps for human-readable view
const VF_QUESTIONS = [
  "Do you feel safe and comfortable in your home and neighbourhood?",
  "Do you feel listened to and respected by your support worker?",
  "Do you feel confident that the adults supporting you understand you, have the right skills, and work well together to meet your needs?",
  "Do you have your own space that you feel proud of and live in comfortable, well-maintained, and stable accommodation?",
  "Do you receive high-quality support from your worker who advocates for you and helps maintain your health and wellbeing?",
  "Do you have a strong, trusting, and meaningful support system with the adults around you, and can you rely on them for support?",
  "Do you feel supported to learn and develop the skills you need for independent living?",
  "Do you feel positive about your future and the opportunities available to you because of the support you have received?",
];

const QS_SECTIONS = [
  { title: "About You", questions: ["How would you describe how things are going for you right now, in general?"] },
  { title: "Feeling Safe and Supported", questions: ["Do you feel safe in the place where you live?", "Can you tell us more about why or why not?", "Who do you feel you can talk to when something is bothering you?", "Is there anything that would make you feel safer or more comfortable where you live?"] },
  { title: "Daily Life and Wellbeing", questions: ["What do you enjoy most about your day-to-day life?", "What things are hard or stressful now?", "Is there something you wish was different about your school, college, or training?"] },
  { title: "Relationships and Support", questions: ["Who makes you feel supported, heard, or cared about?", "Are there times you feel left out or not listened to?", "Can you share what happened?"] },
  { title: "Your Voice Matters", questions: ["If there's one thing the organisation could do better for you, what would it be?", "What helps you feel included in decisions about your care and your life?", "Have you had any experiences with us, good or bad, that you'd like to tell us about?"] },
  { title: "Final Thoughts", questions: ["Is there anything else you'd like to share with us?"] },
];

const LABEL_MAP = {
  date: "Date",
  signature: "YP Signature",
  staff_signature: "Staff Signature",
  yp_signature: "YP Signature",
  facilitator_position: "Staff Position Facilitating",
  yp_attending: "Young People Attending",
  yp_absent: "Young People Absent",
  topics_discussed: "Topics Discussed",
  issues_raised: "Issues Raised / Discussions",
  agreed_actions: "Agreed Actions",
  other_comments: "Any Other Comments",
  staff_name: "Staff Name",
  chair_name: "Chairperson Name",
  next_meeting_date: "Next Meeting Date",
};

function buildLabelMap(category) {
  const map = { ...LABEL_MAP };
  if (category === "voice_feedback") {
    VF_QUESTIONS.forEach((q, i) => {
      map[`q${i+1}_response`] = `Q${i+1}: ${q.length > 60 ? q.slice(0, 60) + "…" : q}`;
      map[`q${i+1}_comment`] = `Q${i+1} Comment`;
    });
  } else if (category === "questionnaire") {
    QS_SECTIONS.forEach((sec, si) => {
      sec.questions.forEach((q, qi) => {
        map[`s${si+1}_q${qi+1}`] = `[${sec.title}] ${q.length > 70 ? q.slice(0, 70) + "…" : q}`;
      });
    });
  }
  return map;
}

// Inline view modal
function YPVoiceViewModal({ record, onClose, onExport }) {
  const responses = record.response_json || {};
  const labelMap = buildLabelMap(record.template_category);

  const renderValue = (key, val) => {
    if (Array.isArray(val)) {
      if (val.length === 0) return <span className="text-muted-foreground italic">None</span>;
      // agreed_actions array
      if (typeof val[0] === "object") {
        return (
          <div className="space-y-1 mt-1">
            {val.map((item, i) => (
              <div key={i} className="bg-muted/30 rounded-lg px-3 py-1.5 text-xs">
                <span className="font-medium">{item.action || "—"}</span>
                {item.responsible && <span className="text-muted-foreground"> · {item.responsible}</span>}
                {item.target_date && <span className="text-muted-foreground"> · Due: {item.target_date}</span>}
              </div>
            ))}
          </div>
        );
      }
      return val.join(", ");
    }
    if (typeof val === "object" && val !== null) return JSON.stringify(val);
    return String(val);
  };

  // Group voice feedback responses by question number
  const renderResponses = () => {
    if (record.template_category === "voice_feedback") {
      return VF_QUESTIONS.map((q, i) => {
        const resp = responses[`q${i+1}_response`];
        const comment = responses[`q${i+1}_comment`];
        if (!resp && !comment) return null;
        return (
          <div key={i} className="border border-border rounded-xl p-3 space-y-1">
            <p className="text-xs font-medium text-foreground">{i+1}. {q}</p>
            {resp && <p className="text-xs"><span className="text-muted-foreground">Response: </span><span className="font-semibold">{resp}</span></p>}
            {comment && <p className="text-xs"><span className="text-muted-foreground">Comment: </span>{comment}</p>}
          </div>
        );
      }).filter(Boolean);
    }

    if (record.template_category === "questionnaire") {
      return QS_SECTIONS.map((sec, si) => {
        const hasAnswers = sec.questions.some((_, qi) => responses[`s${si+1}_q${qi+1}`]);
        if (!hasAnswers) return null;
        return (
          <div key={si} className="border border-border rounded-xl p-3 space-y-2">
            <h4 className="text-xs font-semibold text-foreground">{sec.title}</h4>
            {sec.questions.map((q, qi) => {
              const answer = responses[`s${si+1}_q${qi+1}`];
              if (!answer) return null;
              return (
                <div key={qi}>
                  <p className="text-xs text-muted-foreground">{q}</p>
                  <p className="text-xs font-medium mt-0.5">{answer}</p>
                </div>
              );
            })}
          </div>
        );
      }).filter(Boolean);
    }

    // meeting_record and other — generic key/value with label map
    const skip = new Set(["topics_discussed", "agreed_actions"]);
    return Object.entries(responses)
      .filter(([k, v]) => !skip.has(k) && v !== "" && v !== null && v !== undefined)
      .map(([key, val]) => (
        <div key={key} className="flex gap-2 text-xs">
          <span className="text-muted-foreground min-w-[140px] shrink-0">{labelMap[key] || key.replace(/_/g, " ")}:</span>
          <span className="font-medium">{renderValue(key, val)}</span>
        </div>
      ));
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card">
          <div>
            <h2 className="font-bold text-base">{record.template_name}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{record.resident_name || "—"} · {record.home_name || "—"}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={onExport}><Download className="w-3.5 h-3.5" /> Export</Button>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="p-5 space-y-4">
          {/* Meta grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm bg-muted/20 rounded-xl p-4">
            <div><span className="text-xs text-muted-foreground">Status</span>
              <p className="font-medium capitalize mt-0.5">{record.status?.replace(/_/g, " ")}</p></div>
            <div><span className="text-xs text-muted-foreground">Date</span>
              <p className="font-medium mt-0.5">{record.response_json?.date || "—"}</p></div>
            <div><span className="text-xs text-muted-foreground">Submitted</span>
              <p className="font-medium mt-0.5">{record.submitted_at ? format(new Date(record.submitted_at), "dd MMM yyyy HH:mm") : "Draft"}</p></div>
            <div><span className="text-xs text-muted-foreground">Young Person</span>
              <p className="font-medium mt-0.5">{record.resident_name || "—"}</p></div>
            <div><span className="text-xs text-muted-foreground">Home</span>
              <p className="font-medium mt-0.5">{record.home_name || "—"}</p></div>
            <div><span className="text-xs text-muted-foreground">Staff</span>
              <p className="font-medium mt-0.5">{record.submitted_by_name || record.last_updated_by_name || "—"}</p></div>
            <div><span className="text-xs text-muted-foreground">Version</span>
              <p className="font-medium mt-0.5">{record.template_version || "—"}</p></div>
            {record.concern_flagged && (
              <div className="flex items-center gap-1 col-span-1">
                <Flag className="w-3.5 h-3.5 text-red-500" />
                <span className="text-xs font-medium text-red-600">Concern Flagged</span>
              </div>
            )}
            {record.action_required && (
              <div className="flex items-center gap-1 col-span-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-medium text-amber-600">Action Required</span>
              </div>
            )}
          </div>

          {/* Topics Discussed (meeting_record) */}
          {record.template_category === "meeting_record" && responses.topics_discussed?.length > 0 && (
            <div className="border border-border rounded-xl p-4">
              <h3 className="text-xs font-semibold mb-2">Topics Discussed</h3>
              <div className="flex flex-wrap gap-1.5">
                {responses.topics_discussed.map(t => (
                  <span key={t} className="bg-purple-100 text-purple-700 text-[10px] px-2 py-0.5 rounded-full font-medium">{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Agreed Actions (meeting_record) */}
          {record.template_category === "meeting_record" && responses.agreed_actions?.length > 0 && (
            <div className="border border-border rounded-xl p-4">
              <h3 className="text-xs font-semibold mb-2">Agreed Actions</h3>
              <div className="space-y-1.5">
                {responses.agreed_actions.filter(a => a.action).map((item, i) => (
                  <div key={i} className="bg-muted/30 rounded-lg px-3 py-2 text-xs">
                    <p className="font-medium">{item.action}</p>
                    <p className="text-muted-foreground">
                      {item.responsible && <>Responsible: {item.responsible}</>}
                      {item.target_date && <> · Due: {item.target_date}</>}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Responses */}
          {Object.keys(responses).length > 0 && (
            <div className="border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-3">Responses</h3>
              <div className="space-y-3">
                {renderResponses()}
              </div>
            </div>
          )}

          {record.review_notes && (
            <div className="border border-border rounded-xl p-4 bg-blue-50/50">
              <h3 className="text-sm font-semibold mb-1">Review Notes</h3>
              <p className="text-xs text-muted-foreground">{record.review_notes}</p>
              <p className="text-[10px] text-muted-foreground mt-1">— {record.reviewed_by_name} · {record.reviewed_at ? format(new Date(record.reviewed_at), "dd MMM yyyy") : ""}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}