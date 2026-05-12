import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send, X, Sparkles, Loader2 } from "lucide-react";
import { differenceInDays, parseISO, format } from "date-fns";
import ReactMarkdown from "react-markdown";
import { useQuery } from "@tanstack/react-query";

const SUGGESTED = [
  "Who is due a supervision this week?",
  "Which staff have DBS expiring in the next 30 days?",
  "Show me quiz pass rates for all staff",
  "Which staff have overdue policy acknowledgements?",
  "Who has outstanding disciplinary records?",
  "Which staff have the most absences this month?",
];

function buildContext({ staff, supervisions, training, balances, leaves, disciplinary, quizResults, policyAssignments, expenses, wellbeing }) {
  const today = new Date().toISOString().split("T")[0];
  return `
TODAY: ${today}

ACTIVE STAFF (${staff.filter(s => s.status === "active").length} total):
${staff.filter(s => s.status === "active").map(s =>
  `- ${s.full_name} | Role: ${s.role} | DBS: ${s.dbs_expiry || "N/A"} | Home(s): ${s.home_ids?.join(",") || "N/A"} | Contract: ${s.contract_type || "N/A"} | Start: ${s.start_date || "N/A"} | RTW Checked: ${s.rtw_checked ? "Yes" : "No"}`
).join("\n")}

SUPERVISION RECORDS (last 30):
${supervisions.slice(-30).map(s =>
  `- ${s.supervisee_name || s.staff_name} supervised by ${s.supervisor_name} on ${s.session_date || s.supervision_date} | Status: ${s.status} | Next: ${s.next_supervision_date || "N/A"}`
).join("\n") || "None recorded."}

TRAINING RECORDS (all):
${training.map(t =>
  `- ${t.staff_name}: ${t.course_name} | Status: ${t.training_status || t.status} | Expires: ${t.expiry_date || "N/A"} | Completed: ${t.completion_date || "N/A"}`
).join("\n") || "None recorded."}

LEAVE BALANCES:
${balances.map(b =>
  `- Staff ID ${b.staff_id}: ${b.days_remaining} days remaining of ${b.annual_entitlement} (Year: ${b.leave_year || "current"})`
).join("\n") || "No balances recorded."}

RECENT LEAVE REQUESTS:
${leaves.slice(-20).map(l =>
  `- ${l.staff_name}: ${l.leave_type?.replace(/_/g, " ")} | ${l.date_from} to ${l.date_to} | ${l.days_requested} days | Status: ${l.status}`
).join("\n") || "None."}

DISCIPLINARY RECORDS:
${disciplinary.slice(-20).map(d =>
  `- ${d.staff_name}: ${d.stage || d.type} | Date: ${d.date || d.created_date?.split("T")[0]} | Outcome: ${d.outcome || "Pending"} | Status: ${d.status}`
).join("\n") || "No disciplinary records."}

POLICY QUIZ RESULTS (Safeguarding Quiz):
${quizResults.map(r =>
  `- ${r.staff_name} (${r.staff_role}): ${r.status === "completed" ? `Score ${r.score}% — ${r.passed ? "PASSED" : "FAILED"}` : "Assigned — not yet taken"} | Completed: ${r.completed_at ? r.completed_at.split("T")[0] : "N/A"}`
).join("\n") || "No quiz results."}
Quiz summary: ${quizResults.filter(r => r.passed).length} passed, ${quizResults.filter(r => !r.passed && r.status === "completed").length} failed, ${quizResults.filter(r => r.status === "assigned").length} pending.

POLICY ASSIGNMENTS (last 20):
${policyAssignments.slice(-20).map(a =>
  `- ${a.staff_name}: "${a.policy_title}" | Due: ${a.due_date || "N/A"} | Status: ${a.status}`
).join("\n") || "No assignments."}

EXPENSES (last 15):
${expenses.slice(-15).map(e =>
  `- ${e.staff_name}: £${e.amount} | Category: ${e.category} | Date: ${e.expense_date || e.date} | Status: ${e.status}`
).join("\n") || "None."}

WELLBEING CHECK-INS (last 15):
${wellbeing.slice(-15).map(w =>
  `- ${w.staff_name || "Staff"}: Mood ${w.mood_score || w.mood || "N/A"} | Date: ${w.check_in_date || w.created_date?.split("T")[0]} | ${w.notes ? "Notes: " + w.notes : ""}`
).join("\n") || "None."}
`.trim();
}

