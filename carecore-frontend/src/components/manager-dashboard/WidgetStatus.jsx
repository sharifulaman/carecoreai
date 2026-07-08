import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";

// Shared loading / error state for Manager Dashboard widgets, rendered as a table
// row (colSpan) or a plain block depending on the surrounding layout.

export function WidgetLoadingRow({ colSpan }) {
  return (
    <tr>
      <td colSpan={colSpan} className="text-center py-8 text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading...
        </span>
      </td>
    </tr>
  );
}

export function WidgetErrorRow({ colSpan, onRetry }) {
  return (
    <tr>
      <td colSpan={colSpan} className="text-center py-8">
        <span className="inline-flex flex-col items-center gap-1.5 text-red-600">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium">
            <AlertTriangle className="w-3.5 h-3.5" /> Couldn't load this data.
          </span>
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline"
            >
              <RefreshCw className="w-3 h-3" /> Try again
            </button>
          )}
        </span>
      </td>
    </tr>
  );
}

export function WidgetLoadingBlock({ label = "Loading..." }) {
  return (
    <div className="flex items-center justify-center gap-1.5 py-8 text-sm text-slate-400">
      <Loader2 className="w-4 h-4 animate-spin" /> {label}
    </div>
  );
}

export function WidgetErrorBlock({ onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 py-8">
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600">
        <AlertTriangle className="w-4 h-4" /> Couldn't load this data.
      </span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
        >
          <RefreshCw className="w-3 h-3" /> Try again
        </button>
      )}
    </div>
  );
}
