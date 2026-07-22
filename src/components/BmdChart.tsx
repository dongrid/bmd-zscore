"use client";

import { useMemo } from "react";
import { getReferenceValues } from "@/lib/bmd";
import type { Sex, Parameter } from "@/lib/bmd";

export interface ChartPoint {
  age: number;
  value: number | null;
  z: number | null;
  label: string;
  color: string;
}

interface Props {
  sex: Sex;
  parameter: Parameter;
  ageYears: number | null;
  measuredValue: number | null;
  zScore: number | null;
  additionalPoints?: ChartPoint[];
  onPointClick?: (label: string) => void;
  selectedLabel?: string | null;
}

const CHART = {
  vb: { w: 620, h: 380 },
  pad: { top: 24, right: 56, bottom: 48, left: 60 },
} as const;

const plotW = CHART.vb.w - CHART.pad.left - CHART.pad.right;
const plotH = CHART.vb.h - CHART.pad.top - CHART.pad.bottom;
const plotX0 = CHART.pad.left;
const plotY0 = CHART.pad.top;
const plotX1 = plotX0 + plotW;
const plotY1 = plotY0 + plotH;

const AGE_MAX = 5;
const N_POINTS = 200;

function toPath(pts: { x: number; y: number }[]): string {
  return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
}

function toBandPath(
  top: { x: number; y: number }[],
  bot: { x: number; y: number }[]
): string {
  const fwd = toPath(top);
  const rev = [...bot].reverse().map((p) => `L${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
  return `${fwd} ${rev} Z`;
}

export default function BmdChart({ sex, parameter, ageYears, measuredValue, zScore, additionalPoints = [], onPointClick, selectedLabel }: Props) {
  const { curves, toX, toY, yTicks, xTicks } = useMemo(() => {
    const ages = Array.from({ length: N_POINTS + 1 }, (_, i) => (i / N_POINTS) * AGE_MAX);

    const curveData = ages.map((age) => {
      const { M, S } = getReferenceValues(sex, parameter, age);
      return {
        age,
        m2: M * Math.exp(-2 * S),
        m1: M * Math.exp(-S),
        mean: M,
        p1: M * Math.exp(S),
        p2: M * Math.exp(2 * S),
      };
    });

    const allVals = curveData.flatMap((c) => [c.m2, c.p2]);
    if (measuredValue !== null) allVals.push(measuredValue);
    for (const p of additionalPoints) {
      if (p.value !== null) allVals.push(p.value);
    }

    const rawMin = Math.min(...allVals);
    const rawMax = Math.max(...allVals);
    const pad = (rawMax - rawMin) * 0.08;
    const yMin = rawMin - pad;
    const yMax = rawMax + pad;

    const toX = (age: number) => plotX0 + (age / AGE_MAX) * plotW;
    const toY = (val: number) => plotY1 - ((val - yMin) / (yMax - yMin)) * plotH;

    const yStep = (yMax - yMin) / 5;
    const yTicks = Array.from({ length: 6 }, (_, i) => yMin + yStep * i);
    const xTicks = [0, 1, 2, 3, 4, 5];

    return { curves: curveData, toX, toY, yTicks, xTicks };
  }, [sex, parameter, measuredValue, additionalPoints]);

  const pathFor = (key: "m2" | "m1" | "mean" | "p1" | "p2") =>
    toPath(curves.map((c) => ({ x: toX(c.age), y: toY(c[key]) })));

  const patientX = ageYears !== null ? toX(ageYears) : null;
  const patientY = measuredValue !== null ? toY(measuredValue) : null;
  const hasMultiple = additionalPoints.length > 0;

  // Collect all valid points and sort by age to draw connecting line
  const connectLine = useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    if (ageYears !== null && measuredValue !== null && ageYears >= 0 && ageYears < AGE_MAX) {
      pts.push({ x: toX(ageYears), y: toY(measuredValue) });
    }
    for (const p of additionalPoints) {
      if (p.value !== null && p.age >= 0 && p.age < AGE_MAX) {
        pts.push({ x: toX(p.age), y: toY(p.value) });
      }
    }
    pts.sort((a, b) => a.x - b.x);
    return pts.length >= 2 ? toPath(pts) : null;
  }, [ageYears, measuredValue, additionalPoints, toX, toY]);

  const gridColor = "rgba(100,116,139,0.2)";
  const axisColor = "#94a3b8";
  const textColor = "#64748b";

  return (
    <svg
      viewBox={`0 0 ${CHART.vb.w} ${CHART.vb.h}`}
      className="w-full h-auto"
      aria-label="骨密度標準曲線"
    >
      {/* Grid lines */}
      {yTicks.map((val, i) => (
        <line key={i} x1={plotX0} y1={toY(val)} x2={plotX1} y2={toY(val)} stroke={gridColor} strokeWidth={1} />
      ))}
      {xTicks.map((age) => (
        <line key={age} x1={toX(age)} y1={plotY0} x2={toX(age)} y2={plotY1} stroke={gridColor} strokeWidth={1} />
      ))}

      {/* ±1 SD filled band — green (normal range) */}
      <path
        d={toBandPath(
          curves.map((c) => ({ x: toX(c.age), y: toY(c.p1) })),
          curves.map((c) => ({ x: toX(c.age), y: toY(c.m1) }))
        )}
        fill="rgba(34,197,94,0.12)"
        stroke="none"
      />

      {/* ±1–2 SD strips — amber */}
      <path
        d={toBandPath(
          curves.map((c) => ({ x: toX(c.age), y: toY(c.p2) })),
          curves.map((c) => ({ x: toX(c.age), y: toY(c.p1) }))
        )}
        fill="rgba(245,158,11,0.15)"
        stroke="none"
      />
      <path
        d={toBandPath(
          curves.map((c) => ({ x: toX(c.age), y: toY(c.m1) })),
          curves.map((c) => ({ x: toX(c.age), y: toY(c.m2) }))
        )}
        fill="rgba(245,158,11,0.15)"
        stroke="none"
      />

      {/* Beyond ±2 SD — subtle red */}
      <path
        d={toBandPath(
          curves.map((c) => ({ x: toX(c.age), y: plotY0 })),
          curves.map((c) => ({ x: toX(c.age), y: toY(c.p2) }))
        )}
        fill="rgba(239,68,68,0.07)"
        stroke="none"
      />
      <path
        d={toBandPath(
          curves.map((c) => ({ x: toX(c.age), y: toY(c.m2) })),
          curves.map((c) => ({ x: toX(c.age), y: plotY1 }))
        )}
        fill="rgba(239,68,68,0.07)"
        stroke="none"
      />

      {/* Reference curves */}
      <path d={pathFor("m2")} fill="none" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="5,3" />
      <path d={pathFor("m1")} fill="none" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4,2" />
      <path d={pathFor("mean")} fill="none" stroke="#22c55e" strokeWidth={2} />
      <path d={pathFor("p1")} fill="none" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4,2" />
      <path d={pathFor("p2")} fill="none" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="5,3" />

      {/* Curve labels at right edge */}
      {[
        { key: "p2" as const, label: "+2 SD", color: "#ef4444" },
        { key: "p1" as const, label: "+1 SD", color: "#f59e0b" },
        { key: "mean" as const, label: "Mean", color: "#22c55e" },
        { key: "m1" as const, label: "−1 SD", color: "#f59e0b" },
        { key: "m2" as const, label: "−2 SD", color: "#ef4444" },
      ].map(({ key, label, color }) => {
        const last = curves[curves.length - 1];
        const y = toY(last[key]);
        return (
          <text key={key} x={plotX1 + 4} y={y + 4} fontSize={9} fill={color} fontWeight={500}>
            {label}
          </text>
        );
      })}

      {/* Connecting line between all patient points */}
      {connectLine && (
        <path d={connectLine} fill="none" stroke="#3b82f6" strokeWidth={1.5} opacity={0.6} />
      )}

      {/* Additional points (drawn before main so main appears on top) */}
      {additionalPoints.map((pt) => {
        if (pt.value === null || pt.age < 0 || pt.age >= AGE_MAX) return null;
        const cx = toX(pt.age);
        const cy = toY(pt.value);
        const isSelected = selectedLabel === pt.label;
        return (
          <g key={pt.label} onClick={() => onPointClick?.(pt.label)} style={{ cursor: onPointClick ? "pointer" : undefined }}>
            <circle cx={cx} cy={cy} r={14} fill="transparent" />
            <circle cx={cx} cy={cy} r={isSelected ? 7 : 5} fill="#3b82f6" stroke="white" strokeWidth={isSelected ? 3 : 2} />
            <text x={cx + 8} y={cy - 6} fontSize={10} fontWeight={700} fill="#3b82f6">
              {pt.label}
            </text>
            {pt.z !== null && (
              <text x={cx + 8} y={cy + 6} fontSize={9} fill="#3b82f6">
                Z={pt.z >= 0 ? "+" : ""}{pt.z.toFixed(2)}
              </text>
            )}
          </g>
        );
      })}

      {/* Main patient point */}
      {patientX !== null && patientY !== null && (
        <g onClick={() => onPointClick?.("1")} style={{ cursor: onPointClick ? "pointer" : undefined }}>
          <circle cx={patientX} cy={patientY} r={14} fill="transparent" />
          <circle cx={patientX} cy={patientY} r={selectedLabel === "1" || selectedLabel == null ? 7 : 5} fill="#3b82f6" stroke="white" strokeWidth={selectedLabel === "1" || selectedLabel == null ? 3 : 2} />
          {hasMultiple && (
            <text x={patientX + 8} y={patientY - 6} fontSize={10} fontWeight={700} fill="#3b82f6">
              1
            </text>
          )}
          {zScore !== null && (
            <text
              x={hasMultiple ? patientX + 8 : patientX}
              y={hasMultiple ? patientY + 6 : patientY - 10}
              textAnchor={hasMultiple ? "start" : "middle"}
              fontSize={hasMultiple ? 9 : 11}
              fontWeight={700}
              fill="#3b82f6"
            >
              Z={zScore >= 0 ? "+" : ""}{zScore.toFixed(2)}
            </text>
          )}
        </g>
      )}

      {/* Axes */}
      <line x1={plotX0} y1={plotY0} x2={plotX0} y2={plotY1} stroke={axisColor} strokeWidth={1} />
      <line x1={plotX0} y1={plotY1} x2={plotX1} y2={plotY1} stroke={axisColor} strokeWidth={1} />

      {/* X axis ticks and labels */}
      {xTicks.map((age) => (
        <g key={age}>
          <line x1={toX(age)} y1={plotY1} x2={toX(age)} y2={plotY1 + 4} stroke={axisColor} strokeWidth={1} />
          <text x={toX(age)} y={plotY1 + 16} textAnchor="middle" fontSize={11} fill={textColor}>
            {age}
          </text>
        </g>
      ))}
      <text x={plotX0 + plotW / 2} y={CHART.vb.h - 6} textAnchor="middle" fontSize={11} fill={textColor}>
        年齢（歳）
      </text>

      {/* Y axis ticks and labels */}
      {yTicks.map((val, i) => (
        <g key={i}>
          <line x1={plotX0 - 4} y1={toY(val)} x2={plotX0} y2={toY(val)} stroke={axisColor} strokeWidth={1} />
          <text x={plotX0 - 8} y={toY(val) + 4} textAnchor="end" fontSize={10} fill={textColor}>
            {val.toFixed(val < 10 ? 3 : 1)}
          </text>
        </g>
      ))}
    </svg>
  );
}
