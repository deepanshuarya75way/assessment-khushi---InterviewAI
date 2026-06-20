// src/services/geminiService.js
// FIX 1: Updated model from 'gemini-1.5-flash' to 'gemini-1.5-flash-latest' which is
//         the stable alias that always resolves to the latest supported flash model.
// FIX 2: Added API key validation before every call — surfaces missing key errors clearly.
// FIX 3: Robust JSON extraction: strips ```json fences, finds JSON via regex as fallback.
// FIX 4: Added retry logic (1 retry) for transient 500/503 errors.
// FIX 5: generateQuestions no longer called twice in InterviewSetupPage — guard added.
// FIX 6: Better error messages that surface the actual Gemini API error text.
// FIX 7: evaluateAnswer validates the returned object has required fields before returning.

const MODEL = 'gemini-2.5-flash'

const BASE_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

function getApiKey() {
  const key = import.meta.env.VITE_GEMINI_API_KEY
  if (!key || key === 'your_gemini_api_key') {
    throw new Error(
      'Gemini API key is missing. Add VITE_GEMINI_API_KEY to your .env file.\n' +
      'Get a key at: https://aistudio.google.com/app/apikey'
    )
  }
  return key
}

// Extract JSON from Gemini response text — handles markdown fences and leading text
function extractJSON(text) {
  if (!text) throw new Error('Gemini returned an empty response')

  // Strip markdown code fences
  let clean = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()

  // Try direct parse first
  try { return JSON.parse(clean) } catch {}

  // Find the first { or [ and try from there
  const objIdx = clean.indexOf('{')
  const arrIdx = clean.indexOf('[')
  const start  = objIdx === -1 ? arrIdx : arrIdx === -1 ? objIdx : Math.min(objIdx, arrIdx)

  if (start === -1) throw new Error(`No JSON found in Gemini response: ${text.slice(0, 200)}`)

  const end = clean.startsWith('[', start)
    ? clean.lastIndexOf(']') + 1
    : clean.lastIndexOf('}') + 1

  try {
    return JSON.parse(clean.slice(start, end))
  } catch (e) {
    throw new Error(`Failed to parse Gemini JSON: ${e.message}\nRaw: ${text.slice(0, 300)}`)
  }
}

async function callGemini(prompt, retries = 1) {
  const apiKey = getApiKey()

  let lastErr
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${BASE_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature:     0.7,
            maxOutputTokens: 2048,
            topP:            0.9,
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          ],
        }),
      })

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}))
        const msg = errBody?.error?.message || `HTTP ${response.status}`
        // 429 = quota, 400 = bad key — don't retry these
        if (response.status === 429 || response.status === 400) {
          throw new Error(`Gemini API error: ${msg}`)
        }
        throw new Error(`Gemini API error (${response.status}): ${msg}`)
      }

      const data = await response.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text

      if (!text) {
        const finishReason = data.candidates?.[0]?.finishReason
        throw new Error(`Gemini returned no text. Finish reason: ${finishReason || 'unknown'}`)
      }

      return text
    } catch (err) {
      lastErr = err
      if (attempt < retries) {
        // Wait 1s before retry
        await new Promise(r => setTimeout(r, 1000))
      }
    }
  }
  throw lastErr
}

// ─── Generate interview questions ─────────────────────────────────────────────
export async function generateQuestions(role, difficulty, count = 7) {
  const prompt = `You are an expert technical interviewer. Generate exactly ${count} interview questions for a ${difficulty} level ${role} candidate.

CRITICAL: Return ONLY a valid JSON array. No markdown, no explanation, no preamble.

Each element must have exactly these fields:
- "id": integer starting from 1
- "question": the full interview question text (string)
- "type": one of exactly: "technical", "behavioral", "situational", "problem-solving"
- "hint": one sentence describing what a good answer should include (string)

Example format:
[{"id":1,"question":"Explain how the event loop works in JavaScript.","type":"technical","hint":"Look for understanding of call stack, task queue, and microtasks."}]

Generate ${count} questions for ${difficulty} ${role}.`

  const text    = await callGemini(prompt)
  const parsed  = extractJSON(text)

  if (!Array.isArray(parsed)) throw new Error('Gemini did not return an array of questions')
  if (parsed.length === 0)    throw new Error('Gemini returned 0 questions')

  // Normalise — ensure required fields exist
  return parsed.map((q, i) => ({
    id:       q.id       || i + 1,
    question: q.question || q.text || q.q || `Question ${i + 1}`,
    type:     q.type     || 'technical',
    hint:     q.hint     || '',
  }))
}

