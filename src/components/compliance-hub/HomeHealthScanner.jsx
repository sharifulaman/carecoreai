import { useMemo } from "react";

function scoreHome(home, residents, data) {
  let score = 0;
  const flags = [];

  const homeResidents = residents.filter(r => r.home_id === home.id && r.status === "active");
  const residentIds = homeResidents.map(r => r.id);

  // 1. SupportPlan reviewed (15 pts)
  const plans = (data.supportPlans || []).filter(p => p.home_id === home.id);
  const reviewed = plans.filter(p => p.review_date).length;
  if (plans.length > 0 && reviewed === plans.length) score += 15;
  else if (plans.length > 0) flags.push("Support plans not reviewed");

  // 2. No open safeguarding > 30 days (20 pts)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
  const openSafeguarding = (data.safeguardingRecords || []).filter(
    s => s.home_id === home.id && !s.resolution_date && new Date(s.created_date) < thirtyDaysAgo
  );
  if (openSafeguarding.length === 0) score += 20;
  else flags.push(`${openSafeguarding.length} open safeguarding > 30 days`);

  // 3. MFH return interviews (15 pts)
  const mfhRecords = (data.mfhRecords || []).filter(m => m.home_id === home.id);
  const mfhPending = mfhRecords.filter(m => !m.return_interview_completed);
  if (mfhPending.length === 0) score += 15;
  else flags.push(`${mfhPending.length} MFH interview(s) missing`);

  // 4. Training compliance > 80% (15 pts)
  const homeStaff = (data.staffProfiles || []).filter(s => (s.home_ids || []).includes(home.id));
  const staffWithTraining = homeStaff.filter(s => (data.trainingRecords || []).some(t => t.staff_id === s.id && new Date(t.expiry_date) > new Date()));
  const trainingRate = homeStaff.length > 0 ? staffWithTraining.length / homeStaff.length : 1;
  if (trainingRate >= 0.8) score += 15;
  else flags.push(`Training compliance ${Math.round(trainingRate * 100)}%`);

  // 5. Complaints resolved within 28 days (10 pts)
  const complaints = (data.complaints || []).filter(c => c.home_id === home.id);
  const lateComplaints = complaints.filter(c => {
    if (!c.resolution_date || !c.received_datetime) return false;
    return (new Date(c.resolution_date) - new Date(c.received_datetime)) / 86400000 > 28;
  });
  if (lateComplaints.length === 0) score += 10;
  else flags.push(`${lateComplaints.length} complaint(s) resolved late`);

  // 6. YPViewsRecord per resident (10 pts)
  const ypViews = (data.ypViews || []).filter(y => y.home_id === home.id);
  const ypViewedIds = new Set(ypViews.map(y => y.resident_id));
  const allHaveViews = residentIds.every(id => ypViewedIds.has(id));
  if (allHaveViews || residentIds.length === 0) score += 10;
  else flags.push("YP views missing for some residents");

  // 7. LA Review feedback (10 pts)
  const laReviews = (data.laReviews || []).filter(r => r.home_id === home.id && r.feedback_received);
  if (laReviews.length > 0) score += 10;
  else flags.push("No LA feedback received");

  // 8. VisitReport for all active residents (5 pts)
  const visitReports = (data.visitReports || []).filter(v => v.home_id === home.id);
  const visitedIds = new Set(visitReports.map(v => v.resident_id));
  const allVisited = residentIds.every(id => visitedIds.has(id));
  if (allVisited || residentIds.length === 0) score += 5;
  else flags.push("Visit reports missing for some residents");

  return { score, flags, ypCount: homeResidents.length };
}

function ScoreBadge({ score }) {
  const color = score >= 80 ? "bg-green-100 text-green-700" : score >= 60 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";
  return <span className={`text-lg font-bold px-2 py-0.5 rounded-lg ${color}`}>{score}</span>;
}

