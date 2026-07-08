import React from "react";
import { Package, Shield, AlertTriangle, Zap } from "lucide-react";

export default function AssetKPICards({ kpis }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Total Assets */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Package className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Assets</p>
            <p className="text-2xl font-bold">{kpis.total}</p>
            <p className="text-xs text-muted-foreground mt-1">All assets in home</p>
          </div>
        </div>
      </div>

      {/* Under Warranty */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
            <Shield className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Under Warranty</p>
            <p className="text-2xl font-bold">{kpis.warranty}</p>
            <p className="text-xs text-muted-foreground mt-1">With active warranty</p>
          </div>
        </div>
      </div>

      {/* Needs Attention */}
      <div className="bg-card border border-amber-200 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Needs Attention</p>
            <p className="text-2xl font-bold text-amber-600">{kpis.attention}</p>
            <p className="text-xs text-muted-foreground mt-1">Repair or review required</p>
          </div>
        </div>
      </div>

      {/* High Value Assets */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <Zap className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">High Value Assets</p>
            <p className="text-2xl font-bold">{kpis.highValue}</p>
            <p className="text-xs text-muted-foreground mt-1">Value above £1,000</p>
          </div>
        </div>
      </div>
    </div>
  );
}