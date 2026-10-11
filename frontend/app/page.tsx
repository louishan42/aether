"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "../components/Logo";

export default function Home() {
  const [clock, setClock] = useState("");

  useEffect(() => {
    const tick = () =>
      setClock(
        new Intl.DateTimeFormat("en-SG", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
          timeZone: "Asia/Singapore",
        }).format(new Date()),
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="landing">
      <header className="landing-top">
        <Logo />
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard" className="btn-primary">
            Go to dashboard
          </Link>
          <a href="#premium" className="btn-gold">
            Go Premium
          </a>
        </div>
      </header>

      <section className="landing-hero">
        <p className="landing-kicker">
          <span className="live-dot" />
          Live desk · {clock || "--:--:--"} SGT
        </p>
        <p className="landing-badge">Enterprise SG Problem Statement 1</p>
        <h1 className="landing-title">Automate SME accounts receivable.</h1>
        <p className="landing-lead">Five agents. You approve before anything is sent.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href="/dashboard" className="btn-primary">
            Get started
          </Link>
          <Link href="/datasets" className="btn-ghost">
            Drop a CSV
          </Link>
        </div>
      </section>

      <section className="landing-grid two">
        <article className="panel p-6 md:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Our Goal</p>
          <p className="mt-4 text-xl font-medium tracking-tight">Get unpaid invoices moving without extra staff.</p>
        </article>
        <article className="panel p-6 md:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Our Mission</p>
          <p className="mt-4 text-xl font-medium tracking-tight">Draft from your files. A person still signs off.</p>
        </article>
      </section>

      <section className="landing-pair" id="premium">
        <div className="landing-grid two">
          <article className="panel p-6">
            <h2 className="text-xl font-semibold tracking-tight">Chatbots</h2>
            <ul className="landing-list mt-4">
              <li>Talk only</li>
              <li>Paste rows by hand</li>
              <li>You still write the email</li>
              <li>No Singapore grant/compliance list</li>
            </ul>
          </article>
          <article className="panel landing-accent p-6">
            <h2 className="text-xl font-semibold tracking-tight">Aether</h2>
            <ul className="landing-list on mt-4">
              <li>Five agents on the desk</li>
              <li>Drop CSV once</li>
              <li>Approve, then act</li>
              <li>SG grant shortlist and compliance screen</li>
            </ul>
          </article>
        </div>
        <div className="landing-grid two">
          <article className="panel p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: "#0d9488" }}>
              Standard
            </p>
            <p className="mt-2 text-4xl font-semibold tracking-tight">
              S$59<span className="text-base font-medium text-muted"> / month</span>
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              <li>All five agents</li>
              <li>Approve then act, with a log</li>
              <li>30 day pilot</li>
            </ul>
          </article>
          <article className="panel landing-premium p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: "#fbbf24" }}>
              Premium
            </p>
            <p className="mt-2 text-4xl font-semibold tracking-tight">
              S$99<span className="text-base font-medium opacity-80"> / month</span>
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              <li>Everything in Standard</li>
              <li>Extra users</li>
              <li>Integrations as they launch</li>
            </ul>
            <a href="#premium" className="btn-gold mt-6">
              Go Premium
            </a>
          </article>
        </div>
      </section>
    </div>
  );
}
