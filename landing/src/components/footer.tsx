import { GitBranch } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-zinc-800/50 py-12 px-6">
      <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <span className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-xs text-white font-bold">
            O
          </span>
          Orchestra &copy; {new Date().getFullYear()}
        </div>

        <div className="flex items-center gap-8 text-sm text-zinc-500">
          <a href="#features" className="hover:text-zinc-300 transition-colors">
            Features
          </a>
          <a href="#pricing" className="hover:text-zinc-300 transition-colors">
            Pricing
          </a>
          <a
            href="https://github.com/orchestra-dev/orchestra"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-300 transition-colors"
          >
            <GitBranch size={16} />
          </a>
        </div>
      </div>
    </footer>
  );
}
