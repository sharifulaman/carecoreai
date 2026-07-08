import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { MapPin, Shield, Eye, Clock, X, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function LocationConsentModal({ staffProfile, onConsented, onDecline }) {
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleConsent = async () => {
    if (!checked) { toast.error("Please tick the checkbox to confirm"); return; }
    setSaving(true);
    try {
      const existing = await base44.entities.LocationTrackingConsent.filter({ staff_id: staffProfile.id });
      const now = new Date().toISOString();
      if (existing && existing.length > 0) {
        await base44.entities.LocationTrackingConsent.update(existing[0].id, {
          consented: true,
          consented_at: now,
          revoked_at: null,
          user_agent: navigator.userAgent,
        });
      } else {
        await base44.entities.LocationTrackingConsent.create({
          org_id: ORG_ID,
          staff_id: staffProfile.id,
          user_email: staffProfile.email || "",
          consented: true,
          consented_at: now,
          consent_version: "1.0",
          user_agent: navigator.userAgent,
        });
      }
      toast.success("Location tracking enabled");
      onConsented();
    } catch (e) {
      toast.error("Failed to save consent: " + e.message);
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" style={{ overflow: 'hidden' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" style={{ maxHeight: '90vh' }}>
        {/* Header — fixed */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 rounded-t-2xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">Location Tracking Consent</h2>
              <p className="text-blue-200 text-xs">CareCore AI — Staff Safety & Coordination</p>
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
          <p className="text-sm text-slate-700 leading-relaxed">
            To enable the <strong>Staff Tracker</strong> feature, we need your permission to collect and use your device's GPS location while you are on duty. Please read the following carefully before agreeing.
          </p>

          <div className="space-y-2">
            {[
              { icon: Clock, title: "Update Frequency", desc: "Your location will be recorded once every minute while you are logged in and on duty." },
              { icon: Eye, title: "Who Can See It", desc: "Only authorised managers (Admin, HR, Finance, Team Leaders, RSM) can view your live location on the Staff Tracker map." },
              { icon: Shield, title: "Data Security", desc: "Location data is stored securely and is only retained for operational and safeguarding purposes. You can withdraw consent at any time in your profile settings." },
              { icon: MapPin, title: "Precision", desc: "We use your device's GPS for precise location. This may affect battery usage. You may be prompted by your browser or device to allow location access." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                <Icon className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-slate-800">{title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
            <strong>Important:</strong> Location tracking is used solely for staff coordination, lone-worker safety, and operational management. It will never be used for disciplinary purposes without a separate, formal process.
          </div>

          <label className="flex items-start gap-3 cursor-pointer p-3 border-2 border-slate-200 rounded-xl hover:border-blue-300 transition-colors">
            <input
              type="checkbox"
              checked={checked}
              onChange={e => setChecked(e.target.checked)}
              className="mt-0.5 accent-blue-600 w-4 h-4 shrink-0"
            />
            <span className="text-sm text-slate-700">
              I have read and understood the above. I <strong>consent</strong> to my location being tracked by CareCore AI while I am on duty, as described above.
            </span>
          </label>
        </div>

        {/* Footer — fixed at bottom */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 shrink-0 rounded-b-2xl bg-white">
          <button
            onClick={handleConsent}
            disabled={!checked || saving}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            {saving ? "Saving…" : "I Agree — Enable Location Tracking"}
          </button>
          <button
            onClick={onDecline}
            className="px-4 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}