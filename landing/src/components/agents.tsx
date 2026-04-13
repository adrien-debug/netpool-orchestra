"use client";

import { motion } from "framer-motion";
import { Brain, Shield, Wrench, BarChart3, Compass } from "lucide-react";

const agents = [
  {
    icon: <Brain size={28} />,
    name: "Advisor",
    description:
      "Your AI copilot. Ask it anything — why you have 16 MCP instances, which profile to use, how to optimize your machine. It sees your system in real-time and acts on your behalf.",
    color: "from-violet-500 to-purple-600",
  },
  {
    icon: <Shield size={28} />,
    name: "Preventive",
    description:
      "Watches RAM trends, detects memory leaks, spots crash loops before they escalate. Alerts you 20 minutes before you start swapping.",
    color: "from-emerald-500 to-teal-600",
  },
  {
    icon: <Wrench size={28} />,
    name: "Auto-Fix",
    description:
      "Automatically cleans duplicate processes, kills zombies, restarts degraded services. Circuit breaker + rate limiting for safety.",
    color: "from-amber-500 to-orange-600",
  },
  {
    icon: <BarChart3 size={28} />,
    name: "Performance",
    description:
      "Computes a real-time health score. Identifies top resource consumers. Generates optimization recommendations tailored to your setup.",
    color: "from-blue-500 to-cyan-600",
  },
  {
    icon: <Compass size={28} />,
    name: "Onboarding",
    description:
      "First launch? It scans your machine, detects all projects, and auto-generates your configuration. Zero manual setup required.",
    color: "from-pink-500 to-rose-600",
  },
];

export function Agents() {
  return (
    <section id="agents" className="py-32 px-6 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-950/10 to-transparent" />

      <div className="relative mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <p className="text-sm font-medium text-indigo-400 mb-3 uppercase tracking-widest">
            AI Agents
          </p>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            5 agents that work
            <br />
            <span className="gradient-text">while you code</span>
          </h2>
          <p className="text-zinc-400 max-w-xl mx-auto">
            They monitor, predict, fix and optimize. Running silently in the
            background so you can focus on what matters.
          </p>
        </motion.div>

        <div className="space-y-6">
          {agents.map((a, i) => (
            <motion.div
              key={a.name}
              initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-2xl glass p-8 md:p-10 flex flex-col md:flex-row items-start gap-6 hover:bg-white/[0.04] transition-all"
            >
              <div
                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${a.color} flex items-center justify-center text-white shrink-0`}
              >
                {a.icon}
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">{a.name} Agent</h3>
                <p className="text-zinc-400 leading-relaxed max-w-2xl">
                  {a.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
