import { Button } from "@/components/ui/button";
import { CheckCircle, Copy, Trash2, Send } from "lucide-react";

export default function RotaStatusBar({
  rota, isAdminOrTL, weekLabel,
  onPublish, onCopyLastWeek, onClearWeek, publishing
}) {
  const isPublished = rota?.status === "published";

  return (
    <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Status:</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isPublished ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
          {isPublished ? "Published" : "Draft"}
        </span>
        <span className="text-xs text-muted-foreground">· Week of {weekLabel}</span>
      </div>
      {isAdminOrTL && (
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={onCopyLastWeek}>
            <Copy className="w-3 h-3" /> Copy Last Week
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 text-red-600 border-red-200 hover:bg-red-50" onClick={onClearWeek}>
            <Trash2 className="w-3 h-3" /> Clear Week
          </Button>
          {!isPublished && (
            <Button size="sm" className="h-7 text-xs gap-1.5" onClick={onPublish} disabled={publishing}>
              <Send className="w-3 h-3" /> {publishing ? "Publishing…" : "Publish Rota"}
            </Button>
          )}
          {isPublished && (
            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
              <CheckCircle className="w-3.5 h-3.5" /> Rota Published
            </span>
          )}
        </div>
      )}
    </div>
  );
}