export default function HRAIAssistant({ staff = [] }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! I'm your HR AI Assistant. I have full access to your HR module — staff profiles, supervisions, training, leave, disciplinary, quizzes, policy compliance, expenses, and wellbeing. How can I help?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  // Fetch all HR data
  const { data: supervisions = [] } = useQuery({
    queryKey: ["ai-supervisions"],
    queryFn: () => secureGateway.filter("SupervisionRecord", {}, "-supervision_date", 100),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });
  const { data: training = [] } = useQuery({
    queryKey: ["ai-training"],
    queryFn: () => secureGateway.filter("TrainingRecord", {}, "-created_date", 200),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });
  const { data: balances = [] } = useQuery({
    queryKey: ["ai-leave-balances"],
    queryFn: () => secureGateway.filter("LeaveBalance", {}, "-created_date", 200),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });
  const { data: leaves = [] } = useQuery({
    queryKey: ["ai-leaves"],
    queryFn: () => secureGateway.filter("LeaveRequest", {}, "-date_from", 100),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });
  const { data: disciplinary = [] } = useQuery({
    queryKey: ["ai-disciplinary"],
    queryFn: () => secureGateway.filter("DisciplinaryRecord", {}, "-created_date", 50),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });
  const { data: quizResults = [] } = useQuery({
    queryKey: ["ai-quiz-results"],
    queryFn: () => base44.entities.PolicyQuizResult.filter({ quiz_id: "safeguarding_children_v1" }),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });
  const { data: policyAssignments = [] } = useQuery({
    queryKey: ["ai-policy-assignments"],
    queryFn: () => secureGateway.filter("HRPolicyStaffAssignment", {}, "-assigned_at", 100),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });
  const { data: expenses = [] } = useQuery({
    queryKey: ["ai-expenses"],
    queryFn: () => secureGateway.filter("StaffExpense", {}, "-expense_date", 100),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });
  const { data: wellbeing = [] } = useQuery({
    queryKey: ["ai-wellbeing"],
    queryFn: () => secureGateway.filter("WellbeingCheckIn", {}, "-created_date", 50),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const send = async (text) => {
    const question = text || input;
    if (!question.trim()) return;
    setInput("");
    setMessages(m => [...m, { role: "user", content: question }]);
    setLoading(true);
    try {
      const context = buildContext({ staff, supervisions, training, balances, leaves, disciplinary, quizResults, policyAssignments, expenses, wellbeing });
      const history = messages.slice(-10).map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n");
      const prompt = `You are an expert HR assistant for a UK children's care organisation. 
You have access to the following comprehensive HR module data:

${context}

Conversation so far:
${history}

User's question: ${question}

Answer concisely and helpfully. Use bullet points where appropriate. Reference specific staff names and dates from the data above. 
If generating documents, produce clean structured output. For compliance questions, flag red/amber issues clearly.
For quiz questions, reference actual pass/fail data per staff member.`;

      const result = await base44.integrations.Core.InvokeLLM({ prompt });
      setMessages(m => [...m, { role: "assistant", content: typeof result === "string" ? result : result?.response || "I couldn't generate a response." }]);
    } catch (e) {
      setMessages(m => [...m, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-full shadow-lg hover:bg-primary/90 transition-all text-sm font-medium"
        >
          <Sparkles className="w-4 h-4" /> Ask HR AI
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-full max-w-sm flex flex-col bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
          style={{ height: "540px" }}>

          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-primary text-primary-foreground">
            <Bot className="w-4 h-4" />
            <span className="font-semibold text-sm flex-1">HR AI Assistant</span>
            <button onClick={() => setOpen(false)}><X className="w-4 h-4 opacity-70 hover:opacity-100" /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[90%] rounded-xl px-3 py-2 text-xs ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}>
                  {msg.role === "assistant" ? (
                    <ReactMarkdown className="prose prose-xs max-w-none text-xs [&>*:first-child]:mt-0 [&>*:last-child]:mb-0
                      [&_ul]:list-disc [&_ul]:ml-4 [&_li]:my-0.5 [&_strong]:font-semibold [&_p]:my-1">
                      {msg.content}
                    </ReactMarkdown>
                  ) : msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-xl px-3 py-2 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Thinking…</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {messages.length <= 1 && !loading && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {SUGGESTED.slice(0, 4).map(q => (
                <button key={q} onClick={() => send(q)}
                  className="text-[10px] bg-muted hover:bg-muted/80 text-muted-foreground px-2 py-1 rounded-full transition-colors text-left">
                  {q}
                </button>
              ))}
            </div>
          )}

          <div className="px-3 pb-3 flex gap-2 border-t border-border pt-3">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about staff, leave, DBS, quizzes, compliance…"
              className="text-xs h-8 flex-1"
              disabled={loading}
            />
            <Button size="sm" className="h-8 w-8 p-0" disabled={!input.trim() || loading} onClick={() => send()}>
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}