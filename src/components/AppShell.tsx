"use client";

import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

interface AppShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: "2xl" | "3xl" | "4xl" | "5xl" | "6xl" | "7xl";
}

export default function AppShell({
  title,
  subtitle,
  children,
  maxWidth = "4xl",
}: AppShellProps) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
          )}
        </div>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          aria-label="テーマ切り替え"
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>

      <main className={`flex-1 max-w-${maxWidth} mx-auto w-full px-6 py-8`}>
        {children}
      </main>

      <footer className="px-6 py-6 text-center text-xs text-slate-400 dark:text-slate-600 space-y-1.5">
        <p>本ツールは診療支援目的です。最終判断は必ず医師が行ってください。</p>
        <p className="leading-relaxed">
          Reference: Manousaki D, Rauch F, Chabot G, Dubois J, Fiscaletti M, Alos N.
          Pediatric data for dual X-ray absorptiometric measures of normal lumbar bone mineral density
          in children under 5 years of age using the lunar prodigy densitometer.{" "}
          <em>J Musculoskelet Neuronal Interact.</em> 2016;16(3):247–255. PMID:{" "}
          <a
            href="https://pubmed.ncbi.nlm.nih.gov/27609039/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-slate-500 dark:hover:text-slate-400 transition-colors"
          >
            27609039
          </a>
        </p>
        <p>L=0 LMS モデル（対数正規分布）に基づく。</p>
        <p>aBMD: areal bone mineral density（面積骨密度）· vBMD: volumetric BMD（体積骨密度）</p>
        <p className="font-mono">Kroger: vBMD = aBMD × 4 / (π × Width) · Carter: vBMD = aBMD / √Area = BMC / Area^1.5</p>
      </footer>
    </div>
  );
}
