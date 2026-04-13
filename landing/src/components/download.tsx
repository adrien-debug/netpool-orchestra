"use client";

import { motion } from "framer-motion";
import { Apple, Monitor, Download as DownloadIcon } from "lucide-react";

const platforms = [
  {
    icon: <Apple size={24} />,
    name: "macOS",
    detail: "Universal (Intel + Apple Silicon)",
    file: "Orchestra-0.1.0.dmg",
    available: true,
  },
  {
    icon: <Monitor size={24} />,
    name: "Windows",
    detail: "Windows 10+ (64-bit)",
    file: "Orchestra-Setup-0.1.0.exe",
    available: true,
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a7.14 7.14 0 0 0 .067.461c.625 3.396 3.833 5.2 7.132 5.19 3.3.01 6.507-1.794 7.132-5.19.024-.153.046-.307.067-.461.123-.805-.009-1.657-.287-2.489-.589-1.771-1.831-3.47-2.716-4.521-.75-1.067-.974-1.928-1.05-3.02-.065-1.491 1.056-5.965-3.17-6.298A5.095 5.095 0 0 0 12.504 0z" />
      </svg>
    ),
    name: "Linux",
    detail: "AppImage / .deb (64-bit)",
    file: "Orchestra-0.1.0.AppImage",
    available: true,
  },
];

export function Download() {
  return (
    <section id="download" className="py-32 px-6 relative">
      <div className="absolute inset-0 bg-gradient-to-t from-indigo-950/20 via-transparent to-transparent" />

      <div className="relative mx-auto max-w-4xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <p className="text-sm font-medium text-indigo-400 mb-3 uppercase tracking-widest">
            Download
          </p>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Get Orchestra
            <br />
            <span className="gradient-text">for your platform</span>
          </h2>
          <p className="text-zinc-400 max-w-xl mx-auto mb-12">
            Free to download. No account required. Upgrade to Pro anytime from
            within the app.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {platforms.map((p, i) => (
            <motion.a
              key={p.name}
              href={`/releases/${p.file}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group rounded-2xl glass p-8 flex flex-col items-center gap-4 hover:bg-white/[0.04] transition-all cursor-pointer"
            >
              <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-300 group-hover:text-indigo-400 transition-colors">
                {p.icon}
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">{p.name}</h3>
                <p className="text-xs text-zinc-500">{p.detail}</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-indigo-400 group-hover:text-indigo-300 transition-colors">
                <DownloadIcon size={14} />
                Download
              </div>
            </motion.a>
          ))}
        </div>

        <p className="text-xs text-zinc-600 mt-8">
          v0.1.0 &middot; Requires macOS 12+, Windows 10+, or Ubuntu 20.04+
        </p>
      </div>
    </section>
  );
}
