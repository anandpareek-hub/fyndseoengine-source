"use client";

import { useEffect, useState } from "react";
import WebflowConnectionCard from "@/components/WebflowConnectionCard";
import SitemapCard from "@/components/SitemapCard";
import { useSite } from "@/lib/site-context";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, CheckCircle2, AlertCircle, Zap, Plus, X, Search, Users, Trash2, Crown, Pencil, Eye } from "lucide-react";
import { toast } from "sonner";

type SiteSettings = {
  domain: string;
  name: string;
  description: string;
  brandVoice: string;
  targetAudience: string;
  industry: string;
  targetRegions: string[];
  competitors: string[];
};

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

type WebflowSettings = {
  apiToken: string;
  siteId: string;
  siteName: string;
  domain: string;
  blogCollectionId: string;
};

type ApiKeySettings = {
  openaiApiKey: string;
  dataForSeoLogin: string;
  dataForSeoPassword: string;
  anthropicApiKey: string;
};

type ConnectionResult = { ok: boolean; message: string };

export default function SettingsPage() {
  const { currentSite } = useSite();
  const [loading, setLoading] = useState(true);

  const [site, setSite] = useState<SiteSettings>({
    domain: "",
    name: "",
    description: "",
    brandVoice: "",
    targetAudience: "",
    industry: "",
    targetRegions: [],
    competitors: [],
  });
  const [newCompetitor, setNewCompetitor] = useState("");
  const [suggestedCompetitors, setSuggestedCompetitors] = useState<{ domain: string; avgPosition?: number; intersections?: number; reason?: string; competitorType?: string }[]>([]);
  const [findingCompetitors, setFindingCompetitors] = useState(false);
  const [competitorCountry, setCompetitorCountry] = useState("");
  const [competitorTab, setCompetitorTab] = useState<"brand" | "search">("brand");
  const [searchCompetitors, setSearchCompetitors] = useState<{ domain: string; avgPosition: number; intersections: number; relevance: number }[]>([]);
  const [findingSearchCompetitors, setFindingSearchCompetitors] = useState(false);
  const [searchCompetitorError, setSearchCompetitorError] = useState("");
  const [webflow, setWebflow] = useState<WebflowSettings>({
    apiToken: "",
    siteId: "",
    siteName: "",
    domain: "",
    blogCollectionId: "",
  });
  const [apiKeys, setApiKeys] = useState<ApiKeySettings>({
    openaiApiKey: "",
    dataForSeoLogin: "",
    dataForSeoPassword: "",
    anthropicApiKey: "",
  });
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [savedSection, setSavedSection] = useState<string | null>(null);
  const [testingService, setTestingService] = useState<string | null>(null);
  const [connectionResults, setConnectionResults] = useState<Record<string, ConnectionResult>>({});

  // Team access state
  type TeamMember = {
    id: string;
    email: string;
    role: string;
    name: string | null;
    image: string | null;
    userId: string;
    createdAt: string;
  };
  type TeamOwner = {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    role: string;
  };
  const [teamOwner, setTeamOwner] = useState<TeamOwner | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const [inviting, setInviting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentSite) return;
    async function fetchSettings() {
      try {
        const res = await fetch(`/api/sites/${currentSite!.id}`);
        if (res.ok) {
          const data = await res.json();
          setSite({
            domain: data.domain || "",
            name: data.name || "",
            description: data.description || "",
            brandVoice: data.brandVoice || "",
            targetAudience: data.targetAudience || "",
            industry: data.industry || "",
            targetRegions: data.targetRegions || [],
            competitors: data.competitors || [],
          });
          setWebflow({
            apiToken: data.webflowApiToken || "",
            siteId: data.webflowSiteId || "",
            siteName: data.webflowSiteName || "",
            domain: data.webflowDomain || "",
            blogCollectionId: data.webflowDomain || "",
          });
          setApiKeys({
            openaiApiKey: data.openaiApiKey || "",
            dataForSeoLogin: data.dataForSeoLogin || "",
            dataForSeoPassword: data.dataForSeoPassword || "",
            anthropicApiKey: data.anthropicApiKey || "",
          });
        }
      } catch (err) {
        console.error("Failed to fetch settings:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, [currentSite]);

  // Fetch team members
  async function fetchTeam() {
    if (!currentSite) return;
    setTeamLoading(true);
    try {
      const res = await fetch(`/api/sites/${currentSite.id}/team`);
      if (res.ok) {
        const data = await res.json();
        setTeamOwner(data.owner);
        setTeamMembers(data.members);
      }
    } catch (err) {
      console.error("Failed to fetch team:", err);
    } finally {
      setTeamLoading(false);
    }
  }

  useEffect(() => {
    if (currentSite) fetchTeam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSite]);

  async function inviteTeamMember() {
    if (!currentSite || !inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await fetch(`/api/sites/${currentSite.id}/team`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setTeamMembers((prev) => [...prev, data]);
        setInviteEmail("");
        toast.success(`Invited ${data.email} as ${inviteRole}`);
      } else {
        toast.error(data.error || "Failed to invite");
      }
    } catch {
      toast.error("Failed to invite team member");
    } finally {
      setInviting(false);
    }
  }

  async function removeTeamMember(accessId: string) {
    if (!currentSite) return;
    setRemovingId(accessId);
    try {
      const res = await fetch(`/api/sites/${currentSite.id}/team`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessId }),
      });
      if (res.ok) {
        setTeamMembers((prev) => prev.filter((m) => m.id !== accessId));
        toast.success("Team member removed");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to remove");
      }
    } catch {
      toast.error("Failed to remove team member");
    } finally {
      setRemovingId(null);
    }
  }

  async function updateMemberRole(accessId: string, newRole: string) {
    if (!currentSite) return;
    try {
      const res = await fetch(`/api/sites/${currentSite.id}/team`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessId, role: newRole }),
      });
      if (res.ok) {
        setTeamMembers((prev) =>
          prev.map((m) => (m.id === accessId ? { ...m, role: newRole } : m))
        );
        toast.success(`Role updated to ${newRole}`);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update role");
      }
    } catch {
      toast.error("Failed to update role");
    }
  }

  async function saveSection(section: string, data: Record<string, unknown>) {
    if (!currentSite) return;
    setSavingSection(section);
    setSavedSection(null);
    try {
      const res = await fetch(`/api/sites/${currentSite.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setSavedSection(section);
        setTimeout(() => setSavedSection(null), 3000);
        toast.success("Settings saved");
      } else {
        toast.error("Failed to save settings");
      }
    } catch (err) {
      console.error("Failed to save:", err);
      toast.error("Failed to save settings");
    } finally {
      setSavingSection(null);
    }
  }

  async function testConnection(service: string) {
    if (!currentSite) return;
    setTestingService(service);
    setConnectionResults((prev) => {
      const next = { ...prev };
      delete next[service];
      return next;
    });
    try {
      // Auto-save keys before testing
      await fetch(`/api/sites/${currentSite.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiKeys),
      });
      const res = await fetch(`/api/sites/${currentSite.id}/test-connection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service }),
      });
      const data = await res.json();
      setConnectionResults((prev) => ({
        ...prev,
        [service]: {
          ok: data.success,
          message: data.message || (data.success ? "Connected" : "Failed"),
        },
      }));
      if (data.success) {
        toast.success(`${service} connected successfully`);
      } else {
        toast.error(data.message || `${service} connection failed`);
      }
    } catch {
      setConnectionResults((prev) => ({
        ...prev,
        [service]: { ok: false, message: "Connection test failed" },
      }));
      toast.error("Connection test failed");
    } finally {
      setTestingService(null);
    }
  }

  async function findCompetitors() {
    if (!currentSite) return;
    setFindingCompetitors(true);
    setSuggestedCompetitors([]);
    try {
      const res = await fetch(`/api/sites/${currentSite.id}/competitors`);
      const data = await res.json();
      if (res.ok) {
        setSuggestedCompetitors(data.competitors || []);
        setCompetitorCountry(data.country || "");
        if (data.competitors?.length === 0) {
          toast.info("No competitors found for this domain");
        }
      } else {
        toast.error(data.error || "Failed to find competitors");
      }
    } catch {
      toast.error("Failed to find competitors");
    } finally {
      setFindingCompetitors(false);
    }
  }

  async function findSearchCompetitors() {
    if (!currentSite) return;
    setFindingSearchCompetitors(true);
    setSearchCompetitors([]);
    setSearchCompetitorError("");
    try {
      const res = await fetch(`/api/sites/${currentSite.id}/search-competitors`);
      const data = await res.json();
      if (res.ok) {
        setSearchCompetitors(data.competitors || []);
        setCompetitorCountry(data.country || "");
        if (data.competitors?.length === 0) {
          toast.info("No search competitors found");
        }
      } else {
        setSearchCompetitorError(data.error || "Failed to find search competitors");
      }
    } catch {
      setSearchCompetitorError("Failed to find search competitors");
    } finally {
      setFindingSearchCompetitors(false);
    }
  }

  function addSuggestedCompetitor(domain: string) {
    if (!site.competitors.includes(domain)) {
      setSite({ ...site, competitors: [...site.competitors, domain] });
    }
    setSuggestedCompetitors((prev) => prev.filter((c) => c.domain !== domain));
  }

  function SaveButton({ section, data }: { section: string; data: Record<string, unknown> }) {
    return (
      <Button
        onClick={() => saveSection(section, data)}
        disabled={savingSection === section}
      >
        {savingSection === section ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : savedSection === section ? (
          <CheckCircle2 className="mr-2 size-4 text-emerald-600" />
        ) : (
          <Save className="mr-2 size-4" />
        )}
        {savedSection === section ? "Saved" : "Save"}
      </Button>
    );
  }

  function TestButton({ service, label }: { service: string; label: string }) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => testConnection(service)}
        disabled={testingService === service}
      >
        {testingService === service ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <Zap className="mr-2 size-4" />
        )}
        {label}
      </Button>
    );
  }

  function ConnectionAlert({ service }: { service: string }) {
    const result = connectionResults[service];
    if (!result) return null;
    return (
      <div
        className={`flex items-center gap-2 rounded-md p-3 text-sm ${
          result.ok
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
            : "bg-red-50 text-red-700 border border-red-200"
        }`}
      >
        {result.ok ? (
          <CheckCircle2 className="size-4 shrink-0" />
        ) : (
          <AlertCircle className="size-4 shrink-0" />
        )}
        {result.message}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a2e]">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure your site, API connections, and preferences
        </p>
      </div>

      {/* Site Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Site Settings</CardTitle>
          <CardDescription>Basic information about your site</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Domain</Label>
              <Input
                value={site.domain}
                onChange={(e) => setSite({ ...site, domain: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={site.name}
                onChange={(e) => setSite({ ...site, name: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={site.description}
              onChange={(e) => setSite({ ...site, description: e.target.value })}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Brand Voice</Label>
            <Textarea
              value={site.brandVoice}
              onChange={(e) => setSite({ ...site, brandVoice: e.target.value })}
              placeholder="Describe your brand's tone and voice..."
              rows={2}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Target Audience</Label>
              <Input
                value={site.targetAudience}
                onChange={(e) => setSite({ ...site, targetAudience: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Industry</Label>
              <Input
                value={site.industry}
                onChange={(e) => setSite({ ...site, industry: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Target Country</Label>
            <p className="text-xs text-gray-400">
              SEO audits, keyword research, and competitor analysis will target this market
            </p>
            <select
              value={site.targetRegions[0] || ""}
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

          <div className="space-y-3">
            <div>
              <Label>Competitors</Label>
              <p className="text-xs text-gray-400">
                Known competitor domains to include in SEO audits and gap analysis
              </p>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
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
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-gray-400">
                    AI reads your homepage and finds real business competitors in your market
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={findCompetitors}
                    disabled={findingCompetitors}
                  >
                    {findingCompetitors ? (
                      <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    ) : (
                      <Zap className="mr-1.5 size-3.5" />
                    )}
                    {findingCompetitors ? "Finding..." : "Find Brand Competitors"}
                  </Button>
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
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-gray-400">
                    Sites competing for the same keywords on Google (via DataForSEO)
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={findSearchCompetitors}
                    disabled={findingSearchCompetitors}
                  >
                    {findingSearchCompetitors ? (
                      <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    ) : (
                      <Search className="mr-1.5 size-3.5" />
                    )}
                    {findingSearchCompetitors ? "Finding..." : "Find Search Competitors"}
                  </Button>
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

            <div className="flex gap-2">
              <Input
                value={newCompetitor}
                onChange={(e) => setNewCompetitor(e.target.value)}
                placeholder="Or type a domain manually, e.g. competitor.com"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newCompetitor.trim()) {
                    e.preventDefault();
                    const clean = newCompetitor.trim().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
                    if (clean && !site.competitors.includes(clean)) {
                      setSite({ ...site, competitors: [...site.competitors, clean] });
                    }
                    setNewCompetitor("");
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const clean = newCompetitor.trim().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
                  if (clean && !site.competitors.includes(clean)) {
                    setSite({ ...site, competitors: [...site.competitors, clean] });
                  }
                  setNewCompetitor("");
                }}
                disabled={!newCompetitor.trim()}
              >
                <Plus className="size-4" />
              </Button>
            </div>
            {site.competitors.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {site.competitors.map((comp, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-2.5 py-1 text-sm text-[#1a1a2e]"
                  >
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${comp}&sz=16`}
                      alt=""
                      className="size-3.5 rounded-sm"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    {comp}
                    <button
                      onClick={() =>
                        setSite({ ...site, competitors: site.competitors.filter((_, j) => j !== i) })
                      }
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <SaveButton section="site" data={site} />
          </div>
        </CardContent>
      </Card>

      {/* Team Access */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-5" />
            Team Access
          </CardTitle>
          <CardDescription>
            Share this website with team members. They&apos;ll see it in their dashboard when they sign in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Owner */}
          {teamOwner && (
            <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50/50 px-4 py-3">
              {teamOwner.image ? (
                <img src={teamOwner.image} alt="" className="size-8 rounded-full" />
              ) : (
                <div className="size-8 rounded-full bg-[#FF5722] flex items-center justify-center text-white text-sm font-medium">
                  {(teamOwner.name || teamOwner.email)?.[0]?.toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1a1a2e] truncate">{teamOwner.name || teamOwner.email}</p>
                <p className="text-xs text-gray-400 truncate">{teamOwner.email}</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FF5722]/10 px-2.5 py-1 text-xs font-medium text-[#FF5722]">
                <Crown className="size-3" />
                Owner
              </span>
            </div>
          )}

          {/* Team Members */}
          {teamMembers.length > 0 && (
            <div className="space-y-2">
              {teamMembers.map((member) => (
                <div key={member.id} className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3">
                  {member.image ? (
                    <img src={member.image} alt="" className="size-8 rounded-full" />
                  ) : (
                    <div className="size-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-medium">
                      {(member.name || member.email)?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1a1a2e] truncate">{member.name || member.email}</p>
                    <p className="text-xs text-gray-400 truncate">{member.email}</p>
                  </div>
                  <select
                    value={member.role}
                    onChange={(e) => updateMemberRole(member.id, e.target.value)}
                    className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-[#1a1a2e] focus:border-[#FF5722] focus:outline-none"
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button
                    onClick={() => removeTeamMember(member.id)}
                    disabled={removingId === member.id}
                    className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
                    title="Remove access"
                  >
                    {removingId === member.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

          {teamMembers.length === 0 && !teamLoading && (
            <p className="text-sm text-gray-400 text-center py-3">No team members yet. Invite someone below.</p>
          )}

          {teamLoading && (
            <div className="flex justify-center py-4">
              <Loader2 className="size-5 animate-spin text-gray-400" />
            </div>
          )}

          {/* Invite Form */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm font-medium text-[#1a1a2e] mb-3">Invite a team member</p>
            <div className="flex gap-2">
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Email address"
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    inviteTeamMember();
                  }
                }}
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as "editor" | "viewer")}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#1a1a2e] focus:border-[#FF5722] focus:outline-none"
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
              <Button
                onClick={inviteTeamMember}
                disabled={inviting || !inviteEmail.trim()}
              >
                {inviting ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 size-4" />
                )}
                Invite
              </Button>
            </div>
            <div className="mt-3 flex gap-4">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Pencil className="size-3" />
                <span><strong>Editor</strong> — can generate articles, approve, edit settings</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Eye className="size-3" />
                <span><strong>Viewer</strong> — can view articles and dashboard (read-only)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Connections */}
      <Card>
        <CardHeader>
          <CardTitle>API Connections</CardTitle>
          <CardDescription>
            Connect your API keys for AI content generation, keyword research, and content humanization.
            All keys are stored per-site and never shared.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* OpenAI */}
          <div className="space-y-3">
            <div>
              <Label className="text-base">OpenAI</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Powers AI content generation, planning, QA scoring, and optimization.
                Uses GPT-4o. Get your key from{" "}
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  platform.openai.com
                </a>
              </p>
            </div>
            <div className="flex gap-2">
              <Input
                type="password"
                value={apiKeys.openaiApiKey}
                onChange={(e) => setApiKeys({ ...apiKeys, openaiApiKey: e.target.value })}
                placeholder="sk-..."
                className="flex-1"
              />
              <TestButton service="openai" label="Test" />
            </div>
            <ConnectionAlert service="openai" />
          </div>

          <div className="border-t border-border" />

          {/* DataForSEO */}
          <div className="space-y-3">
            <div>
              <Label className="text-base">DataForSEO</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Keyword research, search volume, keyword difficulty, and competitor analysis.
                Pay-per-use (~$0.001/query). Get credentials from{" "}
                <a href="https://app.dataforseo.com/register" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  dataforseo.com
                </a>
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Login (email)</Label>
                <Input
                  type="text"
                  value={apiKeys.dataForSeoLogin}
                  onChange={(e) => setApiKeys({ ...apiKeys, dataForSeoLogin: e.target.value })}
                  placeholder="your@email.com"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Password</Label>
                <Input
                  type="password"
                  value={apiKeys.dataForSeoPassword}
                  onChange={(e) => setApiKeys({ ...apiKeys, dataForSeoPassword: e.target.value })}
                  placeholder="API password"
                />
              </div>
            </div>
            <div className="flex justify-start">
              <TestButton service="dataforseo" label="Test Connection" />
            </div>
            <ConnectionAlert service="dataforseo" />
          </div>

          <div className="border-t border-border" />

          {/* Anthropic */}
          <div className="space-y-3">
            <div>
              <Label className="text-base">Anthropic</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Powers Claude AI for content humanization and advanced writing.
                Get your key from{" "}
                <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  console.anthropic.com
                </a>
              </p>
            </div>
            <div className="flex gap-2">
              <Input
                type="password"
                value={apiKeys.anthropicApiKey}
                onChange={(e) => setApiKeys({ ...apiKeys, anthropicApiKey: e.target.value })}
                placeholder="sk-ant-..."
                className="flex-1"
              />
              <TestButton service="anthropic" label="Test" />
            </div>
            <ConnectionAlert service="anthropic" />
          </div>

          <div className="flex justify-end pt-2">
            <SaveButton section="apiKeys" data={apiKeys} />
          </div>
        </CardContent>
      </Card>

      {/* Sitemap */}
      <SitemapCard siteId={currentSite?.id || ""} />

      {/* Webflow */}
      <WebflowConnectionCard
        currentSiteId={currentSite?.id || ""}
        initial={webflow}
        onSaved={(data) => setWebflow(data)}
      />

    </div>
  );
}
