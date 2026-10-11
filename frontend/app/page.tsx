"use client";

import Link from "next/link";
import { Logo } from "../components/Logo";

export default function Home() {
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
        <p className="landing-kicker">Enterprise SG · Problem Statement 1</p>
        <h1 className="landing-title">SME ops desk. Five agents. You approve.</h1>
        <p className="landing-lead">Collections, follow-ups, bookings, grants, compliance.</p>
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
        <article className="panel p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Goal</p>
          <p className="mt-3 text-lg font-medium tracking-tight">Cut the chase on unpaid bills and quiet customers.</p>
        </article>
        <article className="panel p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Mission</p>
          <p className="mt-3 text-lg font-medium tracking-tight">Drafts from your files. Nothing goes out until you say so.</p>
        </article>
      </section>

      <section className="landing-grid two" id="compare">
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
      </section>

      <section className="landing-grid two" id="premium">
        <article className="panel p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-700">Standard</p>
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-300">Premium</p>
          <p className="mt-2 text-4xl font-semibold tracking-tight">
            S$99<span className="text-base font-medium opacity-80"> / month</span>
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            <li>Everything in Standard</li>
            <li>Extra users</li>
            <li>Integrations as they launch</li>
          </ul>
          <Link href="/dashboard" className="btn-gold mt-6">
            Go Premium
          </Link>
        </article>
      </section>
    </div>
  );
}
