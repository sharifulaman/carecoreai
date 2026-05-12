import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { secureGateway } from '@/lib/secureGateway';
import ModalSkeleton from './ModalSkeleton';

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

export default function SupportPlanModal({ resident, home, onClose, onGoToTab }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [plan, setPlan] = useState(null);

  useEffect(() => {
    const loadPlan = async () => {
      try {
        setLoading(true);
        setError(null);
        const plans = await secureGateway.filter('SupportPlan', { resident_id: resident.id });
        const active = plans.find(p => p.status === 'active') || plans.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0] || null;
        setPlan(active);
      } catch (err) {
        console.error('Error loading support plan:', err);
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
          <p className="text-sm mb-4">No active support plan has been created for <span className="font-semibold">{resident.display_name}</span> yet.</p>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
            <Button size="sm" onClick={() => { onClose(); onGoToTab(); }}>+ Create Support Plan</Button>
          </div>
        </div>
      </div>
    );
  }

  const statusColor = plan.status === 'active' ? 'bg-green-100 text-green-700' : plan.status === 'draft' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700';
  const reviewDaysColor = getDateColor(plan.review_due_date);

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
            <h2 className="text-lg font-semibold">Support Plan</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColor}`}>{plan.status}</span>
          </div>
          <p className="text-xs text-muted-foreground">Version {plan.version || 1}</p>
          <div className="flex gap-6 mt-3 text-xs">
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
        </div>

        {/* Content */}
        <div className="flex-1 px-6 py-4 space-y-5 overflow-y-auto">
          {['goals', 'needs', 'strengths', 'risks', 'interventions', 'actions', 'resident_preferences'].map(field => {
            const label = field.replace(/_/g, ' ').toUpperCase();
            const value = plan[field];
            return (
              <section key={field}>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{label}</h3>
                <p className={`text-sm leading-relaxed ${!value || value.trim() === '' ? 'text-muted-foreground italic' : ''}`}>
                  {value && value.trim() !== '' ? value : 'Not recorded'}
                </p>
              </section>
            );
          })}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-card border-t border-border px-6 py-3 flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
          <Button size="sm" onClick={() => { onClose(); onGoToTab(); }}>Go to Support Plans tab</Button>
        </div>
      </div>
    </div>
  );
}