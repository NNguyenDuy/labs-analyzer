// ============================================================
// Agent 4 — Patient Explainer
// Sinh giải thích bằng ngôn ngữ đơn giản cho bệnh nhân
// Hỗ trợ EN / FR / AR / VI
// ============================================================

import { qwenChat, parseJsonResponse, MODELS } from "../lib/qwen";
import type { Agent3Output, Agent4Output, Language } from "../../shared/types";

const LANG_CONFIG: Record<Language, { instruction: string; disclaimer: string }> = {
  en: {
    instruction: "Respond in English. Use simple, non-medical language a patient can understand.",
    disclaimer:
      "This analysis is for informational purposes only and does not replace professional medical advice. Please consult your doctor for proper diagnosis and treatment.",
  },
  fr: {
    instruction: "Répondez en français. Utilisez un langage simple, sans termes médicaux.",
    disclaimer:
      "Cette analyse est fournie à titre informatif uniquement et ne remplace pas l'avis médical professionnel. Veuillez consulter votre médecin.",
  },
  ar: {
    instruction: "أجب باللغة العربية. استخدم لغة بسيطة يفهمها المريض، بدون مصطلحات طبية.",
    disclaimer:
      "هذا التحليل للأغراض المعلوماتية فقط ولا يحل محل المشورة الطبية المهنية. يرجى استشارة طبيبك.",
  },
  vi: {
    instruction: "Trả lời bằng tiếng Việt. Dùng ngôn ngữ đơn giản, không dùng thuật ngữ y khoa.",
    disclaimer:
      "Phân tích này chỉ mang tính chất thông tin và không thay thế cho lời khuyên y tế chuyên nghiệp. Vui lòng tham khảo ý kiến bác sĩ.",
  },
};

const URGENCY_GUIDE = `Urgency levels:
- routine: normal or mild abnormality, follow up at next scheduled visit
- soon: moderate abnormality, see doctor within 1-2 weeks  
- urgent: severe abnormality, see doctor within 24-48 hours
- emergency: critical value, go to emergency room immediately`;

export async function runAgent4(
  agent3Output: Agent3Output,
  language: Language,
  jobId: string
): Promise<Agent4Output> {
  console.log(`[Agent4] Generating ${language} explanations for ${agent3Output.tests.length} tests`);

  const langConfig = LANG_CONFIG[language];

  const systemPrompt = `You are a compassionate medical communicator explaining lab results to patients.

LANGUAGE INSTRUCTION: ${langConfig.instruction}

${URGENCY_GUIDE}

COMMUNICATION RULES:
1. Never use medical jargon — explain what the test measures in everyday language
2. Be reassuring but honest about abnormal results
3. For high/critical values: be clear about urgency without causing panic
4. next_steps must be specific and actionable (not "see a doctor" — say "schedule an appointment with your GP within 2 weeks")
5. overall_summary: 2-3 sentences max, focus on what patient should do

Return ONLY JSON:
{
  "language": "${language}",
  "tests": [
    {
      "name": "original name",
      "name_standardized": "standardized name",
      "status": "normal|low|high|critical",
      "severity": "none|mild|moderate|severe",
      "deviation_percent": number,
      "value_text": "original value string",
      "unit": "unit",
      "reference_range_text": "original range",
      "patient_explanation": "simple explanation of what this test means and what the result indicates",
      "next_steps": "specific action the patient should take",
      "urgency": "routine|soon|urgent|emergency",
      "confidence": number
    }
  ],
  "overall_summary": "2-3 sentence summary for patient",
  "urgent_actions": ["list only if urgency=urgent or emergency"],
  "disclaimer": "${langConfig.disclaimer.replace(/"/g, "'")}"
}`;

  const result = await qwenChat({
    model: MODELS.PLUS,
    systemPrompt,
    userContent: `Generate patient-friendly explanations for these analyzed lab results:\n${JSON.stringify(
      agent3Output.tests,
      null,
      2
    )}`,
    traceId: jobId,
    traceName: `Agent4-Explainer-${language}`,
    maxTokens: 5000,
    temperature: 0.3, // Slightly higher for natural language
  });

  const output = parseJsonResponse<Agent4Output>(result.content, "Agent4");

  // Ensure disclaimer is set
  output.disclaimer = langConfig.disclaimer;

  // Ensure urgent_actions only contains genuinely urgent items
  output.urgent_actions = output.tests
    .filter((t) => t.urgency === "urgent" || t.urgency === "emergency")
    .map((t) => t.next_steps);

  console.log(`[Agent4] Generated explanations. Urgent actions: ${output.urgent_actions.length}`);
  return output;
}
