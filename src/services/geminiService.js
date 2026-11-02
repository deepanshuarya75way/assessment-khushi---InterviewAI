
// src/services/geminiService.js

import { getFallbackQuestions } from "../data/questionBank";

const MODEL = "gemini-2.5-flash";

const BASE_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

// ─── API KEY VALIDATION ─────────────────────────────────────────────

function getApiKey() {
  const key = import.meta.env.VITE_GEMINI_API_KEY;

  if (!key || key === "your_gemini_api_key") {
    throw new Error(
      "Gemini API key is missing. Add VITE_GEMINI_API_KEY to your .env file."
    );
  }

  return key;
}

// ─── JSON EXTRACTION ────────────────────────────────────────────────

function extractJSON(text) {
  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  let clean = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  try {
    return JSON.parse(clean);
  } catch {}

  const objIdx = clean.indexOf("{");
  const arrIdx = clean.indexOf("[");

  const start =
    objIdx === -1
      ? arrIdx
      : arrIdx === -1
      ? objIdx
      : Math.min(objIdx, arrIdx);

  if (start === -1) {
    throw new Error("No JSON found in Gemini response");
  }

  const end = clean.startsWith("[", start)
    ? clean.lastIndexOf("]") + 1
    : clean.lastIndexOf("}") + 1;

  if (end <= start) {
    throw new Error("Incomplete JSON response from Gemini");
  }

  try {
    return JSON.parse(clean.slice(start, end));
  } catch (e) {
    throw new Error(`Failed to parse Gemini JSON: ${e.message}`);
  }
}

// ─── GEMINI API CALL ────────────────────────────────────────────────

