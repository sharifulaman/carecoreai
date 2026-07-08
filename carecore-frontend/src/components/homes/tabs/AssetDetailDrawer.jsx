import React, { useState } from "react";
import { X, Copy, Check } from "lucide-react";
import { format } from "date-fns";

export default function AssetDetailDrawer({ asset, onClose }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const conditionColor = {
    excellent: "bg-green-100 text-green-700",
    good: "bg-blue-100 text-blue-700",
    fair: "bg-amber-100 text-amber-700",
    poor: "bg-red-100 text-red-700",
  };

  const statusColor = {
    active: "text-green-600",
    under_warranty: "text-blue-600",
    needs_repair: "text-amber-600",
    out_of_service: "text-red-600",
  };

  const isWarrantyActive = asset.warranty_expiry && new Date(asset.warranty_expiry) > new Date();
  const warrantyDays = asset.warranty_expiry ? Math.floor((new Date(asset.warranty_expiry) - new Date()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-end z-50">
      <div className="bg-card w-full max-w-md max-h-[100vh] overflow-auto shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
          <h2 className="text-lg font-semibold">Asset Details</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Asset ID & QR Code */}
          <div className="bg-muted/20 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm">Auto-generated Asset Profile</h3>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Asset ID (auto-generated)</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-background px-3 py-2 rounded text-xs font-mono border border-border">{asset.asset_id || "AST-" + asset.id?.slice(0, 6).toUpperCase()}</code>
                <button
                  onClick={() => handleCopy(asset.asset_id || "AST-" + asset.id?.slice(0, 6).toUpperCase())}
                  className="p-2 hover:bg-muted rounded"
                >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                </button>
              </div>
            </div>
            {asset.photo_url && (
              <div className="flex justify-center">
                <div className="w-32 h-32 bg-background rounded-lg flex items-center justify-center border border-border">
                  <img src={asset.photo_url} alt="Asset" className="w-full h-full object-cover rounded" />
                </div>
              </div>
            )}
          </div>

          {/* Basic Info */}
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Asset Name</p>
              <p className="font-semibold">{asset.asset_name}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Category</p>
                <p className="text-sm capitalize">{asset.category}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Condition</p>
                <span className={`text-xs px-2 py-1 rounded capitalize font-medium ${conditionColor[asset.condition]}`}>
                  {asset.condition}
                </span>
              </div>
            </div>
          </div>

          {/* Identifiers */}
          <div className="space-y-3">
            {asset.serial_number && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Serial Number</p>
                <p className="text-sm font-mono">{asset.serial_number}</p>
              </div>
            )}
            {asset.location_in_home && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Location in Home</p>
                <p className="text-sm">{asset.location_in_home}</p>
              </div>
            )}
          </div>

          {/* Dates & Warranty */}
          <div className="space-y-3 pb-3 border-b border-border">
            {asset.purchase_date && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Date Purchased</p>
                <p className="text-sm">{format(new Date(asset.purchase_date), "dd MMMM yyyy")}</p>
              </div>
            )}
            {asset.warranty_expiry && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Warranty Status</p>
                <div className="space-y-1">
                  <p className="text-sm font-medium">{format(new Date(asset.warranty_expiry), "dd MMMM yyyy")}</p>
                  <p className={`text-xs font-semibold ${isWarrantyActive ? "text-green-600" : "text-red-600"}`}>
                    {isWarrantyActive ? `${warrantyDays} days remaining` : "Warranty expired"}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Cost & Status */}
          <div className="space-y-3">
            {asset.purchase_cost && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Purchase Cost</p>
                <p className="text-lg font-bold">£{asset.purchase_cost.toFixed(2)}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <span className={`text-sm font-medium ${statusColor[asset.status]}`}>
                {asset.status?.replace(/_/g, " ").charAt(0).toUpperCase() + asset.status?.replace(/_/g, " ").slice(1)}
              </span>
            </div>
          </div>

          {/* Notes */}
          {asset.notes && (
            <div className="bg-muted/20 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-2">Notes</p>
              <p className="text-sm whitespace-pre-wrap">{asset.notes}</p>
            </div>
          )}

          {/* Metadata */}
          <div className="text-xs text-muted-foreground space-y-1 pt-3 border-t border-border">
            {asset.created_date && <p>Created: {format(new Date(asset.created_date), "dd MMM yyyy HH:mm")}</p>}
            {asset.updated_date && <p>Last Updated: {format(new Date(asset.updated_date), "dd MMM yyyy HH:mm")}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}