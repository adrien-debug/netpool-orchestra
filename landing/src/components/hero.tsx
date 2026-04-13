"use client";

import { motion } from "framer-motion";
import { ArrowDown, Cpu, Activity, Shield } from "lucide-react";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center hero-grid overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/20 via-transparent to-transparent" />

      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-5xl px-6 text-center pt-32 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs text-zinc-400 mb-8">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Now in public beta
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
            Your Dev Stack,
            <br />
            <span className="gradient-text">Under Control</span>
          </h1>

          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Orchestra is the intelligent control center for developers.
            Monitor processes, detect issues before they happen, and let
            AI agents keep your machine running at peak performance.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <a
              href="#download"
              className="px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-medium transition-all hover:shadow-lg hover:shadow-indigo-600/20 text-base"
            >
              Download for Free
            </a>
            <a
              href="#features"
              className="px-8 py-3.5 rounded-xl glass hover:bg-white/5 font-medium transition-all text-zinc-300 text-base"
            >
              See how it works
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="relative mx-auto max-w-4xl"
        >
          <div className="rounded-2xl glass glow p-1">
            <div className="rounded-xl bg-zinc-950 p-6 md:p-8">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
                <span className="ml-3 text-xs text-zinc-600 font-mono">
                  Orchestra v0.1.0
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <StatCard
                  icon={<Cpu size={16} />}
                  label="CPU"
                  value="23%"
                  color="text-emerald-400"
                />
                <StatCard
                  icon={<Activity size={16} />}
                  label="RAM Free"
                  value="12.4 GB"
                  color="text-blue-400"
                />
                <StatCard
                  icon={<Shield size={16} />}
                  label="Health"
                  value="A"
                  color="text-violet-400"
                />
              </div>

              <div className="space-y-2">
                {[
                  { name: "next-dev", status: "healthy", cpu: "4.2%", mem: "320 MB" },
                  { name: "postgres", status: "healthy", cpu: "1.1%", mem: "180 MB" },
                  { name: "redis", status: "healthy", cpu: "0.3%", mem: "45 MB" },
                  { name: "shopify-mcp", status: "warning", cpu: "12.8%", mem: "890 MB" },
                ].map((s) => (
                  <div
                    key={s.name}
                    className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-zinc-900/50 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          s.status === "healthy"
                            ? "bg-emerald-400"
                            : "bg-amber-400"
                        }`}
                      />
                      <span className="font-mono text-zinc-300">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-6 text-zinc-500">
                      <span>{s.cpu}</span>
                      <span>{s.mem}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-12"
        >
          <a href="#features" className="inline-flex text-zinc-600 hover:text-zinc-400 transition-colors">
            <ArrowDown size={20} className="animate-bounce" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-lg bg-zinc-900/50 p-4">
      <div className="flex items-center gap-2 text-zinc-500 text-xs mb-2">
        {icon}
        {label}
      </div>
      <div className={`text-2xl font-bold font-mono ${color}`}>{value}</div>
    </div>
  );
}
