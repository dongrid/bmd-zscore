"use client";

import { useState, useMemo } from "react";
import AppShell from "@/components/AppShell";
import BmdChart from "@/components/BmdChart";
import {
  getReferenceValues,
  calcZScore,
  zToValue,
  PARAM_META,
  type Sex,
  type Parameter,
} from "@/lib/bmd";

const PARAMETERS: Parameter[] = ["areal_bmd", "bmc", "vbmd_kroger", "vbmd_carter", "area"];

function zColor(z: number): string {
  const abs = Math.abs(z);
  if (abs <= 1) return "text-emerald-600 dark:text-emerald-400";
  if (abs <= 2) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function zInterpret(z: number): string {
  if (z < -2) return "低値（−2 SD 未満）";
  if (z < -1) return "やや低値（−2〜−1 SD）";
  if (z <= 1) return "正常範囲（±1 SD 以内）";
  if (z <= 2) return "やや高値（+1〜+2 SD）";
  return "高値（+2 SD 超）";
}

const inputCls =
  "w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

function parsePositive(s: string): number | null {
  if (s === "") return null;
  const n = parseFloat(s);
  return !isNaN(n) && n > 0 ? n : null;
}

export default function Home() {
  const [sex, setSex] = useState<Sex>("male");
  const [ageMode, setAgeMode] = useState<"simple" | "exact">("simple");
  const [ageYear, setAgeYear] = useState<number>(0);
  const [ageMonth, setAgeMonth] = useState<number>(6);
  const [birthDate, setBirthDate] = useState<string>("");
  const [measureDate, setMeasureDate] = useState<string>(
    () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" })
  );
  const [abmdInput, setAbmdInput] = useState<string>("");
  const [bmcInput, setBmcInput] = useState<string>("");
  const [areaInput, setAreaInput] = useState<string>("");
  const [widthInput, setWidthInput] = useState<string>("");
  const [chartParam, setChartParam] = useState<Parameter>("areal_bmd");

  const ageDecimal = useMemo((): number | null => {
    if (ageMode === "exact") {
      if (!birthDate) return null;
      const ms = new Date(measureDate).getTime() - new Date(birthDate).getTime();
      const days = ms / (1000 * 60 * 60 * 24);
      return Math.max(0, days / 365.25);
    }
    return ageYear + ageMonth / 12;
  }, [ageMode, ageYear, ageMonth, birthDate, measureDate]);

  const ageOutOfRange = ageDecimal !== null && ageDecimal > 5;

  const { results, vbmdCarter, vbmdKroger, carterFormula } = useMemo(() => {
    const abmd = parsePositive(abmdInput);
    const bmc = parsePositive(bmcInput);
    const area = parsePositive(areaInput);
    const width = parsePositive(widthInput);

    // Carter (1992) 原式: BMC / Area^1.5 を優先、BMC未入力時は aBMD / √Area
    const vbmdCarter =
      bmc !== null && area !== null
        ? bmc / Math.pow(area, 1.5)
        : abmd !== null && area !== null
        ? abmd / Math.sqrt(area)
        : null;

    const carterFormula =
      bmc !== null && area !== null ? "BMC / Area^1.5" :
      abmd !== null && area !== null ? "aBMD / √Area" : null;

    const vbmdKroger =
      abmd !== null && width !== null
        ? (abmd * 4) / (Math.PI * width)
        : null;

    const measuredVals: Record<Parameter, number | null> = {
      areal_bmd: abmd,
      bmc: bmc,
      vbmd_kroger: vbmdKroger,
      vbmd_carter: vbmdCarter,
      area: area,
    };

    const age = ageDecimal ?? 0;
    const results = PARAMETERS.map((param) => {
      const { M, S } = getReferenceValues(sex, param, age);
      const val = measuredVals[param];
      const z = val !== null && S > 0 && ageDecimal !== null && !ageOutOfRange
        ? calcZScore(val, M, S)
        : null;
      return { param, val, M, S, z };
    });

    return { results, vbmdCarter, vbmdKroger, carterFormula };
  }, [sex, ageDecimal, ageOutOfRange, abmdInput, bmcInput, areaInput, widthInput]);

  const chartResult = results.find((r) => r.param === chartParam)!;

  return (
    <AppShell
      title="骨密度 Z スコア"
      subtitle="小児腰椎骨密度（L2–L4 DXA）参照曲線 — 0〜5 歳 | Lunar Prodigy"
      maxWidth="6xl"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
        {/* Left: inputs */}
        <div className="flex flex-col gap-4">
          {/* Sex */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">性別</p>
            <div className="flex gap-2">
              {(["male", "female"] as Sex[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSex(s)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    sex === s
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                  }`}
                >
                  {s === "male" ? "男児" : "女児"}
                </button>
              ))}
            </div>
          </div>

          {/* Age */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">年齢（0〜5 歳）</p>
            {/* Mode toggle */}
            <div className="flex gap-2 mb-3">
              {(["simple", "exact"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setAgeMode(mode)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    ageMode === mode
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                  }`}
                >
                  {mode === "simple" ? "年・月で入力" : "生年月日から計算"}
                </button>
              ))}
            </div>

            {ageMode === "simple" ? (
              <div className="flex gap-3 items-center">
                <div className="flex-1">
                  <label className="text-xs text-slate-400 dark:text-slate-500 mb-1 block">年</label>
                  <select value={ageYear} onChange={(e) => setAgeYear(Number(e.target.value))} className={inputCls}>
                    {[0, 1, 2, 3, 4].map((y) => (
                      <option key={y} value={y}>{y} 歳</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-slate-400 dark:text-slate-500 mb-1 block">か月</label>
                  <select value={ageMonth} onChange={(e) => setAgeMonth(Number(e.target.value))} className={inputCls}>
                    {Array.from({ length: 12 }, (_, i) => i).map((m) => (
                      <option key={m} value={m} disabled={ageYear === 4 && m > 11}>{m} か月</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div>
                  <label className="text-xs text-slate-400 dark:text-slate-500 mb-1 block">生年月日</label>
                  <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-slate-400 dark:text-slate-500 mb-1 block">測定日</label>
                  <input type="date" value={measureDate} onChange={(e) => setMeasureDate(e.target.value)} className={inputCls} />
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  (測定日 − 生年月日) ÷ 365.25
                </p>
              </div>
            )}

            {ageDecimal === null && ageMode === "exact" && (
              <p className="mt-2 text-xs text-amber-500">生年月日を入力してください</p>
            )}
            {ageOutOfRange && (
              <p className="mt-2 text-xs text-red-500 font-medium">対象年齢範囲外です（0〜5 歳のみ）</p>
            )}
            {ageDecimal !== null && !ageOutOfRange && (
              <p className="mt-2 text-xs text-slate-400 dark:text-slate-500 text-right">
                {ageDecimal.toFixed(3)} 歳
              </p>
            )}
          </div>

          {/* Measurements */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">DXA 測定値（L2–L4）</p>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-slate-400 dark:text-slate-500 mb-1 block">Areal BMD (g/cm²)</label>
                <input type="number" value={abmdInput} onChange={(e) => setAbmdInput(e.target.value)}
                  placeholder="0.35" step={0.001} min={0} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-slate-400 dark:text-slate-500 mb-1 block">BMC (g)</label>
                <input type="number" value={bmcInput} onChange={(e) => setBmcInput(e.target.value)}
                  placeholder="3.0" step={0.1} min={0} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-slate-400 dark:text-slate-500 mb-1 block">Area (cm²)</label>
                <input type="number" value={areaInput} onChange={(e) => setAreaInput(e.target.value)}
                  placeholder="8.0" step={0.1} min={0} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-slate-400 dark:text-slate-500 mb-1 block">
                  Width — L2–L4 平均横幅 (cm)
                  <span className="ml-1 text-slate-300 dark:text-slate-600">[Kroger法]</span>
                </label>
                <input type="number" value={widthInput} onChange={(e) => setWidthInput(e.target.value)}
                  placeholder="2.5" step={0.01} min={0} className={inputCls} />
              </div>
            </div>

            {/* Derived vBMD values */}
            {(vbmdCarter !== null || vbmdKroger !== null) && (
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex flex-col gap-1">
                {vbmdKroger !== null && (
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    vBMD (Kroger) ={" "}
                    <span className="text-slate-700 dark:text-slate-300">{vbmdKroger.toFixed(4)} g/cm³</span>
                  </p>
                )}
                {vbmdCarter !== null && (
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    vBMD (Carter) ={" "}
                    <span className="text-slate-700 dark:text-slate-300">{vbmdCarter.toFixed(4)} g/cm³</span>
                    {carterFormula && (
                      <span className="ml-1 text-slate-400 dark:text-slate-500 font-sans">({carterFormula})</span>
                    )}
                  </p>
                )}
              </div>
            )}

            {/* vBMD formula note */}
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex flex-col gap-1.5 text-xs text-slate-400 dark:text-slate-500">
              <p className="font-mono">Kroger: aBMD × 4 / (π × Width)</p>
              <p className="font-mono">Carter: aBMD / √Area = BMC / Area^1.5</p>
              <p className="mt-0.5 leading-relaxed">
                論文（Manousaki 2016）では Lunar Prodigy の標準として
                Kroger 法を使用。Carter 法は参照式のみ掲載。
              </p>
            </div>
          </div>

          {/* Z-score summary */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">
              Z スコア一覧
              <span className="ml-1 font-normal text-slate-400 dark:text-slate-500">（クリックでグラフ切替）</span>
            </p>
            <div className="flex flex-col gap-1.5">
              {results.map(({ param, val, z }) => (
                <button
                  key={param}
                  onClick={() => setChartParam(param)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                    chartParam === param
                      ? "bg-blue-50 dark:bg-blue-950 border border-blue-400 dark:border-blue-500"
                      : "hover:bg-slate-50 dark:hover:bg-slate-700 border border-transparent"
                  }`}
                >
                  <span className="text-slate-600 dark:text-slate-300 text-xs">
                    {PARAM_META[param].label}
                  </span>
                  {z !== null ? (
                    <span className={`font-bold font-mono text-sm ${zColor(z)}`}>
                      {z >= 0 ? "+" : ""}{z.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: chart + reference table */}
        <div className="flex flex-col gap-4">
          {/* Chart */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {PARAM_META[chartParam].description} 参照曲線
              </p>
              <div className="flex gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-4 border-t-2 border-emerald-500" />
                  Mean
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-4 border-t-2 border-dashed border-amber-400" />
                  ±1 SD
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-4 border-t-2 border-dashed border-red-400" />
                  ±2 SD
                </span>
                {chartResult.z !== null && (
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500" />
                    患者値
                  </span>
                )}
              </div>
            </div>

            {/* Z result for chart param */}
            {chartResult.z !== null && (
              <div className="mb-3 rounded-xl bg-slate-50 dark:bg-slate-900 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Z スコア</p>
                  <p className={`text-2xl font-bold tabular-nums ${zColor(chartResult.z)}`}>
                    {chartResult.z >= 0 ? "+" : ""}{chartResult.z.toFixed(2)}
                  </p>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    {zInterpret(chartResult.z)}
                  </p>
                </div>
                <div className="text-right text-xs text-slate-400 dark:text-slate-500 font-mono">
                  <p>M = {chartResult.M.toFixed(4)}</p>
                  <p>S = {chartResult.S.toFixed(4)}</p>
                </div>
              </div>
            )}

            <BmdChart
              sex={sex}
              parameter={chartParam}
              ageYears={ageDecimal ?? null}
              measuredValue={chartResult.val}
              zScore={chartResult.z}
            />
            <p className="mt-2 text-right text-xs text-slate-400 dark:text-slate-500">
              参照: Manousaki D et al., <em>J Musculoskelet Neuronal Interact.</em> 2016 (PMCID: PMC5114347)
            </p>
          </div>

          {/* Reference value table */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
              年齢別参照値（{ageDecimal !== null ? `${ageDecimal.toFixed(2)} 歳` : "—"}・{sex === "male" ? "男児" : "女児"}） — {PARAM_META[chartParam].label}
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700">
                  <th className="text-left pb-2 font-medium">Z スコア</th>
                  <th className="text-right pb-2 font-medium">
                    {PARAM_META[chartParam].label} ({PARAM_META[chartParam].unit})
                  </th>
                </tr>
              </thead>
              <tbody>
                {[2, 1.5, 1, 0, -1, -1.5, -2].map((z) => {
                  const val = zToValue(z, chartResult.M, chartResult.S);
                  return (
                    <tr
                      key={z}
                      className={`border-b border-slate-50 dark:border-slate-700/50 ${
                        chartResult.z !== null && Math.abs(chartResult.z - z) < 0.5
                          ? "bg-blue-50 dark:bg-blue-950/30"
                          : ""
                      }`}
                    >
                      <td
                        className={`py-1.5 font-mono font-medium ${
                          z === 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : Math.abs(z) === 2
                            ? "text-red-500"
                            : "text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {z >= 0 ? "+" : ""}{z.toFixed(1)}
                      </td>
                      <td className="py-1.5 text-right font-mono text-slate-700 dark:text-slate-300">
                        {val.toFixed(val < 10 ? 3 : 1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <p className="mt-6 text-xs text-slate-400 dark:text-slate-600 text-center">
        L2–L4 腰椎 DXA データを使用。対象年齢 0〜5 歳。L=0 LMS モデル（対数正規分布）に基づく。
      </p>
    </AppShell>
  );
}
