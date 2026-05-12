import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { calculateOverallScore } from "@/lib/ilsDomains";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Eye } from "lucide-react";

export default function ILSOverview({ residents, homes, onSelectResident }) {
  const [search, setSearch] = useState("");
  const [filterHome, setFilterHome] = useState("all");
  const queryClient = useQueryClient();

  const { data: ilsPlans = [] } = useQuery({
    queryKey: ["ils-plans"],
    queryFn: () => secureGateway.filter("ILSPlan", {}, "-updated_date", 500),
  });

  const filtered = useMemo(() => {
    return residents
      .filter(r => {
        const matchSearch = !search || r.display_name?.toLowerCase().includes(search.toLowerCase());
        const matchHome = filterHome === "all" || r.home_id === filterHome;
        return matchSearch && matchHome;
      })
      .map(r => {
        const plan = ilsPlans.find(p => p.resident_id === r.id && p.status !== "archived");
        const score = plan ? calculateOverallScore(plan) : 0;
        return { resident: r, plan, score };
      })
      .sort((a, b) => a.score - b.score);
  }, [residents, ilsPlans, search, filterHome]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search young people..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            prefix={<Search className="w-4 h-4" />}
            className="text-sm"
          />
        </div>
        <Select value={filterHome} onValueChange={setFilterHome}>
          <SelectTrigger className="w-40 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Homes</SelectItem>
            {homes.map(h => (
              <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/10">
              <th className="text-left px-4 py-3 text-xs font-semibold">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold">Home</th>
              <th className="text-left px-4 py-3 text-xs font-semibold">Overall Score</th>
              <th className="text-left px-4 py-3 text-xs font-semibold">Domains</th>
              <th className="text-center px-4 py-3 text-xs font-semibold">Last Updated</th>
              <th className="text-center px-4 py-3 text-xs font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No residents found.</td></tr>
            ) : filtered.map(({ resident, plan, score }) => (
              <tr key={resident.id} className="border-b border-border last:border-0 hover:bg-muted/5">
                <td className="px-4 py-3 font-medium text-sm">{resident.display_name}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{homes.find(h => h.id === resident.home_id)?.name}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="text-lg font-bold text-blue-600">{score}%</div>
                    <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${score}%` }} />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {plan ? (
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(i => {
                        const domainName = ["Home Management", "Food and Nutrition", "Finance and Money", "Employment and Education", "Health Management", "Social and Community", "Digital Literacy", "Emotional Wellbeing"][i - 1];
                        const section = plan.sections?.find(s => s.domain === domainName);
                        const domainScore = section ? Math.round((section.skills?.filter(sk => sk.status === "achieved").length || 0) / (section.skills?.length || 1) * 100) : 0;
                        return (
                          <div
                            key={i}
                            className="w-2.5 h-6 rounded-sm bg-gradient-to-b"
                            style={{
                              backgroundColor: domainScore === 0 ? "#e5e7eb" : domainScore < 50 ? "#fbbf24" : domainScore < 80 ? "#60a5fa" : "#10b981"
                            }}
                            title={domainName}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">No plan</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground text-center">
                  {plan?.updated_date ? new Date(plan.updated_date).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSelectResident(resident)}
                    className="gap-1.5"
                  >
                    <Eye className="w-4 h-4" /> View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}