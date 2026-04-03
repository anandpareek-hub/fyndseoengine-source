"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import {
  Zap,
  Target,
  FileText,
  CheckCircle,
  ArrowRight,
  BarChart3,
  Globe,
  Sparkles,
  Bot,
  Clock,
  TrendingUp,
  Eye,
  Layers,
  PenTool,
  Send,
} from "lucide-react";

function FadeIn({
  children,
  delay = 0,
  direction = "up",
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  direction?: "up" | "down" | "left" | "right";
  className?: string;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const directions = {
    up: { y: 40, x: 0 },
    down: { y: -40, x: 0 },
    left: { y: 0, x: 40 },
    right: { y: 0, x: -40 },
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, ...directions[direction] }}
      animate={isInView ? { opacity: 1, y: 0, x: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function FloatingCard({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 4, delay, repeat: Infinity, ease: "easeInOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function AnimatedCounter({ value, suffix = "" }: { value: string; suffix?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.span
      ref={ref}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={isInView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
    >
      {value}{suffix}
    </motion.span>
  );
}

export default function Home() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-[#FF5722] border-t-transparent" />
      </div>
    );
  }

  if (status === "authenticated") return null;

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Navigation */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-50 border-b border-gray-100/80 bg-white/80 backdrop-blur-xl"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF5722] to-[#ff6b1a] shadow-lg shadow-orange-200">
              <Zap className="size-5 text-white" />
            </div>
            <span className="text-lg font-bold text-[#1a1a2e] tracking-tight">
              Webflow SEO Engine
            </span>
          </div>
          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-[13px] font-medium text-gray-500 hover:text-[#1a1a2e] transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-[13px] font-medium text-gray-500 hover:text-[#1a1a2e] transition-colors">
              How It Works
            </a>
            <a href="#pipeline" className="text-[13px] font-medium text-gray-500 hover:text-[#1a1a2e] transition-colors">
              Pipeline
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/signin"
              className="text-[13px] font-medium text-[#1a1a2e] hover:text-[#FF5722] transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/signin"
              className="rounded-xl bg-gradient-to-r from-[#FF5722] to-[#ff6b1a] px-5 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-orange-200 hover:shadow-orange-300 hover:scale-[1.02] transition-all"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f1729] via-[#1a1a2e] to-[#0c1a33]" />
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#FF5722]/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-[#FF5722]/15 rounded-full blur-[100px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#FF5722]/5 rounded-full blur-[80px]" />
        </div>

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm"
            >
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              >
                <Bot className="size-4 text-[#FF5722]" />
              </motion.div>
              <span className="text-sm font-medium text-white/80">Autonomous AI SEO Agent</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-4xl font-extrabold tracking-tight text-white md:text-[56px] md:leading-[1.08]"
            >
              From SEO goal to{" "}
              <span className="relative">
                <span className="bg-gradient-to-r from-[#FF5722] to-[#ffb347] bg-clip-text text-transparent">
                  published content
                </span>
                <motion.span
                  className="absolute -bottom-1 left-0 h-[3px] bg-gradient-to-r from-[#FF5722] to-[#ffb347] rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 0.8, delay: 1 }}
                />
              </span>
              <br />
              fully automated
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-6 text-base text-white/50 md:text-lg leading-relaxed max-w-2xl mx-auto"
            >
              Give it a goal. The AI agent researches keywords, plans a content
              strategy, writes optimized articles, and publishes to your store.
              You just review and approve.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
            >
              <Link
                href="/signin"
                className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#FF5722] to-[#ff6b1a] px-8 py-4 text-[15px] font-semibold text-white shadow-2xl shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02] transition-all"
              >
                Get Started
                <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-8 py-4 text-[15px] font-medium text-white/80 backdrop-blur-sm hover:bg-white/10 transition-all"
              >
                See How It Works
              </a>
            </motion.div>
          </div>

          {/* Floating dashboard preview cards */}
          <div className="mt-20 relative">
            <div className="flex justify-center gap-4 md:gap-6">
              <FloatingCard delay={0} className="hidden md:block">
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5 w-52">
                  <div className="text-xs font-medium text-white/40 uppercase tracking-wider">Articles Generated</div>
                  <div className="mt-2 text-3xl font-bold text-white">47</div>
                  <div className="mt-1 text-xs text-emerald-400">+12 this week</div>
                </div>
              </FloatingCard>

              <FloatingCard delay={0.5}>
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5 w-52">
                  <div className="text-xs font-medium text-white/40 uppercase tracking-wider">Organic Traffic</div>
                  <div className="mt-2 text-3xl font-bold text-white">12.4K</div>
                  <div className="mt-1 text-xs text-emerald-400">+34% vs last month</div>
                </div>
              </FloatingCard>

              <FloatingCard delay={1} className="hidden sm:block">
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5 w-52">
                  <div className="text-xs font-medium text-white/40 uppercase tracking-wider">Keywords Ranked</div>
                  <div className="mt-2 text-3xl font-bold text-white">286</div>
                  <div className="mt-1 text-xs text-emerald-400">+58 new positions</div>
                </div>
              </FloatingCard>

              <FloatingCard delay={1.5} className="hidden lg:block">
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5 w-52">
                  <div className="text-xs font-medium text-white/40 uppercase tracking-wider">Published</div>
                  <div className="mt-2 text-3xl font-bold text-white">31</div>
                  <div className="mt-1 text-xs text-emerald-400">100% approved</div>
                </div>
              </FloatingCard>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 gap-8 md:grid-cols-4 max-w-3xl mx-auto">
            {[
              { value: "100%", label: "Autonomous" },
              { value: "10x", label: "Faster Than Manual" },
              { value: "24/7", label: "Content Engine" },
              { value: "$0.50", label: "Per Article" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.8 + i * 0.1 }}
                className="text-center"
              >
                <div className="text-2xl font-bold text-white md:text-3xl">
                  <AnimatedCounter value={stat.value} />
                </div>
                <div className="mt-1 text-xs text-white/40 font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <FadeIn>
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-sm font-semibold text-[#FF5722] uppercase tracking-wider">Features</span>
              <h2 className="mt-3 text-3xl font-bold text-[#1a1a2e] md:text-4xl">
                Everything you need for autonomous SEO
              </h2>
              <p className="mt-4 text-base text-gray-400">
                A complete AI-powered pipeline from keyword research to published content
              </p>
            </div>
          </FadeIn>

          <div className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Target,
                title: "Goal-Driven Planning",
                description:
                  "Set an SEO goal and the AI agent creates a full content strategy with keyword clusters, topic maps, and a publishing schedule.",
                gradient: "from-blue-500 to-cyan-500",
                bg: "bg-blue-50",
              },
              {
                icon: Sparkles,
                title: "AI Content Generation",
                description:
                  "GPT-4o writes SEO-optimized articles with proper structure, meta tags, FAQ sections, and internal linking suggestions.",
                gradient: "from-purple-500 to-pink-500",
                bg: "bg-purple-50",
              },
              {
                icon: Eye,
                title: "Human-in-the-Loop Review",
                description:
                  "Every article lands in a review queue. Approve, reject, or request revisions before anything goes live.",
                gradient: "from-orange-500 to-red-500",
                bg: "bg-orange-50",
              },
              {
                icon: Globe,
                title: "One-Click Publishing",
                description:
                  "Publish directly to your Webflow CMS via API. Full audit trail of every publish action.",
                gradient: "from-emerald-500 to-teal-500",
                bg: "bg-emerald-50",
              },
              {
                icon: BarChart3,
                title: "Performance Tracking",
                description:
                  "Monitor keyword rankings, organic traffic, and content performance. A/B test meta titles automatically.",
                gradient: "from-cyan-500 to-blue-500",
                bg: "bg-cyan-50",
              },
              {
                icon: TrendingUp,
                title: "Continuous Optimization",
                description:
                  "The agent monitors published content and suggests updates, content refreshes, and new opportunities.",
                gradient: "from-rose-500 to-orange-500",
                bg: "bg-rose-50",
              },
            ].map((feature, i) => (
              <FadeIn key={feature.title} delay={i * 0.1}>
                <div className="group relative rounded-2xl border border-gray-100 bg-white p-6 transition-all hover:shadow-xl hover:shadow-gray-100/50 hover:-translate-y-1 duration-300">
                  <div className={`mb-4 inline-flex size-12 items-center justify-center rounded-xl ${feature.bg}`}>
                    <feature.icon className="size-6 text-gray-700" />
                  </div>
                  <h3 className="text-[15px] font-semibold text-[#1a1a2e]">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-400">
                    {feature.description}
                  </p>
                  <div className={`absolute inset-x-0 bottom-0 h-0.5 rounded-b-2xl bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-[#f8f9fb] py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <FadeIn>
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-sm font-semibold text-[#FF5722] uppercase tracking-wider">How it works</span>
              <h2 className="mt-3 text-3xl font-bold text-[#1a1a2e] md:text-4xl">
                4 steps from goal to published
              </h2>
            </div>
          </FadeIn>

          <div className="mt-16 grid gap-0 md:grid-cols-4">
            {[
              {
                step: "01",
                icon: Target,
                title: "Set a Goal",
                description: "Define your SEO objective. The AI suggests goals based on your website scan.",
                color: "#FF5722",
              },
              {
                step: "02",
                icon: Layers,
                title: "AI Plans Strategy",
                description: "Researches competitors, finds keyword opportunities, and creates a content plan.",
                color: "#9333ea",
              },
              {
                step: "03",
                icon: PenTool,
                title: "Content Generated",
                description: "AI writes full articles with titles, meta descriptions, structured content, and FAQs.",
                color: "#FF5722",
              },
              {
                step: "04",
                icon: Send,
                title: "Review & Publish",
                description: "Approve with one click. Publishes directly to your Webflow site.",
                color: "#16a34a",
              },
            ].map((item, i) => (
              <FadeIn key={item.step} delay={i * 0.15}>
                <div className="relative flex flex-col items-center px-6 py-8 text-center">
                  {i < 3 && (
                    <div className="absolute right-0 top-[56px] hidden h-px w-full translate-x-1/2 md:block"
                      style={{ background: `linear-gradient(90deg, ${item.color}40, transparent)` }}
                    />
                  )}
                  <div
                    className="relative z-10 mb-5 flex size-14 items-center justify-center rounded-2xl shadow-lg text-white"
                    style={{ backgroundColor: item.color }}
                  >
                    <item.icon className="size-6" />
                  </div>
                  <div
                    className="mb-2 text-xs font-bold uppercase tracking-widest"
                    style={{ color: item.color }}
                  >
                    Step {item.step}
                  </div>
                  <h3 className="text-[15px] font-semibold text-[#1a1a2e]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-gray-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Pipeline Section */}
      <section id="pipeline" className="py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <FadeIn>
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-sm font-semibold text-[#FF5722] uppercase tracking-wider">Pipeline</span>
              <h2 className="mt-3 text-3xl font-bold text-[#1a1a2e] md:text-4xl">
                Your content pipeline at a glance
              </h2>
              <p className="mt-4 text-base text-gray-400">
                Track every article from idea to published
              </p>
            </div>
          </FadeIn>

          <div className="mt-16 flex justify-center">
            <div className="flex gap-3 overflow-x-auto pb-4">
              {[
                { label: "Planned", count: 12, color: "#6b7280" },
                { label: "Generating", count: 3, color: "#FF5722" },
                { label: "In Review", count: 5, color: "#FF5722" },
                { label: "Approved", count: 8, color: "#16a34a" },
                { label: "Published", count: 47, color: "#9333ea" },
              ].map((stage, i) => (
                <FadeIn key={stage.label} delay={i * 0.1} direction="up">
                  <div className="relative w-36 rounded-2xl border border-gray-100 bg-white p-5 text-center shadow-sm hover:shadow-lg transition-shadow">
                    {i < 4 && (
                      <div className="absolute -right-2 top-1/2 -translate-y-1/2 text-gray-200 hidden sm:block">
                        <ArrowRight className="size-4" />
                      </div>
                    )}
                    <motion.div
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ type: "spring", delay: i * 0.1 + 0.3 }}
                      className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full text-xl font-bold text-white"
                      style={{ backgroundColor: stage.color }}
                    >
                      {stage.count}
                    </motion.div>
                    <div className="text-sm font-semibold text-[#1a1a2e]">{stage.label}</div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>

          {/* Brand understanding */}
          <FadeIn>
            <div className="mt-24 grid gap-12 md:grid-cols-2 items-center">
              <div>
                <span className="text-sm font-semibold text-[#FF5722] uppercase tracking-wider">Smart Onboarding</span>
                <h3 className="mt-3 text-2xl font-bold text-[#1a1a2e]">
                  AI that understands your brand
                </h3>
                <p className="mt-4 text-gray-400 leading-relaxed">
                  During onboarding, the agent scans your website to learn your
                  brand voice, target audience, products, and competitive
                  landscape. Every piece of content is tailored to your business.
                </p>
                <ul className="mt-6 space-y-3">
                  {[
                    "Automatic website scanning with AI analysis",
                    "Brand voice and audience detection",
                    "Competitor identification and tracking",
                    "Keyword opportunity discovery",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-gray-500">
                      <CheckCircle className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-[#f8f9fb] to-white p-8 shadow-sm">
                <div className="space-y-4">
                  {[
                    { label: "Brand Voice", value: "Professional, authoritative, luxury-focused" },
                    { label: "Target Audience", value: "Fashion-conscious professionals, 25-45" },
                  ].map((item) => (
                    <FloatingCard key={item.label} delay={Math.random() * 2}>
                      <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-50">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-300">{item.label}</div>
                        <div className="mt-1.5 text-sm text-[#1a1a2e] font-medium">{item.value}</div>
                      </div>
                    </FloatingCard>
                  ))}
                  <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-50">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-300">AI-Suggested Keywords</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {["luxury fashion", "designer brands", "premium clothing", "style guide"].map((kw) => (
                        <span key={kw} className="rounded-lg bg-[#FF5722]/10 px-2.5 py-1 text-xs font-medium text-[#FF5722]">{kw}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f1729] via-[#1a1a2e] to-[#0c1a33]" />
        <div className="absolute inset-0">
          <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-[#FF5722]/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 left-1/4 w-72 h-72 bg-[#FF5722]/10 rounded-full blur-[100px]" />
        </div>
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <FadeIn>
            <h2 className="text-3xl font-bold text-white md:text-4xl leading-tight">
              Stop writing content manually.
              <br />
              <span className="bg-gradient-to-r from-[#FF5722] to-[#ffb347] bg-clip-text text-transparent">
                Let AI do the heavy lifting.
              </span>
            </h2>
            <p className="mt-6 text-base text-white/40 leading-relaxed">
              Set your SEO goals and let the autonomous agent handle research,
              writing, and publishing. You stay in control with human-in-the-loop review.
            </p>
            <div className="mt-10">
              <Link
                href="/signin"
                className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#FF5722] to-[#ff6b1a] px-8 py-4 text-[15px] font-semibold text-white shadow-2xl shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02] transition-all"
              >
                Get Started Free
                <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            <div className="mt-8 flex items-center justify-center gap-6 text-sm text-white/40">
              <span className="flex items-center gap-1.5">
                <CheckCircle className="size-4 text-emerald-400" />
                No credit card required
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="size-4 text-[#FF5722]" />
                Setup in 2 minutes
              </span>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white py-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#FF5722] to-[#ff6b1a]">
              <Zap className="size-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-[#1a1a2e]">Webflow SEO Engine</span>
          </div>
          <p className="text-xs text-gray-300">
            &copy; {new Date().getFullYear()} Webflow SEO Engine. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
