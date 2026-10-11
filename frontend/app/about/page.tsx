"use client";

import { QRCodeSVG } from "qrcode.react";
import { PageHeader } from "../../components/PageHeader";
import shahPhoto from "./photos/shah";
import louisPhoto from "./photos/louis";
import lokiPhoto from "./photos/loki";

const photos = {
  shah: shahPhoto,
  louis: louisPhoto,
  loki: lokiPhoto,
};

const team = [
  {
    slug: "shah" as const,
    photoPos: "center 30%",
    name: "Shah Htet Naing",
    short: "Shah",
    role: "Full-stack",
    linkedin: "https://www.linkedin.com/in/shah-htet-naing",
    contributions: [
      "UI and API.",
      "PII checks.",
      "Risk scoring.",
    ],
  },
  {
    slug: "louis" as const,
    photoPos: "center 78%",
    name: "Thi Han Htun",
    short: "Louis",
    role: "Backend",
    linkedin: "https://www.linkedin.com/in/thi-han-htun-65a22736a/",
    contributions: [
      "Database.",
      "Records.",
      "Approvals and email.",
    ],
  },
  {
    slug: "loki" as const,
    photoPos: "center 18%",
    name: "Nyan Lin Htet",
    short: "Loki",
    role: "Product",
    linkedin: "https://www.linkedin.com/in/nyan-lin-htet-1a6849240/",
    contributions: [
      "SME fit.",
      "Operator flow.",
      "Go-to-market.",
    ],
  },
];

const stack = [
  { name: "Next.js", mark: "N" },
  { name: "Vercel", mark: "▲" },
  { name: "Render", mark: "R" },
  { name: "Node.js", mark: "JS" },
  { name: "Supabase", mark: "S" },
  { name: "Resend", mark: "@" },
];

export default function AboutPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="About Us"
      />

      <section className="panel p-5 md:p-7">
        <p className="accent-text text-[11px] font-semibold uppercase tracking-[0.18em]">Mission</p>
        <p className="mt-3 max-w-3xl text-lg font-medium leading-relaxed tracking-tight md:text-xl">
          Agents that take the admin off Singapore SMEs.
        </p>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        {team.map((member) => (
          <article key={member.slug} className="about-card panel">
            <div className="about-photo">
              <img src={photos[member.slug]} alt={member.name} style={{ objectPosition: member.photoPos }} />
              <span className="about-photo-name">{member.short}</span>
            </div>
            <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
              <h2 className="text-xl font-semibold tracking-tight">
                {member.name} <span className="text-muted">({member.short})</span>
              </h2>
              <p className="mt-1 text-sm text-muted">{member.role}</p>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm">
                {member.contributions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-5">
                <a className="btn-primary" href={member.linkedin} target="_blank" rel="noreferrer">
                  Connect on LinkedIn
                </a>
                <div className="about-qr" title={member.linkedin}>
                  <QRCodeSVG value={member.linkedin} size={84} bgColor="#faf8ff" fgColor="#3b0764" level="M" />
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="panel p-5 md:p-7">
        <p className="accent-text text-[11px] font-semibold uppercase tracking-[0.18em]">Tech stack</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {stack.map((item) => (
            <div key={item.name} className="stack-badge">
              <span className="stack-mark" aria-hidden>
                {item.mark}
              </span>
              {item.name}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
