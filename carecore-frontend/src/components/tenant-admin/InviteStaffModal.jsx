import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ROLE_LABELS } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, RefreshCw, Copy, Check, ShieldCheck, Search } from "lucide-react";
import { toast } from "sonner";

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  let pwd = "";
  for (let i = 0; i < 12; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 text-xs text-primary hover:underline"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export default function InviteStaffModal({ onClose, onSuccess }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [password, setPassword] = useState(generatePassword);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(null); // { email, role, password }

  const { data: allStaff = [], isLoading } = useQuery({
    queryKey: ["staff-for-invite"],
    queryFn: () => base44.entities.StaffProfile.filter({}, "-created_date", 500),
    staleTime: 60 * 1000,
  });

  // Show staff without a linked auth account first (user_id empty / missing)
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allStaff
      .filter(s =>
        !q ||
        s.full_name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        const aLinked = Boolean(a.user_id);
        const bLinked = Boolean(b.user_id);
        if (aLinked !== bLinked) return aLinked ? 1 : -1;
        return (a.full_name || "").localeCompare(b.full_name || "");
      });
  }, [allStaff, search]);

  const handleSubmit = async () => {
    if (!selected) return;
    if (!password || password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (selected.user_id) {
      toast.error("This staff member already has a login account");
      return;
    }

    setSaving(true);
    try {
      const token = sessionStorage.getItem("access_token");
      const res = await fetch(
        `${import.meta.env.DEV ? '/api' : (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api").replace(/\/$/, "")}/auth/invite`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: selected.email,
            password,
            full_name: selected.full_name || selected.email,
            role: selected.role || "support_worker",
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error?.message || "Failed to create login account");
        return;
      }
      setDone({ email: selected.email, role: selected.role, password });
      onSuccess?.();
    } catch (err) {
      toast.error("Network error — please try again");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-base">
            {done ? "Login Account Created" : "Set Login Credentials"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {done ? (
          /* ── Success screen ── */
          <div className="px-6 py-6 space-y-5">
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
              <ShieldCheck className="w-8 h-8 text-green-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-800">Account created successfully</p>
                <p className="text-xs text-green-700 mt-0.5">
                  Share these credentials with <span className="font-medium">{done.email}</span>
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Email</p>
                  <p className="text-sm font-mono font-medium">{done.email}</p>
                </div>
                <CopyButton text={done.email} />
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Temporary Password</p>
                  <p className="text-sm font-mono font-medium tracking-wider">{done.password}</p>
                </div>
                <CopyButton text={done.password} />
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Role</p>
                  <p className="text-sm font-medium">{ROLE_LABELS[done.role] || done.role}</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              Ask the staff member to change their password after first login.
            </p>

            <div className="flex justify-end">
              <Button onClick={onClose}>Done</Button>
            </div>
          </div>
        ) : (
          /* ── Form ── */
          <div className="px-6 py-5 space-y-5">
            {/* Staff picker */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                Select Staff Member
              </label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="border border-border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                {isLoading ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Loading staff...</p>
                ) : filtered.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No staff found</p>
                ) : (
                  filtered.map(s => {
                    const isLinked = Boolean(s.user_id);
                    const isSelected = selected?.id === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => !isLinked && setSelected(s)}
                        disabled={isLinked}
                        className={[
                          "w-full flex items-center justify-between px-4 py-2.5 text-sm border-b border-border/50 last:border-0 transition-colors",
                          isSelected ? "bg-primary/10 border-primary/20" : "hover:bg-muted/40",
                          isLinked ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
                        ].join(" ")}
                      >
                        <div className="text-left">
                          <p className="font-medium text-foreground">{s.full_name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{s.email}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {ROLE_LABELS[s.role] || s.role || "—"}
                          </span>
                          {isLinked && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                              Has login
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
              {selected && (
                <p className="text-xs text-primary mt-1.5">
                  Selected: <span className="font-semibold">{selected.full_name}</span> ({selected.email})
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                Temporary Password
              </label>
              <div className="flex gap-2">
                <Input
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="font-mono text-sm flex-1"
                  placeholder="At least 8 characters"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setPassword(generatePassword())}
                  title="Generate new password"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Auto-generated. You can edit it or regenerate.
              </p>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                onClick={handleSubmit}
                disabled={saving || !selected || !password}
              >
                {saving ? "Creating..." : "Create Login Account"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