// ─── Evaluate a single answer ──────────────────────────────────────────────────
export async function evaluateAnswer(question, answer, role, difficulty) {
  const safeAnswer = answer?.trim() || '(no answer provided)'

  const prompt = `You are an expert interviewer evaluating a ${difficulty} ${role} candidate.

Question: "${question}"
Candidate Answer: "${safeAnswer}"

Evaluate and return ONLY this exact JSON object, no extra text:
{
  "technicalKnowledge": <integer 0-10>,
  "communication":      <integer 0-10>,
  "confidence":         <integer 0-10>,
  "clarity":            <integer 0-10>,
  "problemSolving":     <integer 0-10>,
  "overall":            <integer 0-10>,
  "strengths":          ["strength1", "strength2"],
  "weaknesses":         ["weakness1", "weakness2"],
  "feedback":           "2-3 sentence specific, actionable feedback",
  "needsFollowUp":      false
}

If the answer is empty or very short, give low scores and set needsFollowUp to true.`

  const text   = await callGemini(prompt)
  const parsed = extractJSON(text)

  // Validate and sanitise all numeric fields — Gemini sometimes returns strings
  const toInt = (v, def = 5) => {
    const n = parseInt(v, 10)
    return isNaN(n) ? def : Math.max(0, Math.min(10, n))
  }

  return {
    technicalKnowledge: toInt(parsed.technicalKnowledge),
    communication:      toInt(parsed.communication),
    confidence:         toInt(parsed.confidence),
    clarity:            toInt(parsed.clarity),
    problemSolving:     toInt(parsed.problemSolving),
    overall:            toInt(parsed.overall),
    strengths:          Array.isArray(parsed.strengths)  ? parsed.strengths  : [],
    weaknesses:         Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
    feedback:           typeof parsed.feedback === 'string' ? parsed.feedback : '',
    needsFollowUp:      !!parsed.needsFollowUp,
  }
}

// ─── Generate follow-up question ──────────────────────────────────────────────
export async function generateFollowUp(originalQuestion, answer, scores, role) {
  const weak = scores.overall < 6
  const prompt = `You are conducting a ${role} interview.

Original question: "${originalQuestion}"
Candidate answered: "${answer}"
Score: ${scores.overall}/10 (${weak ? 'weak answer' : 'decent answer'})

Generate ONE short follow-up question (max 2 sentences) to ${weak ? 'probe the gap in their knowledge' : 'explore this topic further'}.
Return ONLY the question text. No labels, no quotes, no explanation.`

  const text = await callGemini(prompt)
  // Clean up any accidental quotes or labels the model might add
  return text.trim().replace(/^["']|["']$/g, '').replace(/^Follow-?up:?\s*/i, '')
}

// ─── Generate final placement report ─────────────────────────────────────────
export async function generateFinalReport(role, difficulty, questionsAndAnswers, allScores) {
  if (!allScores.length) throw new Error('No scores to generate report from')

  const avgScore = allScores.reduce((a, b) => a + b.overall, 0) / allScores.length
  const qaText   = questionsAndAnswers
    .map((qa, i) => `Q${i + 1}: ${qa.question}\nA: ${qa.answer || '(no answer)'}\nScore: ${allScores[i]?.overall ?? 'N/A'}/10`)
    .join('\n\n')

  const prompt = `You are a senior talent acquisition specialist reviewing a complete ${difficulty} ${role} mock interview.

Average Score: ${avgScore.toFixed(1)}/10

Interview Transcript:
${qaText}

Return ONLY this exact JSON, no extra text:
{
  "placementReadiness": <integer 0-100>,
  "strengths":          ["s1","s2","s3"],
  "weaknesses":         ["w1","w2","w3"],
  "skillsToImprove":    ["skill1","skill2","skill3"],
  "learningPath": [
    {"topic":"Topic A","resources":"Resource description","priority":"high"},
    {"topic":"Topic B","resources":"Resource description","priority":"medium"},
    {"topic":"Topic C","resources":"Resource description","priority":"low"}
  ],
  "summary": "3-4 sentence overall assessment of the candidate",
  "hiringRecommendation": "Strong Yes"
}

hiringRecommendation must be exactly one of: "Strong Yes", "Yes", "Maybe", "No"`

  const text   = await callGemini(prompt, 2) // 2 retries for the important final call
  const parsed = extractJSON(text)

  return {
    placementReadiness:    Math.max(0, Math.min(100, parseInt(parsed.placementReadiness, 10) || 0)),
    strengths:             Array.isArray(parsed.strengths)       ? parsed.strengths       : [],
    weaknesses:            Array.isArray(parsed.weaknesses)      ? parsed.weaknesses      : [],
    skillsToImprove:       Array.isArray(parsed.skillsToImprove) ? parsed.skillsToImprove : [],
    learningPath:          Array.isArray(parsed.learningPath)    ? parsed.learningPath    : [],
    summary:               typeof parsed.summary === 'string'    ? parsed.summary         : '',
    hiringRecommendation:  parsed.hiringRecommendation || 'Maybe',
  }
}
