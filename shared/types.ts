// ============================================================
// SHARED TYPES — nguồn sự thật duy nhất cho toàn bộ project
// Tất cả agent, backend, frontend đều import từ file này
// ============================================================

export type Language = "en" | "fr" | "ar" | "vi";

export type TestStatus = "normal" | "low" | "high" | "critical";

export type Severity = "none" | "mild" | "moderate" | "severe";

export type Urgency = "routine" | "soon" | "urgent" | "emergency";

export type JobStatus =
  | "queued"
  | "extracting"
  | "normalizing"
  | "analyzing"
  | "explaining"
  | "qa_check"
  | "done"
  | "failed";

// ─── Agent 1 Output: Raw extraction từ PDF ───────────────────
export interface RawLabTest {
  name: string;              // tên xét nghiệm như trong PDF
  value: number | null;      // giá trị số, null nếu không parse được
  value_text: string;        // giá trị raw string từ PDF
  unit: string;              // đơn vị như trong PDF
  reference_range_text: string; // range raw string từ PDF
  reference_min: number | null;
  reference_max: number | null;
}

export interface Agent1Output {
  patient_info: {
    name: string | null;
    dob: string | null;
    date: string | null;       // ngày xét nghiệm
    lab_name: string | null;
    doctor: string | null;
  };
  tests: RawLabTest[];
  raw_text_snippet: string;    // 500 ký tự đầu của PDF để debug
  confidence: number;          // 0-1, độ tự tin của extraction
}

// ─── Agent 2 Output: Normalized ──────────────────────────────
export interface NormalizedLabTest extends RawLabTest {
  name_standardized: string;   // tên chuẩn hóa theo WHO (ví dụ: "Glucose (Fasting)")
  value_si: number | null;     // giá trị đã convert sang SI unit
  unit_si: string;             // SI unit chuẩn
  ref_min_si: number | null;
  ref_max_si: number | null;
  who_category: string;        // "CBC" | "Metabolic" | "Lipid" | "Thyroid" | "Liver" | "Renal" | "Other"
}

export interface Agent2Output {
  tests: NormalizedLabTest[];
  normalization_notes: string[]; // ghi chú về các conversion đã thực hiện
}

// ─── Agent 3 Output: Clinical analysis ───────────────────────
export interface AnalyzedLabTest extends NormalizedLabTest {
  status: TestStatus;
  severity: Severity;
  deviation_percent: number;    // % lệch so với reference range
  reasoning_steps: string[];    // CoT steps, 5 bước
  clinical_significance: string;
  confidence: number;           // 0-1
}

export interface Agent3Output {
  tests: AnalyzedLabTest[];
  critical_flags: string[];     // tên các test ở mức critical
  overall_risk: "low" | "medium" | "high" | "critical";
}

// ─── Agent 4 Output: Patient-friendly explanation ────────────
export interface ExplainedLabTest {
  name: string;                 // tên gốc từ PDF
  name_standardized: string;
  status: TestStatus;
  severity: Severity;
  deviation_percent: number;
  value_text: string;
  unit: string;
  reference_range_text: string;
  patient_explanation: string;  // ngôn ngữ đơn giản, không thuật ngữ
  next_steps: string;           // hành động cụ thể bệnh nhân cần làm
  urgency: Urgency;
  confidence: number;
}

export interface Agent4Output {
  language: Language;
  tests: ExplainedLabTest[];
  overall_summary: string;      // tóm tắt tổng thể cho bệnh nhân
  urgent_actions: string[];     // danh sách việc cần làm ngay
  disclaimer: string;           // "Kết quả này chỉ mang tính tham khảo..."
}

// ─── Agent 5 Output: QA Self-check ───────────────────────────
export interface QAIssue {
  test_name: string;
  issue_type: "severity_wrong" | "explanation_unclear" | "next_steps_missing" | "critical_missed" | "language_wrong";
  description: string;
  correction: string;
}

export interface Agent5Output {
  issues_found: boolean;
  issues: QAIssue[];
  validated_output: Agent4Output; // output sau khi đã apply corrections
  qa_score: number;              // 0-100
}

// ─── Final Result (stored in DB + returned to frontend) ──────
export interface LabAnalysisResult {
  job_id: string;
  language: Language;
  patient_info: Agent1Output["patient_info"];
  tests: ExplainedLabTest[];
  overall_summary: string;
  urgent_actions: string[];
  disclaimer: string;
  overall_risk: Agent3Output["overall_risk"];
  critical_flags: string[];
  qa_score: number;
  metadata: {
    processing_time_ms: number;
    total_tokens: number;
    models_used: string[];
    pdf_pages: number;
    extraction_confidence: number;
  };
}

// ─── API Request/Response types ──────────────────────────────
export interface UploadResponse {
  job_id: string;
  status: JobStatus;
  message: string;
}

export interface JobStatusResponse {
  job_id: string;
  status: JobStatus;
  progress: number;            // 0-100
  current_step: string;        // human-readable step label
  result?: LabAnalysisResult;
  error?: string;
  created_at: string;
  updated_at: string;
}
