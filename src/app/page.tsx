import Image from "next/image";
import Link from "next/link";
import { Navbar } from "@/components/navbar";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col font-sans text-body-md selection:bg-[#007AFF] selection:text-white">
      <Navbar />

      {/* Main Content Canvas */}
      <main className="flex-grow pt-[80px] w-full max-w-[1440px] mx-auto">
        {/* Hero Section */}
        <section id="platform" className="relative px-4 md:px-12 py-16 md:py-[120px] overflow-hidden scroll-mt-[80px]">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(150,150,150,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(150,150,150,0.1)_1px,transparent_1px)] bg-[size:40px_40px] opacity-50 pointer-events-none"></div>
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#007AFF] rounded-full blur-[150px] opacity-[0.08] pointer-events-none"></div>
          
          <div className="relative z-10 max-w-4xl mx-auto text-center flex flex-col items-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#007AFF]/30 bg-[#007AFF]/10 mb-8">
              <span className="material-symbols-outlined text-[#007AFF] text-[16px]">magic_button</span>
              <span className="text-[#007AFF] text-xs font-semibold tracking-wider">AI Spend Audit for Startups</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 tracking-tight">Stop Overspending on AI Tools in Minutes</h1>
            
            <p className="text-xl text-foreground/70 max-w-2xl mb-10 leading-relaxed">
              Spendly audits your stack, flags waste instantly, and helps you reclaim your budget without the manual work.
            </p>
            
            <Link href="/audit" className="bg-[#007AFF] text-white text-lg font-semibold px-8 py-4 rounded-full hover:bg-blue-600 transition-colors shadow-[0_0_20px_rgba(0,122,255,0.4)] mb-12 flex items-center gap-2 group w-max mx-auto">
              Audit My Stack - It&apos;s Free
              <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </Link>
            
            <div className="flex flex-col items-center gap-4 opacity-60">
              <span className="text-xs uppercase tracking-widest text-foreground/50 font-semibold">Trusted by 500+ high-growth startups</span>
              <div className="flex flex-wrap justify-center gap-8 md:gap-12 items-center grayscale">
                <span className="text-2xl font-bold text-foreground/40">ACME Corp</span>
                <span className="text-2xl font-bold text-foreground/40">GlobalTech</span>
                <span className="text-2xl font-bold text-foreground/40">Nova</span>
                <span className="text-2xl font-bold text-foreground/40">Nexus</span>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="solutions" className="px-4 md:px-12 py-16 border-t border-border-subtle bg-surface-dim/30 scroll-mt-[80px]">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-4">Precision Intelligence, Zero Effort</h2>
              <p className="text-foreground/60 max-w-xl mx-auto text-lg">A clinical approach to reducing your SaaS overhead.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Step 1 */}
              <div className="bg-surface-dim border border-border-subtle rounded-xl p-8 hover:border-[#007AFF]/50 transition-colors group relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#007AFF]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="w-12 h-12 rounded-lg bg-surface-bright flex items-center justify-center mb-6 border border-border-subtle group-hover:border-[#007AFF]/30 transition-colors shadow-sm">
                  <span className="material-symbols-outlined text-foreground/80 group-hover:text-[#007AFF] transition-colors">link</span>
                </div>
                <h3 className="text-xl font-medium text-foreground mb-3">Securely Link Accounts</h3>
                <p className="text-foreground/60 leading-relaxed">Connect your financial systems securely with read-only access. We integrate instantly via Plaid and direct API endpoints.</p>
              </div>
              
              {/* Step 2 */}
              <div className="bg-surface-dim border border-border-subtle rounded-xl p-8 hover:border-[#007AFF]/50 transition-colors group relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#007AFF]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="w-12 h-12 rounded-lg bg-surface-bright flex items-center justify-center mb-6 border border-border-subtle group-hover:border-[#007AFF]/30 transition-colors shadow-sm">
                  <span className="material-symbols-outlined text-foreground/80 group-hover:text-[#007AFF] transition-colors">analytics</span>
                </div>
                <h3 className="text-xl font-medium text-foreground mb-3">AI Analysis</h3>
                <p className="text-foreground/60 leading-relaxed">Our proprietary engine scans millions of transactions globally to detect hidden fees, tier bloat, and orphaned subscriptions.</p>
              </div>
              
              {/* Step 3 */}
              <div className="bg-surface-dim border border-border-subtle rounded-xl p-8 hover:border-[#007AFF]/50 transition-colors group relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#007AFF]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="w-12 h-12 rounded-lg bg-surface-bright flex items-center justify-center mb-6 border border-border-subtle group-hover:border-[#007AFF]/30 transition-colors shadow-sm">
                  <span className="material-symbols-outlined text-foreground/80 group-hover:text-[#007AFF] transition-colors">cut</span>
                </div>
                <h3 className="text-xl font-medium text-foreground mb-3">Execute Savings</h3>
                <p className="text-foreground/60 leading-relaxed">Review high-confidence recommendations and cancel unused tools with one click directly from the dashboard.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Savings Showcase Section */}
        <section id="ai-audit" className="px-4 md:px-12 py-16 scroll-mt-[80px]">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-end mb-8">
              <div>
                <h2 className="text-3xl font-bold text-foreground mb-2">Actionable Intelligence</h2>
                <p className="text-foreground/60 text-lg">Real-time data visualized for immediate decision making.</p>
              </div>
              <Link className="text-[#007AFF] hover:text-foreground transition-colors flex items-center gap-1 text-xs font-semibold uppercase tracking-wider mt-4 md:mt-0" href="#">
                View Demo Report <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto lg:h-[400px]">
              {/* Large Metric Card */}
              <div className="lg:col-span-2 bg-surface-dim border border-border-subtle rounded-xl p-8 relative overflow-hidden flex flex-col justify-between hover:bg-foreground/[0.02] transition-colors">
                <div className="flex justify-between items-start z-10">
                  <div>
                    <span className="text-foreground/50 text-xs font-semibold uppercase tracking-wider block mb-2">Average Savings Found</span>
                    <div className="text-4xl md:text-5xl font-bold text-foreground flex items-center gap-3">
                      $14,000<span className="text-[#007AFF] text-xl font-medium">/year</span>
                    </div>
                  </div>
                  <div className="bg-surface-bright rounded-full p-2 border border-border-subtle">
                    <span className="material-symbols-outlined text-[#007AFF]">trending_down</span>
                  </div>
                </div>
                
                {/* Abstract Chart Representation */}
                <div className="mt-8 h-32 w-full flex items-end gap-2 opacity-80 z-10">
                  <div className="w-1/6 bg-foreground/10 rounded-t-sm" style={{ height: "100%" }}></div>
                  <div className="w-1/6 bg-foreground/10 rounded-t-sm" style={{ height: "90%" }}></div>
                  <div className="w-1/6 bg-foreground/10 rounded-t-sm" style={{ height: "75%" }}></div>
                  <div className="w-1/6 bg-foreground/20 rounded-t-sm border-t border-[#007AFF]" style={{ height: "60%" }}></div>
                  <div className="w-1/6 bg-[#007AFF]/20 rounded-t-sm border-t border-[#007AFF]" style={{ height: "40%" }}></div>
                  <div className="w-1/6 bg-[#007AFF]/40 rounded-t-sm border-t border-[#007AFF]" style={{ height: "25%" }}></div>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-surface-dim to-transparent pointer-events-none"></div>
              </div>
              
              {/* Smaller Cards Column */}
              <div className="flex flex-col gap-6 h-full">
                <div className="flex-1 bg-surface-dim border border-border-subtle rounded-xl p-6 flex flex-col justify-center hover:border-[#007AFF]/30 transition-colors relative">
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-error-red/80 rounded-l-full"></div>
                  <span className="text-foreground/50 text-xs font-semibold uppercase tracking-wider block mb-2">Seat Optimization</span>
                  <div className="text-2xl font-bold text-foreground mb-1">12 Seats</div>
                  <p className="text-error-red text-sm flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">warning</span> Identified as inactive
                  </p>
                </div>
                
                <div className="flex-1 bg-surface-dim border border-border-subtle rounded-xl p-6 flex flex-col justify-center hover:border-[#007AFF]/30 transition-colors relative">
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-error-red/80 rounded-l-full"></div>
                  <span className="text-foreground/50 text-xs font-semibold uppercase tracking-wider block mb-2">Stack Consolidation</span>
                  <div className="text-2xl font-bold text-foreground mb-1">4 Tools</div>
                  <p className="text-error-red text-sm flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">content_copy</span> Duplicate functions flagged
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section id="pricing" className="px-4 md:px-12 py-[120px] relative overflow-hidden scroll-mt-[80px]">
          <div className="absolute inset-0 bg-[#007AFF]/5 pointer-events-none"></div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-[#007AFF] rounded-[100%] blur-[120px] opacity-[0.05] pointer-events-none"></div>
          <div className="max-w-3xl mx-auto text-center relative z-10 border border-border-subtle bg-surface-dim/80 backdrop-blur-md rounded-2xl p-12 shadow-[0_20px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
            <h2 className="text-3xl font-bold text-foreground mb-6">Ready to take control of your SaaS spend?</h2>
            <Link href="/audit" className="bg-[#007AFF] text-white text-lg font-semibold px-8 py-4 rounded-full hover:bg-blue-600 transition-colors shadow-[0_0_20px_rgba(0,122,255,0.4)] flex items-center gap-2 mx-auto group w-max">
              Audit My Stack - It&apos;s Free
              <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-surface-dim border-t border-border-subtle flex flex-col md:flex-row justify-between items-center px-6 md:px-12 py-10 w-full mt-auto">
        <div className="flex items-center gap-2 mb-6 md:mb-0">
          <span className="text-xl font-bold text-foreground">Spendly</span>
        </div>
        <div className="flex flex-wrap justify-center gap-6 text-sm font-medium">
          <Link className="text-foreground/50 hover:text-[#007AFF] transition-colors" href="#">Privacy Policy</Link>
          <Link className="text-foreground/50 hover:text-[#007AFF] transition-colors" href="#">Terms of Service</Link>
          <Link className="text-foreground/50 hover:text-[#007AFF] transition-colors" href="#">Security</Link>
          <Link className="text-foreground/50 hover:text-[#007AFF] transition-colors" href="#">Contact</Link>
        </div>
        <div className="text-foreground/50 text-sm mt-6 md:mt-0">
          © 2026 Spendly AI. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
