// Reference: Manousaki D et al. (PMC5114347) — Normative lumbar spine DXA data, children 0–5 years
// L=0 LMS model: Z = ln(X / M) / S
// Kroger vBMD: BMAD = aBMD × 4 / (π × Width), Width = 椎体横幅
// Carter vBMD: BMAD = aBMD / √Area = BMC / Area^1.5

export type Sex = "male" | "female";
export type Parameter = "areal_bmd" | "bmc" | "vbmd_kroger" | "vbmd_carter" | "area";

export interface ParamMeta {
  label: string;
  unit: string;
  description: string;
  step: number;
  min: number;
  defaultVal: number;
}

export const PARAM_META: Record<Parameter, ParamMeta> = {
  areal_bmd: {
    label: "aBMD",
    unit: "g/cm²",
    description: "面積骨密度（L2–L4）",
    step: 0.001,
    min: 0.1,
    defaultVal: 0.35,
  },
  bmc: {
    label: "BMC",
    unit: "g",
    description: "骨塩量（L2–L4）",
    step: 0.1,
    min: 0.1,
    defaultVal: 3.0,
  },
  vbmd_kroger: {
    label: "vBMD Kroger法",
    unit: "g/cm³",
    description: "体積骨密度・Kroger法（L2–L4）",
    step: 0.001,
    min: 0.01,
    defaultVal: 0.22,
  },
  vbmd_carter: {
    label: "vBMD Carter法",
    unit: "g/cm³",
    description: "体積骨密度・Carter法（L2–L4）",
    step: 0.001,
    min: 0.01,
    defaultVal: 0.12,
  },
  area: {
    label: "Area",
    unit: "cm²",
    description: "椎体面積（L2–L4）",
    step: 0.1,
    min: 1,
    defaultVal: 8.0,
  },
};

export interface RefValues {
  M: number;
  S: number;
}

/**
 * Returns age-specific mean (M) and coefficient of variation (S) for L=0 LMS model.
 * age: decimal years, 0–5
 */
export function getReferenceValues(sex: Sex, param: Parameter, age: number): RefValues {
  const a = age;
  const a2 = a * a;
  const a3 = a2 * a;

  if (sex === "male") {
    switch (param) {
      case "areal_bmd":
        return { M: 0.289 + 0.0869 * a - 0.00446 * a2, S: 0.131 - 0.01065 * a };
      case "bmc":
        return { M: 1.69 + 1.99 * a, S: 0.227 - 0.0225 * a };
      case "vbmd_kroger":
        return { M: 0.218 - 0.0417 * a + 0.0303 * a2 - 0.0043 * a3, S: 0.134 - 0.00767 * a };
      case "vbmd_carter":
        return { M: 0.113 - 0.0334 * a + 0.021 * a2 - 0.00294 * a3, S: 0.113 - 0.00343 * a };
      case "area":
        return { M: 5.93 + 4.27 * a - 0.37 * a2, S: 0.127 - 0.00795 * a };
    }
  } else {
    switch (param) {
      case "areal_bmd":
        return { M: 0.291 + 0.105 * a - 0.0049 * a2, S: 0.084 - 0.00566 * a };
      case "bmc":
        return { M: 1.60 + 2.23 * a, S: 0.141 - 0.00142 * a };
      case "vbmd_kroger":
        return { M: 0.219 - 0.00652 * a + 0.0111 * a2 - 0.00125 * a3, S: 0.084 - 0.00735 * a };
      case "vbmd_carter":
        return { M: 0.124 - 0.00454 * a + 0.00606 * a2 - 0.00075 * a3, S: 0.076 - 0.00643 * a };
      case "area":
        return { M: 5.68 + 4.29 * a - 0.374 * a2, S: 0.081 - 0.00087 * a };
    }
  }
}

/** Z = ln(measured / M) / S  (L=0 LMS) */
export function calcZScore(measured: number, M: number, S: number): number {
  return Math.log(measured / M) / S;
}

/** Value at given Z: X = M × exp(Z × S) */
export function zToValue(z: number, M: number, S: number): number {
  return M * Math.exp(z * S);
}
