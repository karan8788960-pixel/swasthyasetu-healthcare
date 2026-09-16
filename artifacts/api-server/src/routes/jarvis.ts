import { Router, type IRouter } from "express";
import { AskJarvisBody, AskJarvisResponse } from "@workspace/api-zod";

const router: IRouter = Router();
const buckets = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 24;

const SYSTEM_PROMPT = `You are SwasthyaSetu JARVIS, a rural healthcare navigation assistant.
Never diagnose, prescribe, or give personalized dosing. For emergencies such as chest pain,
severe breathing difficulty, unconsciousness, heavy bleeding, stroke signs, or severe injury,
tell the user to use SOS or call emergency services immediately. Keep replies short and clear.
Reply in the language mix used by the user.`;

function isRateLimited(key: string) {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || now > existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  existing.count += 1;
  return existing.count > MAX_PER_WINDOW;
}

function localReply(query: string) {
  const q = query.toLowerCase();
  if (/chest pain|saans|breathing|unconscious|बेहोश|bleeding|stroke|accident|emergency/.test(q)) {
    return "Yeh emergency ho sakti hai. Abhi SOS dabayein ya 108/112 par call karein. Khud drive na karein; paas ke vyakti se help lein.";
  }
  if (q.includes("hospital") || q.includes("facility") || q.includes("aspataal")) {
    return "Main aapke liye nearest healthcare facility dhoondh sakta hoon. Healthcare Finder kholiye, emergency filter lagaiye, aur phone karke availability confirm karein.";
  }
  if (q.includes("doctor") || q.includes("doctor search")) {
    return "Doctor Discovery mein specialty aur video/in-person mode choose karke available doctor ka slot book karein.";
  }
  if (q.includes("paracetamol") || q.includes("medicine") || q.includes("dawai")) {
    return "Medicine ki dose age, weight aur medical history par depend karti hai. Prescription ya dose ke liye doctor/pharmacist se confirm karein; main sirf general information de sakta hoon.";
  }
  if (q.includes("fever") || q.includes("bukhar")) {
    return "Paani piyen, rest karein aur temperature note karein. Tez bukhar, rash, saans ki dikkat, dehydration, ya 2 din se zyada symptoms ho to doctor se consult karein.";
  }
  return "Main aapko hospital, doctor, appointment aur general health education mein guide kar sakta hoon. Aap apna sawaal Hindi, Hinglish ya English mein pooch sakte hain.";
}

async function providerReply(query: string, role: string | null | undefined, lastMedicine: string | null | undefined) {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return null;
  const endpoint = process.env.XAI_API_URL ?? "https://api.x.ai/v1/chat/completions";
  const model = process.env.XAI_MODEL ?? "grok-4-1-fast-non-reasoning";
  const context = [role ? `Role: ${role}` : "", lastMedicine ? `Previous medicine: ${lastMedicine}` : ""]
    .filter(Boolean)
    .join("\n");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `${context}\n${query}`.trim() },
      ],
      max_tokens: 400,
    }),
  });
  if (!response.ok) return null;
  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content?.trim() || null;
}

router.post("/jarvis", async (req, res) => {
  const body = AskJarvisBody.parse(req.body);
  const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() ?? req.ip ?? "anon";
  if (isRateLimited(ip)) {
    res.status(429).json({ error: "Too many questions. Please try again in a few minutes." });
    return;
  }
  try {
    const reply = await providerReply(body.query, body.role, body.lastMedicine);
    res.json(AskJarvisResponse.parse({ reply: reply ?? localReply(body.query), source: reply ? "provider" : "local" }));
  } catch {
    res.json(AskJarvisResponse.parse({ reply: localReply(body.query), source: "local" }));
  }
});

export default router;