import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const navItems = [
  ["about", "About"],
  ["academic", "Academic"],
  ["resume", "Resume"],
  ["clubs", "Clubs & Extra"],
  ["credentials", "Certifications"],
  ["profiles", "Coding Profiles"],
  ["hackathons", "Hackathons"],
  ["contact", "Contact"]
];

function SectionTitle({ no, label, title, text }) {
  return (
    <div className="section-title">
      <div className="eyebrow"><span>{no}</span>{label}</div>
      <h2>{title}</h2>
      {text && <p>{text}</p>}
    </div>
  );
}

function App() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/profile`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setProfile)
      .catch(() => setError("The portfolio server is not running. Start it with npm run dev."));
  }, []);

  if (error) return <main className="error-page"><div><span className="eyebrow">CONNECTION ERROR</span><h1>Portfolio server not connected.</h1><p>{error}</p><code>npm run dev</code></div></main>;
  if (!profile) return <div className="loading-page">Loading portfolio…</div>;

  const project = profile.projects?.[0];

  return (
    <div className="site-shell">
      <header className="topbar">
        <a className="brand" href="#home" onClick={() => setMenuOpen(false)}>
          <span className="brand-mark">TB</span>
          <span><b>TEJASWINI BANDLA</b><small>CSE · AI & ML</small></span>
        </a>
        <button className="menu-button" onClick={() => setMenuOpen(v => !v)} aria-label="Open menu">☰</button>
        <nav className={menuOpen ? "nav open" : "nav"}>
          {navItems.map(([id, label]) => <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)}>{label}</a>)}
        </nav>
        <a className="resume-top" href={profile.resume} target="_blank" rel="noreferrer">Resume ↗</a>
      </header>

      <main>
        <section id="home" className="hero">
          <div className="hero-main">
            <span className="kicker">VNR VJIET · HYDERABAD · 2025—2029</span>
            <h1>Tejaswini <i>Bandla.</i></h1>
            <h3>{profile.headline}</h3>
            <p>{profile.tagline}</p>
            <div className="hero-actions"><a className="btn dark" href="#academic">View profile ↓</a><a className="btn light" href="#contact">Contact ↗</a></div>
          </div>
          <aside className="hero-score">
            <span className="mini-label">ACADEMIC SCORE</span>
            <strong>{profile.education.cgpa}</strong>
            <span>CGPA / 10</span>
            <hr />
            <b>{profile.education.degree}</b>
            <small>{profile.education.college}</small>
          </aside>
        </section>

        <section id="about" className="section white">
          <SectionTitle no="01" label="ABOUT" title="A focused student profile." />
          <div className="about-grid">
            <div className="about-lead">Building fundamentals in <em>software + AI.</em></div>
            <div>{profile.about.map((p, i) => <p key={i}>{p}</p>)}</div>
          </div>
        </section>

        <section id="academic" className="section soft">
          <SectionTitle no="02" label="ACADEMIC PROFILE" title="Academics, skills and one featured project." />
          <article className="degree-row">
            <div className="icon-box">AI</div>
            <div><span className="label">CURRENT DEGREE · 2025—2029</span><h3>{profile.education.degree}</h3><p>{profile.education.college} · {profile.education.year}</p></div>
            <div className="cgpa"><strong>{profile.education.cgpa}</strong><span>CGPA</span></div>
          </article>
          <div className="skill-section">
            <div className="subhead"><span>TECHNICAL SKILLS</span><small>Current toolkit</small></div>
            <div className="skill-grid">
              {Object.entries(profile.skills).map(([group, skills]) => <div className="skill-group" key={group}><b>{group}</b><p>{skills.join(" · ")}</p></div>)}
            </div>
          </div>
          {project && <article className="project-card">
            <div className="project-index">01</div>
            <div><span className="label">FEATURED PROJECT</span><h3>{project.name}</h3><p>{project.description}</p><div className="tags">{project.technologies.map(t => <span key={t}>{t}</span>)}</div></div>
            {project.repository && <a className="repo-link" href={project.repository} target="_blank" rel="noreferrer">GitHub ↗</a>}
          </article>}
        </section>

        <section id="resume" className="section white">
          <SectionTitle no="03" label="RESUME" title="One page. Ready to review." />
          <div className="resume-row"><div className="document-icon">PDF</div><div><h3>Tejaswini Bandla</h3><p>B.Tech CSE (AI & ML) · VNR VJIET · 9.68 CGPA</p></div><a className="btn dark" href={profile.resume} target="_blank" rel="noreferrer">Open resume ↗</a></div>
        </section>

        <section id="clubs" className="section soft">
          <SectionTitle no="04" label="CLUBS & EXTRA" title="Student communities." />
          <div className="club-grid">{profile.community.map((item, i) => <article className="club-card" key={item.title}><span className="club-icon">{i === 0 ? "SC" : "TH"}</span><div><span className="label">{item.role}</span><h3>{item.title}</h3><p>{item.description}</p></div></article>)}</div>
        </section>

        <section id="credentials" className="section white">
          <SectionTitle no="05" label="CERTIFICATIONS" title="Verified learning." />
          {profile.certifications.map(item => <article className="cert-row" key={item.title}><span className="cert-icon">N</span><div><span className="label">NPTEL</span><h3>{item.title}</h3><p>{item.subtitle}</p></div><span className="cert-grade">SILVER</span></article>)}
        </section>

        <section id="profiles" className="section soft">
          <SectionTitle no="06" label="CODING PROFILES" title="Practice, tracked across platforms." />
          <div className="profile-grid">{profile.coding_profiles.map(item => <a className="profile-card" href={item.url} target="_blank" rel="noreferrer" key={item.name}><div className="platform-icon">{item.name === "CodeChef" ? "CC" : item.name === "HackerRank" ? "HR" : "LC"}</div><div><span className="label">{item.name}</span><h3>{item.username}</h3><p>{item.detail}</p></div><b>↗</b></a>)}</div>
        </section>

        <section id="hackathons" className="section white">
          <SectionTitle no="07" label="HACKATHONS & CONTESTS" title="Selective technical participation." />
          <div className="timeline">{profile.contests.map((item, i) => <article className="timeline-row" key={item.title}><span>0{i + 1}</span><div><span className="label">{item.label}</span><h3>{item.title}</h3><p>{item.description}</p></div></article>)}</div>
        </section>

        <section id="contact" className="contact-section">
          <div><div className="eyebrow"><span>08</span>CONTACT</div><h2>Let's connect.</h2><p>For recruitment, collaboration or technical discussions.</p></div>
          <div className="contact-list"><a href={`mailto:${profile.contact.email}`}><span>EMAIL</span><b>{profile.contact.email}</b><i>↗</i></a><a href={profile.links.linkedin} target="_blank" rel="noreferrer"><span>LINKEDIN</span><b>Professional profile</b><i>↗</i></a><a href={profile.links.github} target="_blank" rel="noreferrer"><span>GITHUB</span><b>Code & repositories</b><i>↗</i></a></div>
        </section>
      </main>

      <footer><span>TEJASWINI BANDLA · CSE (AI & ML) · VNR VJIET</span><span>Krithomed Technical Round</span></footer>
      <Chatbot />
    </div>
  );
}

function Chatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([{ role: "assistant", text: "Hi, I’m TejuBot. Ask me for a specific detail about Tejaswini’s profile." }]);
  const suggestions = ["What is her CGPA?", "What are her coding profiles?", "Tell me about Web Forge AI", "What did she achieve in CodeFrenzy?"];
  async function sendMessage(value = input) {
    const q = value.trim(); if (!q || loading) return;
    setMessages(m => [...m, { role: "user", text: q }]); setInput(""); setLoading(true);
    try {
      const r = await fetch(`${API_URL}/api/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: q }) });
      const data = await r.json(); if (!r.ok) throw new Error();
      setMessages(m => [...m, { role: "assistant", text: data.answer }]);
    } catch { setMessages(m => [...m, { role: "assistant", text: "I can’t reach the profile assistant right now. Please check that the backend is running." }]); }
    finally { setLoading(false); }
  }
  return <>
    {open && <div className="chat-window"><div className="chat-header"><div><span>PROFILE SEARCH ASSISTANT</span><b>TejuBot</b><small>Keyword + semantic retrieval</small></div><button onClick={() => setOpen(false)}>×</button></div><div className="chat-body">{messages.map((m, i) => <div key={i} className={`bubble ${m.role}`}>{m.text}</div>)}{loading && <div className="bubble assistant">Searching the profile…</div>}</div>{messages.length === 1 && <div className="suggestions">{suggestions.map(s => <button key={s} onClick={() => sendMessage(s)}>{s}</button>)}</div>}<form className="chat-form" onSubmit={e => { e.preventDefault(); sendMessage(); }}><input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask for a specific detail…"/><button disabled={loading}>→</button></form></div>}
    <button className="chat-fab" onClick={() => setOpen(v => !v)}>✦ {open ? "Close" : "Ask TejuBot"}</button>
  </>;
}

export default App;
