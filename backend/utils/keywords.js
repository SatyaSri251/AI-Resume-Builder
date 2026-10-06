const STOP_WORDS = new Set(`
a an the and or but for to of in on with from by as at is are be been being
this that these those it its into about we you your our their they he she
will would should can could may might must have has had do does did not
role job work working experience years year using use used build built
develop developed development responsible responsibilities required preferred
candidate candidates team teams
`.split(/\s+/));

const KNOWN_SKILLS = [
  "Java","Python","JavaScript","TypeScript","C","C++","HTML","CSS","React",
  "Angular","Node.js","Express.js","Spring Boot","REST API","PostgreSQL",
  "MySQL","MongoDB","SQL","Git","GitHub","Docker","AWS","Azure",
  "Machine Learning","Deep Learning","NLP","TensorFlow","PyTorch",
  "Data Structures","Algorithms","OOP","Linux","Agile","Jira",
  "Communication","Leadership"
];

function normalize(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9+#.\- ]/g, " ");
}

function extractKeywords(text, limit = 30) {
  const normalized = normalize(text);
  const words = normalized.split(/\s+/).filter(Boolean);
  const counts = new Map();

  for (const word of words) {
    if (word.length < 3 || STOP_WORDS.has(word)) continue;
    counts.set(word, (counts.get(word) || 0) + 1);
  }

  const skillMatches = KNOWN_SKILLS.filter(skill =>
    normalized.includes(skill.toLowerCase())
  );

  const common = [...counts.entries()]
    .sort((a,b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);

  return [...new Set([...skillMatches, ...common])].slice(0, limit);
}

function extractSkills(text) {
  const normalized = normalize(text);
  return KNOWN_SKILLS.filter(skill => normalized.includes(skill.toLowerCase()));
}

function atsCheck(resume, jobDescription = "") {
  const resumeText = [
    resume.title, resume.objective, resume.summary, resume.phone,
    resume.location, resume.educationText, resume.experienceText,
    resume.projectsText, resume.skillsText
  ].join(" ").toLowerCase();

  const keywords = extractKeywords(jobDescription, 30);
  const matched = keywords.filter(k => resumeText.includes(k.toLowerCase()));
  const missing = keywords.filter(k => !resumeText.includes(k.toLowerCase()));

  let score = keywords.length
    ? Math.round((matched.length / keywords.length) * 100)
    : 0;

  const warnings = [];
  if (!resume.summary?.trim()) warnings.push("Add a professional summary.");
  if (!resume.skillsText?.trim()) warnings.push("Add relevant technical and soft skills.");
  if (!resume.experienceText?.trim() && !resume.projectsText?.trim()) {
    warnings.push("Add experience or project achievements.");
  }
  if ((resume.summary || "").length < 60) warnings.push("Make the summary more specific and achievement-focused.");
  if (resumeText.includes("photo") || resumeText.includes("date of birth")) {
    warnings.push("Avoid unnecessary personal information for ATS-focused resumes.");
  }

  return {
    score,
    matchedKeywords: matched,
    missingKeywords: missing,
    warnings,
    keywordCoverage: keywords.length ? `${matched.length}/${keywords.length}` : "0/0"
  };
}

function fallbackImprove(text, section = "summary", iteration = 1) {
  const clean = String(text || "").trim();
  if (!clean) return "Add a concise, achievement-focused description.";
  if (section !== "summary") {
    return clean
      .replace(/\bworked on\b/gi, "Developed")
      .replace(/\bmade\b/gi, "Implemented")
      .replace(/\bhelped\b/gi, "Contributed to")
      .replace(/\bused\b/gi, "Utilized")
      .replace(/\bdid\b/gi, "Executed");
  }

  const facts = clean
    .replace(/^motivated professional with experience in\s*/i, "")
    .replace(/[.!?]+$/, "")
    .trim();
  const variants = [
    `Professional with hands-on experience in ${facts}. Brings practical technical knowledge, problem-solving ability, and a strong focus on delivering reliable solutions and collaborating effectively with teams.`,
    `Experienced in ${facts}, with a practical approach to solving problems and delivering quality work. Combines relevant technical capabilities with clear communication, adaptability, and consistent execution.`,
    `Technical professional experienced in ${facts}. Focused on turning requirements into practical solutions, working effectively with teams, and applying relevant skills to deliver dependable results.`,
    `Versatile professional with experience in ${facts}. Applies technical knowledge, analytical thinking, and collaborative working practices to build useful solutions and support successful project outcomes.`
  ];
  return variants[(Math.max(1, Number(iteration) || 1) - 1) % variants.length];
}
module.exports = { extractKeywords, extractSkills, atsCheck, fallbackImprove, KNOWN_SKILLS };
