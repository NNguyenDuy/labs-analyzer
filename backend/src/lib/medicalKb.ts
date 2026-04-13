// ============================================================
// Medical Knowledge Base
// Reference ranges theo WHO, ADA 2024, AACE guidelines
// Dùng trong Agent 2 (Normalizer) để inject vào context
// ============================================================

export interface MedicalReference {
  name_standardized: string;
  aliases: string[];           // tên thường gặp trong PDF
  category: string;
  unit_si: string;
  ref_min_si: number;
  ref_max_si: number;
  unit_common: string;         // đơn vị thông dụng
  ref_min_common: number;
  ref_max_common: number;
  conversion_factor: number;   // common → SI
  severity_thresholds: {
    mild_low?: number;         // dưới mức này là mild low
    moderate_low?: number;
    severe_low?: number;
    mild_high?: number;
    moderate_high?: number;
    severe_high?: number;
  };
  clinical_notes: string;
  source: string;
}

export const MEDICAL_KB: MedicalReference[] = [
  // ─── Glucose ────────────────────────────────────────────────
  {
    name_standardized: "Glucose (Fasting)",
    aliases: ["glucose", "blood sugar", "fasting glucose", "fbs", "gly", "glycémie", "đường huyết", "glucose à jeun"],
    category: "Metabolic",
    unit_si: "mmol/L",
    ref_min_si: 3.9,
    ref_max_si: 5.6,
    unit_common: "mg/dL",
    ref_min_common: 70,
    ref_max_common: 100,
    conversion_factor: 0.0555,
    severity_thresholds: {
      severe_low: 2.8,    // <50 mg/dL
      moderate_low: 3.3,  // <60 mg/dL
      mild_low: 3.9,      // <70 mg/dL
      mild_high: 5.6,     // 100-125 mg/dL (prediabetes)
      moderate_high: 7.0, // 126-199 mg/dL (diabetes threshold)
      severe_high: 11.1,  // >=200 mg/dL
    },
    clinical_notes: "ADA 2024: Fasting <100 mg/dL normal, 100-125 prediabetes, >=126 diabetes (confirm 2x)",
    source: "ADA Standards of Care 2024",
  },

  // ─── HbA1c ──────────────────────────────────────────────────
  {
    name_standardized: "HbA1c",
    aliases: ["hba1c", "hemoglobin a1c", "glycated hemoglobin", "a1c", "hémoglobine glyquée", "hbA1C"],
    category: "Metabolic",
    unit_si: "%",
    ref_min_si: 4.0,
    ref_max_si: 5.6,
    unit_common: "%",
    ref_min_common: 4.0,
    ref_max_common: 5.6,
    conversion_factor: 1,
    severity_thresholds: {
      mild_high: 5.7,    // prediabetes
      moderate_high: 6.5, // diabetes
      severe_high: 9.0,  // poorly controlled
    },
    clinical_notes: "ADA: <5.7% normal, 5.7-6.4% prediabetes, >=6.5% diabetes",
    source: "ADA Standards of Care 2024",
  },

  // ─── Total Cholesterol ──────────────────────────────────────
  {
    name_standardized: "Total Cholesterol",
    aliases: ["cholesterol", "total cholesterol", "tc", "cholestérol total", "cholesterol toàn phần"],
    category: "Lipid",
    unit_si: "mmol/L",
    ref_min_si: 0,
    ref_max_si: 5.17,
    unit_common: "mg/dL",
    ref_min_common: 0,
    ref_max_common: 200,
    conversion_factor: 0.02586,
    severity_thresholds: {
      mild_high: 5.17,   // 200 mg/dL
      moderate_high: 6.2, // 240 mg/dL
      severe_high: 7.75,
    },
    clinical_notes: "Desirable <200, Borderline 200-239, High >=240 mg/dL",
    source: "ACC/AHA 2019",
  },

  // ─── LDL ────────────────────────────────────────────────────
  {
    name_standardized: "LDL Cholesterol",
    aliases: ["ldl", "ldl cholesterol", "ldl-c", "low density lipoprotein", "cholestérol ldl"],
    category: "Lipid",
    unit_si: "mmol/L",
    ref_min_si: 0,
    ref_max_si: 2.59,
    unit_common: "mg/dL",
    ref_min_common: 0,
    ref_max_common: 100,
    conversion_factor: 0.02586,
    severity_thresholds: {
      mild_high: 2.59,   // 100 mg/dL
      moderate_high: 3.37, // 130 mg/dL
      severe_high: 4.14, // 160 mg/dL
    },
    clinical_notes: "Optimal <100, Near optimal 100-129, Borderline 130-159, High >=160 mg/dL",
    source: "ACC/AHA 2019",
  },

  // ─── HDL ────────────────────────────────────────────────────
  {
    name_standardized: "HDL Cholesterol",
    aliases: ["hdl", "hdl cholesterol", "hdl-c", "high density lipoprotein"],
    category: "Lipid",
    unit_si: "mmol/L",
    ref_min_si: 1.03,
    ref_max_si: 99,
    unit_common: "mg/dL",
    ref_min_common: 40,
    ref_max_common: 9999,
    conversion_factor: 0.02586,
    severity_thresholds: {
      severe_low: 0.78,
      moderate_low: 0.91,
      mild_low: 1.03,
    },
    clinical_notes: "Low (<40 mg/dL men, <50 women) = CV risk factor. High >=60 mg/dL protective",
    source: "ACC/AHA 2019",
  },

  // ─── Triglycerides ──────────────────────────────────────────
  {
    name_standardized: "Triglycerides",
    aliases: ["triglycerides", "tg", "trigs", "triglycérides", "mỡ máu trung tính"],
    category: "Lipid",
    unit_si: "mmol/L",
    ref_min_si: 0,
    ref_max_si: 1.7,
    unit_common: "mg/dL",
    ref_min_common: 0,
    ref_max_common: 150,
    conversion_factor: 0.01129,
    severity_thresholds: {
      mild_high: 1.7,    // 150 mg/dL
      moderate_high: 2.26, // 200 mg/dL
      severe_high: 5.65, // 500 mg/dL (pancreatitis risk)
    },
    clinical_notes: "Normal <150, Borderline 150-199, High 200-499, Very high >=500",
    source: "ACC/AHA 2019",
  },

  // ─── Creatinine ─────────────────────────────────────────────
  {
    name_standardized: "Creatinine (Serum)",
    aliases: ["creatinine", "creat", "serum creatinine", "créatinine", "creatinin"],
    category: "Renal",
    unit_si: "umol/L",
    ref_min_si: 53,
    ref_max_si: 106,
    unit_common: "mg/dL",
    ref_min_common: 0.6,
    ref_max_common: 1.2,
    conversion_factor: 88.4,
    severity_thresholds: {
      mild_high: 106,
      moderate_high: 177,   // CKD stage 3 threshold
      severe_high: 354,
    },
    clinical_notes: "Varies by age/sex/muscle mass. eGFR more diagnostic than creatinine alone",
    source: "KDIGO 2023",
  },

  // ─── CBC - WBC ──────────────────────────────────────────────
  {
    name_standardized: "WBC (White Blood Cells)",
    aliases: ["wbc", "white blood cells", "leucocytes", "leukocytes", "bạch cầu"],
    category: "CBC",
    unit_si: "10^9/L",
    ref_min_si: 4.0,
    ref_max_si: 11.0,
    unit_common: "K/uL",
    ref_min_common: 4.0,
    ref_max_common: 11.0,
    conversion_factor: 1,
    severity_thresholds: {
      severe_low: 2.0,
      moderate_low: 3.0,
      mild_low: 4.0,
      mild_high: 11.0,
      moderate_high: 20.0,
      severe_high: 30.0,
    },
    clinical_notes: "Low = leukopenia (infection risk), High = leukocytosis (infection/inflammation)",
    source: "WHO 2023",
  },

  // ─── CBC - Hemoglobin ────────────────────────────────────────
  {
    name_standardized: "Hemoglobin",
    aliases: ["hemoglobin", "hgb", "hb", "haemoglobin", "hémoglobine", "huyết sắc tố"],
    category: "CBC",
    unit_si: "g/L",
    ref_min_si: 120,
    ref_max_si: 160,
    unit_common: "g/dL",
    ref_min_common: 12.0,
    ref_max_common: 16.0,
    conversion_factor: 10,
    severity_thresholds: {
      severe_low: 70,    // 7 g/dL — transfusion threshold
      moderate_low: 90,  // 9 g/dL
      mild_low: 120,     // 12 g/dL
      mild_high: 160,
      moderate_high: 180,
      severe_high: 200,
    },
    clinical_notes: "Female ref: 12-16 g/dL, Male: 13.5-17.5 g/dL",
    source: "WHO 2011 Anaemia guidelines",
  },

  // ─── ALT (Liver) ─────────────────────────────────────────────
  {
    name_standardized: "ALT (Alanine Aminotransferase)",
    aliases: ["alt", "alanine aminotransferase", "sgpt", "alat", "transaminase"],
    category: "Liver",
    unit_si: "U/L",
    ref_min_si: 0,
    ref_max_si: 40,
    unit_common: "U/L",
    ref_min_common: 0,
    ref_max_common: 40,
    conversion_factor: 1,
    severity_thresholds: {
      mild_high: 40,
      moderate_high: 120,  // 3x ULN
      severe_high: 400,    // 10x ULN — liver damage
    },
    clinical_notes: "Elevated in hepatitis, fatty liver, drug toxicity. >3x ULN clinically significant",
    source: "AASLD 2023",
  },

  // ─── TSH (Thyroid) ───────────────────────────────────────────
  {
    name_standardized: "TSH (Thyroid Stimulating Hormone)",
    aliases: ["tsh", "thyroid stimulating hormone", "thyrotropin", "thyréostimuline"],
    category: "Thyroid",
    unit_si: "mIU/L",
    ref_min_si: 0.4,
    ref_max_si: 4.0,
    unit_common: "mIU/L",
    ref_min_common: 0.4,
    ref_max_common: 4.0,
    conversion_factor: 1,
    severity_thresholds: {
      severe_low: 0.01,
      moderate_low: 0.1,
      mild_low: 0.4,
      mild_high: 4.0,
      moderate_high: 10.0,
      severe_high: 20.0,
    },
    clinical_notes: "Low = hyperthyroidism, High = hypothyroidism",
    source: "ATA 2023",
  },
];

/**
 * Tìm reference cho một test name từ PDF
 * Dùng fuzzy matching trên aliases
 */
export function findReference(testName: string): MedicalReference | null {
  const name = testName.toLowerCase().trim();
  return (
    MEDICAL_KB.find(
      (ref) =>
        ref.name_standardized.toLowerCase() === name ||
        ref.aliases.some((alias) => name.includes(alias) || alias.includes(name))
    ) ?? null
  );
}

/**
 * Lấy relevant references cho danh sách tests
 * Inject vào Agent 3 prompt để tăng accuracy
 */
export function getRelevantReferences(testNames: string[]): string {
  const found: MedicalReference[] = [];
  for (const name of testNames) {
    const ref = findReference(name);
    if (ref && !found.find((r) => r.name_standardized === ref.name_standardized)) {
      found.push(ref);
    }
  }

  if (found.length === 0) return "No specific references found. Use general clinical knowledge.";

  return found
    .map(
      (r) =>
        `${r.name_standardized}: Normal ${r.ref_min_common}-${r.ref_max_common} ${r.unit_common}. ` +
        `Clinical: ${r.clinical_notes}`
    )
    .join("\n");
}
