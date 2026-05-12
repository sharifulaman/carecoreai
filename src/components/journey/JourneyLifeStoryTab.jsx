import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { ORG_ID } from "@/lib/roleConfig";

import JourneySectionNav from "./JourneySectionNav";
import JourneySummaryCard from "./JourneySummaryCard";
import JourneyRouteSection from "./JourneyRouteSection";
import JourneyAIReviewPanel from "./JourneyAIReviewPanel";
import JourneyWorkflowPanel from "./JourneyWorkflowPanel";
import {
  IdentitySection, FamilySection, ReasonSection, CountriesSection,
  TravelDocumentsSection, HelpersSection, FundingSection, AsylumClaimsSection,
  ArrivalSection, FearSection, EvidenceSection, StatementBuilderSection,
} from "./JourneySectionForms";

function calcCompletion(record, stages, familyMembers, countries, claims, evidenceDocs) {
  const checks = [
    !!record?.country_of_origin,
    !!record?.nationality,
    !!record?.language_spoken,
    familyMembers.length > 0,
    (record?.reason_for_leaving_categories || []).length > 0 || !!record?.reason_for_leaving_summary,
    stages.length >= 2,
    countries.length > 0,
    record?.had_passport !== "unknown",
    !!record?.journey_arranged_by,
    record?.money_paid_for_journey !== "unknown",
    !!record?.uk_arrival_date,
    !!record?.uk_arrival_method,
    !!record?.fear_of_return_summary || !!record?.what_yp_fears_if_returned,
    evidenceDocs.length > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export default function JourneyLifeStoryTab({ resident, staffProfile, user }) {
  const [activeSection, setActiveSection] = useState("route");
  const [generating, setGenerating] = useState(false);
  const qc = useQueryClient();

  const residentId = resident?.id;

  const { data: records = [] } = useQuery({
    queryKey: ["journey-record", residentId],
    queryFn: () => base44.entities.JourneyLifeStoryRecord.filter({ resident_id: residentId }),
    enabled: !!residentId,
  });

  const { data: stages = [] } = useQuery({
    queryKey: ["journey-stages", residentId],
    queryFn: () => base44.entities.JourneyStage.filter({ resident_id: residentId }),
    enabled: !!residentId,
  });

  const { data: familyMembers = [] } = useQuery({
    queryKey: ["journey-family", residentId],
    queryFn: () => base44.entities.JourneyFamilyMember.filter({ resident_id: residentId }),
    enabled: !!residentId,
  });

  const { data: countries = [] } = useQuery({
    queryKey: ["journey-countries", residentId],
    queryFn: () => base44.entities.JourneyCountryPassedThrough.filter({ resident_id: residentId }),
    enabled: !!residentId,
  });

  const { data: claims = [] } = useQuery({
    queryKey: ["journey-claims", residentId],
    queryFn: () => base44.entities.PreviousAsylumClaim.filter({ resident_id: residentId }),
    enabled: !!residentId,
  });

  const { data: evidenceDocs = [] } = useQuery({
    queryKey: ["journey-evidence", residentId],
    queryFn: () => base44.entities.JourneyEvidenceDocument.filter({ resident_id: residentId }),
    enabled: !!residentId,
  });

  const { data: reviewEvents = [] } = useQuery({
    queryKey: ["journey-events", residentId],
    queryFn: () => base44.entities.JourneyReviewEvent.filter({ resident_id: residentId }),
    enabled: !!residentId,
  });

  // Get or create record
  const record = records[0] || null;

  const getOrCreateRecord = useCallback(async () => {
    if (record) return record;
    const newRecord = await base44.entities.JourneyLifeStoryRecord.create({
      org_id: ORG_ID,
      resident_id: residentId,
      statement_status: "draft",
      workflow_status: "draft",
      completion_percentage: 0,
      updated_by_name: staffProfile?.full_name || user?.email,
    });
    qc.invalidateQueries({ queryKey: ["journey-record", residentId] });
    return newRecord;
  }, [record, residentId, staffProfile, user, qc]);

  const handleFieldChange = useCallback(async (field, value) => {
    const rec = await getOrCreateRecord();
    const completion = calcCompletion(
      { ...rec, [field]: value }, stages, familyMembers, countries, claims, evidenceDocs
    );
    await base44.entities.JourneyLifeStoryRecord.update(rec.id, {
      [field]: value,
      completion_percentage: completion,
      updated_by_name: staffProfile?.full_name || user?.email,
    });
    qc.invalidateQueries({ queryKey: ["journey-record", residentId] });
  }, [getOrCreateRecord, stages, familyMembers, countries, claims, evidenceDocs, staffProfile, user, qc, residentId]);

  const handleSaveDraft = async () => {
    const rec = await getOrCreateRecord();
    const completion = calcCompletion(rec, stages, familyMembers, countries, claims, evidenceDocs);
    await base44.entities.JourneyLifeStoryRecord.update(rec.id, {
      completion_percentage: completion,
      updated_by_name: staffProfile?.full_name || user?.email,
    });
    qc.invalidateQueries({ queryKey: ["journey-record", residentId] });
    toast.success("Draft saved");
  };

  const handleSubmit = async () => {
    const rec = await getOrCreateRecord();
    await base44.entities.JourneyLifeStoryRecord.update(rec.id, {
      workflow_status: "submitted",
      statement_status: "submitted",
      submitted_by: staffProfile?.full_name || user?.email,
      submitted_at: new Date().toISOString(),
    });
    await base44.entities.JourneyReviewEvent.create({
      org_id: ORG_ID, resident_id: residentId, life_story_id: rec.id,
      event_type: "submitted", from_status: "draft", to_status: "submitted",
      created_by: user?.email, created_by_name: staffProfile?.full_name,
    });
    qc.invalidateQueries({ queryKey: ["journey-record", residentId] });
    qc.invalidateQueries({ queryKey: ["journey-events", residentId] });
    toast.success("Submitted for review");
  };

  const handleGenerateStatement = async () => {
    setGenerating(true);
    try {
      const rec = await getOrCreateRecord();
      const context = {
        resident: resident?.display_name, nationality: rec.nationality,
        country_of_origin: rec.country_of_origin, home_town: rec.home_town,
        reason: rec.reason_for_leaving_summary, journey: stages.map(s => `${s.from_country}→${s.to_country} (${s.departure_date}, ${s.approximate_duration}, via ${(s.travel_methods || []).join("/")})`).join("; "),
        countries_passed: countries.map(c => c.country).join(", "),
        uk_arrival: `${rec.uk_arrival_date} by ${rec.uk_arrival_method} at ${rec.uk_arrival_place}`,
        fear_of_return: rec.fear_of_return_summary,
        family: familyMembers.map(f => `${f.name} (${f.relationship}, ${f.current_location})`).join("; "),
        claims: claims.map(c => `${c.country}: ${c.outcome}`).join("; "),
      };

      const prompt = `You are an experienced social care professional writing a formal narrative life story and journey chronology for an unaccompanied asylum-seeking young person. 

Write a detailed, flowing, third-person narrative — NOT a list of questions and answers, NOT bullet points, NOT headings with short answers. Write it as continuous prose paragraphs, as you would find in a professional social work report or witness statement bundle prepared for a solicitor.

The narrative must cover all of the following areas in a natural, connected way:
1. Personal background, identity and origins
2. Family circumstances and who they lived with
3. The problems and threats they faced in their home country
4. The decision to leave and who made that decision
5. The full journey route stage by stage, including methods of travel, countries passed through, approximate dates and durations, who arranged each stage, and any harm or exploitation experienced
6. Documents used during the journey and what happened to them
7. People who helped or organised the journey and any concerns about exploitation or control
8. Money paid for the journey, who paid it, and any debts
9. Any previous asylum claims in other countries
10. Arrival in the UK — date, method, location, and initial steps taken
11. Fear of return — what the young person fears would happen and why
12. Any outstanding matters requiring clarification by the solicitor

Use professional, neutral language throughout. Where information was provided by the young person, write "as stated by [name]" or "according to [name]". Where information is uncertain or approximate, record this clearly (e.g. "the exact date is not known", "approximately"). Do not invent or assume facts not provided.

DATA TO USE:
- Name: ${context.resident || "Not recorded"}
- Nationality: ${context.nationality || "Not recorded"}
- Country of origin: ${context.country_of_origin || "Not recorded"}, hometown: ${context.home_town || "Not recorded"}
- Reason for leaving: ${context.reason || "Not recorded"}
- Journey stages: ${context.journey || "Not recorded"}
- Countries passed through: ${context.countries_passed || "Not recorded"}
- UK arrival: ${context.uk_arrival}
- Fear of return: ${context.fear_of_return || "Not recorded"}
- Family in home country: ${context.family || "Not recorded"}
- Previous asylum claims: ${context.claims || "None recorded"}

End the document with this exact disclaimer on a new line:
---
DISCLAIMER: This document is a care-record narrative draft prepared by social care staff to support professional review. It is not a formal legal witness statement and must be reviewed and approved by the young person's legal representative before any official use.`;

      const result = await base44.integrations.Core.InvokeLLM({ prompt });
      if (!result) throw new Error("No response from AI");
      await base44.entities.JourneyLifeStoryRecord.update(rec.id, {
        generated_statement: result,
        updated_by_name: staffProfile?.full_name,
      });
      qc.invalidateQueries({ queryKey: ["journey-record", residentId] });
      toast.success("Draft statement generated");
      setActiveSection("statement");
    } catch (err) {
      toast.error("Failed to generate statement: " + (err?.message || "Unknown error"));
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveStatement = async (text) => {
    const rec = await getOrCreateRecord();
    await base44.entities.JourneyLifeStoryRecord.update(rec.id, { generated_statement: text, updated_by_name: staffProfile?.full_name });
    qc.invalidateQueries({ queryKey: ["journey-record", residentId] });
    toast.success("Statement saved");
  };

  const handleExportPDF = () => {
    toast.info("PDF export — please use browser print for now (Ctrl+P / Cmd+P)");
    window.print();
  };

  const refresh = (key) => qc.invalidateQueries({ queryKey: [key, residentId] });

  const completion = calcCompletion(record, stages, familyMembers, countries, claims, evidenceDocs);

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-xs text-slate-400">
        <span>Young People</span>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-600 font-medium">{resident?.display_name}</span>
        <ChevronRight className="w-3 h-3" />
        <span>Records & Compliance</span>
        <ChevronRight className="w-3 h-3" />
        <span className="text-purple-600 font-semibold">Journey & Life Story</span>
      </nav>

      {/* Summary card */}
      <JourneySummaryCard
        resident={resident}
        record={record}
        staffProfile={staffProfile}
        onSaveDraft={handleSaveDraft}
        onSubmit={handleSubmit}
        onGenerateStatement={handleGenerateStatement}
        onExportPDF={handleExportPDF}
      />

      {/* Sensitivity notice */}
      <div className="text-xs text-slate-500 italic px-1">
        ℹ️ Information should be recorded as provided by the young person and reviewed sensitively. Staff should avoid leading questions and should record uncertainty clearly. Use "Unknown" or "Approximate" where information is not confirmed.
      </div>

      {/* 3-column layout */}
      <div className="flex gap-4 items-start">

        {/* LEFT: Section navigator */}
        <div className="w-56 shrink-0">
          <JourneySectionNav
            activeSection={activeSection}
            onSelect={setActiveSection}
            completion={completion}
            record={record}
            stages={stages}
            familyMembers={familyMembers}
            countries={countries}
            claims={claims}
            evidenceDocs={evidenceDocs}
          />
        </div>

        {/* CENTRE: Section content */}
        <div className="flex-1 min-w-0">
          {activeSection === "identity" && <IdentitySection record={record} onChange={handleFieldChange} />}
          {activeSection === "family" && <FamilySection familyMembers={familyMembers} residentId={residentId} lifeStoryId={record?.id} onRefresh={() => refresh("journey-family")} />}
          {activeSection === "reason" && <ReasonSection record={record} onChange={handleFieldChange} />}
          {activeSection === "route" && (
            <JourneyRouteSection stages={stages} residentId={residentId} lifeStoryId={record?.id} onRefresh={() => refresh("journey-stages")} />
          )}
          {activeSection === "countries" && <CountriesSection countries={countries} residentId={residentId} lifeStoryId={record?.id} onRefresh={() => refresh("journey-countries")} />}
          {activeSection === "documents" && <TravelDocumentsSection record={record} onChange={handleFieldChange} />}
          {activeSection === "helpers" && <HelpersSection record={record} onChange={handleFieldChange} />}
          {activeSection === "funding" && <FundingSection record={record} onChange={handleFieldChange} />}
          {activeSection === "asylum" && <AsylumClaimsSection claims={claims} residentId={residentId} lifeStoryId={record?.id} onRefresh={() => refresh("journey-claims")} />}
          {activeSection === "arrival" && <ArrivalSection record={record} onChange={handleFieldChange} />}
          {activeSection === "fear" && <FearSection record={record} onChange={handleFieldChange} />}
          {activeSection === "evidence" && <EvidenceSection evidenceDocs={evidenceDocs} residentId={residentId} lifeStoryId={record?.id} staffProfile={staffProfile} onRefresh={() => refresh("journey-evidence")} />}
          {activeSection === "statement" && (
            <StatementBuilderSection
              record={record} stages={stages} familyMembers={familyMembers}
              countries={countries} claims={claims}
              onSaveStatement={handleSaveStatement}
              onRegenerateStatement={handleGenerateStatement}
              generating={generating}
            />
          )}
        </div>

        {/* RIGHT: AI Review + Workflow */}
        <div className="w-64 shrink-0 space-y-4">
          <JourneyAIReviewPanel
            record={record}
            stages={stages}
            countries={countries}
            claims={claims}
            onViewFull={() => toast.info("Full AI review is shown above.")}
          />
          <JourneyWorkflowPanel record={record} reviewEvents={reviewEvents} />
        </div>
      </div>
    </div>
  );
}