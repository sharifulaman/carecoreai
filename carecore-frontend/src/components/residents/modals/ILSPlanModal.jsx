import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { secureGateway } from '@/lib/secureGateway';
import ModalSkeleton from './ModalSkeleton';

const SKILL_LABELS = {
  cooking: 'Cooking',
  budgeting: 'Budgeting',
  hygiene: 'Hygiene',
  transport: 'Transport',
  health: 'Health',
  relationships: 'Relationships',
  employment: 'Employment',
  education: 'Education',
};

const SKILL_ORDER = ['cooking', 'budgeting', 'hygiene', 'transport', 'health', 'relationships', 'employment', 'education'];

const LEVEL_COLORS = {
  no_awareness: 'bg-red-100 text-red-700',
  developing: 'bg-amber-100 text-amber-700',
  needs_support: 'bg-amber-100 text-amber-700',
  independent_with_prompts: 'bg-blue-100 text-blue-700',
  fully_independent: 'bg-green-100 text-green-700',
};

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysFromToday(dateStr) {
  if (!dateStr) return null;
  const d = Math.floor((new Date(dateStr) - new Date()) / 86400000);
  return d;
}

function getDateColor(dateStr) {
  const days = daysFromToday(dateStr);
  if (days === null) return 'text-muted-foreground';
  if (days < 0) return 'text-red-600';
  if (days <= 7) return 'text-amber-600';
  return 'text-green-600';
}

function daysAgoLabel(dateStr) {
  if (!dateStr) return '—';
  const d = Math.floor((new Date() - new Date(dateStr)) / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  return `${d} days ago`;
}

function ProgressBar({ value, maxWidth = 'w-full' }) {
  const color = value >= 70 ? 'bg-green-600' : value >= 40 ? 'bg-amber-600' : 'bg-red-600';
  return (
    <div className={`h-1.5 rounded-full bg-muted overflow-hidden ${maxWidth}`}>
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

export default function ILSPlanModal({ resident, home, onClose, onGoToTab }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [plan, setPlan] = useState(null);
  const [sections, setSections] = useState([]);

  useEffect(() => {
    const loadPlan = async () => {
      try {
        setLoading(true);
        setError(null);
        const plans = await secureGateway.filter('ILSPlan', { resident_id: resident.id });
        const active = plans.find(p => p.status === 'active') || plans.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0] || null;
        setPlan(active);

        if (active) {
          const secs = await secureGateway.filter('ILSPlanSection', { ils_plan_id: active.id });
          setSections(secs);
        }
      } catch (err) {
        console.error('Error loading ILS plan:', err);
        setError('Unable to load plan data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    loadPlan();
  }, [resident.id]);

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
        <div className="bg-card rounded-xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
          <p className="text-sm text-destructive mb-4">{error}</p>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
            <Button size="sm" onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-card rounded-xl w-full max-w-2xl mx-4 max-h-[90vh]">
          <ModalSkeleton />
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
        <div className="bg-card rounded-xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
          <p className="text-sm mb-4">No active ILS plan has been created for <span className="font-semibold">{resident.display_name}</span> yet.</p>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
            <Button size="sm" onClick={() => { onClose(); onGoToTab(); }}>+ Create ILS Plan</Button>
          </div>
        </div>
      </div>
    );
  }

  const statusColor = plan.status === 'active' ? 'bg-green-100 text-green-700' : plan.status === 'draft' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700';
  const reviewDaysColor = getDateColor(plan.review_due_date);

  const avgProgress = sections.length > 0 ? Math.round(sections.reduce((a, s) => a + (s.progress_percentage || 0), 0) / sections.length) : 0;

  const sortedSections = [...sections].sort((a, b) => {
    const aIdx = SKILL_ORDER.indexOf(a.skill_area);
    const bIdx = SKILL_ORDER.indexOf(b.skill_area);
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return 0;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 md:p-0" onClick={onClose}>
      <div className="bg-card rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto md:max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">{resident.initials || resident.display_name?.charAt(0)}</div>
              <div>
                <p className="font-semibold text-base">{resident.display_name}</p>
                <p className="text-xs text-muted-foreground">{home?.name || '—'}</p>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        {/* Title and meta */}
        <div className="px-6 pt-4 pb-3 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Independent Living Skills Plan</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColor}`}>{plan.status}</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Version {plan.version || 1}</p>
          <div className="flex gap-6 text-xs mb-4">
            <div>
              <p className="text-muted-foreground">Effective date</p>
              <p className="font-medium">{formatDate(plan.effective_date) || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Review due</p>
              <p className={`font-medium ${reviewDaysColor}`}>{formatDate(plan.review_due_date) || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Last updated</p>
              <p className="font-medium">{daysAgoLabel(plan.updated_date || plan.created_date)}</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Overall ILS Progress</span>
              <span className="font-semibold">{avgProgress}%</span>
            </div>
            <ProgressBar value={avgProgress} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-6 py-4 space-y-3 overflow-y-auto">
          {sortedSections.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-8">No skill areas assessed yet.</p>
          ) : (
            sortedSections.map(section => {
              const skillLabel = section.skill_area === 'custom' ? section.custom_skill_name : SKILL_LABELS[section.skill_area] || section.skill_area;
              const levelColor = LEVEL_COLORS[section.current_level] || 'bg-muted text-muted-foreground';
              const isEmpty = !section.current_ability && !section.goal && !section.support_needed && !section.actions;

              return (
                <div key={section.id} className="border border-border rounded-lg p-3 bg-muted/30">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">{skillLabel}</h4>
                    {section.current_level && <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${levelColor}`}>{section.current_level.replace(/_/g, ' ')}</span>}
                  </div>

                  {section.progress_percentage !== undefined && (
                    <div className="space-y-1 mb-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-semibold">{section.progress_percentage}%</span>
                      </div>
                      <ProgressBar value={section.progress_percentage} />
                    </div>
                  )}

                  {isEmpty ? (
                    <p className="text-xs text-muted-foreground italic">Not yet assessed</p>
                  ) : (
                    <div className="space-y-2 text-xs">
                      {section.current_ability && (
                        <div>
                          <p className="text-muted-foreground font-medium">Current ability</p>
                          <p className="text-sm">{section.current_ability}</p>
                        </div>
                      )}
                      {section.goal && (
                        <div>
                          <p className="text-muted-foreground font-medium">Goal</p>
                          <p className="text-sm">{section.goal}</p>
                        </div>
                      )}
                      {section.support_needed && (
                        <div>
                          <p className="text-muted-foreground font-medium">Support needed</p>
                          <p className="text-sm">{section.support_needed}</p>
                        </div>
                      )}
                      {section.actions && (
                        <div>
                          <p className="text-muted-foreground font-medium">Actions</p>
                          <p className="text-sm">{section.actions}</p>
                        </div>
                      )}
                      {section.target_date && (
                        <div>
                          <p className="text-muted-foreground font-medium">Target date</p>
                          <p className="text-sm">{formatDate(section.target_date)}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-card border-t border-border px-6 py-3 flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
          <Button size="sm" onClick={() => { onClose(); onGoToTab(); }}>Go to ILS Plans tab</Button>
        </div>
      </div>
    </div>
  );
}