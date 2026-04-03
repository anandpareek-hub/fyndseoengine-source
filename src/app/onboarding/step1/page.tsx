"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Zap, Globe, Loader2, ArrowRight } from "lucide-react";

function getFaviconUrl(url: string) {
  try {
    const host = url.includes("://") ? new URL(url).hostname : url.replace(/\/.*$/, "");
    return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
  } catch {
    return null;
  }
}

export default function OnboardingStep1() {
  const [url, setUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const trimmed = url.trim();
    if (trimmed.length > 3 && trimmed.includes(".")) {
      const timer = setTimeout(() => setFaviconUrl(getFaviconUrl(trimmed)), 500);
      return () => clearTimeout(timer);
    } else {
      setFaviconUrl(null);
    }
  }, [url]);

  async function handleScan() {
    if (!url.trim()) return;
    setScanning(true);
    setError("");

    try {
      const res = await fetch("/api/sites/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Scan failed");
      }

      router.push("/onboarding/step2");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setScanning(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-[#FF5722]">
            <Zap className="size-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-[#1a1a2e]">Welcome to Webflow SEO Engine</h1>
          <p className="text-gray-500 mt-2">Let&apos;s scan your website to get started</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1a1a2e] mb-2">Your Website URL</label>
              <div className="relative">
                {faviconUrl ? (
                  <img
                    src={faviconUrl}
                    alt=""
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-sm"
                    onError={() => setFaviconUrl(null)}
                  />
                ) : (
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                )}
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="example.com"
                  disabled={scanning}
                  className="w-full rounded-lg border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-[#1a1a2e] placeholder:text-gray-400 focus:border-[#FF5722] focus:outline-none focus:ring-2 focus:ring-[#FF5722]/20 disabled:opacity-50"
                  onKeyDown={(e) => e.key === "Enter" && handleScan()}
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            {scanning && (
              <div className="p-4 bg-[#FFF3E0] border border-[#FF5722]/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-[#FF5722] animate-spin" />
                  <div>
                    <p className="text-sm font-medium text-[#1a1a2e]">Scanning your website...</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Analyzing homepage, sitemap, and about page with AI
                    </p>
                  </div>
                </div>
                <div className="mt-3 w-full bg-[#FF5722]/10 rounded-full h-1.5">
                  <div className="bg-[#FF5722] h-1.5 rounded-full animate-pulse" style={{ width: "60%" }} />
                </div>
              </div>
            )}

            <button
              onClick={handleScan}
              disabled={scanning || !url.trim()}
              className="w-full rounded-lg bg-[#FF5722] py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#E64A19] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {scanning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  Scan Website
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <p className="text-xs text-gray-400 text-center">
              We&apos;ll analyze your homepage, sitemap, and about page to understand your business
            </p>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center mt-6 gap-2">
          <div className="w-8 h-1.5 rounded-full bg-[#FF5722]" />
          <div className="w-8 h-1.5 rounded-full bg-gray-200" />
          <div className="w-8 h-1.5 rounded-full bg-gray-200" />
          <div className="w-8 h-1.5 rounded-full bg-gray-200" />
        </div>
      </div>
    </div>
  );
}
