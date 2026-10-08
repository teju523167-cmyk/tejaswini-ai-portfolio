import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const profilePath = path.join(__dirname, "data", "profile.json");
const profile = JSON.parse(fs.readFileSync(profilePath, "utf-8"));

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const embeddingModel = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
let documentEmbeddings = null;

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", chatbotMode: openai ? "AI + keyword + semantic embeddings" : "keyword + local semantic similarity" });
});

app.get("/api/profile", (req, res) => res.json(profile));

// ---------- Hybrid retrieval ----------
const stopWords = new Set([
  "a", "an", "the", "is", "are", "was", "were", "what", "who", "where", "when", "why", "how",
  "does", "do", "did", "has", "have", "her", "his", "she", "he", "about", "tell", "me", "and",
  "or", "of", "to", "in", "on", "for", "with", "my", "your", "this", "that", "from", "can", "you"
]);

const synonyms = {
  cgpa: ["gpa", "grade", "academic", "marks", "score"],
  coding: ["leetcode", "codechef", "hackerrank", "programming", "problem", "dsa"],
  club: ["clubs", "community", "student", "street", "turing", "coordination"],
  hackathon: ["hackathon", "contest", "codefrenzy", "quantumard", "competition", "technical"],
  certificate: ["certification", "nptel", "silver", "credential"],
  resume: ["cv", "curriculum", "profile"],
  project: ["projects", "web", "forge", "application", "ai", "fullstack", "full-stack"],
  skills: ["technology", "technologies", "stack", "programming", "tools", "frameworks"],
  education: ["college", "degree", "btech", "academic", "study", "student"],
  contact: ["email", "linkedin", "github", "reach", "connect"]
};

