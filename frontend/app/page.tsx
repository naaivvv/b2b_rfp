"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Database,
  Download,
  Eye,
  FileSearch,
  FileText,
  Gauge,
  Layers,
  LockKeyhole,
  PenLine,
  Save,
  Search,
  Server,
  ShieldCheck,
  UploadCloud,
  UserCheck
} from "lucide-react";
import { useMemo, useState } from "react";

import FlowArt, { FlowSection } from "@/components/ui/story-scroll";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type PipelineStep = {
  label: string;
  detail: string;
  meta: string;
  icon: LucideIcon;
};

type KnowledgeSource = {
  category: string;
  title: string;
  match: string;
  excerpt: string;
  icon: LucideIcon;
};

const pipelineSteps: PipelineStep[] = [
  {
    label: "Upload",
    detail: "Secure PDF intake creates an RFP record and storage pointer.",
    meta: "Supabase Storage",
    icon: UploadCloud
  },
  {
    label: "Analyze",
    detail: "CrewAI extracts deadlines, hard requirements, and scoring criteria.",
    meta: "Analyst Agent",
    icon: FileSearch
  },
  {
    label: "Retrieve",
    detail: "Vector search pulls trusted internal knowledge for each requirement.",
    meta: "pgvector RAG",
    icon: Database
  },
  {
    label: "Draft",
    detail: "The writer agent assembles a compliant proposal in Markdown.",
    meta: "Groq Llama 3",
    icon: PenLine
  },
  {
    label: "Review",
    detail: "Humans edit, approve, and export the final response package.",
    meta: "TipTap editor",
    icon: Eye
  }
];

const complianceChecks = [
  "Deadline captured: May 31, 5:00 PM",
  "SOC 2 evidence requested",
  "Implementation timeline required",
  "References from past RFPs needed"
];

const knowledgeSources: KnowledgeSource[] = [
  {
    category: "Technical",
    title: "Cloud architecture response library",
    match: "96% match",
    excerpt: "Reusable language for deployment model, uptime targets, integrations, and support boundaries.",
    icon: Server
  },
  {
    category: "Legal",
    title: "Security and compliance appendix",
    match: "91% match",
    excerpt: "Source-backed statements for data residency, audit logs, access control, and incident handling.",
    icon: LockKeyhole
  },
  {
    category: "Past RFP",
    title: "Enterprise analytics proposal",
    match: "88% match",
    excerpt: "Winning answer patterns for implementation phases, stakeholder governance, and value proof.",
    icon: Layers
  }
];

const reviewTabs = ["Draft", "Sources", "Export"] as const;

function SectionDivider() {
  return (
    <hr className="my-6 border-t border-white/10" />
  );
}

function CtaButtons() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button asChild size="lg" className="h-12 px-5">
        <Link href="/upload">
          <UploadCloud className="mr-2 h-4 w-4" />
          Upload RFP
        </Link>
      </Button>
      <Button asChild size="lg" variant="outline" className="h-12 px-5">
        <Link href="/proposals">
          View Proposals
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

