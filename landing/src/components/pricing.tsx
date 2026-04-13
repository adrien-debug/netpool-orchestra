"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for solo developers getting started.",
    features: [
      "System monitoring dashboard",
      "Port & process scanning",
      "Duplicate detection",
      "One-click actions",
      "CLI (devctl)",
    ],
    cta: "Download Free",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$12",
    period: "/month",
    description: "For developers who want AI-powered automation.",
    features: [
      "Everything in Free",
      "All 5 AI agents",
      "Chat advisor (GPT-4o, Claude, local)",
      "Multi-machine config sync",
      "30-day metrics history",
      "Priority support",
    ],
    cta: "Start Pro Trial",
    highlighted: true,
  },
  {
    name: "Team",
    price: "$29",
    period: "/seat/month",
    description: "Shared configs and team-wide visibility.",
    features: [
      "Everything in Pro",
      "Team dashboard",
      "Shared configurations",
      "Role-based access",
      "Usage analytics",
      "Dedicated support",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-32 px-6">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <p className="text-sm font-medium text-indigo-400 mb-3 uppercase tracking-widest">
            Pricing
          </p>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Free to start,
            <br />
            <span className="gradient-text">powerful to scale</span>
          </h2>
          <p className="text-zinc-400 max-w-xl mx-auto">
            The dashboard is free forever. Upgrade for AI agents, chat, and
            cross-machine sync.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`rounded-2xl p-8 flex flex-col ${
                p.highlighted
                  ? "bg-gradient-to-b from-indigo-600/20 to-transparent border border-indigo-500/30 glow"
                  : "glass"
              }`}
            >
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-1">{p.name}</h3>
                <p className="text-sm text-zinc-500">{p.description}</p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold">{p.price}</span>
                <span className="text-zinc-500 text-sm ml-1">{p.period}</span>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <Check
                      size={16}
                      className={`mt-0.5 shrink-0 ${
                        p.highlighted ? "text-indigo-400" : "text-zinc-500"
                      }`}
                    />
                    <span className="text-zinc-300">{f}</span>
                  </li>
                ))}
              </ul>

              <a
                href="#download"
                className={`block text-center py-3 rounded-xl font-medium text-sm transition-all ${
                  p.highlighted
                    ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                    : "glass hover:bg-white/5 text-zinc-300"
                }`}
              >
                {p.cta}
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