async function callGemini(prompt, retries = 1) {
  const apiKey = getApiKey();

  let lastErr;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(
        `${BASE_URL}?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048,
              topP: 0.9,
            },
          }),
        }
      );

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));

        const msg =
          errBody?.error?.message || `HTTP ${response.status}`;

        throw new Error(
          `Gemini API error (${response.status}): ${msg}`
        );
      }

      const data = await response.json();

      const text =
        data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error("Gemini returned no text");
      }

      return text;

    } catch (err) {
      lastErr = err;

      console.error(
        `Gemini attempt ${attempt + 1} failed:`,
        err.message
      );

      if (attempt < retries) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000)
        );
      }
    }
  }

  throw lastErr;
}

// ─── FALLBACK QUESTION CONVERTER ────────────────────────────────────

function getFallbackForRole(role, count = 7) {
  const fallbackQuestions = getFallbackQuestions(role, count);

  return fallbackQuestions.map((q, index) => ({
    id: index + 1,
    question: q.question,
    type: mapCategoryToType(q.category),
    hint: q.hint || "Explain your answer with relevant concepts and examples.",
  }));
}

function mapCategoryToType(category = "") {
  const value = category.toLowerCase();

  if (
    value.includes("behavioral") ||
    value.includes("experience") ||
    value.includes("teamwork") ||
    value.includes("motivation") ||
    value.includes("introduction") ||
    value.includes("career")
  ) {
    return "behavioral";
  }

  if (
    value.includes("problem") ||
    value.includes("security")
  ) {
    return "problem-solving";
  }

  if (
    value.includes("practical") ||
    value.includes("situational")
  ) {
    return "situational";
  }

  return "technical";
}

// ─── GENERATE INTERVIEW QUESTIONS ───────────────────────────────────

export async function generateQuestions(
  role,
  difficulty,
  count = 7
) {
  try {
    const prompt = `
You are an expert technical interviewer.

Generate exactly ${count} interview questions for a
${difficulty} level ${role} candidate.

Return ONLY a valid JSON array.

Each element must have exactly these fields:

- "id": integer starting from 1
- "question": full interview question
- "type": technical, behavioral, situational, or problem-solving
- "hint": one sentence describing what a good answer should include

Example:
[
  {
    "id": 1,
    "question": "Explain how the event loop works in JavaScript.",
    "type": "technical",
    "hint": "Look for understanding of the call stack and task queue."
  }
]

Generate ${count} questions for ${difficulty} ${role}.
`;

    const text = await callGemini(prompt);

    const parsed = extractJSON(text);

    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error("Invalid question response from Gemini");
    }

    const questions = parsed.map((q, index) => ({
      id: index + 1,
      question: q.question || q.text || q.q || "",
      type: q.type || "technical",
      hint: q.hint || "",
    }));

    if (questions.some((q) => !q.question.trim())) {
      throw new Error("Gemini returned incomplete questions");
    }

    return questions.slice(0, count);

  } catch (error) {
    console.error(
      "Gemini question generation failed. Using fallback:",
      error.message
    );

    return getFallbackForRole(role, count);
  }
}

// ─── EVALUATE ANSWER ────────────────────────────────────────────────

export async function evaluateAnswer(
  question,
  answer,
  role,
  difficulty
) {
  const safeAnswer = answer?.trim() || "(no answer provided)";

  const defaultEvaluation = {
    technicalKnowledge: 5,
    communication: 5,
    confidence: 5,
    clarity: 5,
    problemSolving: 5,
    overall: 5,
    strengths: [],
    weaknesses: [
      "Automated AI evaluation was unavailable.",
      "Review your answer manually.",
    ],
    feedback:
      "AI evaluation was unavailable. Your answer has been saved, but its scores are provisional.",
    needsFollowUp: false,
    evaluationAvailable: false,
  };

  try {
    const prompt = `
You are an expert interviewer evaluating a
${difficulty} ${role} candidate.

Question: "${question}"

Candidate Answer: "${safeAnswer}"

Return ONLY valid JSON:

{
  "technicalKnowledge": 5,
  "communication": 5,
  "confidence": 5,
  "clarity": 5,
  "problemSolving": 5,
  "overall": 5,
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "feedback": "Specific actionable feedback",
  "needsFollowUp": false
}

All scores must be integers from 0 to 10.
If the answer is empty or very short, give low scores
and set needsFollowUp to true.
`;

    const text = await callGemini(prompt);

    const parsed = extractJSON(text);

    const toInt = (value, fallback = 5) => {
      const number = Number(value);

      return Number.isFinite(number)
        ? Math.max(0, Math.min(10, Math.round(number)))
        : fallback;
    };

    return {
      technicalKnowledge: toInt(parsed.technicalKnowledge),
      communication: toInt(parsed.communication),
      confidence: toInt(parsed.confidence),
      clarity: toInt(parsed.clarity),
      problemSolving: toInt(parsed.problemSolving),
      overall: toInt(parsed.overall),

      strengths: Array.isArray(parsed.strengths)
        ? parsed.strengths
        : [],

      weaknesses: Array.isArray(parsed.weaknesses)
        ? parsed.weaknesses
        : [],

      feedback:
        typeof parsed.feedback === "string"
          ? parsed.feedback
          : "",

      needsFollowUp: !!parsed.needsFollowUp,

      evaluationAvailable: true,
    };

  } catch (error) {
    console.error("Answer evaluation failed:", error.message);

    // Do not pretend default scores are genuine AI scores.
    return defaultEvaluation;
  }
}

// ─── GENERATE FOLLOW-UP QUESTION ────────────────────────────────────

export async function generateFollowUp(
  originalQuestion,
  answer,
  scores,
  role
) {
  try {
    const weak = scores.overall < 6;

    const prompt = `
You are conducting a ${role} interview.

Original question: "${originalQuestion}"

Candidate answered: "${answer}"

Score: ${scores.overall}/10.

Generate ONE short follow-up question (maximum 2 sentences).

${weak
  ? "Probe the gaps in the candidate's knowledge."
  : "Explore the topic in greater depth."}

Return ONLY the question text.
No labels or explanation.
`;

    const text = await callGemini(prompt);

    return text
      .trim()
      .replace(/^["']|["']$/g, "")
      .replace(/^Follow-?up:?\s*/i, "");

  } catch (error) {
    console.error("Follow-up generation failed:", error.message);

    return `Can you explain your approach to "${originalQuestion}" in more detail and provide a practical example?`;
  }
}

// ─── GENERATE FINAL PLACEMENT REPORT ────────────────────────────────

export async function generateFinalReport(
  role,
  difficulty,
  questionsAndAnswers,
  allScores
) {
  if (!allScores.length) {
    throw new Error("No scores to generate report from");
  }

  const avgScore =
    allScores.reduce((total, score) => total + score.overall, 0) /
    allScores.length;

  const qaText = questionsAndAnswers
    .map(
      (qa, index) =>
        `Q${index + 1}: ${qa.question}\n` +
        `A: ${qa.answer || "(no answer)"}\n` +
        `Score: ${allScores[index]?.overall ?? "N/A"}/10`
    )
    .join("\n\n");

  try {
    const prompt = `
You are a senior talent acquisition specialist.

Review this ${difficulty} ${role} mock interview.

Average Score: ${avgScore.toFixed(1)}/10

Interview Transcript:
${qaText}

Return ONLY valid JSON:

{
  "placementReadiness": 70,
  "strengths": ["strength1", "strength2", "strength3"],
  "weaknesses": ["weakness1", "weakness2", "weakness3"],
  "skillsToImprove": ["skill1", "skill2", "skill3"],
  "learningPath": [
    {
      "topic": "Topic A",
      "resources": "Resource description",
      "priority": "high"
    }
  ],
  "summary": "Overall assessment of the candidate.",
  "hiringRecommendation": "Maybe"
}

hiringRecommendation must be exactly:
"Strong Yes", "Yes", "Maybe", or "No".

placementReadiness must be an integer between 0 and 100.
`;

    const text = await callGemini(prompt, 2);

    const parsed = extractJSON(text);

    return {
      placementReadiness: Math.max(
        0,
        Math.min(
          100,
          parseInt(parsed.placementReadiness, 10) || 0
        )
      ),

      strengths: Array.isArray(parsed.strengths)
        ? parsed.strengths
        : [],

      weaknesses: Array.isArray(parsed.weaknesses)
        ? parsed.weaknesses
        : [],

      skillsToImprove: Array.isArray(parsed.skillsToImprove)
        ? parsed.skillsToImprove
        : [],

      learningPath: Array.isArray(parsed.learningPath)
        ? parsed.learningPath
        : [],

      summary:
        typeof parsed.summary === "string"
          ? parsed.summary
          : "",

      hiringRecommendation: [
        "Strong Yes",
        "Yes",
        "Maybe",
        "No",
      ].includes(parsed.hiringRecommendation)
        ? parsed.hiringRecommendation
        : "Maybe",

      reportAvailable: true,
    };

  } catch (error) {
    console.error("Final report generation failed:", error.message);

    return {
      placementReadiness: Math.round(avgScore * 10),

      strengths: [
        "Interview completed.",
        "Candidate attempted the interview questions.",
      ],

      weaknesses: [
        "AI-generated report was unavailable.",
      ],

      skillsToImprove: [
        "Review the questions where your scores were lowest.",
        "Practice explaining technical concepts.",
        "Work on structured communication.",
      ],

      learningPath: [],

      summary:
        "This is a provisional report based on the available interview scores. AI-generated analysis was unavailable.",

      hiringRecommendation: "Maybe",

      reportAvailable: false,
    };
  }
}
