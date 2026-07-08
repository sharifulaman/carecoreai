import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function ItemRow({ item }) {
  return (
    <div className="px-4 md:px-5 py-3 md:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
      <div className="min-w-0">
        <p className="font-medium text-xs md:text-sm truncate">{item.primaryLabel}</p>
        {item.secondaryLabel && <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.secondaryLabel}</p>}
      </div>
      <div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
        {item.badge && (
          <Badge className={`text-[9px] md:text-[10px] px-1.5 py-0.5 border ${item.badgeClass || "bg-amber-500/10 text-amber-600 border-amber-200"}`}>
            {item.badge}
          </Badge>
        )}
        {item.meta && <p className="text-xs text-muted-foreground">{item.meta}</p>}
        {item.fileUrl && (
          <a href={item.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-primary hover:underline">
            <Download className="w-3 h-3" /> Download
          </a>
        )}
      </div>
    </div>
  );
}

export default function ExpiringItemsModal({ title, items, leaseItems, docItems, onClose }) {
  // Dual-section mode when leaseItems + docItems are provided
  const isDualMode = leaseItems !== undefined || docItems !== undefined;

  const totalCount = isDualMode
    ? (leaseItems?.length || 0) + (docItems?.length || 0)
    : items?.length || 0;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 md:p-4">
      <div className="bg-card rounded-2xl border border-border w-full max-w-lg md:max-w-xl max-h-[95vh] md:max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-border shrink-0 gap-2">
          <div className="min-w-0">
            <h2 className="font-semibold text-base md:text-lg">{title}</h2>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">{totalCount} item{totalCount !== 1 ? "s" : ""}</p>
          </div>
          <button onClick={onClose} className="hover:opacity-70 transition-opacity shrink-0">
            <X className="w-4 md:w-5 h-4 md:h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 divide-y divide-border">
          {totalCount === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8 md:py-12">No items to show.</p>
          )}

          {isDualMode ? (
            <>
              {/* Section 1: Expiring Leases */}
              {leaseItems && leaseItems.length > 0 && (
                <>
                  <div className="px-4 md:px-5 py-2 bg-amber-50 dark:bg-amber-900/10">
                    <p className="text-xs font-semibold text-amber-700">Expiring Leases ({leaseItems.length})</p>
                  </div>
                  {leaseItems.map((item, i) => <ItemRow key={item.id || i} item={item} />)}
                </>
              )}

              {/* Section 2: Expiring Documents */}
              {docItems && docItems.length > 0 && (
                <>
                  <div className="px-4 md:px-5 py-2 bg-purple-50 dark:bg-purple-900/10">
                    <p className="text-xs font-semibold text-purple-700">Expiring Documents ({docItems.length})</p>
                  </div>
                  {docItems.map((item, i) => <ItemRow key={item.id || i} item={item} />)}
                </>
              )}
            </>
          ) : (
            (items || []).map((item, i) => <ItemRow key={item.id || i} item={item} />)
          )}
        </div>

        <div className="p-4 md:p-5 border-t border-border shrink-0 flex justify-end">
          <Button variant="outline" onClick={onClose} className="text-sm">Close</Button>
        </div>
      </div>
    </div>
  );
}