#!/usr/bin/env tsx
// ============================================================
// Generate mock lab report text files for testing
// (Real PDFs needed for actual test, these are text mocks)
// Usage: tsx tests/generate-samples.ts
// ============================================================

import * as fs from "fs";
import * as path from "path";

const SAMPLES_DIR = path.join(__dirname, "samples");
fs.mkdirSync(SAMPLES_DIR, { recursive: true });

// ── EN Sample ─────────────────────────────────────────────────
const EN_REPORT = `
LABORATORY REPORT
Patient: John Smith
Date of Birth: 15/03/1975
Date of Test: ${new Date().toLocaleDateString("en-GB")}
Requesting Doctor: Dr. Sarah Johnson
Lab: City Medical Laboratory

COMPLETE BLOOD COUNT
Test Name           Result    Units    Reference Range
WBC                 11.8      K/uL     4.0-11.0        H
Hemoglobin          13.2      g/dL     13.5-17.5       L
Hematocrit          39.1      %        41.0-53.0       L
Platelets           245       K/uL     150-400

METABOLIC PANEL
Glucose (Fasting)   142       mg/dL    70-100          H
HbA1c               7.8       %        <5.7            H
Creatinine          1.4       mg/dL    0.6-1.2         H

LIPID PANEL
Total Cholesterol   245       mg/dL    <200            H
LDL                 168       mg/dL    <100            H
HDL                 38        mg/dL    >40             L
Triglycerides       310       mg/dL    <150            H

LIVER FUNCTION
ALT                 52        U/L      0-40            H
AST                 45        U/L      0-40            H

THYROID
TSH                 0.8       mIU/L    0.4-4.0         Normal
`;

// ── VI Sample ─────────────────────────────────────────────────
const VI_REPORT = `
PHIẾU KẾT QUẢ XÉT NGHIỆM
Bệnh nhân: Nguyễn Văn An
Ngày sinh: 20/05/1980
Ngày xét nghiệm: ${new Date().toLocaleDateString("vi-VN")}
Bác sĩ yêu cầu: BS. Trần Thị Hoa
Phòng xét nghiệm: Bệnh viện Đa khoa Trung Ương

CÔNG THỨC MÁU
Tên xét nghiệm        Kết quả    Đơn vị    Giá trị bình thường
Bạch cầu (WBC)        8.5        K/uL      4.0-11.0
Hồng cầu (RBC)        4.2        M/uL      4.5-5.5              T
Huyết sắc tố (Hb)     118        g/L       130-175              T
Tiểu cầu              198        K/uL      150-400

SINH HÓA MÁU
Đường huyết lúc đói   7.8        mmol/L    3.9-5.6              T
HbA1c                 8.2        %         <5.7                 T
Cholesterol toàn phần 6.5        mmol/L    <5.17                T
LDL                   4.8        mmol/L    <2.59                T
Triglyceride          3.2        mmol/L    <1.7                 T
Creatinin             95         umol/L    53-106

MEN GAN
ALT (SGPT)            35         U/L       0-40
AST (SGOT)            30         U/L       0-40
`;

// ── FR Sample ─────────────────────────────────────────────────
const FR_REPORT = `
RÉSULTATS D'ANALYSES BIOLOGIQUES
Patient: Marie Dupont
Date de naissance: 08/09/1965
Date du prélèvement: ${new Date().toLocaleDateString("fr-FR")}
Médecin prescripteur: Dr. Philippe Martin
Laboratoire: Laboratoire Central Paris

NUMÉRATION FORMULE SANGUINE
Examen               Résultat   Unité     Valeurs normales
Leucocytes           6.2        G/L       4.0-11.0
Hémoglobine          11.8       g/dL      12.0-16.0          B
Hématocrite          35.1       %         37.0-47.0          B
Plaquettes           189        G/L       150-400

BILAN LIPIDIQUE
Cholestérol total    7.2        mmol/L    <5.17              H
LDL cholestérol      4.9        mmol/L    <2.59              H
HDL cholestérol      1.1        mmol/L    >1.03
Triglycérides        2.8        mmol/L    <1.7               H

GLYCÉMIE
Glucose à jeun       6.8        mmol/L    3.9-5.6            H
HbA1c                6.2        %         <5.7               H

BILAN RÉNAL
Créatinine           78         umol/L    53-106
`;

// Write samples
fs.writeFileSync(path.join(SAMPLES_DIR, "en-report.txt"), EN_REPORT);
fs.writeFileSync(path.join(SAMPLES_DIR, "vi-report.txt"), VI_REPORT);
fs.writeFileSync(path.join(SAMPLES_DIR, "fr-report.txt"), FR_REPORT);

console.log(`Generated ${SAMPLES_DIR}/`);
console.log("  en-report.txt");
console.log("  vi-report.txt");
console.log("  fr-report.txt");
console.log("\nNote: These are text samples. For real testing, use actual PDF files.");
console.log("The QA runner accepts these .txt files for smoke testing the pipeline.");
