// ============================================================
// Agent 3+4 — Combined Analyze + Explain (single LLM call)
// Replaces two sequential calls with one, cutting ~30-50s
// ============================================================

import { qwenChat, parseJsonResponse, MODELS } from "../lib/qwen";
import { getRelevantReferences } from "../lib/medicalKb";
import type { Agent2Output, Agent34Output, Language } from "@shared/types";

const LANG_CONFIG: Record<Language, { instruction: string; disclaimer: string }> = {
  en: {
    instruction: "Write patient_explanation and next_steps in English. Use simple, non-medical language.",
    disclaimer:
      "This analysis is for informational purposes only and does not replace professional medical advice. Please consult your doctor for proper diagnosis and treatment.",
  },
  fr: {
    instruction: "Rédigez patient_explanation et next_steps en français. Utilisez un langage simple, sans termes médicaux.",
    disclaimer:
      "Cette analyse est fournie à titre informatif uniquement et ne remplace pas l'avis médical professionnel. Veuillez consulter votre médecin.",
  },
  ar: {
    instruction: "اكتب patient_explanation و next_steps باللغة العربية. استخدم لغة بسيطة بدون مصطلحات طبية.",
    disclaimer:
      "هذا التحليل للأغراض المعلوماتية فقط ولا يحل محل المشورة الطبية المهنية. يرجى استشارة طبيبك.",
  },
  vi: {
    instruction: "Viết patient_explanation và next_steps bằng tiếng Việt. Dùng ngôn ngữ đơn giản, không dùng thuật ngữ y khoa.",
    disclaimer:
      "Phân tích này chỉ mang tính chất thông tin và không thay thế cho lời khuyên y tế chuyên nghiệp. Vui lòng tham khảo ý kiến bác sĩ.",
  },
};

export async function runAgent34(
  agent2Output: Agent2Output,
  language: Language,
  jobId: string
): Promise<Agent34Output> {
  console.log(`[Agent34] Analyzing + explaining ${agent2Output.tests.length} tests in ${language}`);

  const langConfig = LANG_CONFIG[language];
  const testNames = agent2Output.tests.map((t) => t.name_standardized || t.name);
  const medicalRefs = getRelevantReferences(testNames);

  const systemPrompt = `You are a senior clinical pathologist AND medical communicator. In ONE pass, analyze lab results clinically and generate patient-friendly explanations.

MEDICAL REFERENCE STANDARDS:
${medicalRefs}

LANGUAGE INSTRUCTION: ${langConfig.instruction}

SEVERITY RULES:
- none: within normal range
- mild: 0-25% outside range
- moderate: 25-75% outside range
- severe: >75% outside range OR critical value

URGENCY RULES:
- routine: normal or mild
- soon: moderate → see doctor within 1-2 weeks
- urgent: severe → see doctor within 24-48 hours
- emergency: critical value → go to emergency room immediately

RULES:
1. Return ONLY valid compact JSON — no markdown, no extra text
2. patient_explanation: simple language, max 2 sentences
3. next_steps: specific action (e.g. "Visit your GP within 2 weeks", not just "see a doctor")
4. overall_summary: 2-3 sentences in ${language === "en" ? "English" : language === "fr" ? "French" : language === "ar" ? "Arabic" : "Vietnamese"}
5. clinical_significance: max 10 words in English (internal use)

Return ONLY JSON:
{
  "language": "${language}",
  "overall_risk": "low|medium|high|critical",
  "critical_flags": ["test names with critical status"],
  "tests": [
    {
      "name": "original name",
      "name_standardized": "standardized name",
      "value": number,
      "value_text": "original string",
      "unit": "original unit",
      "unit_si": "SI unit",
      "value_si": number,
      "reference_range_text": "original range",
      "reference_min": number | null,
      "reference_max": number | null,
      "ref_min_si": number | null,
      "ref_max_si": number | null,
      "who_category": "CBC|Metabolic|Lipid|Thyroid|Liver|Renal|Other",
      "status": "normal|low|high|critical",
      "severity": "none|mild|moderate|severe",
      "deviation_percent": number,
      "clinical_significance": "brief english note",
      "confidence": 0.0,
      "patient_explanation": "simple explanation in ${language}",
      "next_steps": "specific action in ${language}",
      "urgency": "routine|soon|urgent|emergency"
    }
  ],
  "overall_summary": "2-3 sentence summary in ${language}",
  "urgent_actions": ["only if urgency=urgent or emergency, in ${language}"],
  "disclaimer": "${langConfig.disclaimer.replace(/"/g, "'")}"
}`;

  const result = await qwenChat({
    model: MODELS.PLUS,
    systemPrompt,
    userContent: `Analyze and explain these normalized lab results:\n${JSON.stringify(agent2Output.tests)}`,
    traceId: jobId,
    traceName: `Agent34-Combined-${language}`,
    maxTokens: 8000,
    temperature: 0.1,
  });

  const output = parseJsonResponse<Agent34Output>(result.content, "Agent34");

  // Post-process: enforce severity/urgency rules programmatically
  output.tests = output.tests.map((test) => {
    // Recalculate deviation if ref range available
    if (test.value_si != null && test.ref_min_si != null && test.ref_max_si != null) {
      const range = test.ref_max_si - test.ref_min_si;
      if (range > 0) {
        let deviation = 0;
        if (test.value_si < test.ref_min_si) {
          deviation = ((test.ref_min_si - test.value_si) / range) * 100;
        } else if (test.value_si > test.ref_max_si) {
          deviation = ((test.value_si - test.ref_max_si) / range) * 100;
        }
        if (Math.abs((test.deviation_percent ?? 0) - deviation) > 10) {
          test.deviation_percent = parseFloat(deviation.toFixed(1));
        }
      }
    }

    // Enforce urgency matches severity
    if (test.status === "critical" && test.urgency !== "emergency") {
      test.urgency = "emergency";
    } else if (test.severity === "severe" && test.urgency === "routine") {
      test.urgency = "urgent";
    } else if (test.status === "normal") {
      test.urgency = "routine";
    }

    return test;
  });

  // Recompute critical_flags and overall_risk from test data
  output.critical_flags = output.tests
    .filter((t) => t.status === "critical")
    .map((t) => t.name_standardized || t.name);

  const hasCritical = output.critical_flags.length > 0;
  const hasSevere = output.tests.some((t) => t.severity === "severe");
  const hasModerate = output.tests.some((t) => t.severity === "moderate");
  output.overall_risk = hasCritical ? "critical" : hasSevere ? "high" : hasModerate ? "medium" : "low";

  // Recompute urgent_actions
  output.urgent_actions = output.tests
    .filter((t) => t.urgency === "urgent" || t.urgency === "emergency")
    .map((t) => t.next_steps);

  output.disclaimer = langConfig.disclaimer;
  output.language = language;

  console.log(`[Agent34] Risk=${output.overall_risk} Critical=${output.critical_flags.length} Urgent=${output.urgent_actions.length}`);
  return output;
}