export default function HomePage() {
  const [activeStep, setActiveStep] = useState(1);
  const [activeCategory, setActiveCategory] = useState(knowledgeSources[0].category);
  const [activeReviewTab, setActiveReviewTab] = useState<(typeof reviewTabs)[number]>("Draft");

  const activePipelineStep = pipelineSteps[activeStep];
  const activeKnowledgeSource = useMemo(
    () =>
      knowledgeSources.find((source) => source.category === activeCategory) ??
      knowledgeSources[0],
    [activeCategory]
  );
  const ActivePipelineIcon = activePipelineStep.icon;
  const ActiveKnowledgeIcon = activeKnowledgeSource.icon;

  return (
    <div className="relative left-1/2 -my-10 -ml-[50vw] w-screen overflow-x-hidden bg-background">
      <FlowArt aria-label="RFP Response Architect landing page">
        <FlowSection
          aria-label="Autonomous RFP Command Center"
          className="bg-slate-950 text-white"
          style={{
            backgroundImage:
              "linear-gradient(90deg, rgba(2,6,23,0.96), rgba(15,23,42,0.76), rgba(15,23,42,0.55)), url(https://images.unsplash.com/photo-1631477076114-9123f721b9dc?q=80&w=1080&auto=format&fit=crop)",
            backgroundPosition: "center",
            backgroundSize: "cover"
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Badge className="border-white/20 bg-white/10 text-white">
              Agentic proposal operations
            </Badge>
            <div className="flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white/85">
              <Activity className="h-4 w-4 text-emerald-300" aria-hidden="true" />
              Pipeline ready
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.7fr)] lg:items-end">
            <div className="max-w-5xl">
              <p className="mb-4 text-sm font-semibold uppercase text-blue-200">
                Autonomous RFP Response Architect
              </p>
              <h1 className="max-w-6xl text-5xl font-semibold leading-none text-white sm:text-7xl lg:text-8xl">
                Turn dense RFPs into review-ready proposals.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200">
                Upload a PDF, let specialist agents extract requirements, retrieve trusted
                company knowledge, and draft a proposal your team can approve with confidence.
              </p>
              <div className="mt-8">
                <CtaButtons />
              </div>
            </div>

            <div className="rounded-lg border border-white/20 bg-white/10 p-4 shadow-2xl backdrop-blur-md">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Live pipeline</p>
                  <p className="text-xs text-slate-300">Select a stage to inspect the handoff.</p>
                </div>
                <Gauge className="h-5 w-5 text-blue-200" aria-hidden="true" />
              </div>
              <div className="grid grid-cols-5 gap-2" aria-label="Pipeline stage selector">
                {pipelineSteps.map((step, index) => {
                  const StepIcon = step.icon;
                  const isActive = index === activeStep;

                  return (
                    <button
                      key={step.label}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setActiveStep(index)}
                      className={
                        isActive
                          ? "flex min-h-14 flex-col items-center justify-center gap-1 rounded-md bg-blue-500 text-white shadow-sm transition"
                          : "flex min-h-14 flex-col items-center justify-center gap-1 rounded-md border border-white/15 bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                      }
                    >
                      <StepIcon className="h-4 w-4" aria-hidden="true" />
                      <span className="hidden text-xs sm:inline">{step.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 rounded-md bg-slate-950/70 p-4">
                <div className="flex items-start gap-3">
                  <span className="rounded-md bg-blue-500/20 p-2 text-blue-200">
                    <ActivePipelineIcon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-semibold text-white">{activePipelineStep.label}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-300">
                      {activePipelineStep.detail}
                    </p>
                    <p className="mt-3 text-xs font-medium uppercase text-emerald-300">
                      {activePipelineStep.meta}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FlowSection>

        <FlowSection
          aria-label="Analyze Requirements"
          className="text-white"
          style={{ backgroundColor: "#0c1222" }}
        >
          <div>
            <p className="text-sm font-semibold uppercase text-indigo-400">01 Analyze</p>
            <SectionDivider />
            <h2 className="max-w-5xl text-5xl font-semibold leading-none text-slate-100 sm:text-7xl lg:text-8xl">
              Extract the requirements that decide the deal.
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
            <div className="space-y-4">
              {complianceChecks.map((item) => (
                <div
                  key={item}
                  className="flex min-h-16 items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4"
                >
                  <CheckCircle2 className="h-5 w-5 flex-none text-emerald-400" aria-hidden="true" />
                  <span className="text-sm font-medium text-slate-200">{item}</span>
                </div>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="glass-card rounded-lg p-5">
                <Clock3 className="mb-4 h-6 w-6 text-indigo-400" aria-hidden="true" />
                <p className="text-sm font-semibold text-slate-100">Deadline intelligence</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Dates, submission windows, and mandatory meetings become structured review data.
                </p>
              </div>
              <div className="glass-card rounded-lg p-5">
                <AlertTriangle className="mb-4 h-6 w-6 text-amber-400" aria-hidden="true" />
                <p className="text-sm font-semibold text-slate-100">Risk flags</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Compliance gaps surface early so the proposal team can decide fast.
                </p>
              </div>
              <div className="glass-card rounded-lg p-5">
                <ClipboardCheck className="mb-4 h-6 w-6 text-emerald-400" aria-hidden="true" />
                <p className="text-sm font-semibold text-slate-100">Evaluation map</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Scoring criteria guide the answer structure before drafting starts.
                </p>
              </div>
            </div>
          </div>
        </FlowSection>

        <FlowSection
          aria-label="Retrieve Trusted Knowledge"
          className="bg-slate-950 text-white"
          style={{ backgroundColor: "#020617" }}
        >
          <div>
            <p className="text-sm font-semibold uppercase text-emerald-400">02 Retrieve</p>
            <SectionDivider />
            <h2 className="max-w-5xl text-5xl font-semibold leading-none sm:text-7xl lg:text-8xl">
              Ground every answer in trusted company knowledge.
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div
              className="min-h-80 rounded-lg border border-white/15 bg-cover bg-center p-5 shadow-2xl"
              style={{
                backgroundImage:
                  "linear-gradient(180deg, rgba(2,6,23,0.35), rgba(2,6,23,0.9)), url(https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1200&q=85)"
              }}
              aria-label="Enterprise team reviewing proposal knowledge"
            >
              <div className="mt-auto flex h-full flex-col justify-end">
                <Badge className="w-fit border-white/20 bg-white/15 text-white">
                  pgvector source bundle
                </Badge>
                <p className="mt-4 max-w-md text-lg font-semibold text-white">
                  The retriever ranks source chunks by requirement, not by generic document search.
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-white/15 bg-white/10 p-4 backdrop-blur">
              <div className="mb-4 flex flex-wrap gap-2" aria-label="Knowledge category filters">
                {knowledgeSources.map((source) => (
                  <button
                    key={source.category}
                    type="button"
                    aria-pressed={source.category === activeCategory}
                    onClick={() => setActiveCategory(source.category)}
                    className={
                      source.category === activeCategory
                        ? "min-h-11 rounded-md bg-white px-4 text-sm font-semibold text-slate-950 transition"
                        : "min-h-11 rounded-md border border-white/15 px-4 text-sm font-semibold text-white/75 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    }
                  >
                    {source.category}
                  </button>
                ))}
              </div>

              <div className="rounded-md bg-white/[0.04] p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="rounded-md bg-indigo-500/15 p-2 text-indigo-400">
                      <ActiveKnowledgeIcon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="font-semibold text-slate-100">{activeKnowledgeSource.title}</p>
                      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                        {activeKnowledgeSource.excerpt}
                      </p>
                    </div>
                  </div>
                  <Badge variant="success">{activeKnowledgeSource.match}</Badge>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {["Requirement query", "Embedding match", "Writer context"].map((label) => (
                    <div key={label} className="rounded-md border border-white/10 bg-white/[0.03] p-3">
                      <Search className="mb-2 h-4 w-4 text-slate-500" aria-hidden="true" />
                      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
                      <div className="mt-3 h-2 rounded-full bg-white/10">
                        <div className="h-2 w-4/5 rounded-full bg-indigo-500" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </FlowSection>

        <FlowSection
          aria-label="Draft Review Export"
          className="text-white"
          style={{ backgroundColor: "#0c1222" }}
        >
          <div>
            <p className="text-sm font-semibold uppercase text-indigo-400">03 Draft</p>
            <SectionDivider />
            <h2 className="max-w-5xl text-5xl font-semibold leading-none text-slate-100 sm:text-7xl lg:text-8xl">
              Move from generated draft to approved document.
            </h2>
          </div>

          <div className="glass-card rounded-lg shadow-2xl">
            <div className="flex flex-col gap-3 border-b border-white/[0.06] p-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-100">Proposal review workspace</p>
                <p className="text-sm text-slate-400">Autosave, source checks, and export controls.</p>
              </div>
              <div className="flex flex-wrap gap-2" aria-label="Review mode tabs">
                {reviewTabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    aria-pressed={activeReviewTab === tab}
                    onClick={() => setActiveReviewTab(tab)}
                    className={
                      activeReviewTab === tab
                        ? "min-h-11 rounded-md bg-gradient-to-r from-indigo-500 to-violet-500 px-4 text-sm font-semibold text-white"
                        : "min-h-11 rounded-md border border-white/10 px-4 text-sm font-semibold text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    }
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid min-h-[24rem] lg:grid-cols-2">
              <div className="border-b border-white/[0.06] bg-white/[0.02] p-4 lg:border-b-0 lg:border-r">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-300">RFP PDF</span>
                  <Badge variant="warning">12 requirements</Badge>
                </div>
                <div className="space-y-3 rounded-md border border-white/10 bg-white/[0.03] p-5">
                  <FileText className="h-6 w-6 text-slate-500" aria-hidden="true" />
                  <div className="h-3 w-3/4 rounded-full bg-white/10" />
                  <div className="h-3 w-full rounded-full bg-white/10" />
                  <div className="h-3 w-5/6 rounded-full bg-white/10" />
                  <div className="rounded-md border border-amber-500/20 bg-amber-500/[0.06] p-3 text-sm text-amber-300">
                    Mandatory security appendix detected.
                  </div>
                </div>
              </div>

              <div className="p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-300">
                    {activeReviewTab === "Draft"
                      ? "Generated proposal"
                      : activeReviewTab === "Sources"
                        ? "Source coverage"
                        : "Export package"}
                  </span>
                  <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                    <Save className="h-3.5 w-3.5" aria-hidden="true" />
                    Version 4 saved
                  </span>
                </div>
                <div className="rounded-md border border-white/10 p-5">
                  {activeReviewTab === "Draft" ? (
                    <div className="space-y-4">
                      <p className="text-xl font-semibold text-slate-100">Executive Summary</p>
                      <p className="text-sm leading-6 text-slate-400">
                        We propose a phased implementation that satisfies the RFP requirements for
                        security, integration readiness, stakeholder governance, and measurable ROI.
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Badge variant="success">Compliant</Badge>
                        <Badge variant="muted">Source-backed</Badge>
                      </div>
                    </div>
                  ) : null}

                  {activeReviewTab === "Sources" ? (
                    <div className="space-y-3">
                      {["Security appendix", "Integration playbook", "Past RFP response"].map(
                        (source) => (
                          <div key={source} className="flex items-center gap-3 rounded-md border border-white/10 p-3">
                            <CheckCircle2
                              className="h-4 w-4 text-emerald-400"
                              aria-hidden="true"
                            />
                            <span className="text-sm font-medium text-slate-300">{source}</span>
                          </div>
                        )
                      )}
                    </div>
                  ) : null}

                  {activeReviewTab === "Export" ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Button variant="outline" className="h-12 justify-start">
                        <Download className="mr-2 h-4 w-4" />
                        Export PDF
                      </Button>
                      <Button variant="outline" className="h-12 justify-start">
                        <Download className="mr-2 h-4 w-4" />
                        Export DOCX
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </FlowSection>

        <FlowSection
          aria-label="Human in the Loop Control"
          className="text-white"
          style={{ backgroundColor: "#0f172a" }}
        >
          <div>
            <p className="text-sm font-semibold uppercase text-violet-400">04 Control</p>
            <SectionDivider />
            <h2 className="max-w-5xl text-5xl font-semibold leading-none sm:text-7xl lg:text-8xl">
              Human approval stays at the center.
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr] lg:items-end">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="glass-card rounded-lg p-5">
                <UserCheck className="mb-4 h-6 w-6 text-indigo-400" aria-hidden="true" />
                <p className="font-semibold text-slate-100">Reviewer-owned</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Drafts are editable and approval is explicit before final export.
                </p>
              </div>
              <div className="glass-card rounded-lg p-5">
                <ShieldCheck className="mb-4 h-6 w-6 text-emerald-400" aria-hidden="true" />
                <p className="font-semibold text-slate-100">Compliance visible</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Requirements, sources, and status are visible across the workflow.
                </p>
              </div>
              <div className="glass-card rounded-lg p-5">
                <Bot className="mb-4 h-6 w-6 text-violet-400" aria-hidden="true" />
                <p className="font-semibold text-slate-100">Agents coordinated</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Analyst, retriever, and writer roles run in a controlled sequence.
                </p>
              </div>
            </div>

            <div className="glass-card rounded-lg p-5 shadow-2xl">
              <p className="text-sm font-semibold text-slate-500">Start the workflow</p>
              <p className="mt-3 text-3xl font-semibold leading-tight text-slate-100">
                Upload a new RFP or jump back into proposal review.
              </p>
              <p className="mt-4 text-sm leading-6 text-slate-400">
                Both actions stay available because proposal teams move between intake,
                monitoring, editing, and approval throughout the day.
              </p>
              <div className="mt-6">
                <CtaButtons />
              </div>
            </div>
          </div>
        </FlowSection>
      </FlowArt>
    </div>
  );
}
