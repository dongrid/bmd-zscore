"use client";

import { useMemo } from "react";
import { getReferenceValues } from "@/lib/bmd";
import type { Sex, Parameter } from "@/lib/bmd";

interface Props {
  sex: Sex;
  parameter: Parameter;
  ageYears: number | null;
  measuredValue: number | null;
  zScore: number | null;
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

// Closed band between two curves (top left→right, bottom right→left)
function toBandPath(
  top: { x: number; y: number }[],
  bot: { x: number; y: number }[]
): string {
  const fwd = toPath(top);
  const rev = [...bot].reverse().map((p) => `L${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
  return `${fwd} ${rev} Z`;
}

export default function BmdChart({ sex, parameter, ageYears, measuredValue, zScore }: Props) {
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

    const rawMin = Math.min(...allVals);
    const rawMax = Math.max(...allVals);
    const pad = (rawMax - rawMin) * 0.08;
    const yMin = rawMin - pad;
    const yMax = rawMax + pad;

    const toX = (age: number) => plotX0 + (age / AGE_MAX) * plotW;
    const toY = (val: number) => plotY1 - ((val - yMin) / (yMax - yMin)) * plotH;

    // Y axis ticks: 5 evenly spaced
    const yStep = (yMax - yMin) / 5;
    const yTicks = Array.from({ length: 6 }, (_, i) => yMin + yStep * i);

    // X axis ticks: 0, 1, 2, 3, 4, 5
    const xTicks = [0, 1, 2, 3, 4, 5];

    return { curves: curveData, toX, toY, yTicks, xTicks };
  }, [sex, parameter, measuredValue]);

  const pathFor = (key: "m2" | "m1" | "mean" | "p1" | "p2") =>
    toPath(curves.map((c) => ({ x: toX(c.age), y: toY(c[key]) })));

  const patientX = ageYears !== null ? toX(ageYears) : null;
  const patientY = measuredValue !== null ? toY(measuredValue) : null;

  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");

  const gridColor = "rgba(100,116,139,0.2)";
  const axisColor = "#94a3b8";
  const textColor = "#64748b";

  return (
    <svg
      viewBox={`0 0 ${CHART.vb.w} ${CHART.vb.h}`}
      className="w-full h-auto"
      aria-label="骨密度参照曲線"
    >
      {/* Grid lines */}
      {yTicks.map((val, i) => (
        <line
          key={i}
          x1={plotX0}
          y1={toY(val)}
          x2={plotX1}
          y2={toY(val)}
          stroke={gridColor}
          strokeWidth={1}
        />
      ))}
      {xTicks.map((age) => (
        <line
          key={age}
          x1={toX(age)}
          y1={plotY0}
          x2={toX(age)}
          y2={plotY1}
          stroke={gridColor}
          strokeWidth={1}
        />
      ))}

      {/* ±1 SD filled band (inner) */}
      <path
        d={toBandPath(
          curves.map((c) => ({ x: toX(c.age), y: toY(c.p1) })),
          curves.map((c) => ({ x: toX(c.age), y: toY(c.m1) }))
        )}
        fill="rgba(234,179,8,0.13)"
        stroke="none"
      />

      {/* ±2 SD outer strips (between ±1SD and ±2SD lines only) */}
      <path
        d={toBandPath(
          curves.map((c) => ({ x: toX(c.age), y: toY(c.p2) })),
          curves.map((c) => ({ x: toX(c.age), y: toY(c.p1) }))
        )}
        fill="rgba(239,68,68,0.15)"
        stroke="none"
      />
      <path
        d={toBandPath(
          curves.map((c) => ({ x: toX(c.age), y: toY(c.m1) })),
          curves.map((c) => ({ x: toX(c.age), y: toY(c.m2) }))
        )}
        fill="rgba(239,68,68,0.15)"
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
          <text
            key={key}
            x={plotX1 + 4}
            y={y + 4}
            fontSize={9}
            fill={color}
            fontWeight={500}
          >
            {label}
          </text>
        );
      })}

      {/* Patient point */}
      {patientX !== null && patientY !== null && (
        <g>
          <circle cx={patientX} cy={patientY} r={6} fill="#3b82f6" stroke="white" strokeWidth={2} />
          {zScore !== null && (
            <text
              x={patientX}
              y={patientY - 10}
              textAnchor="middle"
              fontSize={11}
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
      <text
        x={plotX0 + plotW / 2}
        y={CHART.vb.h - 6}
        textAnchor="middle"
        fontSize={11}
        fill={textColor}
      >
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
