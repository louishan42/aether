"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "../components/Logo";

type Theme = "light" | "dark";

export default function Home() {
  const [clock, setClock] = useState("");
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const saved = window.localStorage.getItem("aether-landing-theme");
    if (saved === "dark" || saved === "light") setTheme(saved);
  }, []);

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

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    window.localStorage.setItem("aether-landing-theme", next);
  }

  return (
    <div className={`landing-shell ${theme}`}>
      <div className="landing">
        <header className="landing-top">
          <Logo />
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn-ghost" onClick={toggleTheme}>
              {theme === "light" ? "Dark" : "White"}
            </button>
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
            <a href="#premium" className="btn-ghost">
              See plans
            </a>
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
                <li>CSV on Datasets</li>
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

      <footer className="landing-foot">
        <div className="landing-foot-inner">
          <div>
            <p className="landing-foot-brand">Aether</p>
            <p className="landing-foot-note">Approve-then-act desk for Singapore SMEs.</p>
          </div>
          <div>
            <p className="landing-foot-label">Desk</p>
            <Link href="/dashboard">Overview</Link>
            <Link href="/analysis">Analysis</Link>
            <Link href="/approvals">Approvals</Link>
            <Link href="/datasets">Datasets</Link>
          </div>
          <div>
            <p className="landing-foot-label">Plans</p>
            <a href="#premium">Standard S$59</a>
            <a href="#premium">Premium S$99</a>
            <Link href="/about">About us</Link>
          </div>
          <div>
            <p className="landing-foot-label">Singapore</p>
            <p>Asia/Singapore</p>
            <p>PS1 · collections, grants, bookings</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
