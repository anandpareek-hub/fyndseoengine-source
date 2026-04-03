"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Target, ArrowLeft, Loader2, ArrowRight, Check } from "lucide-react";

interface SiteData {
  id: string;
  domain: string;
  name: string;
  seoGoalType: string | null;
  businessModel: string | null;
  primarySeoGoal: string | null;
  targetRegions: string[];
  contentTone: string | null;
  topicsOfInterest: string[];
}

const goalTypes = [
  { value: "sales", label: "Drive Sales", desc: "Rank product/category pages to sell more" },
  { value: "leads", label: "Generate Leads", desc: "Attract potential customers to convert" },
  { value: "traffic", label: "Grow Traffic", desc: "Increase organic visitors and visibility" },
  { value: "brand_awareness", label: "Brand Awareness", desc: "Build authority and recognition" },
];

const businessModels = [
  { value: "ecommerce", label: "E-commerce" },
  { value: "saas", label: "SaaS / Software" },
  { value: "services", label: "Services / Agency" },
  { value: "media", label: "Media / Publishing" },
  { value: "other", label: "Other" },
];

const contentTones = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual & Friendly" },
  { value: "technical", label: "Technical & Expert" },
  { value: "conversational", label: "Conversational" },
];

export default function OnboardingStep3() {
  const [site, setSite] = useState<SiteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seoGoalType, setSeoGoalType] = useState("");
  const [businessModel, setBusinessModel] = useState("");
  const [primarySeoGoal, setPrimarySeoGoal] = useState("");
  const [contentTone, setContentTone] = useState("");
  const [topicInput, setTopicInput] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/sites")
      .then((r) => r.json())
      .then((data) => {
        if (!data || data.length === 0) {
          router.push("/onboarding/step1");
          return;
        }
        const s = data[0];
        setSite(s);
        setSeoGoalType(s.seoGoalType || "");
        setBusinessModel(s.businessModel || "");
        setPrimarySeoGoal(s.primarySeoGoal || "");
        setContentTone(s.contentTone || "");
        setTopics(s.topicsOfInterest || []);
        setLoading(false);
      });
  }, [router]);

  async function handleSave() {
    if (!site) return;
    setSaving(true);
    await fetch(`/api/sites/${site.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seoGoalType,
        businessModel,
        primarySeoGoal,
        contentTone,
        topicsOfInterest: topics,
      }),
    });
    router.push("/onboarding/step4");
  }

  function addTopic() {
    if (!topicInput.trim()) return;
    setTopics([...topics, topicInput.trim()]);
    setTopicInput("");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
        <Loader2 className="w-8 h-8 text-[#FF5722] animate-spin" />
      </div>
    );
  }

  if (!site) return null;

  return (
    <div className="min-h-screen bg-[#f8f9fa] py-12 px-4">
      <div className="w-full max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-[#1a1a2e]">
            <Target className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">Your SEO Strategy</h1>
          <p className="text-gray-500 mt-1">Tell us what you want to achieve so we can tailor the AI agent</p>
        </div>

        <div className="space-y-4">
          {/* SEO Goal Type */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
            <h3 className="text-sm font-semibold text-[#1a1a2e] mb-3">What&apos;s your primary SEO goal?</h3>
            <div className="grid grid-cols-2 gap-3">
              {goalTypes.map((goal) => (
                <button
                  key={goal.value}
                  onClick={() => setSeoGoalType(goal.value)}
                  className={`relative rounded-lg border-2 p-4 text-left transition-all ${
                    seoGoalType === goal.value
                      ? "border-[#FF5722] bg-[#FFF3E0]"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {seoGoalType === goal.value && (
                    <div className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-[#FF5722]">
                      <Check className="size-3 text-white" />
                    </div>
                  )}
                  <div className="text-sm font-semibold text-[#1a1a2e]">{goal.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{goal.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Business Model */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
            <h3 className="text-sm font-semibold text-[#1a1a2e] mb-3">Business model</h3>
            <div className="flex flex-wrap gap-2">
              {businessModels.map((bm) => (
                <button
                  key={bm.value}
                  onClick={() => setBusinessModel(bm.value)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                    businessModel === bm.value
                      ? "border-[#FF5722] bg-[#FFF3E0] text-[#FF5722]"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {bm.label}
                </button>
              ))}
            </div>
          </div>

          {/* Primary Goal Description */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
            <h3 className="text-sm font-semibold text-[#1a1a2e] mb-1">Describe your goal in detail</h3>
            <p className="text-xs text-gray-400 mb-3">What specific outcome do you want from SEO? Be specific.</p>
            <textarea
              value={primarySeoGoal}
              onChange={(e) => setPrimarySeoGoal(e.target.value)}
              placeholder="e.g. I want to rank for luxury fashion keywords in UAE and drive sales to hugoboss.ae. We need blog content around fashion trends, style guides, and seasonal collections."
              rows={3}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-[#1a1a2e] placeholder:text-gray-400 focus:border-[#FF5722] focus:outline-none focus:ring-2 focus:ring-[#FF5722]/20 resize-none"
            />
          </div>

          {/* Content Preferences */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
            <h3 className="text-sm font-semibold text-[#1a1a2e] mb-3">Content tone</h3>
            <div className="grid grid-cols-2 gap-2">
              {contentTones.map((tone) => (
                <button
                  key={tone.value}
                  onClick={() => setContentTone(tone.value)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all ${
                    contentTone === tone.value
                      ? "border-[#FF5722] bg-[#FFF3E0] text-[#FF5722]"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <div className={`size-4 rounded-full border-2 flex items-center justify-center ${
                    contentTone === tone.value ? "border-[#FF5722]" : "border-gray-300"
                  }`}>
                    {contentTone === tone.value && <div className="size-2 rounded-full bg-[#FF5722]" />}
                  </div>
                  {tone.label}
                </button>
              ))}
            </div>
          </div>

          {/* Topics of Interest */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
            <h3 className="text-sm font-semibold text-[#1a1a2e] mb-1">Topics you want to cover</h3>
            <p className="text-xs text-gray-400 mb-3">Add topics or keywords you want the AI to focus on</p>
            {topics.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {topics.map((t, i) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded-md bg-[#FFF3E0] px-2.5 py-1 text-xs font-medium text-[#FF5722]">
                    {t}
                    <button onClick={() => setTopics(topics.filter((_, idx) => idx !== i))} className="ml-0.5 hover:text-red-500">
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                placeholder="e.g. luxury fashion trends, designer brands UAE..."
                className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#1a1a2e] focus:border-[#FF5722] focus:outline-none focus:ring-2 focus:ring-[#FF5722]/20"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTopic())}
              />
              <button
                onClick={addTopic}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => router.push("/onboarding/step2")}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#FF5722] py-2.5 text-sm font-semibold text-white hover:bg-[#E64A19] disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>Continue <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </div>

        <div className="flex justify-center mt-6 gap-2">
          <div className="w-8 h-1.5 rounded-full bg-[#FF5722]" />
          <div className="w-8 h-1.5 rounded-full bg-[#FF5722]" />
          <div className="w-8 h-1.5 rounded-full bg-[#FF5722]" />
          <div className="w-8 h-1.5 rounded-full bg-gray-200" />
        </div>
      </div>
    </div>
  );
}
