"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, Globe, Database, Columns3, ExternalLink, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface WebflowSettings {
  apiToken: string;
  siteId: string;
  siteName: string;
  domain: string;
  blogCollectionId: string;
}

interface WfSite {
  id: string;
  displayName: string;
  shortName: string;
  defaultDomain: string;
  customDomains?: string[];
}

interface WfCollection {
  id: string;
  displayName: string;
  slug: string;
}

export default function WebflowConnectionCard({
  currentSiteId,
  initial,
  onSaved,
}: {
  currentSiteId: string;
  initial: WebflowSettings;
  onSaved: (data: WebflowSettings) => void;
}) {
  const [token, setToken] = useState(initial.apiToken || "");
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(!!initial.apiToken && !!initial.siteId);
  const [error, setError] = useState("");

  const [sites, setSites] = useState<WfSite[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState(initial.siteId || "");

  const [collections, setCollections] = useState<WfCollection[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState(initial.blogCollectionId || "");

  const [saving, setSaving] = useState(false);

  // Auto-load collections if already connected
  useEffect(() => {
    if (initial.apiToken && initial.siteId && !collections.length) {
      loadCollections(initial.siteId);
    }
  }, []);

  async function handleConnect() {
    if (!token.trim()) return;
    setConnecting(true);
    setError("");
    try {
      const res = await fetch("/api/webflow/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiToken: token.trim() }),
      });
      const data = await res.json();
      if (data.success && data.sites) {
        setConnected(true);
        setSites(data.sites);
        if (data.sites.length === 1) {
          setSelectedSiteId(data.sites[0].id);
          loadCollections(data.sites[0].id);
        }
        toast.success("Connected to Webflow");
      } else {
        setError(data.error || "Invalid API token");
      }
    } catch {
      setError("Connection failed");
    }
    setConnecting(false);
  }

  async function loadCollections(siteId: string) {
    setLoadingCollections(true);
    try {
      const res = await fetch("/api/webflow/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiToken: token || initial.apiToken, siteId }),
      });
      const data = await res.json();
      setCollections(data.collections || []);
    } catch { /* ignore */ }
    setLoadingCollections(false);
  }

  function handleSiteSelect(siteId: string) {
    setSelectedSiteId(siteId);
    setSelectedCollectionId("");
    setCollections([]);
    if (siteId) loadCollections(siteId);
  }

  async function handleSave() {
    if (!currentSiteId) return;
    setSaving(true);

    const selectedSite = sites.find((s) => s.id === selectedSiteId);
    const data: WebflowSettings = {
      apiToken: token || initial.apiToken,
      siteId: selectedSiteId || initial.siteId,
      siteName: selectedSite?.displayName || initial.siteName,
      domain: selectedSite?.customDomains?.[0] || selectedSite?.defaultDomain || initial.domain,
      blogCollectionId: selectedCollectionId || initial.blogCollectionId,
    };

    try {
      const res = await fetch("/api/sites/" + currentSiteId, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webflowApiToken: data.apiToken,
          webflowSiteId: data.siteId,
          webflowSiteName: data.siteName,
          webflowDomain: data.domain,
          webflowBlogCollectionId: data.blogCollectionId,
        }),
      });
      if (res.ok) {
        toast.success("Webflow settings saved");
        onSaved(data);
      } else {
        toast.error("Failed to save");
      }
    } catch {
      toast.error("Failed to save");
    }
    setSaving(false);
  }

  const hasChanges = token !== initial.apiToken || selectedSiteId !== initial.siteId || selectedCollectionId !== initial.blogCollectionId;
  const connectedSite = sites.find((s) => s.id === selectedSiteId) || (initial.siteId ? { displayName: initial.siteName, defaultDomain: initial.domain } : null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5" />
          Webflow
          {connected && initial.siteId && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
        </CardTitle>
        <CardDescription>Connect your Webflow site for auto-publishing content</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Step 1: API Token */}
        <div className="space-y-2">
          <Label>API Token</Label>
          <p className="text-xs text-muted-foreground">
            Get your token from{" "}
            <a href="https://webflow.com/dashboard/workspace/integrations" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1">
              Webflow Integrations <ExternalLink className="w-3 h-3" />
            </a>
          </p>
          <div className="flex gap-2">
            <Input
              type="password"
              value={token}
              onChange={(e) => { setToken(e.target.value); setConnected(false); setSites([]); }}
              placeholder="Paste your Webflow API token..."
              className="flex-1"
            />
            <Button
              onClick={handleConnect}
              disabled={connecting || !token.trim()}
              variant={connected && sites.length > 0 ? "outline" : "default"}
            >
              {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : connected && sites.length > 0 ? "Reconnect" : "Connect"}
            </Button>
          </div>
          {error && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {error}
            </p>
          )}
        </div>

        {/* Step 2: Select Site */}
        {(connected && sites.length > 0) && (
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" /> Select Site
            </Label>
            <select
              value={selectedSiteId}
              onChange={(e) => handleSiteSelect(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="">Choose a site...</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.displayName} ({s.defaultDomain})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Step 3: Select Blog Collection */}
        {selectedSiteId && (
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Columns3 className="w-3.5 h-3.5" /> Blog CMS Collection
            </Label>
            {loadingCollections ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading collections...
              </div>
            ) : (
              <select
                value={selectedCollectionId}
                onChange={(e) => setSelectedCollectionId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">Choose blog collection...</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.displayName} ({c.slug})
                  </option>
                ))}
              </select>
            )}
            <p className="text-xs text-muted-foreground">
              Select the CMS Collection where blog articles will be published
            </p>
          </div>
        )}

        {/* Connected info */}
        {initial.siteId && connectedSite && !sites.length && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-sm font-medium text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Connected to {initial.siteName || "Webflow"}
            </p>
            <p className="text-xs text-emerald-600 mt-1">{initial.domain}</p>
          </div>
        )}

        {/* Save */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving || (!hasChanges && !!initial.siteId)}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
