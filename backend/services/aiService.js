const OpenAI = require("openai");
const { fallbackImprove, extractKeywords, extractSkills } = require("../utils/keywords");

let client = null;
if (process.env.OPENAI_API_KEY) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function improveText(text, section = "summary", iteration = 1) {
  const clean = String(text || "").trim();
  if (!client) return fallbackImprove(clean, section, Number(iteration) || 1);

  const styles = [
    "lead with the candidate's strongest professional identity and core value",
    "lead with technical strengths and the kind of problems the candidate solves",
    "lead with impact, delivery, collaboration, and practical outcomes",
    "lead with domain expertise, adaptability, and the candidate's strongest capabilities"
  ];
  const style = styles[(Math.max(1, Number(iteration) || 1) - 1) % styles.length];

  const prompt = `Rewrite this resume ${section} from scratch while preserving every factual detail from the original.\n\nRules:\n- Do not invent employers, degrees, dates, technologies, certifications, metrics, achievements or years of experience.\n- Do not simply prepend phrases such as "motivated professional".\n- Do not copy the original sentence structure.\n- Produce a meaningfully different version on every request.\n- Keep it concise, professional and ATS-friendly.\n- ${style}.\n- Return only the rewritten text.\n\nRewrite iteration: ${iteration}\nOriginal:\n${clean}`;

  const response = await client.responses.create({model:"gpt-5-mini",input:prompt});
  return response.output_text.trim();
}

async function analyzeJob(text) {
  const skills = extractSkills(text);
  const keywords = extractKeywords(text, 30);
  if (!client) return {mode:"local-nlp",keywords,skills,roleHints:detectRoleHints(text)};

  const prompt = `Analyze this job description for a resume builder. Return JSON with keys: role, keywords (array max 20), skills (array max 20), responsibilities (array max 8). Do not invent information.\nJob description:\n${text}`;
  const response = await client.responses.create({model:"gpt-5-mini",input:prompt});
  try { return {mode:"ai",...JSON.parse(response.output_text)}; }
  catch { return {mode:"local-nlp",keywords,skills,roleHints:detectRoleHints(text)}; }
}

function detectRoleHints(text) {
  const t = text.toLowerCase(); const hints=[];
  if(t.includes("software")||t.includes("developer"))hints.push("Software/Development");
  if(t.includes("data")||t.includes("analytics"))hints.push("Data/Analytics");
  if(t.includes("machine learning")||t.includes("nlp"))hints.push("AI/ML");
  if(t.includes("cloud")||t.includes("aws")||t.includes("azure"))hints.push("Cloud");
  return hints;
}
module.exports={improveText,analyzeJob};
