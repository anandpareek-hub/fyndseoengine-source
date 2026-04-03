"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Building2, ArrowRight, ArrowLeft, Loader2, X, Plus, Zap, Search, CheckCircle2 } from "lucide-react";

interface SiteData {
  id: string;
  domain: string;
  name: string;
  description: string;
  products: string[];
  targetAudience: string;
  industry: string;
  competitors: string[];
  brandVoice: string;
  targetRegions: string[];
}

const REGION_OPTIONS = [
  { code: "ae", label: "United Arab Emirates" },
  { code: "sa", label: "Saudi Arabia" },
  { code: "qa", label: "Qatar" },
  { code: "kw", label: "Kuwait" },
  { code: "bh", label: "Bahrain" },
  { code: "om", label: "Oman" },
  { code: "eg", label: "Egypt" },
  { code: "us", label: "United States" },
  { code: "uk", label: "United Kingdom" },
  { code: "ca", label: "Canada" },
  { code: "au", label: "Australia" },
  { code: "in", label: "India" },
  { code: "sg", label: "Singapore" },
  { code: "de", label: "Germany" },
  { code: "fr", label: "France" },
  { code: "es", label: "Spain" },
  { code: "it", label: "Italy" },
  { code: "nl", label: "Netherlands" },
  { code: "br", label: "Brazil" },
  { code: "mx", label: "Mexico" },
  { code: "jp", label: "Japan" },
  { code: "kr", label: "South Korea" },
  { code: "tr", label: "Turkey" },
  { code: "za", label: "South Africa" },
  { code: "id", label: "Indonesia" },
  { code: "my", label: "Malaysia" },
  { code: "ph", label: "Philippines" },
  { code: "th", label: "Thailand" },
  { code: "pk", label: "Pakistan" },
  { code: "ng", label: "Nigeria" },
  { code: "nz", label: "New Zealand" },
  { code: "ie", label: "Ireland" },
  { code: "se", label: "Sweden" },
  { code: "no", label: "Norway" },
  { code: "dk", label: "Denmark" },
  { code: "fi", label: "Finland" },
  { code: "pl", label: "Poland" },
  { code: "ch", label: "Switzerland" },
  { code: "at", label: "Austria" },
  { code: "be", label: "Belgium" },
  { code: "pt", label: "Portugal" },
  { code: "co", label: "Colombia" },
  { code: "ar", label: "Argentina" },
  { code: "cl", label: "Chile" },
  { code: "il", label: "Israel" },
  { code: "vn", label: "Vietnam" },
].sort((a, b) => a.label.localeCompare(b.label));

