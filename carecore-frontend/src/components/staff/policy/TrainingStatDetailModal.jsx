import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function TrainingStatDetailModal({ open, onOpenChange, title, icon: Icon, columns, rows, emptyMessage }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            {Icon && <Icon className="w-4 h-4" />}
            {title}
            {rows.length > 0 && (
              <span className="ml-1 text-xs font-normal text-muted-foreground">({rows.length})</span>
            )}
          </DialogTitle>
        </DialogHeader>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {emptyMessage || "No records found."}
          </p>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {columns.map(col => (
                    <th key={col.key} className="text-left py-2 px-3 font-semibold text-slate-600 whitespace-nowrap">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                    {columns.map(col => (
                      <td key={col.key} className="py-2 px-3 text-slate-700 whitespace-nowrap">
                        {col.render ? col.render(row) : row[col.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}