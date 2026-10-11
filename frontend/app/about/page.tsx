"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { PageHeader } from "../../components/PageHeader";

const team = [
  {
    slug: "shah",
    name: "Shah Htet Naing",
    short: "Shah",
    role: "Developer · Full-Stack & AI Systems Leader",
    linkedin: "https://www.linkedin.com/in/shah-htet-naing",
    contributions: [
      "Architected the Next.js UI and Express API.",
      "Built PII/DLP regex guardrails.",
      "Designed the risk scoring engine.",
    ],
  },
  {
    slug: "louis",
    name: "Thi Han Htun",
    short: "Louis",
    role: "Developer · Backend & Infrastructure Specialist",
    linkedin: "https://www.linkedin.com/in/thi-han-htun-65a22736a/",
    contributions: [
      "Built the database schema.",
      "Wired ledger-style record integrations.",
      "Shipped the human-in-the-loop approval and email dispatch pipeline.",
    ],
  },
  {
    slug: "loki",
    name: "Nyan Lin Htet",
    short: "Loki",
    role: "Business Development Manager · Product & SME Ecosystem Lead",
    linkedin: "https://www.linkedin.com/in/nyan-lin-htet-1a6849240/",
    contributions: [
      "Led product-market fit with Enterprise Singapore SME requirements.",
      "Designed the operator workflow.",
      "Owned business strategy for the desk.",
    ],
  },
] as const;

const stack = [
  { name: "Next.js", mark: "N" },
  { name: "Vercel", mark: "▲" },
  { name: "Render", mark: "R" },
  { name: "Node.js", mark: "JS" },
  { name: "MongoDB Atlas", mark: "M" },
  { name: "OpenAI", mark: "AI" },
  { name: "Resend", mark: "@" },
];

function TeamPhoto({ slug, name }: { slug: string; name: string }) {
  const [src, setSrc] = useState(`/team/${slug}.jpg`);
  const [missing, setMissing] = useState(false);

  return (
    <div className="about-photo" aria-label={`${name} photo`}>
      {missing ? (
        <div className="about-photo-empty">
          <span>Photo</span>
          <span>Drop {slug}.jpg in frontend/public/team</span>
        </div>
      ) : (
        <img
          src={src}
          alt={`${name}`}
          onError={() => {
            if (src.endsWith(".jpg")) setSrc(`/team/${slug}.png`);
            else setMissing(true);
          }}
        />
      )}
    </div>
  );
}

export default function AboutPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="About Us"
        description="The team behind Aether — built for Singapore SMEs, shown to hackathon judges as we execute."
      />

      <section className="panel p-5 md:p-7">
        <p className="accent-text text-[11px] font-semibold uppercase tracking-[0.18em]">Mission</p>
        <p className="mt-3 max-w-3xl text-lg font-medium leading-relaxed tracking-tight md:text-xl">
          Building secure, autonomous AI agents to solve operational bottlenecks for Singapore&apos;s local businesses.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {team.map((member) => (
          <article key={member.slug} className="panel flex flex-col p-5">
            <TeamPhoto slug={member.slug} name={member.name} />
            <h2 className="mt-4 text-xl font-semibold tracking-tight">
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
                <QRCodeSVG value={member.linkedin} size={96} bgColor="#ffffff" fgColor="#3b0764" level="M" />
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
