import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { base44 } from "@/api/base44Client";
import { ILS_DOMAINS, calculateOverallScore, getReadinessLevel } from "@/lib/ilsDomains";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Plus, ChevronDown } from "lucide-react";
import DomainCard from "./DomainCard";
import SkillUpdateModal from "./SkillUpdateModal";
import SessionLogModal from "./SessionLogModal";

export default function ILSDetail({ resident, home, staff, user }) {
  const queryClient = useQueryClient();
  const [expandedDomain, setExpandedDomain] = useState(null);
  const [skillToUpdate, setSkillToUpdate] = useState(null);
  const [showSessionLog, setShowSessionLog] = useState(false);

  const { data: ilsPlan } = useQuery({
    queryKey: ["ils-plan", resident.id],
    queryFn: () => 
      secureGateway.filter("ILSPlan", { resident_id: resident.id, status: "active" })
        .then(plans => plans[0] || null),
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["ils-sessions", resident.id],
    queryFn: () => secureGateway.filter("ILSSessionLog", { resident_id: resident.id }, "-session_date", 50),
  });

  const radarData = useMemo(() => {
    return ILS_DOMAINS.map(domain => {
      const section = ilsPlan?.sections?.find(s => s.domain === domain.name);
      const achieved = section?.skills?.filter(s => s.status === "achieved").length || 0;
      const total = section?.skills?.length || 1;
      return {
        domain: domain.name.split(" ")[0],
        score: Math.round((achieved / total) * 100),
        fullName: domain.name
      };
    });
  }, [ilsPlan]);

  const overallScore = ilsPlan ? calculateOverallScore(ilsPlan) : 0;
  const readiness = getReadinessLevel(overallScore);

  const updateSkillMutation = useMutation({
    mutationFn: async (data) => {
      const updated = { ...ilsPlan };
      const section = updated.sections.find(s => s.domain === data.domain);
      const skill = section.skills.find(s => s.name === data.skillName);
      Object.assign(skill, data.updates);
      return secureGateway.update("ILSPlan", ilsPlan.id, updated);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ils-plan", resident.id] });
      setSkillToUpdate(null);
    },
  });

  const createSessionMutation = useMutation({
    mutationFn: (sessionData) => 
      base44.entities.ILSSessionLog.create({
        org_id: resident.org_id,
        resident_id: resident.id,
        resident_name: resident.display_name,
        home_id: resident.home_id,
        ...sessionData
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ils-sessions", resident.id] });
      setShowSessionLog(false);
    },
  });

  return (
    <div className="space-y-6 bg-card border border-border rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div>
          <h2 className="text-2xl font-bold">{resident.display_name}</h2>
          <p className="text-sm text-muted-foreground">{home?.name} • Last updated {ilsPlan?.updated_date ? new Date(ilsPlan.updated_date).toLocaleDateString() : "never"}</p>
        </div>
        <div className="text-right">
          <div className="text-5xl font-bold text-blue-600 mb-1">{overallScore}%</div>
          <Badge className={`${readiness.color}`}>{readiness.label}</Badge>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button onClick={() => setShowSessionLog(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Log ILS Session
        </Button>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" /> Export Report
        </Button>
      </div>

      {/* Radar Chart */}
      {ilsPlan && (
        <div className="bg-muted/20 rounded-lg p-6 flex justify-center">
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="domain" />
              <PolarRadiusAxis domain={[0, 100]} />
              <Radar name="Progress" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Domain Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ILS_DOMAINS.map(domain => {
          const section = ilsPlan?.sections?.find(s => s.domain === domain.name);
          return (
            <DomainCard
              key={domain.name}
              domain={domain}
              section={section}
              isExpanded={expandedDomain === domain.name}
              onToggle={() => setExpandedDomain(expandedDomain === domain.name ? null : domain.name)}
              onUpdateSkill={(skill) => setSkillToUpdate({ domain: domain.name, skill })}
            />
          );
        })}
      </div>

      {/* Recent Sessions */}
      {sessions.length > 0 && (
        <div className="bg-muted/10 rounded-lg p-4">
          <h3 className="font-semibold mb-3">Recent Sessions</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {sessions.slice(0, 10).map(session => (
              <div key={session.id} className="flex items-center justify-between text-sm py-2 border-b border-border/50 last:border-0">
                <div>
                  <p className="font-medium">{new Date(session.session_date).toLocaleDateString()} • {session.session_type}</p>
                  <p className="text-xs text-muted-foreground">{session.domains_covered?.join(", ") || "—"}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{session.duration_minutes} mins</p>
                  <p className="text-xs font-medium text-blue-600 capitalize">{session.young_person_engagement}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {skillToUpdate && (
        <SkillUpdateModal
          skill={skillToUpdate.skill}
          domain={skillToUpdate.domain}
          onClose={() => setSkillToUpdate(null)}
          onSave={(data) => updateSkillMutation.mutate(data)}
          user={user}
        />
      )}

      {showSessionLog && (
        <SessionLogModal
          resident={resident}
          domains={ILS_DOMAINS}
          onClose={() => setShowSessionLog(false)}
          onSave={(data) => createSessionMutation.mutate(data)}
          user={user}
        />
      )}
    </div>
  );
}