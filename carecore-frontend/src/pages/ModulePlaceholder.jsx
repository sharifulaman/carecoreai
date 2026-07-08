import { useOutletContext } from "react-router-dom";
import { Construction } from "lucide-react";

export default function ModulePlaceholder({ title, description }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="bg-card rounded-2xl border border-border p-12 text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Construction className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold mb-2">{title || "Module Coming Soon"}</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {description || "This module is being built and will be available shortly. All 13 modules are being developed incrementally."}
        </p>
      </div>
    </div>
  );
}