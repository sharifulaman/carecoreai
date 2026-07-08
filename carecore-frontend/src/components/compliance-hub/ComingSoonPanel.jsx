export default function ComingSoonPanel({ reportType }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center bg-card border border-border rounded-xl">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center text-3xl mb-4">🚧</div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{reportType} — Coming in next phase</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        This report module is planned for the next development sprint. Check back soon.
      </p>
    </div>
  );
}