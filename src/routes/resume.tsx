import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Briefcase,
  Download,
  Eye,
  FileText,
  GraduationCap,
  Import,
  Pencil,
  Plus,
  Printer,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, Chip, SectionHeader } from "@/components/ui/primitives";
import { TextField, TextArea } from "@/components/edit/Fields";
import { ActionButton } from "@/components/edit/Buttons";
import { useAppStore, useHydrated } from "@/store/useAppStore";
import { saveBackupFile } from "@/lib/platform-files";
import { newId } from "@/lib/id";
import { haptics } from "@/lib/haptics";
import { sound } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { ResumeSchema, type ResumeData } from "@/lib/schema";

export const Route = createFileRoute("/resume")({
  head: () => ({
    meta: [
      { title: "Resume — SkillSync" },
      { name: "description", content: "Build a print-ready developer resume." },
      { property: "og:title", content: "Resume — SkillSync" },
      { property: "og:description", content: "Your story, formatted." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResumePage,
});

const SAMPLE_RESUME: ResumeData = {
  name: "Aditya Sharma",
  title: "Software Engineer (Final Year, B.Tech CSE)",
  email: "aditya.sharma@email.com",
  phone: "+91 98765 43210",
  location: "Delhi, India",
  website: "adityasharma.dev",
  github: "github.com/adityasharma",
  linkedin: "linkedin.com/in/adityasharma",
  summary:
    "Final-year CSE student and builder of full-stack products. Shipped 3 production apps used by 2k+ students, with a focus on TypeScript, React and systems design. Seeking SDE roles where I can turn ambiguous problems into fast, tested software.",
  skills: [
    "TypeScript",
    "React",
    "Node.js",
    "PostgreSQL",
    "Python",
    "Docker",
    "AWS (S3, EC2)",
    "Git & CI/CD",
  ],
  education: [
    {
      id: newId(),
      institution: "ABC Institute of Technology",
      degree: "B.Tech in Computer Science",
      field: "",
      start: "2022",
      end: "2026",
      score: "CGPA: 8.7 / 10",
    },
  ],
  experience: [
    {
      id: newId(),
      role: "Software Engineering Intern",
      company: "TechNova Labs",
      start: "May 2025",
      end: "Aug 2025",
      current: false,
      bullets: [
        "Rebuilt the billing dashboard in React + TypeScript, cutting page load time by 62%.",
        "Designed a Postgres schema migration pipeline used across 4 microservices.",
        "Introduced Playwright smoke tests, reducing post-release regressions by 40%.",
      ],
    },
  ],
  projects: [
    {
      id: newId(),
      name: "SkillSync OS",
      tech: "React 19 · TypeScript · Zustand · Capacitor",
      link: "github.com/adityasharma/skillsync",
      bullets: [
        "Offline-first personal growth OS with roadmap tracking, habits, focus timer and local notifications.",
        "Schema-versioned localStorage persistence with automated migrations and backup envelopes.",
        "Packaged as a signed Android APK via a GitHub Actions CI pipeline.",
      ],
    },
    {
      id: newId(),
      name: "CampusCafe",
      tech: "Node.js · Express · MongoDB · React Native",
      link: "",
      bullets: [
        "Order-ahead app for the campus cafeteria; served 1,200+ daily orders during peak hours.",
        "Cut average pickup wait from 14 minutes to 4 with real-time queue estimation.",
      ],
    },
  ],
  certifications: [
    { id: newId(), name: "AWS Cloud Practitioner", issuer: "Amazon Web Services", year: "2025" },
    { id: newId(), name: "Deep Learning Specialization", issuer: "Coursera", year: "2024" },
  ],
};

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {title}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function BulletList({
  bullets,
  onChange,
}: {
  bullets: string[];
  onChange: (bullets: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      {bullets.map((b, i) => (
        <div key={i} className="flex items-start gap-2">
          <TextArea
            value={b}
            onChange={(e) => onChange(bullets.map((x, j) => (j === i ? e.target.value : x)))}
            placeholder="• What did you build / improve / measure?"
            className="min-h-[44px]"
          />
          <button
            onClick={() => onChange(bullets.filter((_, j) => j !== i))}
            aria-label="Remove bullet"
            className="mt-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange([...bullets, ""])}
        className="flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-white/[0.1] py-2 text-[12px] font-medium text-muted-foreground transition-colors hover:border-white/[0.2] hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2} /> Add bullet
      </button>
    </div>
  );
}

function ResumePage() {
  const hydrated = useHydrated();
  const resume = useAppStore((s) => s.resume);
  const updateResume = useAppStore((s) => s.updateResume);
  const setResume = useAppStore((s) => s.setResume);
  const profileName = useAppStore((s) => s.profile.name);

  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [skillsDraft, setSkillsDraft] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const patch = (p: Partial<ResumeData>) => updateResume(p);

  const setItem = <K extends "education" | "experience" | "projects" | "certifications">(
    key: K,
    id: string,
    patchItem: Partial<ResumeData[K][number]>,
  ) => {
    const next = resume[key].map((item) => (item.id === id ? { ...item, ...patchItem } : item));
    updateResume({ [key]: next } as Partial<ResumeData>);
  };

  const addItem = <K extends "education" | "experience" | "projects" | "certifications">(
    key: K,
    factory: () => ResumeData[K][number],
  ) => {
    updateResume({ [key]: [...resume[key], factory()] } as Partial<ResumeData>);
    haptics.success();
    sound.success();
  };

  const removeItem = <K extends "education" | "experience" | "projects" | "certifications">(
    key: K,
    id: string,
  ) => {
    updateResume({ [key]: resume[key].filter((i) => i.id !== id) } as Partial<ResumeData>);
  };

  const commitSkills = () => {
    const skills = skillsDraft
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (skills.length === 0) return;
    patch({ skills: [...new Set([...resume.skills, ...skills])] });
    setSkillsDraft("");
  };

  const exportJson = async () => {
    const result = await saveBackupFile({
      filename: "skillsync-resume.json",
      text: JSON.stringify(resume, null, 2),
    });
    if (result.status === "saved" || result.status === "fallback-download") {
      toast.success("Resume exported");
    } else if (result.status !== "cancelled") {
      toast.error(result.message ?? "Export failed");
    }
  };

  const importJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = ResumeSchema.parse(JSON.parse(String(reader.result)));
        setResume(parsed);
        toast.success("Resume imported");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Invalid resume file");
      }
    };
    reader.readAsText(file);
  };

  const fillExample = () => {
    setResume(SAMPLE_RESUME);
    haptics.success();
    sound.success();
    toast.success("Example loaded — make it yours");
  };

  const ready = resume.name.trim().length > 0;

  return (
    <AppShell>
      <header className="mb-5 flex items-center justify-between px-5 lg:px-2">
        <Link
          to="/profile"
          className="glass flex h-10 w-10 items-center justify-center rounded-full active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="h-[17px] w-[17px] text-muted-foreground" strokeWidth={1.75} />
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={fillExample}
            className="pressable flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-[12.5px] font-medium transition-colors"
          >
            <Wand2 className="h-3.5 w-3.5" strokeWidth={2} /> Example
          </button>
          <button
            onClick={() => window.print()}
            className="gradient-primary flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-medium text-white shadow-[var(--shadow-glow)] transition-transform active:scale-95"
          >
            <Printer className="h-3.5 w-3.5" strokeWidth={2} /> Print / PDF
          </button>
        </div>
      </header>

      <div className="mb-5 px-5 lg:px-2">
        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Career
        </div>
        <h1 className="mt-1.5 text-[28px] font-semibold leading-tight tracking-[-0.02em]">
          Resume Builder.
        </h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          Structured data in, print-ready ATS-friendly resume out. Autosaves as you type.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-5 px-5 lg:px-2">
        <div className="glass inline-flex items-center gap-1 rounded-full p-1">
          {(
            [
              { key: "edit", label: "Edit", icon: Pencil },
              { key: "preview", label: "Preview", icon: Eye },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => {
                haptics.selection();
                setTab(key);
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[12.5px] font-medium transition-colors",
                tab === key ? "bg-white/[0.08] text-foreground" : "text-muted-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={2} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "edit" ? (
        <div className="space-y-6 px-5 lg:px-2 lg:auto-grid-wide lg:items-start lg:space-y-0">
          <section className="space-y-4">
            <Section title="Personal">
              <Card className="space-y-3 p-4">
                <div className="grid grid-cols-2 gap-3">
                  <TextField
                    value={resume.name}
                    onChange={(e) => patch({ name: e.target.value })}
                    placeholder={profileName !== "Learner" ? profileName : "Full name"}
                  />
                  <TextField
                    value={resume.title}
                    onChange={(e) => patch({ title: e.target.value })}
                    placeholder="Headline, e.g. Software Engineer"
                  />
                  <TextField
                    type="email"
                    value={resume.email}
                    onChange={(e) => patch({ email: e.target.value })}
                    placeholder="Email"
                  />
                  <TextField
                    value={resume.phone}
                    onChange={(e) => patch({ phone: e.target.value })}
                    placeholder="Phone"
                  />
                  <TextField
                    value={resume.location}
                    onChange={(e) => patch({ location: e.target.value })}
                    placeholder="City, Country"
                  />
                  <TextField
                    value={resume.website}
                    onChange={(e) => patch({ website: e.target.value })}
                    placeholder="Website (optional)"
                  />
                  <TextField
                    value={resume.github}
                    onChange={(e) => patch({ github: e.target.value })}
                    placeholder="GitHub"
                  />
                  <TextField
                    value={resume.linkedin}
                    onChange={(e) => patch({ linkedin: e.target.value })}
                    placeholder="LinkedIn"
                  />
                </div>
              </Card>
            </Section>

            <Section title="Summary">
              <Card className="p-4">
                <TextArea
                  value={resume.summary}
                  onChange={(e) => patch({ summary: e.target.value })}
                  placeholder="2-3 sentences: who you are, what you've built, what you're looking for. Quantify where you can."
                  className="min-h-[96px]"
                />
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Pro tip: lead with an outcome — “Shipped X, improved Y by Z%”.
                </p>
              </Card>
            </Section>

            <Section title="Skills">
              <Card className="space-y-3 p-4">
                <div className="flex flex-wrap gap-2">
                  {resume.skills.map((s) => (
                    <button
                      key={s}
                      onClick={() => patch({ skills: resume.skills.filter((x) => x !== s) })}
                      className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[12px] font-medium transition-colors hover:border-danger/40 hover:text-danger"
                      title="Remove"
                    >
                      {s} ×
                    </button>
                  ))}
                  {resume.skills.length === 0 ? (
                    <span className="text-[12.5px] text-muted-foreground">No skills yet.</span>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <TextField
                    value={skillsDraft}
                    onChange={(e) => setSkillsDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        commitSkills();
                      }
                    }}
                    placeholder="Type a skill and press Enter (comma-separated works too)"
                  />
                  <ActionButton size="sm" variant="ghost" onClick={commitSkills}>
                    <Plus className="h-4 w-4" strokeWidth={2} /> Add
                  </ActionButton>
                </div>
              </Card>
            </Section>
          </section>

          <section className="space-y-4">
            <Section
              title="Education"
              action={
                <button
                  onClick={() =>
                    addItem("education", () => ({
                      id: newId(),
                      institution: "",
                      degree: "",
                      field: "",
                      start: "",
                      end: "",
                      score: "",
                    }))
                  }
                  className="text-[12px] font-medium text-[var(--primary)]"
                >
                  + Add
                </button>
              }
            />
            {resume.education.map((edu) => (
              <Card key={edu.id} className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <Chip tone="primary">
                    <GraduationCap className="h-3 w-3" strokeWidth={2} /> Education
                  </Chip>
                  <button
                    onClick={() => removeItem("education", edu.id)}
                    aria-label="Remove education"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <TextField
                    className="col-span-2"
                    value={edu.institution}
                    onChange={(e) => setItem("education", edu.id, { institution: e.target.value })}
                    placeholder="Institution"
                  />
                  <TextField
                    className="col-span-2"
                    value={edu.degree}
                    onChange={(e) => setItem("education", edu.id, { degree: e.target.value })}
                    placeholder="Degree, e.g. B.Tech in Computer Science"
                  />
                  <TextField
                    value={edu.start}
                    onChange={(e) => setItem("education", edu.id, { start: e.target.value })}
                    placeholder="Start year"
                  />
                  <TextField
                    value={edu.end}
                    onChange={(e) => setItem("education", edu.id, { end: e.target.value })}
                    placeholder="End year"
                  />
                  <TextField
                    className="col-span-2"
                    value={edu.score}
                    onChange={(e) => setItem("education", edu.id, { score: e.target.value })}
                    placeholder="Score, e.g. CGPA: 8.7 / 10"
                  />
                </div>
              </Card>
            ))}
          </section>

          <section className="space-y-4 lg:col-span-2">
            <Section
              title="Experience"
              action={
                <button
                  onClick={() =>
                    addItem("experience", () => ({
                      id: newId(),
                      role: "",
                      company: "",
                      start: "",
                      end: "",
                      current: false,
                      bullets: [""],
                    }))
                  }
                  className="text-[12px] font-medium text-[var(--primary)]"
                >
                  + Add
                </button>
              }
            />
            {resume.experience.map((exp) => (
              <Card key={exp.id} className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <Chip tone="primary">
                    <Briefcase className="h-3 w-3" strokeWidth={2} /> Experience
                  </Chip>
                  <button
                    onClick={() => removeItem("experience", exp.id)}
                    aria-label="Remove experience"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <TextField
                    value={exp.role}
                    onChange={(e) => setItem("experience", exp.id, { role: e.target.value })}
                    placeholder="Role, e.g. SWE Intern"
                  />
                  <TextField
                    value={exp.company}
                    onChange={(e) => setItem("experience", exp.id, { company: e.target.value })}
                    placeholder="Company"
                  />
                  <TextField
                    value={exp.start}
                    onChange={(e) => setItem("experience", exp.id, { start: e.target.value })}
                    placeholder="Start, e.g. May 2025"
                  />
                  <TextField
                    value={exp.current ? "Present" : exp.end}
                    onChange={(e) =>
                      setItem("experience", exp.id, {
                        end: e.target.value,
                        current: false,
                      })
                    }
                    placeholder="End, e.g. Aug 2025"
                  />
                </div>
                <BulletList
                  bullets={exp.bullets}
                  onChange={(bullets) => setItem("experience", exp.id, { bullets })}
                />
              </Card>
            ))}
            {resume.experience.length === 0 ? (
              <Card className="p-6 text-center text-[12.5px] text-muted-foreground">
                No experience yet — projects and internships both count.
              </Card>
            ) : null}
          </section>

          <section className="space-y-4 lg:col-span-2">
            <Section
              title="Projects"
              action={
                <button
                  onClick={() =>
                    addItem("projects", () => ({
                      id: newId(),
                      name: "",
                      tech: "",
                      link: "",
                      bullets: [""],
                    }))
                  }
                  className="text-[12px] font-medium text-[var(--primary)]"
                >
                  + Add
                </button>
              }
            />
            {resume.projects.map((proj) => (
              <Card key={proj.id} className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <Chip tone="info">
                    <FileText className="h-3 w-3" strokeWidth={2} /> Project
                  </Chip>
                  <button
                    onClick={() => removeItem("projects", proj.id)}
                    aria-label="Remove project"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <TextField
                    value={proj.name}
                    onChange={(e) => setItem("projects", proj.id, { name: e.target.value })}
                    placeholder="Project name"
                  />
                  <TextField
                    value={proj.tech}
                    onChange={(e) => setItem("projects", proj.id, { tech: e.target.value })}
                    placeholder="Tech stack"
                  />
                  <TextField
                    className="col-span-2"
                    value={proj.link}
                    onChange={(e) => setItem("projects", proj.id, { link: e.target.value })}
                    placeholder="Link (optional)"
                  />
                </div>
                <BulletList
                  bullets={proj.bullets}
                  onChange={(bullets) => setItem("projects", proj.id, { bullets })}
                />
              </Card>
            ))}
          </section>

          <section className="space-y-4">
            <Section
              title="Certifications"
              action={
                <button
                  onClick={() =>
                    addItem("certifications", () => ({
                      id: newId(),
                      name: "",
                      issuer: "",
                      year: "",
                    }))
                  }
                  className="text-[12px] font-medium text-[var(--primary)]"
                >
                  + Add
                </button>
              }
            />
            {resume.certifications.map((cert) => (
              <Card key={cert.id} className="flex items-center gap-3 p-4">
                <div className="grid min-w-0 flex-1 grid-cols-2 gap-3">
                  <TextField
                    value={cert.name}
                    onChange={(e) => setItem("certifications", cert.id, { name: e.target.value })}
                    placeholder="Certification"
                  />
                  <TextField
                    value={cert.issuer}
                    onChange={(e) => setItem("certifications", cert.id, { issuer: e.target.value })}
                    placeholder="Issuer"
                  />
                  <TextField
                    value={cert.year}
                    onChange={(e) => setItem("certifications", cert.id, { year: e.target.value })}
                    placeholder="Year"
                  />
                </div>
                <button
                  onClick={() => removeItem("certifications", cert.id)}
                  aria-label="Remove certification"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
              </Card>
            ))}
          </section>

          <section className="space-y-3 lg:col-span-2">
            <SectionHeader title="Data" />
            <Card className="flex flex-wrap items-center gap-2 p-4">
              <ActionButton size="sm" variant="ghost" onClick={exportJson}>
                <Download className="h-4 w-4" strokeWidth={2} /> Export JSON
              </ActionButton>
              <ActionButton size="sm" variant="ghost" onClick={() => fileRef.current?.click()}>
                <Import className="h-4 w-4" strokeWidth={2} /> Import JSON
              </ActionButton>
              <ActionButton size="sm" variant="ghost" onClick={fillExample}>
                <Sparkles className="h-4 w-4" strokeWidth={2} /> Load example
              </ActionButton>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) importJson(file);
                  e.target.value = "";
                }}
              />
            </Card>
          </section>
        </div>
      ) : (
        /* ------------------------------------------------ Preview ------- */
        <div className="px-5 lg:px-2">
          <div className="mx-auto max-w-[210mm]">
            <div className="resume-print rounded-[8px] border border-border bg-white p-10 text-[#18181b] shadow-[var(--shadow-float)]">
              {ready ? (
                <div>
                  <header className="border-b-2 border-[#18181b] pb-4">
                    <h2 className="text-[26px] font-bold leading-tight tracking-tight">
                      {resume.name}
                    </h2>
                    <div className="mt-0.5 text-[13.5px] font-medium text-[#3f3f46]">
                      {resume.title}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-3 text-[11.5px] text-[#52525b]">
                      {[
                        resume.email,
                        resume.phone,
                        resume.location,
                        resume.website,
                        resume.github,
                        resume.linkedin,
                      ]
                        .filter(Boolean)
                        .map((line) => (
                          <span key={line}>{line}</span>
                        ))}
                    </div>
                  </header>

                  {resume.summary ? (
                    <p className="mt-4 text-[12px] leading-relaxed text-[#3f3f46]">
                      {resume.summary}
                    </p>
                  ) : null}

                  {resume.skills.length > 0 ? (
                    <section className="mt-4">
                      <h3 className="text-[12px] font-bold uppercase tracking-[0.12em]">Skills</h3>
                      <p className="mt-1.5 text-[12px] leading-relaxed text-[#3f3f46]">
                        {resume.skills.join(" · ")}
                      </p>
                    </section>
                  ) : null}

                  {resume.experience.length > 0 ? (
                    <section className="mt-4">
                      <h3 className="text-[12px] font-bold uppercase tracking-[0.12em]">
                        Experience
                      </h3>
                      {resume.experience.map((exp) => (
                        <div key={exp.id} className="mt-2">
                          <div className="flex items-baseline justify-between">
                            <span className="text-[12.5px] font-semibold">
                              {exp.role} · {exp.company}
                            </span>
                            <span className="text-[11px] text-[#52525b]">
                              {exp.start} – {exp.current ? "Present" : exp.end}
                            </span>
                          </div>
                          {exp.bullets.filter(Boolean).length > 0 ? (
                            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[12px] leading-relaxed text-[#3f3f46]">
                              {exp.bullets.filter(Boolean).map((b, i) => (
                                <li key={i}>{b}</li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      ))}
                    </section>
                  ) : null}

                  {resume.projects.length > 0 ? (
                    <section className="mt-4">
                      <h3 className="text-[12px] font-bold uppercase tracking-[0.12em]">
                        Projects
                      </h3>
                      {resume.projects.map((proj) => (
                        <div key={proj.id} className="mt-2">
                          <div className="flex items-baseline justify-between">
                            <span className="text-[12.5px] font-semibold">{proj.name}</span>
                            {proj.link ? (
                              <span className="text-[11px] text-[#52525b]">{proj.link}</span>
                            ) : null}
                          </div>
                          {proj.tech ? (
                            <div className="text-[11px] italic text-[#52525b]">{proj.tech}</div>
                          ) : null}
                          {proj.bullets.filter(Boolean).length > 0 ? (
                            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[12px] leading-relaxed text-[#3f3f46]">
                              {proj.bullets.filter(Boolean).map((b, i) => (
                                <li key={i}>{b}</li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      ))}
                    </section>
                  ) : null}

                  {resume.education.length > 0 ? (
                    <section className="mt-4">
                      <h3 className="text-[12px] font-bold uppercase tracking-[0.12em]">
                        Education
                      </h3>
                      {resume.education.map((edu) => (
                        <div key={edu.id} className="mt-2 flex items-baseline justify-between">
                          <div>
                            <span className="text-[12.5px] font-semibold">{edu.degree}</span>
                            {edu.institution ? (
                              <span className="text-[12px] text-[#3f3f46]">
                                {" "}
                                — {edu.institution}
                              </span>
                            ) : null}
                          </div>
                          <span className="text-[11px] text-[#52525b]">
                            {edu.start}
                            {edu.start && edu.end ? " – " : ""}
                            {edu.end}
                            {edu.score ? ` · ${edu.score}` : ""}
                          </span>
                        </div>
                      ))}
                    </section>
                  ) : null}

                  {resume.certifications.length > 0 ? (
                    <section className="mt-4">
                      <h3 className="text-[12px] font-bold uppercase tracking-[0.12em]">
                        Certifications
                      </h3>
                      <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-[12px] text-[#3f3f46]">
                        {resume.certifications.map((cert) => (
                          <li key={cert.id}>
                            {cert.name}
                            {cert.issuer ? ` — ${cert.issuer}` : ""}
                            {cert.year ? ` (${cert.year})` : ""}
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                </div>
              ) : (
                <div className="py-16 text-center text-[#52525b]">
                  <FileText className="mx-auto h-10 w-10 opacity-40" strokeWidth={1.5} />
                  <div className="mt-4 text-[14px] font-medium text-[#3f3f46]">
                    Your resume will appear here
                  </div>
                  <p className="mx-auto mt-1 max-w-[280px] text-[12px]">
                    Fill in the Edit tab — or hit “Example” in the header to see what a complete one
                    looks like.
                  </p>
                </div>
              )}
            </div>
            <div className="mt-4 text-center text-[11.5px] text-muted-foreground">
              {hydrated ? "Autosaved locally — nothing leaves your device." : ""}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
