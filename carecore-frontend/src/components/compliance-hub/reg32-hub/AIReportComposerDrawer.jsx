import { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import AIReportGenerator from "@/components/compliance-hub/AIReportGeneratorOriginal";

/**
 * Wrapper that repositions the existing AIReportGenerator into a compact
 * bottom composer/drawer. The existing component is reused exactly as-is —
 * all fields, controls, buttons, handlers, AI generation logic, entity
 * connections, and report preview/export remain untouched.
 *
 * Only the visual presentation changes: a slim header bar with expand/collapse,
 * defaulting to collapsed so it sits compactly at the bottom of the dashboard.
 */
export default function AIReportComposerDrawer({ expanded, onToggle, ...aiProps }) {
  return (
    <div className="rounded-xl border border-purple-200 overflow-hidden bg-white">
      {/* Slim header bar — always visible */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-purple-50 border-b border-purple-200">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-semibold text-purple-900">AI Reg 32 Report Composer</span>
          <span className="text-[10px] text-purple-500 hidden sm:inline">· Reused existing generator</span>
        </div>
        <button
          onClick={onToggle}
          className="flex items-center gap-1 text-xs px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium transition-colors"
        >
          {expanded ? <><ChevronUp className="w-3 h-3" /> Collapse</> : <><ChevronDown className="w-3 h-3" /> Expand</>}
        </button>
      </div>

      {/* Collapsible body — existing AIReportGenerator reused exactly as-is */}
      {expanded && (
        <div className="max-h-[600px] overflow-y-auto">
          <AIReportGenerator {...aiProps} />
        </div>
      )}
    </div>
  );
}