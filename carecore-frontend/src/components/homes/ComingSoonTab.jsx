import { CheckCircle2, Zap, FileText } from 'lucide-react';

const ICON_MAP = {
  checks: CheckCircle2,
  chores: Zap,
  audit: FileText,
};

const CONTENT_MAP = {
  checks: {
    title: 'Checks',
    description: 'Home compliance checks and inspections will appear here.',
  },
  chores: {
    title: 'Chores',
    description: 'Home task management and chore schedules will appear here.',
  },
  audit: {
    title: 'Audit',
    description: 'Home audit trails and compliance history will appear here.',
  },
};

export default function ComingSoonTab({ tabKey }) {
  const Icon = ICON_MAP[tabKey] || FileText;
  const content = CONTENT_MAP[tabKey] || {};

  return (
    <div className="flex flex-col items-center justify-center py-24 px-6">
      <Icon className="w-16 h-16 text-primary/40 mb-4" />
      <h3 className="text-base font-medium mb-1">{content.title}</h3>
      <p className="text-xs text-muted-foreground text-center mb-4 max-w-sm">{content.description}</p>
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">Coming Soon</span>
    </div>
  );
}