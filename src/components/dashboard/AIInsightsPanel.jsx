import { useState } from "react";
import { Brain, RefreshCw, Loader2, AlertTriangle, TrendingUp, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

export default function AIInsightsPanel({ residents = [], reports = [], logs = [] }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateInsights = async () => {
    setLoading(true);
    try {
      const context = {
        totalResidents: residents.length,
        activeResidents: residents.filter(r => r.status === "active").length,
        reportsToday: reports.filter(r => r.date === new Date().toISOString().split("T")[0]).length,
        highRisk: residents.filter(r => r.risk_level === "high" || r.risk_level === "critical").length,
        recentReports: reports.slice(0, 10).map(r => ({
          resident: r.resident_name,
          date: r.date,
          status: r.status
        })),
      };

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an AI assistant for a UK care management platform. Generate a concise daily overview for an administrator. Here is today's data: ${JSON.stringify(context)}. Write 3-5 bullet points highlighting: any concerns, overdue items, positive observations. Use British English. Be professional and actionable. If data is limited, note what should be monitored.`,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            flags: { type: "array", items: { type: "object", properties: { text: { type: "string" }, priority: { type: "string" } } } },
          }
        }
      });
      setInsights(result);
    } catch (err) {
      setInsights({ summary: "Unable to generate insights at this time. Please try again.", flags: [] });
    }
    setLoading(false);
  };

  return (
    <div className="bg-gradient-to-r from-primary/5 via-primary/[0.02] to-transparent rounded-xl border border-primary/20 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">AI Insights — Today's Overview</h3>
            <p className="text-xs text-muted-foreground">Automated analysis of your organisation</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={generateInsights}
          disabled={loading}
          className="gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {insights ? "Refresh" : "Generate"} Insights
        </Button>
      </div>

      {insights ? (
        <div className="space-y-3">
          <p className="text-sm text-foreground leading-relaxed">{insights.summary}</p>
          {insights.flags?.length > 0 && (
            <div className="space-y-2 mt-3">
              {insights.flags.map((flag, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{flag.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Click "Generate Insights" to get an AI-powered analysis of your organisation's current status.
        </p>
      )}
    </div>
  );
}