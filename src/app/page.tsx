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

export default function Home() {
  const [sex, setSex] = useState<Sex>("male");
  const [ageYear, setAgeYear] = useState<number>(0);
  const [ageMonth, setAgeMonth] = useState<number>(6);
  const [parameter, setParameter] = useState<Parameter>("areal_bmd");
  const [rawInput, setRawInput] = useState<string>("");

  const ageDecimal = ageYear + ageMonth / 12;
  const meta = PARAM_META[parameter];

  const { M, S, zScore, measuredNum } = useMemo(() => {
    const { M, S } = getReferenceValues(sex, parameter, ageDecimal);
    const measuredNum = rawInput !== "" ? parseFloat(rawInput) : null;
    const zScore =
      measuredNum !== null && measuredNum > 0 && !isNaN(measuredNum) && S > 0
        ? calcZScore(measuredNum, M, S)
        : null;
    return { M, S, zScore, measuredNum };
  }, [sex, parameter, ageDecimal, rawInput]);

  const refTable = useMemo(() => {
    if (S <= 0) return null;
    return [-2, -1.5, -1, 0, 1, 1.5, 2].map((z) => ({
      z,
      val: zToValue(z, M, S),
    }));
  }, [M, S]);

  return (
    <AppShell
      title="骨密度 Z スコア"
      subtitle="小児腰椎骨密度（L2–L4 DXA）参照曲線 — 0〜5 歳"
      maxWidth="6xl"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
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
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">
              年齢（0〜5 歳）
            </p>
            <div className="flex gap-3 items-center">
              <div className="flex-1">
                <label className="text-xs text-slate-400 dark:text-slate-500 mb-1 block">年</label>
                <select
                  value={ageYear}
                  onChange={(e) => setAgeYear(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[0, 1, 2, 3, 4].map((y) => (
                    <option key={y} value={y}>
                      {y} 歳
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs text-slate-400 dark:text-slate-500 mb-1 block">か月</label>
                <select
                  value={ageMonth}
                  onChange={(e) => setAgeMonth(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 12 }, (_, i) => i).map((m) => (
                    <option key={m} value={m} disabled={ageYear === 4 && m > 11}>
                      {m} か月
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500 text-right">
              {ageDecimal.toFixed(2)} 歳
            </p>
          </div>

          {/* Parameter */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">測定指標</p>
            <div className="flex flex-col gap-2">
              {PARAMETERS.map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setParameter(p);
                    setRawInput("");
                  }}
                  className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    parameter === p
                      ? "bg-blue-50 dark:bg-blue-950 border border-blue-400 dark:border-blue-500 text-blue-700 dark:text-blue-300"
                      : "border border-transparent hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <span className="font-medium">{PARAM_META[p].label}</span>
                  <span className="text-slate-400 dark:text-slate-500 ml-1 text-xs">
                    ({PARAM_META[p].unit})
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Measurement input */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              {meta.description}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">測定値を入力</p>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder={meta.defaultVal.toString()}
                step={meta.step}
                min={meta.min}
                className="flex-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {meta.unit}
              </span>
            </div>

            {/* Z-score result */}
            {zScore !== null ? (
              <div className="mt-4 rounded-xl bg-slate-50 dark:bg-slate-900 p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Z スコア</p>
                <p className={`text-3xl font-bold tabular-nums ${zColor(zScore)}`}>
                  {zScore >= 0 ? "+" : ""}
                  {zScore.toFixed(2)}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                  {zInterpret(zScore)}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <div>
                    <span className="text-slate-400">M（平均）</span>
                    <span className="ml-1 font-mono text-slate-700 dark:text-slate-300">
                      {M.toFixed(4)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">S（CV）</span>
                    <span className="ml-1 font-mono text-slate-700 dark:text-slate-300">
                      {S.toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              rawInput !== "" && (
                <p className="mt-3 text-xs text-red-500">有効な値を入力してください</p>
              )
            )}
          </div>
        </div>

        {/* Right: chart + reference table */}
        <div className="flex flex-col gap-4">
          {/* Chart */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {meta.description} 参照曲線
              </p>
              <div className="flex gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-4 h-0.5 bg-emerald-500" />
                  Mean
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-4 h-0.5 bg-amber-400" style={{ borderTop: "2px dashed" }} />
                  ±1 SD
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-4 h-0.5 bg-red-400" style={{ borderTop: "2px dashed" }} />
                  ±2 SD
                </span>
                {zScore !== null && (
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500" />
                    患者値
                  </span>
                )}
              </div>
            </div>
            <BmdChart
              sex={sex}
              parameter={parameter}
              ageYears={ageDecimal}
              measuredValue={measuredNum}
              zScore={zScore}
            />
            <p className="mt-2 text-right text-xs text-slate-400 dark:text-slate-500">
              参照: Zulfiqar et al., <em>Radiology Research and Practice</em> 2016 (PMC5114347)
            </p>
          </div>

          {/* Reference value table */}
          {refTable && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
                年齢別参照値（{ageDecimal.toFixed(2)} 歳・{sex === "male" ? "男児" : "女児"}）
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700">
                    <th className="text-left pb-2 font-medium">Z スコア</th>
                    <th className="text-right pb-2 font-medium">
                      {meta.label} ({meta.unit})
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {refTable.map(({ z, val }) => (
                    <tr
                      key={z}
                      className={`border-b border-slate-50 dark:border-slate-700/50 ${
                        zScore !== null && Math.abs(zScore - z) < 0.5
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
                        {z >= 0 ? "+" : ""}
                        {z.toFixed(1)}
                      </td>
                      <td className="py-1.5 text-right font-mono text-slate-700 dark:text-slate-300">
                        {val.toFixed(val < 10 ? 3 : 1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <p className="mt-6 text-xs text-slate-400 dark:text-slate-600 text-center">
        L2–L4 腰椎 DXA データを使用。対象年齢 0〜5 歳。L=0 LMS モデル（対数正規分布）に基づく。
      </p>
    </AppShell>
  );
}
