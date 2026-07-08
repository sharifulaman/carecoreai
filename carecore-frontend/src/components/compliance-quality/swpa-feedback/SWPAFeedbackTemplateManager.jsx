import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_TEMPLATE = {
  name: "Social Worker/PA Feedback",
  description: "Quality Check: Evaluating our impact and enhancing the performance of support services through Social Worker/Personal Adviser feedback.",
  status: "active",
  version_number: "1.0",
  sections: [
    {
      section_id: "section_1",
      title: "Section 1: General Feedback",
      description: "",
      questions: [
        {
          question_id: "q1",
          question_text: "Do you think our services meet the needs of the young people?",
          question_type: "multiple_choice",
          options: ["Yes, fully", "Partially", "No"],
          is_required: true,
          display_order: 1
        },
        {
          question_id: "q2",
          question_text: "How would you describe the communication between our team and social worker?",
          question_type: "multiple_choice",
          options: ["Excellent", "Good", "Satisfactory", "Needs Improvement"],
          is_required: true,
          display_order: 2
        },
        {
          question_id: "q3",
          question_text: "Have you experienced any challenges with working with our team?",
          question_type: "text",
          is_required: false,
          display_order: 3
        }
      ]
    },
    {
      section_id: "section_2",
      title: "Section 2: Support Worker Performance",
      description: "",
      questions: [
        {
          question_id: "q4",
          question_text: "In your opinion how would you rate the professionalism of our support workers?",
          question_type: "multiple_choice",
          options: ["Excellent", "Good", "Average", "Poor"],
          is_required: true,
          display_order: 4
        },
        {
          question_id: "q5",
          question_text: "Are our support workers adequately trained to handle the needs of young people?",
          question_type: "multiple_choice",
          options: ["Yes", "Somewhat", "No"],
          is_required: true,
          display_order: 5
        },
        {
          question_id: "q6",
          question_text: "Are our support workers responsive and proactive?",
          question_type: "multiple_choice",
          options: ["Always", "Often", "Sometimes", "Rarely"],
          is_required: true,
          display_order: 6
        },
        {
          question_id: "q7",
          question_text: "Do our workers foster a safe and supportive environment for young people?",
          question_type: "multiple_choice",
          options: ["Yes", "Partially", "No"],
          is_required: true,
          display_order: 7
        },
        {
          question_id: "q8",
          question_text: "How would you rate the overall quality of support provided to young people?",
          question_type: "multiple_choice",
          options: ["Excellent", "Good", "Average", "Poor"],
          is_required: true,
          display_order: 8
        }
      ]
    },
    {
      section_id: "section_3",
      title: "Section 3: Service Improvement",
      description: "",
      questions: [
        {
          question_id: "q9",
          question_text: "Any suggestions for improving collaboration between your team and ours?",
          question_type: "text",
          is_required: false,
          display_order: 9
        }
      ]
    }
  ]
};

export default function SWPAFeedbackTemplateManager({ orgId, user, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(DEFAULT_TEMPLATE);
  const [activeSection, setActiveSection] = useState(0);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SWPAFeedbackTemplate.create({
      org_id: orgId,
      created_by_id: user?.id,
      created_by_name: user?.full_name,
      ...data
    }),
    onSuccess: () => {
      toast.success("Template created successfully");
      qc.invalidateQueries({ queryKey: ["swpa-templates"] });
      onClose?.();
    },
    onError: (err) => toast.error("Error: " + err.message)
  });

  const handleSubmit = () => {
    if (!form.name?.trim()) {
      toast.error("Template name required");
      return;
    }
    createMutation.mutate(form);
  };

  const updateQuestion = (sectionIdx, qIdx, field, value) => {
    const updated = { ...form };
    updated.sections[sectionIdx].questions[qIdx][field] = value;
    setForm(updated);
  };

  const addQuestion = (sectionIdx) => {
    const updated = { ...form };
    const newId = `q${Date.now()}`;
    updated.sections[sectionIdx].questions.push({
      question_id: newId,
      question_text: "",
      question_type: "multiple_choice",
      options: ["Option 1"],
      is_required: true,
      display_order: updated.sections[sectionIdx].questions.length + 1
    });
    setForm(updated);
  };

  const removeQuestion = (sectionIdx, qIdx) => {
    const updated = { ...form };
    updated.sections[sectionIdx].questions.splice(qIdx, 1);
    setForm(updated);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-lg font-bold">Edit SW/PA Feedback Template</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* Template Info */}
          <div>
            <label className="text-sm font-medium">Template Name</label>
            <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="mt-1" />
          </div>

          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} className="mt-1" />
          </div>

          {/* Sections */}
          <div className="border-t border-border pt-4">
            <h3 className="font-semibold mb-3">Sections & Questions</h3>
            <div className="space-y-4">
              {form.sections.map((section, sIdx) => (
                <div key={section.section_id} className="border border-border rounded-lg p-4 bg-muted/20">
                  <h4 className="font-medium mb-3">{section.title}</h4>
                  
                  {/* Questions in section */}
                  <div className="space-y-3 mb-3">
                    {section.questions.map((q, qIdx) => (
                      <div key={q.question_id} className="bg-white rounded border border-border p-3 text-sm">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <Input
                            value={q.question_text}
                            onChange={e => updateQuestion(sIdx, qIdx, "question_text", e.target.value)}
                            placeholder="Question text"
                            className="flex-1 h-8"
                          />
                          <button onClick={() => removeQuestion(sIdx, qIdx)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                        </div>
                        
                        <select
                          value={q.question_type}
                          onChange={e => updateQuestion(sIdx, qIdx, "question_type", e.target.value)}
                          className="w-full px-2 py-1 border border-border rounded text-xs"
                        >
                          <option value="multiple_choice">Multiple Choice</option>
                          <option value="text">Text Input</option>
                          <option value="rating">Rating</option>
                        </select>

                        {q.question_type === "multiple_choice" && (
                          <div className="mt-2 text-xs">
                            <label className="block font-medium mb-1">Options (comma-separated)</label>
                            <Input
                              value={q.options.join(", ")}
                              onChange={e => updateQuestion(sIdx, qIdx, "options", e.target.value.split(",").map(o => o.trim()))}
                              className="h-7"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <Button size="sm" variant="outline" onClick={() => addQuestion(sIdx)} className="w-full gap-1">
                    <Plus className="w-3 h-3" /> Add Question
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-border px-6 py-4 flex items-center justify-end gap-2 bg-muted/30 sticky bottom-0">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Saving..." : "Save Template"}
          </Button>
        </div>
      </div>
    </div>
  );
}