"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useSite } from "@/lib/site-context";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  LayoutDashboard,
  Target,
  FileText,
  ClipboardList,
  Sparkles,
  BarChart3,
  Search,
  CheckCircle2,
  Globe,
  Settings,
  LogOut,
  Menu,
  ChevronDown,
  Zap,
  Plus,
  Check,
  Users,
  BookOpen,
  List,
  ScanSearch,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/strategy", label: "SEO Strategy", icon: Zap, section: "CONTENT", comingSoon: true },
  { href: "/content-strategy", label: "Content Strategy", icon: BookOpen },
  { href: "/topics", label: "Topics", icon: List },
  { href: "/customers", label: "Customer Intelligence", icon: Users },
  { href: "/knowledge-base", label: "Knowledge Base", icon: BookOpen },
  { href: "/goals", label: "Campaigns", icon: Target, comingSoon: true },
  { href: "/articles", label: "Articles", icon: FileText },
  { href: "/review", label: "Review Queue", icon: ClipboardList },
  { href: "/optimizations", label: "Optimizations", icon: Sparkles, section: "TOOLS", comingSoon: true },
  { href: "/ab-tests", label: "A/B Tests", icon: BarChart3, comingSoon: true },
  { href: "/research", label: "Research", icon: Search, comingSoon: true },
  { href: "/page-audit", label: "Page Audit", icon: ScanSearch, comingSoon: true },
  { href: "/pages", label: "Monitored Pages", icon: Globe, comingSoon: true },
  { href: "/published", label: "Published", icon: CheckCircle2, section: "SETTINGS" },
  { href: "/settings", label: "Settings", icon: Settings },
];

function getFaviconUrl(domain: string) {
  try {
    const host = domain.includes("://") ? new URL(domain).hostname : domain;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=32`;
  } catch {
    return null;
  }
}

function SidebarContent({ pathname }: { pathname: string }) {
  const { data: session } = useSession();
  const { currentSite, sites, setSite } = useSite();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Site Switcher */}
      <div className="px-3 py-3 border-b border-white/10" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-white/5 transition-colors group"
        >
          {currentSite?.domain ? (
            <img
              src={getFaviconUrl(currentSite.domain) || ""}
              alt=""
              className="w-7 h-7 rounded-lg bg-white/10 p-0.5"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className="w-7 h-7 bg-gradient-to-br from-orange to-yellow-500 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
          )}
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {currentSite?.name || "SEO Autopilot"}
            </p>
            {currentSite?.domain && (
              <p className="text-[10px] text-white/40 truncate">
                {currentSite.domain.replace("https://", "").replace("http://", "")}
              </p>
            )}
          </div>
          <ChevronDown className={`w-4 h-4 text-white/30 group-hover:text-white/60 transition-all ${dropdownOpen ? "rotate-180" : ""}`} />
        </button>

        {/* Dropdown */}
        {dropdownOpen && (
          <div className="mt-1 bg-dark-light rounded-xl border border-white/10 shadow-xl overflow-hidden">
            <div className="max-h-48 overflow-y-auto py-1">
              {sites.map((site) => (
                <button
                  key={site.id}
                  onClick={() => {
                    if (site.id !== currentSite?.id) {
                      setSite(site);
                    }
                    setDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 transition-colors"
                >
                  <img
                    src={getFaviconUrl(site.domain) || ""}
                    alt=""
                    className="w-5 h-5 rounded bg-white/10 p-0.5"
                    onError={(e) => { (e.target as HTMLImageElement).src = ""; }}
                  />
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-xs font-medium text-white/80 truncate">{site.name || site.domain}</p>
                    <p className="text-[10px] text-white/30 truncate">
                      {site.domain.replace("https://", "").replace("http://", "")}
                    </p>
                  </div>
                  {site.accessRole && site.accessRole !== "owner" && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/40 shrink-0">
                      {site.accessRole}
                    </span>
                  )}
                  {site.id === currentSite?.id && (
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  )}
                </button>
              ))}
            </div>

            {/* Add website */}
            <div className="border-t border-white/10">
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  router.push("/onboarding/step1");
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/5 transition-colors"
              >
                <div className="w-5 h-5 rounded bg-white/10 flex items-center justify-center">
                  <Plus className="w-3 h-3 text-white/50" />
                </div>
                <span className="text-xs font-medium text-white/50">Add Website</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {navItems.map((item, i) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <div key={item.href}>
              {item.section && i > 0 && (
                <div className="px-3 pt-5 pb-2 text-[10px] font-semibold text-white/30 tracking-widest uppercase">
                  {item.section}
                </div>
              )}
              {item.comingSoon ? (
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium mb-0.5 text-white/25 cursor-default">
                  <Icon className="w-[18px] h-[18px]" />
                  {item.label}
                  <span className="ml-auto text-[9px] font-semibold uppercase tracking-wider bg-white/10 text-white/30 px-1.5 py-0.5 rounded">Soon</span>
                </div>
              ) : (
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-0.5 ${
                    isActive
                      ? "bg-primary text-white shadow-lg shadow-primary/25"
                      : "text-white/50 hover:text-white hover:bg-sidebar-hover"
                  }`}
                >
                  <Icon className="w-[18px] h-[18px]" />
                  {item.label}
                </Link>
              )}
            </div>
          );
        })}
      </nav>

      {/* User Section */}
      {session?.user && (
        <div className="px-3 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2">
            {session.user.image ? (
              <img src={session.user.image} alt="" className="w-8 h-8 rounded-full ring-2 ring-white/20" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center text-sm font-medium text-white">
                {session.user.name?.[0] || "?"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white/90 truncate">{session.user.name}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-white/30 hover:text-white/70 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Desktop Sidebar */}
      <aside className="hidden w-60 h-screen shrink-0 md:block fixed left-0 top-0 z-40">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger>
          <button className="fixed left-3 top-3 z-40 rounded-md bg-white p-2 shadow-md md:hidden">
            <Menu className="size-5 text-dark" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="w-60 p-0 border-none">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent pathname={pathname} />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="flex-1 md:ml-60">
        <div className="mx-auto max-w-[1400px] p-6">{children}</div>
      </main>
    </div>
  );
}