function normalize(text) {
  return text.toLowerCase().replace(/[^a-z0-9+#.& -]/g, " ").replace(/\s+/g, " ").trim();
}

function tokens(text) {
  return normalize(text)
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t && !stopWords.has(t));
}

function expandQuery(query) {
  const base = tokens(query);
  const expanded = new Set(base);
  for (const token of base) {
    for (const [key, words] of Object.entries(synonyms)) {
      if (token === key || words.includes(token)) {
        expanded.add(key);
        words.forEach((word) => expanded.add(word));
      }
    }
  }
  return [...expanded];
}

function makeDocuments() {
  const docs = [];
  const add = (id, title, text, data) => docs.push({ id, title, text, data });

  add("about", "About", profile.about.join(" "), profile.about);
  add("education", "Academic Profile", `${profile.education.degree} ${profile.education.college} ${profile.education.period} ${profile.education.cgpa} ${profile.education.year}`, profile.education);
  add("skills", "Technical Skills", Object.entries(profile.skills).map(([k, v]) => `${k}: ${v.join(", ")}`).join(". "), profile.skills);
  add("project", "Web Forge AI", `${profile.projects[0]?.name} ${profile.projects[0]?.description} ${profile.projects[0]?.technologies.join(" ")}`, profile.projects[0]);
  add("resume", "Resume", "One-page resume containing education skills project achievements activities coding profiles and interests.", profile.resume);
  const certifications = Array.isArray(profile.certifications) ? profile.certifications : [];
  const codingProfiles = Array.isArray(profile.coding_profiles) ? profile.coding_profiles : [];
  const contests = Array.isArray(profile.contests)
    ? profile.contests
    : (Array.isArray(profile.hackathons) ? profile.hackathons : []);
  const community = Array.isArray(profile.community) ? profile.community : [];
  const contact = profile.contact || { email: "" };
  const links = profile.links || { github: "", linkedin: "" };

  add("certifications", "Certifications", certifications.map((x) => `${x.title} ${x.subtitle} ${x.description}`).join(" "), certifications);
  add("coding", "Coding Profiles", codingProfiles.map((x) => `${x.name} ${x.username} ${x.detail}`).join(" "), codingProfiles);
  add("hackathons", "Hackathons and Contests", contests.map((x) => `${x.title} ${x.label} ${x.description}`).join(" "), contests);
  add("clubs", "Clubs and Extra", community.map((x) => `${x.title} ${x.role} ${x.description}`).join(" "), community);
  add("contact", "Contact", `${contact.email} ${links.github} ${links.linkedin}`, contact);
  return docs;
}

const documents = makeDocuments();

function lexicalSemanticScores(query, docs) {
  const qTerms = expandQuery(query);
  const documentTokens = docs.map((doc) => tokens(doc.text));
  const df = new Map();
  for (const terms of documentTokens) {
    for (const term of new Set(terms)) df.set(term, (df.get(term) || 0) + 1);
  }
  const N = docs.length;
  const qSet = new Set(qTerms);

  return docs.map((doc, index) => {
    const terms = documentTokens[index];
    const tf = new Map();
    for (const term of terms) tf.set(term, (tf.get(term) || 0) + 1);
    const vector = new Map();
    for (const term of new Set([...terms, ...qTerms])) {
      const idf = Math.log((N + 1) / ((df.get(term) || 0) + 1)) + 1;
      vector.set(term, (tf.get(term) || 0) * idf);
    }
    let dot = 0, qNorm = 0, dNorm = 0;
    for (const term of vector.keys()) {
      const q = qSet.has(term) ? 1 : 0;
      const d = vector.get(term);
      dot += q * d;
      qNorm += q * q;
      dNorm += d * d;
    }
    return qNorm && dNorm ? dot / (Math.sqrt(qNorm) * Math.sqrt(dNorm)) : 0;
  });
}

async function semanticEmbeddingScores(query, docs) {
  if (!openai) return null;
  try {
    if (!documentEmbeddings) {
      const response = await openai.embeddings.create({ model: embeddingModel, input: docs.map(d => `${d.title}. ${d.text}`) });
      documentEmbeddings = response.data.map(x => x.embedding);
    }
    const response = await openai.embeddings.create({ model: embeddingModel, input: query });
    const q = response.data[0].embedding;
    const cosine = (a, b) => {
      let dot = 0, na = 0, nb = 0;
      for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
      return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
    };
    return documentEmbeddings.map(v => cosine(q, v));
  } catch (error) {
    console.warn("Semantic embedding search unavailable; using local lexical similarity.", error.message);
    return null;
  }
}

function keywordScore(query, doc) {
  const q = normalize(query);
  const terms = expandQuery(query);
  const text = normalize(`${doc.title} ${doc.text}`);
  let score = 0;
  for (const term of terms) {
    if (text.includes(term)) score += q.includes(term) ? 2 : 1;
  }
  if (text.includes(q) && q.length > 3) score += 5;
  return score;
}

async function retrieve(query, limit = 5) {
  const localSemantic = lexicalSemanticScores(query, documents);
  const embeddingSemantic = await semanticEmbeddingScores(query, documents);
  const semantic = embeddingSemantic || localSemantic;
  return documents
    .map((doc, i) => {
      const keyword = keywordScore(query, doc);
      const semanticScore = semantic[i] || 0;
      const combined = keyword * 0.55 + semanticScore * 10 * 0.45;
      return { ...doc, keyword, semantic: semanticScore, score: combined };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function directIntentAnswer(question) {
  const q = normalize(question);

  if (/\b(cgpa|gpa|grade|marks|academic score|score)\b/.test(q)) {
    return `Tejaswini's CGPA is ${profile.education.cgpa}/10. She is a ${profile.education.year} student pursuing ${profile.education.degree} at ${profile.education.college}.`;
  }

  if (/\b(codechef|code chef)\b/.test(q)) {
    const p = profile.coding_profiles.find(x => x.name.toLowerCase() === 'codechef');
    return `CodeChef: ${p.username}. Rating ${p.detail.replace('Rating ', '')}.`;
  }

  if (/\b(leetcode|leet code)\b/.test(q)) {
    const p = profile.coding_profiles.find(x => x.name.toLowerCase() === 'leetcode');
    return `LeetCode: ${p.username}. ${p.detail}.`;
  }

  if (/\b(hackerrank|hacker rank)\b/.test(q)) {
    const p = profile.coding_profiles.find(x => x.name.toLowerCase() === 'hackerrank');
    return `HackerRank: ${p.username}. ${p.detail}.`;
  }

  if (/\b(coding profiles?|coding platforms?|programming profiles?)\b/.test(q)) {
    return profile.coding_profiles.map(x => `${x.name}: ${x.username} — ${x.detail}`).join(' | ');
  }

  if (/\b(nptel|certification|certificate|certificates)\b/.test(q)) {
    return profile.certifications.map(x => `${x.title}: ${x.subtitle}. ${x.description}`).join(' | ');
  }

  if (/\b(street cause|turing hut|clubs?|club activities|student activities)\b/.test(q)) {
    return profile.community.map(x => `${x.title} — ${x.role}: ${x.description}`).join(' | ');
  }

  if (/\b(codefrenzy|quantumard|hackathon|contest|competition)\b/.test(q)) {
    const matches = profile.contests.filter(x => q.includes(normalize(x.title).split(' ')[0]) || /hackathon|contest|competition|codefrenzy|quantumard/.test(q));
    const list = matches.length ? matches : profile.contests;
    return list.map(x => `${x.title} — ${x.description}`).join(' | ');
  }

 if (
  /\b(project title|project name|name of (the|her) project|title of (the|her) project)\b/.test(q)
) {
  const p = profile.projects?.[0];

  if (!p) {
    return "No project is currently listed in Tejaswini's portfolio.";
  }

  return `The project title is ${p.name}.`;
}

if (
  /\b(web forge|project|projects?|ai project|full[- ]stack project|what did (she|tejaswini) build|what has (she|tejaswini) built)\b/.test(q)
) {
  const p = profile.projects?.[0];

  if (!p) {
    return "No project information is currently listed.";
  }

  return `${p.name}: ${p.description} Technologies: ${p.technologies.join(", ")}.`;
}

  if (/\b(skill|skills|technolog(?:y|ies)|tech stack|programming languages?|frameworks?|tools?)\b/.test(q)) {
    return Object.entries(profile.skills).map(([k, v]) => `${k}: ${v.join(', ')}`).join(' | ');
  }

  if (/\b(email|mail|contact|reach|linkedin|github)\b/.test(q)) {
    return `Email: ${profile.contact.email}. GitHub: ${profile.links.github}. LinkedIn: ${profile.links.linkedin}.`;
  }

  if (/\b(education|degree|college|university|study|student|academic profile)\b/.test(q)) {
    return `Tejaswini is pursuing ${profile.education.degree} at ${profile.education.college}. She is in ${profile.education.year} (${profile.education.period}) with a ${profile.education.cgpa} CGPA.`;
  }

  return null;
}

function formatRetrievedAnswer(question, results) {
  const direct = directIntentAnswer(question);
  if (direct) return direct;

  if (!results.length || results[0].score < 0.25) {
    return "I couldn't find that detail in Tejaswini's current portfolio profile. Try asking about her education, CGPA, skills, Web Forge AI, resume, clubs, certifications, coding profiles, hackathons or contact details.";
  }

  const top = results[0];
  if (top.id === "education") return `Tejaswini is pursuing ${profile.education.degree} at ${profile.education.college}. She is in ${profile.education.year} (${profile.education.period}) with a ${profile.education.cgpa} CGPA.`;
  if (top.id === "skills") return Object.entries(profile.skills).map(([k, v]) => `${k}: ${v.join(", ")}`).join(" | ");
  if (top.id === "project") { const p = profile.projects[0]; return `${p.name}: ${p.description} Technologies: ${p.technologies.join(", ")}.`; }
  if (top.id === "coding") return profile.coding_profiles.map(x => `${x.name}: ${x.username} (${x.detail})`).join(" | ");
  if (top.id === "hackathons") return profile.contests.map(x => `${x.title}: ${x.description}`).join(" | ");
  if (top.id === "clubs") return profile.community.map(x => `${x.title} — ${x.role}: ${x.description}`).join(" | ");
  if (top.id === "certifications") return profile.certifications.map(x => `${x.title}: ${x.subtitle}. ${x.description}`).join(" | ");
  if (top.id === "resume") return "Tejaswini's one-page resume is available through the Resume section.";
  if (top.id === "contact") return `Email: ${profile.contact.email}. GitHub: ${profile.links.github}. LinkedIn: ${profile.links.linkedin}.`;
  if (top.id === "about") return profile.about.join(" ");
  return `${top.title}: ${top.text}`;
}

function buildContext(results) {
  return results.map((r) => `### ${r.title}\n${r.text}`).join("\n\n");
}

app.post("/api/chat", async (req, res) => {
  const { message } = req.body;
  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "Please enter a message." });
  }

  const question = message.trim();
  const results = await retrieve(question, 5);
  const fallback = formatRetrievedAnswer(question, results);

  // If an API key and model are configured, the retrieved profile facts are passed to the model.
  // Without them, the portfolio still works using the local hybrid retriever.
  if (!openai || !process.env.OPENAI_MODEL) {
    return res.json({ answer: fallback, mode: "hybrid-local" });
  }

  try {
    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL,
      instructions: `You are TejuBot, the portfolio assistant for ${profile.name}. Answer ONLY from the retrieved portfolio context below. Do not invent facts. If the context does not contain the requested detail, clearly say it is not currently listed. Give precise answers and include usernames, scores, technologies, dates or roles when relevant.\n\nRETRIEVED CONTEXT:\n${buildContext(results)}`,
      input: question
    });
    res.json({ answer: response.output_text || fallback, mode: "ai + hybrid-retrieval" });
  } catch (error) {
    console.error("Chatbot error:", error);
    res.json({ answer: fallback, mode: "hybrid-local-fallback" });
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
