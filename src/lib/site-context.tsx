"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";

export type Site = {
  id: string;
  domain: string;
  name: string;
  industry: string;
  webflowApiToken: string | null;
  webflowSiteId: string | null;
  isActive: boolean;
  createdAt: string;
  accessRole?: string; // "owner" | "editor" | "viewer"
};

type SiteContextType = {
  currentSite: Site | null;
  sites: Site[];
  setSite: (site: Site) => void;
  loading: boolean;
  refetchSites: () => Promise<void>;
};

const SiteContext = createContext<SiteContextType>({
  currentSite: null,
  sites: [],
  setSite: () => {},
  loading: true,
  refetchSites: async () => {},
});

export function SiteProvider({ children }: { children: ReactNode }) {
  const [sites, setSites] = useState<Site[]>([]);
  const [currentSite, setCurrentSite] = useState<Site | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  async function fetchSites() {
    try {
      const res = await fetch("/api/sites");
      if (res.ok) {
        const data: Site[] = await res.json();
        setSites(data);
        if (data.length > 0) {
          setCurrentSite(data[0]);
        } else if (!pathname.startsWith("/onboarding")) {
          router.push("/onboarding/step1");
        }
      }
    } catch (err) {
      console.error("Failed to fetch sites:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SiteContext.Provider
      value={{ currentSite, sites, setSite: setCurrentSite, loading, refetchSites: fetchSites }}
    >
      {children}
    </SiteContext.Provider>
  );
}

export function useSite() {
  return useContext(SiteContext);
}
