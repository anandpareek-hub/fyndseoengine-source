"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Key, ArrowLeft, Loader2, ArrowRight, CheckCircle, ExternalLink, Globe, Database, Columns3 } from "lucide-react";

interface SiteData {
  id: string;
  domain: string;
  name: string;
  openaiApiKey: string | null;
  serperApiKey: string | null;
  webflowApiToken: string | null;
  webflowSiteId: string | null;
  webflowSiteName: string | null;
  webflowDomain: string | null;
  webflowBlogCollectionId: string | null;
  webflowFieldMapping: Record<string, string> | null;
  scanData: { suggestedKeywords?: string[]; contentGaps?: string[] } | null;
}

interface WebflowSite { id: string; displayName: string; shortName: string; defaultDomain: string; customDomains?: string[] }
interface WebflowCollection { id: string; displayName: string; slug: string; fields: any[] }
interface CollectionField { id: string; slug: string; displayName: string; type: string; isRequired: boolean }

export default function OnboardingStep4() {
  const [site, setSite] = useState<SiteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openaiKey, setOpenaiKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const router = useRouter();

  const [webflowToken, setWebflowToken] = useState("");
  const [testingWebflow, setTestingWebflow] = useState(false);
  const [webflowConnected, setWebflowConnected] = useState(false);
  const [webflowSites, setWebflowSites] = useState<WebflowSite[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [webflowError, setWebflowError] = useState("");
  const [collections, setCollections] = useState<WebflowCollection[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [selectedBlogCollection, setSelectedBlogCollection] = useState("");
  const [collectionFields, setCollectionFields] = useState<CollectionField[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({ body: "", excerpt: "", image: "" });

  useEffect(() => {
    fetch("/api/sites").then((r) => r.json()).then((data) => {
      if (!data || data.length === 0) { router.push("/onboarding/step1"); return; }
      const s = data[0];
      setSite(s);
      setOpenaiKey(s.openaiApiKey || "");
      setAnthropicKey(s.anthropicApiKey || "");
      if (s.webflowApiToken) { setWebflowToken(s.webflowApiToken); setWebflowConnected(true); }
      if (s.webflowSiteId) setSelectedSiteId(s.webflowSiteId);
      if (s.webflowBlogCollectionId) setSelectedBlogCollection(s.webflowBlogCollectionId);
      if (s.webflowFieldMapping) setFieldMapping(s.webflowFieldMapping as Record<string, string>);
      setLoading(false);
    });
  }, [router]);

  async function testWebflowToken() {
    if (!webflowToken.trim()) return;
    setTestingWebflow(true); setWebflowError("");
    try {
      const res = await fetch("/api/webflow/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiToken: webflowToken.trim() }) });
      const data = await res.json();
      if (data.success && data.sites) { setWebflowConnected(true); setWebflowSites(data.sites); if (data.sites.length === 1) { setSelectedSiteId(data.sites[0].id); loadCollections(data.sites[0].id); } }
      else setWebflowError(data.error || "Invalid API token");
    } catch { setWebflowError("Connection failed"); }
    setTestingWebflow(false);
  }

  async function loadCollections(siteId: string) {
    setLoadingCollections(true);
    try { const res = await fetch("/api/webflow/collections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiToken: webflowToken, siteId }) }); const data = await res.json(); setCollections(data.collections || []); } catch {}
    setLoadingCollections(false);
  }

  async function loadFields(collectionId: string) {
    setLoadingFields(true);
    try {
      const res = await fetch("/api/webflow/collections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiToken: webflowToken, siteId: selectedSiteId, collectionId }) });
      const data = await res.json(); const fields = data.fields || []; setCollectionFields(fields);
      const richText = fields.filter((f: CollectionField) => f.type === "RichText");
      const plainText = fields.filter((f: CollectionField) => f.type === "PlainText");
      const imageF = fields.filter((f: CollectionField) => f.type === "ImageRef" || f.type === "Image");
      const auto: Record<string, string> = { body: "", excerpt: "", image: "" };
      if (richText.length > 0) auto.body = (richText.find((f: CollectionField) => /body|content|post/i.test(f.slug)) || richText[0]).slug;
      const exc = plainText.find((f: CollectionField) => /summary|excerpt|description/i.test(f.slug));
      if (exc) auto.excerpt = exc.slug;
      if (imageF.length > 0) auto.image = (imageF.find((f: CollectionField) => /image|thumbnail|featured|cover/i.test(f.slug)) || imageF[0]).slug;
      setFieldMapping(auto);
    } catch {}
    setLoadingFields(false);
  }

  function handleSiteSelect(siteId: string) { setSelectedSiteId(siteId); setSelectedBlogCollection(""); setCollectionFields([]); if (siteId) loadCollections(siteId); }
  function handleCollectionSelect(collectionId: string) { setSelectedBlogCollection(collectionId); if (collectionId) loadFields(collectionId); }

  async function handleFinish() {
    if (!site) return; setSaving(true);
    const selectedSite = webflowSites.find((s) => s.id === selectedSiteId);
    await fetch("/api/sites/" + site.id, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      ...(webflowToken ? { webflowApiToken: webflowToken } : {}),
      ...(selectedSiteId ? { webflowSiteId: selectedSiteId } : {}),
      ...(selectedSite ? { webflowSiteName: selectedSite.displayName, webflowDomain: selectedSite.customDomains?.[0] || selectedSite.defaultDomain } : {}),
      ...(selectedBlogCollection ? { webflowBlogCollectionId: selectedBlogCollection } : {}),
      ...(Object.values(fieldMapping).some(Boolean) ? { webflowFieldMapping: fieldMapping } : {}),
      ...(openaiKey ? { openaiApiKey: openaiKey } : {}),
      ...(anthropicKey ? { anthropicApiKey: anthropicKey } : {}),
    }) });
    router.push("/dashboard");
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]"><Loader2 className="w-8 h-8 text-[#FF5722] animate-spin" /></div>;
  if (!site) return null;
  const scanData = site.scanData as { suggestedKeywords?: string[]; contentGaps?: string[] } | null;

  return (
    <div className="min-h-screen bg-[#f8f9fa] py-12 px-4">
      <div className="w-full max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-[#1a1a2e]"><Key className="w-7 h-7 text-white" /></div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">Connect Webflow & API Keys</h1>
          <p className="text-gray-500 mt-1">Connect your Webflow site and add API keys to power the engine</p>
        </div>

        {/* Webflow Connection */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm mb-4">
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-[#4353FF]" />
              <h3 className="text-sm font-semibold text-[#1a1a2e]">Webflow Connection</h3>
              {webflowConnected && <CheckCircle className="w-4 h-4 text-emerald-500" />}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1a1a2e] mb-1">Webflow API Token
                <a href="https://webflow.com/dashboard/workspace/integrations" target="_blank" className="ml-2 text-xs text-[#4353FF] inline-flex items-center gap-1">Get token <ExternalLink className="w-3 h-3" /></a>
              </label>
              <div className="flex gap-2">
                <input type="password" value={webflowToken} onChange={(e) => { setWebflowToken(e.target.value); setWebflowConnected(false); }} placeholder="Paste your Webflow API token..." className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-[#1a1a2e] focus:border-[#4353FF] focus:outline-none focus:ring-2 focus:ring-[#4353FF]/20" />
                <button onClick={testWebflowToken} disabled={testingWebflow || !webflowToken.trim()} className="rounded-lg bg-[#4353FF] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#3343EE] disabled:opacity-50">{testingWebflow ? <Loader2 className="w-4 h-4 animate-spin" /> : "Connect"}</button>
              </div>
              {webflowError && <p className="text-xs text-red-500 mt-1">{webflowError}</p>}
            </div>
            {webflowConnected && webflowSites.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-[#1a1a2e] mb-1"><Database className="w-3.5 h-3.5 inline mr-1" />Select Webflow Site</label>
                <select value={selectedSiteId} onChange={(e) => handleSiteSelect(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-[#1a1a2e] focus:border-[#4353FF] focus:outline-none focus:ring-2 focus:ring-[#4353FF]/20">
                  <option value="">Choose a site...</option>
                  {webflowSites.map((s) => <option key={s.id} value={s.id}>{s.displayName} ({s.defaultDomain})</option>)}
                </select>
              </div>
            )}
            {selectedSiteId && (
              <div>
                <label className="block text-sm font-medium text-[#1a1a2e] mb-1"><Columns3 className="w-3.5 h-3.5 inline mr-1" />Blog CMS Collection</label>
                {loadingCollections ? <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading collections...</div> : (
                  <select value={selectedBlogCollection} onChange={(e) => handleCollectionSelect(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-[#1a1a2e] focus:border-[#4353FF] focus:outline-none focus:ring-2 focus:ring-[#4353FF]/20">
                    <option value="">Choose blog collection...</option>
                    {collections.map((c) => <option key={c.id} value={c.id}>{c.displayName} ({c.slug})</option>)}
                  </select>
                )}
              </div>
            )}
            {selectedBlogCollection && collectionFields.length > 0 && (
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 space-y-3">
                <h4 className="text-xs font-semibold text-[#1a1a2e] uppercase tracking-wide">Field Mapping</h4>
                <p className="text-xs text-gray-400">Map your collection fields to article content. Auto-detected where possible.</p>
                {loadingFields ? <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading fields...</div> : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2"><label className="text-xs text-gray-600">Content Body (Rich Text)</label><select value={fieldMapping.body || ""} onChange={(e) => setFieldMapping({ ...fieldMapping, body: e.target.value })} className="rounded border border-gray-200 px-2 py-1.5 text-xs"><option value="">-- Select --</option>{collectionFields.filter((f) => f.type === "RichText").map((f) => <option key={f.slug} value={f.slug}>{f.displayName}</option>)}</select></div>
                    <div className="grid grid-cols-2 gap-2"><label className="text-xs text-gray-600">Excerpt / Summary</label><select value={fieldMapping.excerpt || ""} onChange={(e) => setFieldMapping({ ...fieldMapping, excerpt: e.target.value })} className="rounded border border-gray-200 px-2 py-1.5 text-xs"><option value="">-- None --</option>{collectionFields.filter((f) => f.type === "PlainText" || f.type === "RichText").map((f) => <option key={f.slug} value={f.slug}>{f.displayName}</option>)}</select></div>
                    <div className="grid grid-cols-2 gap-2"><label className="text-xs text-gray-600">Featured Image</label><select value={fieldMapping.image || ""} onChange={(e) => setFieldMapping({ ...fieldMapping, image: e.target.value })} className="rounded border border-gray-200 px-2 py-1.5 text-xs"><option value="">-- None --</option>{collectionFields.filter((f) => f.type === "ImageRef" || f.type === "Image").map((f) => <option key={f.slug} value={f.slug}>{f.displayName}</option>)}</select></div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {scanData?.suggestedKeywords && scanData.suggestedKeywords.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm mb-4"><div className="p-5"><h3 className="text-sm font-semibold text-[#1a1a2e]">AI-Suggested Keywords</h3><p className="text-xs text-gray-500 mt-0.5">Based on your website analysis</p><div className="flex flex-wrap gap-2 mt-3">{scanData.suggestedKeywords.map((kw, i) => <span key={i} className="rounded-md bg-[#FFF3E0] px-2.5 py-1 text-xs font-medium text-[#FF5722]">{kw}</span>)}</div></div></div>
        )}
        {scanData?.contentGaps && scanData.contentGaps.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm mb-4"><div className="p-5"><h3 className="text-sm font-semibold text-[#1a1a2e]">Content Opportunities</h3><p className="text-xs text-gray-500 mt-0.5">Gaps identified in your content strategy</p><ul className="space-y-2 mt-3">{scanData.contentGaps.map((gap, i) => <li key={i} className="text-sm text-gray-600 flex items-start gap-2"><CheckCircle className="w-4 h-4 text-[#16a34a] mt-0.5 shrink-0" />{gap}</li>)}</ul></div></div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm mb-4">
          <div className="p-5 space-y-4">
            <div><h3 className="text-sm font-semibold text-[#1a1a2e]">API Keys (Optional)</h3><p className="text-xs text-gray-500 mt-0.5">You can add these later in Settings</p></div>
            <div><label className="block text-sm font-medium text-[#1a1a2e] mb-1">OpenAI API Key<a href="https://platform.openai.com/api-keys" target="_blank" className="ml-2 text-xs text-[#FF5722] inline-flex items-center gap-1">Get key <ExternalLink className="w-3 h-3" /></a></label><input type="password" value={openaiKey} onChange={(e) => setOpenaiKey(e.target.value)} placeholder="sk-..." className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-[#1a1a2e] focus:border-[#FF5722] focus:outline-none focus:ring-2 focus:ring-[#FF5722]/20" /><p className="text-xs text-gray-400 mt-1">Required for AI content generation (GPT-4o)</p></div>
            <div><label className="block text-sm font-medium text-[#1a1a2e] mb-1">Anthropic API Key<a href="https://console.anthropic.com/settings/keys" target="_blank" className="ml-2 text-xs text-[#FF5722] inline-flex items-center gap-1">Get key <ExternalLink className="w-3 h-3" /></a></label><input type="password" value={anthropicKey} onChange={(e) => setAnthropicKey(e.target.value)} placeholder="sk-ant-..." className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-[#1a1a2e] focus:border-[#FF5722] focus:outline-none focus:ring-2 focus:ring-[#FF5722]/20" /><p className="text-xs text-gray-400 mt-1">Powers Claude AI for content humanization</p></div>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={() => router.push("/onboarding/step3")} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"><ArrowLeft className="w-4 h-4" /> Back</button>
          <button onClick={handleFinish} disabled={saving} className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#FF5722] py-2.5 text-sm font-semibold text-white hover:bg-[#E64A19] disabled:opacity-50">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Launch Dashboard <ArrowRight className="w-4 h-4" /></>}</button>
        </div>
        <div className="flex justify-center mt-6 gap-2"><div className="w-8 h-1.5 rounded-full bg-[#FF5722]" /><div className="w-8 h-1.5 rounded-full bg-[#FF5722]" /><div className="w-8 h-1.5 rounded-full bg-[#FF5722]" /><div className="w-8 h-1.5 rounded-full bg-[#FF5722]" /></div>
      </div>
    </div>
  );
}
