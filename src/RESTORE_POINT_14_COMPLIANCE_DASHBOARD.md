# RESTORE POINT 14 — Compliance Dashboard Redesign
**Date:** 2026-05-05  
**Description:** Dark navy compliance & readiness panel on AdminDashboard with gauge dial, risk issues list, and quick action buttons.

---

## What Was Changed

### 1. `components/compliance/OfstedReadinessScore.jsx`
Complete restyle of the score display and issues list. Now renders a horizontal layout with:
- **Left:** SVG half-circle gauge dial showing score/100 with a colour-coded arc (green ≥75, amber ≥60, orange ≥40, red <40)
- **Middle:** "Top Risk Areas" list with coloured dot indicators (red for top 2, orange for 3-4, amber for rest), show more/less toggle after 5 items
- No outer wrapper card — component is designed to sit inside the dark navy panel

Key classes/structure:
```jsx
<div className="flex gap-6 h-full">
  {/* Left: gauge */}
  <div className="flex flex-col items-center justify-center shrink-0 gap-2 min-w-[120px]">
    <svg width="140" height="90" viewBox="0 0 140 90"> ... </svg>
    score number + status label badge
  </div>
  {/* Middle: top risk areas */}
  <div className="flex-1 flex flex-col gap-1 min-w-0">
    list of issues with coloured dots + show more
  </div>
</div>
```

State added: `const [showAll, setShowAll] = useState(false);`  
Imports added: `ChevronDown` from lucide-react, `useState`

---

### 2. `components/compliance/QuickActionButtons.jsx`
Refactored to a compact grid layout for use inside the dark navy panel:
- 2×2 grid of icon buttons (Report Missing, Significant Event, Reg 4 Report, Data Rectification)
- Full-width "Report Compliance Pack" download button at bottom
- All text/icon colours use white/opacity variants for dark background

```jsx
<div className="flex flex-col gap-3 h-full">
  <p className="text-sm font-semibold text-white/90">Quick Actions</p>
  <div className="grid grid-cols-2 gap-2 flex-1">
    {actions.map(...)}
  </div>
  <button onClick={onExport} ...>Download Compliance Pack</button>
</div>
```

---

### 3. `pages/AdminDashboard.jsx` — Compliance Panel section
Replaced old light card with a dark navy gradient section:

```jsx
<section className="rounded-xl p-5 overflow-hidden" style={{ background: "linear-gradient(135deg, #0f1d3a 0%, #162347 60%, #1a2d5a 100%)" }}>
  <div className="flex items-center justify-between mb-4">
    <h2 className="text-base font-semibold text-white">Compliance &amp; Readiness</h2>
    <ScoringRulesModal />
  </div>
  <div className="flex flex-col lg:flex-row gap-5 items-stretch">
    {/* Score + Issues — flex-1 */}
    <div className="flex-1 min-w-0">
      <OfstedReadinessScore data={{}} residents={filteredResidents} staff={staffProfiles} />
    </div>
    {/* Vertical divider (desktop) */}
    <div className="hidden lg:block w-px bg-white/10 self-stretch" />
    {/* Horizontal divider (mobile) */}
    <div className="block lg:hidden h-px bg-white/10" />
    {/* Quick Actions — lg:w-72 */}
    <div className="lg:w-72 shrink-0">
      <QuickActionButtons onExport={() => {}} />
    </div>
  </div>
</section>
```

---

## How to Revert

To revert to **before this restore point**, replace the three sections above with:

### `OfstedReadinessScore` — old return block:
```jsx
const status = getStatus(score.score);
return (
  <div className="space-y-4">
    <h3 className="font-semibold text-sm">Ofsted Readiness Score</h3>
    <div className={`rounded-lg p-6 ${status.color} text-center`}>
      <div className="text-5xl font-bold mb-2">{score.score}</div>
      <p className="text-sm font-semibold">/ 100 — {status.label}</p>
    </div>
    {score.issues.length > 0 && (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-900 mb-2">Areas to Address</p>
            <ul className="space-y-1">
              {score.issues.map((issue, i) => (
                <li key={i} className="text-xs text-amber-700">• {issue}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    )}
  </div>
);
```

### AdminDashboard — old Compliance Panel:
```jsx
<section className="space-y-4 bg-card border border-border rounded-xl p-6">
  <div className="flex items-center justify-between">
    <h2 className="text-lg font-semibold">Compliance & Readiness</h2>
    <ScoringRulesModal />
  </div>
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <OfstedReadinessScore data={{}} residents={filteredResidents} staff={staffProfiles} />
    <QuickActionButtons onExport={() => {}} />
  </div>
</section>
``