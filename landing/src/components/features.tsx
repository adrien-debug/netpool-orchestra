"use client";

import { motion } from "framer-motion";
import {
  Activity,
  Gauge,
  Terminal,
  Zap,
  Eye,
  Lock,
} from "lucide-react";

const features = [
  {
    icon: <Activity size={24} />,
    title: "Live System Monitor",
    description:
      "Real-time visibility into processes, ports, CPU, RAM, and Docker containers. Know exactly what's running on your machine.",
  },
  {
    icon: <Zap size={24} />,
    title: "One-Click Actions",
    description:
      "Start, stop, restart services. Free stuck ports. Clean duplicates. Switch profiles. All in one click.",
  },
  {
    icon: <Eye size={24} />,
    title: "Proactive Detection",
    description:
      "AI agents detect issues before they crash your stack. RAM leaks, port conflicts, zombie processes — caught early.",
  },
  {
    icon: <Gauge size={24} />,
    title: "Health Scoring",
    description:
      "A global health score (A–F) computed from CPU, RAM, service health, and conflicts. See your machine's fitness at a glance.",
  },
  {
    icon: <Terminal size={24} />,
    title: "AI Chat Assistant",
    description:
      "Ask Orchestra anything about your system. It understands context, explains issues, and executes fixes via natural language.",
  },
  {
    icon: <Lock size={24} />,
    title: "Secure by Design",
    description:
      "API keys in OS keychain. System data never leaves your machine. Privacy-first architecture, zero telemetry by default.",
  },
];

export function Features() {
  return (
    <section id="features" className="py-32 px-6">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <p className="text-sm font-medium text-indigo-400 mb-3 uppercase tracking-widest">
            Features
          </p>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Everything you need to
            <br />
            <span className="gradient-text">master your machine</span>
          </h2>
          <p className="text-zinc-400 max-w-xl mx-auto">
            From passive monitoring to intelligent automation. Orchestra grows
            with your workflow.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group rounded-2xl glass p-8 hover:bg-white/[0.04] transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-indigo-600/10 flex items-center justify-center text-indigo-400 mb-5 group-hover:bg-indigo-600/20 transition-colors">
                {f.icon}
              </div>
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                {f.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