export default function OnboardingStep2() {
  const [site, setSite] = useState<SiteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newProduct, setNewProduct] = useState("");
  const [newCompetitor, setNewCompetitor] = useState("");
  const router = useRouter();

  // Competitor finder state
  const [competitorTab, setCompetitorTab] = useState<"brand" | "search">("brand");
  const [suggestedCompetitors, setSuggestedCompetitors] = useState<{ domain: string; reason?: string; competitorType?: string }[]>([]);
  const [findingCompetitors, setFindingCompetitors] = useState(false);
  const [searchCompetitors, setSearchCompetitors] = useState<{ domain: string; avgPosition: number; intersections: number; relevance: number }[]>([]);
  const [findingSearchCompetitors, setFindingSearchCompetitors] = useState(false);
  const [searchCompetitorError, setSearchCompetitorError] = useState("");
  const [competitorCountry, setCompetitorCountry] = useState("");

  useEffect(() => {
    fetch("/api/sites")
      .then((r) => r.json())
      .then((data) => {
        if (!data || data.length === 0) {
          router.push("/onboarding/step1");
          return;
        }
        setSite(data[0]);
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
        name: site.name,
        description: site.description,
        industry: site.industry,
        brandVoice: site.brandVoice,
        targetAudience: site.targetAudience,
        products: site.products,
        competitors: site.competitors,
        targetRegions: site.targetRegions,
      }),
    });
    router.push("/onboarding/step3");
  }

  function addProduct() {
    if (!newProduct.trim() || !site) return;
    setSite({ ...site, products: [...site.products, newProduct.trim()] });
    setNewProduct("");
  }

  function removeProduct(i: number) {
    if (!site) return;
    setSite({ ...site, products: site.products.filter((_, idx) => idx !== i) });
  }

  function addCompetitor() {
    if (!newCompetitor.trim() || !site) return;
    const clean = newCompetitor.trim().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
    if (clean && !site.competitors.includes(clean)) {
      setSite({ ...site, competitors: [...site.competitors, clean] });
    }
    setNewCompetitor("");
  }

  function removeCompetitor(i: number) {
    if (!site) return;
    setSite({ ...site, competitors: site.competitors.filter((_, idx) => idx !== i) });
  }

  function addSuggestedCompetitor(domain: string) {
    if (!site) return;
    if (!site.competitors.includes(domain)) {
      setSite({ ...site, competitors: [...site.competitors, domain] });
    }
    setSuggestedCompetitors((prev) => prev.filter((c) => c.domain !== domain));
  }

  async function findBrandCompetitors() {
    if (!site) return;
    setFindingCompetitors(true);
    setSuggestedCompetitors([]);
    try {
      const res = await fetch(`/api/sites/${site.id}/competitors`);
      const data = await res.json();
      if (res.ok) {
        setSuggestedCompetitors(data.competitors || []);
        setCompetitorCountry(data.country || "");
      }
    } catch { /* ignore */ }
    setFindingCompetitors(false);
  }

  async function findSearchCompetitorsHandler() {
    if (!site) return;
    setFindingSearchCompetitors(true);
    setSearchCompetitors([]);
    setSearchCompetitorError("");
    try {
      const res = await fetch(`/api/sites/${site.id}/search-competitors`);
      const data = await res.json();
      if (res.ok) {
        setSearchCompetitors(data.competitors || []);
        setCompetitorCountry(data.country || "");
      } else {
        setSearchCompetitorError(data.error || "Failed to find search competitors");
      }
    } catch {
      setSearchCompetitorError("Failed to find search competitors");
    }
    setFindingSearchCompetitors(false);
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
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">Review Your Business Profile</h1>
          <p className="text-gray-500 mt-1">AI analyzed your website. Edit anything that&apos;s off.</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-[#1a1a2e] mb-1">Company Name</label>
              <input
                value={site.name || ""}
                onChange={(e) => setSite({ ...site, name: e.target.value })}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-[#1a1a2e] focus:border-[#FF5722] focus:outline-none focus:ring-2 focus:ring-[#FF5722]/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1a1a2e] mb-1">Description</label>
              <textarea
                value={site.description || ""}
                onChange={(e) => setSite({ ...site, description: e.target.value })}
                rows={3}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-[#1a1a2e] focus:border-[#FF5722] focus:outline-none focus:ring-2 focus:ring-[#FF5722]/20 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#1a1a2e] mb-1">Industry</label>
                <input
                  value={site.industry || ""}
                  onChange={(e) => setSite({ ...site, industry: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-[#1a1a2e] focus:border-[#FF5722] focus:outline-none focus:ring-2 focus:ring-[#FF5722]/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1a1a2e] mb-1">Brand Voice</label>
                <input
                  value={site.brandVoice || ""}
                  onChange={(e) => setSite({ ...site, brandVoice: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-[#1a1a2e] focus:border-[#FF5722] focus:outline-none focus:ring-2 focus:ring-[#FF5722]/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1a1a2e] mb-1">Target Country</label>
              <p className="text-xs text-gray-400 mb-1">Where are your customers? This determines SEO data sources.</p>
              <select
                value={site.targetRegions?.[0] || ""}
                onChange={(e) =>
                  setSite({ ...site, targetRegions: e.target.value ? [e.target.value] : [] })
                }
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-[#1a1a2e] focus:border-[#FF5722] focus:outline-none focus:ring-2 focus:ring-[#FF5722]/20"
              >
                <option value="">Auto-detect from domain</option>
                {REGION_OPTIONS.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1a1a2e] mb-1">Target Audience</label>
              <input
                value={site.targetAudience || ""}
                onChange={(e) => setSite({ ...site, targetAudience: e.target.value })}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-[#1a1a2e] focus:border-[#FF5722] focus:outline-none focus:ring-2 focus:ring-[#FF5722]/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1a1a2e] mb-2">Products & Services</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {site.products.map((p, i) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded-md bg-[#FFF3E0] px-2.5 py-1 text-xs font-medium text-[#FF5722]">
                    {p}
                    <button onClick={() => removeProduct(i)} className="ml-0.5 hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newProduct}
                  onChange={(e) => setNewProduct(e.target.value)}
                  placeholder="Add a product..."
                  className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#1a1a2e] focus:border-[#FF5722] focus:outline-none focus:ring-2 focus:ring-[#FF5722]/20"
                  onKeyDown={(e) => e.key === "Enter" && addProduct()}
                />
                <button
                  onClick={addProduct}
                  className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 hover:text-[#1a1a2e]"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Competitors with Finder */}
            <div>
              <label className="block text-sm font-medium text-[#1a1a2e] mb-2">Competitors</label>

              {/* Tabs */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 mb-3">
                <button
                  onClick={() => setCompetitorTab("brand")}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                    competitorTab === "brand"
                      ? "bg-white text-[#1a1a2e] shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Zap className="size-3.5" />
                  Brand Competitors
                </button>
                <button
                  onClick={() => setCompetitorTab("search")}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                    competitorTab === "search"
                      ? "bg-white text-[#1a1a2e] shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Search className="size-3.5" />
                  Search Engine Competitors
                </button>
              </div>

              {/* Brand Competitors Tab */}
              {competitorTab === "brand" && (
                <div className="space-y-3 mb-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-gray-400">
                      AI reads your homepage and finds real business competitors
                    </p>
                    <button
                      onClick={findBrandCompetitors}
                      disabled={findingCompetitors}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {findingCompetitors ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Zap className="size-3.5" />
                      )}
                      {findingCompetitors ? "Finding..." : "Find Brand Competitors"}
                    </button>
                  </div>

                  {suggestedCompetitors.length > 0 && (
                    <div className="rounded-lg border border-[#FF5722]/20 bg-[#FFF3E0]/30 p-3 space-y-2">
                      <p className="text-xs font-medium text-[#FF5722]">
                        Brand competitors{competitorCountry ? ` in ${competitorCountry}` : ""} — click to add
                      </p>
                      <div className="space-y-1.5">
                        {suggestedCompetitors.map((comp) => (
                          <button
                            key={comp.domain}
                            onClick={() => addSuggestedCompetitor(comp.domain)}
                            disabled={site.competitors.includes(comp.domain)}
                            className="flex w-full items-center gap-3 rounded-md border border-gray-200 bg-white px-3 py-2 text-left hover:border-[#FF5722]/40 hover:bg-[#FFF3E0]/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <img
                              src={`https://www.google.com/s2/favicons?domain=${comp.domain}&sz=16`}
                              alt=""
                              className="size-4 rounded-sm shrink-0"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-[#1a1a2e]">{comp.domain}</span>
                              {comp.reason && <p className="text-[10px] text-gray-400 truncate mt-0.5">{comp.reason}</p>}
                            </div>
                            {comp.competitorType && (
                              <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${
                                comp.competitorType === "direct" ? "bg-red-50 text-red-600" :
                                comp.competitorType === "indirect" ? "bg-amber-50 text-amber-600" :
                                "bg-blue-50 text-blue-600"
                              }`}>{comp.competitorType}</span>
                            )}
                            {site.competitors.includes(comp.domain) ? (
                              <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                            ) : (
                              <Plus className="size-4 text-[#FF5722] shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Search Engine Competitors Tab */}
              {competitorTab === "search" && (
                <div className="space-y-3 mb-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-gray-400">
                      Sites competing for the same keywords on Google (via DataForSEO)
                    </p>
                    <button
                      onClick={findSearchCompetitorsHandler}
                      disabled={findingSearchCompetitors}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {findingSearchCompetitors ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Search className="size-3.5" />
                      )}
                      {findingSearchCompetitors ? "Finding..." : "Find Search Competitors"}
                    </button>
                  </div>

                  {searchCompetitorError && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                      <p className="text-xs text-amber-700">{searchCompetitorError}</p>
                    </div>
                  )}

                  {searchCompetitors.length > 0 && (
                    <div className="rounded-lg border border-blue-200/50 bg-blue-50/30 p-3 space-y-2">
                      <p className="text-xs font-medium text-blue-600">
                        Search engine competitors{competitorCountry ? ` in ${competitorCountry}` : ""} — click to add
                      </p>
                      <div className="space-y-1.5">
                        {searchCompetitors.map((comp) => (
                          <button
                            key={comp.domain}
                            onClick={() => addSuggestedCompetitor(comp.domain)}
                            disabled={site.competitors.includes(comp.domain)}
                            className="flex w-full items-center gap-3 rounded-md border border-gray-200 bg-white px-3 py-2 text-left hover:border-blue-400/40 hover:bg-blue-50/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <img
                              src={`https://www.google.com/s2/favicons?domain=${comp.domain}&sz=16`}
                              alt=""
                              className="size-4 rounded-sm shrink-0"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                            <span className="text-sm font-medium text-[#1a1a2e] flex-1">{comp.domain}</span>
                            <span className="text-[10px] text-gray-400 shrink-0">{comp.intersections} keyword overlap</span>
                            <span className="text-[10px] text-gray-400 shrink-0">avg pos {comp.avgPosition?.toFixed(1)}</span>
                            {site.competitors.includes(comp.domain) ? (
                              <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                            ) : (
                              <Plus className="size-4 text-blue-500 shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Current competitors */}
              {site.competitors.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {site.competitors.map((c, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 rounded-md bg-[#fff7ed] px-2.5 py-1 text-xs font-medium text-[#FF5722]">
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${c}&sz=16`}
                        alt=""
                        className="size-3.5 rounded-sm"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      {c}
                      <button onClick={() => removeCompetitor(i)} className="ml-0.5 hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Manual add */}
              <div className="flex gap-2">
                <input
                  value={newCompetitor}
                  onChange={(e) => setNewCompetitor(e.target.value)}
                  placeholder="Or type a domain manually, e.g. competitor.com"
                  className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#1a1a2e] focus:border-[#FF5722] focus:outline-none focus:ring-2 focus:ring-[#FF5722]/20"
                  onKeyDown={(e) => e.key === "Enter" && addCompetitor()}
                />
                <button
                  onClick={addCompetitor}
                  disabled={!newCompetitor.trim()}
                  className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 hover:text-[#1a1a2e] disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => router.push("/onboarding/step1")}
                className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
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
                  <>Confirm & Continue <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-center mt-6 gap-2">
          <div className="w-8 h-1.5 rounded-full bg-[#FF5722]" />
          <div className="w-8 h-1.5 rounded-full bg-[#FF5722]" />
          <div className="w-8 h-1.5 rounded-full bg-gray-200" />
          <div className="w-8 h-1.5 rounded-full bg-gray-200" />
        </div>
      </div>
    </div>
  );
}