export default function HomeHealthScanner({
  homes, residents, data, selectedHomeId, onSelectHome,
  selectedYPs, setSelectedYPs,
  reviewerName, setReviewerName,
  reviewerOrg, setReviewerOrg,
  reviewCompleted, setReviewCompleted,
  flagsResolved, totalFlags, deadline,
}) {
  const homeScores = useMemo(() => {
    return homes.map(h => ({ home: h, ...scoreHome(h, residents, data) }));
  }, [homes, residents, data]);

  const activeResidents = residents.filter(r => r.status === "active");

  // Org-wide summary
  const totalVisitReports = (data.visitReports || []).length;
  const requiredVisits = activeResidents.length;
  const trainingCompliant = (data.staffProfiles || []).filter(s =>
    (data.trainingRecords || []).some(t => t.staff_id === s.id && new Date(t.expiry_date) > new Date())
  ).length;
  const totalStaff = (data.staffProfiles || []).length;
  const totalComplaints = (data.complaints || []).length;
  const resolvedComplaints = (data.complaints || []).filter(c => c.status === "closed" || c.resolution_date).length;
  const mfhCount = (data.mfhRecords || []).length;
  const sigEventsCount = (data.significantEvents || []).length;
  const ofstedNotifsCount = (data.ofstedNotifications || []).filter(n => n.status === "pending").length;
  const laReviewsTotal = (data.laReviews || []).length;
  const laFeedbackReceived = (data.laReviews || []).filter(r => r.feedback_received).length;

  const toggleYP = (id) => {
    setSelectedYPs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const daysLeft = deadline ? Math.ceil((new Date(deadline) - new Date()) / 86400000) : null;

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">🏠 Home health scan</span>
        {homeScores.reduce((acc, h) => acc + h.flags.length, 0) > 0 && (
          <span className="text-xs bg-red-500 text-white rounded-full px-2 py-0.5 font-bold">
            {homeScores.reduce((acc, h) => acc + h.flags.length, 0)} flags
          </span>
        )}
      </div>

      {/* Home cards */}
      <div className="space-y-2">
        {homeScores.map(({ home, score, flags, ypCount }) => {
          const isSelected = selectedHomeId === home.id;
          const borderColor = score >= 80 ? "border-green-300" : score >= 60 ? "border-amber-300" : "border-red-300";
          return (
            <button
              key={home.id}
              onClick={() => onSelectHome(isSelected ? null : home.id)}
              className={[
                "w-full text-left rounded-xl border-2 p-3 flex items-center gap-3 transition-all bg-card hover:shadow-sm",
                isSelected ? borderColor + " shadow-md" : "border-border",
              ].join(" ")}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${score >= 80 ? "bg-green-100 text-green-700" : score >= 60 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                {home.name?.[0] || "H"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{home.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{home.type?.replace(/_/g, " ")} · {ypCount} YP</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <ScoreBadge score={score} />
                {flags.length > 0 && (
                  <span className="text-[10px] bg-red-500/10 text-red-600 rounded px-1.5 py-0.5 font-medium">{flags.length} issues</span>
                )}
                {flags.length === 0 && (
                  <span className="text-[10px] text-green-600">✓ clear</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Org-wide summary */}
      <div className="bg-muted/40 border border-border rounded-xl p-3 space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Organisation-wide</p>
        {[
          { label: "Visit reports", value: `${totalVisitReports} / ${requiredVisits}`, ok: totalVisitReports >= requiredVisits },
          { label: "Training compliance", value: `${totalStaff > 0 ? Math.round(trainingCompliant / totalStaff * 100) : 0}%`, ok: totalStaff > 0 && trainingCompliant / totalStaff >= 0.8 },
          { label: "Complaints resolved", value: `${resolvedComplaints} / ${totalComplaints}`, ok: resolvedComplaints === totalComplaints },
          { label: "MFH episodes", value: mfhCount, ok: mfhCount === 0 },
          { label: "Significant events", value: sigEventsCount, ok: true },
          { label: "Ofsted notifications", value: ofstedNotifsCount, ok: ofstedNotifsCount === 0 },
          { label: "LA feedback received", value: `${laFeedbackReceived} of ${laReviewsTotal}`, ok: laFeedbackReceived === laReviewsTotal },
        ].map(({ label, value, ok }) => (
          <div key={label} className="flex justify-between text-xs">
            <span className="text-muted-foreground">{label}</span>
            <span className={ok ? "text-green-600 font-medium" : "text-red-600 font-medium"}>{value}</span>
          </div>
        ))}
      </div>

      {/* YP selector */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Young people in this review</p>
        <div className="flex flex-wrap gap-1.5">
          {activeResidents.map(r => {
            const sel = selectedYPs.includes(r.id);
            return (
              <button
                key={r.id}
                onClick={() => toggleYP(r.id)}
                className={`text-xs px-2 py-1 rounded-full border font-medium transition-colors ${sel ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary"}`}
              >
                {r.initials || r.display_name?.slice(0, 5) || "YP"}
              </button>
            );
          })}
        </div>
      </div>

      {/* Independent reviewer */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Independent reviewer</p>
        <input
          type="text"
          placeholder="Reviewer name"
          value={reviewerName}
          onChange={e => setReviewerName(e.target.value)}
          className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <input
          type="text"
          placeholder="Organisation"
          value={reviewerOrg}
          onChange={e => setReviewerOrg(e.target.value)}
          className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <input
          type="date"
          value={reviewCompleted}
          onChange={e => setReviewCompleted(e.target.value)}
          className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Flags resolved</span>
          <span className="font-medium">{flagsResolved} of {totalFlags}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: totalFlags > 0 ? `${(flagsResolved / totalFlags) * 100}%` : "0%" }}
          />
        </div>
        {deadline && (
          <div className="text-xs text-muted-foreground">
            <span className="text-red-600 font-medium">Ofsted deadline: {deadline}</span>
            <br />
            <span>Submit within 28 days of completion</span>
            {daysLeft !== null && (
              <span className={`ml-2 font-semibold ${daysLeft <= 7 ? "text-red-600" : daysLeft <= 14 ? "text-amber-600" : "text-green-600"}`}>
                ({daysLeft} days left)
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}