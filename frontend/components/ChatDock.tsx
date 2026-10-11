"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../lib/api";

type Line = { role: "you" | "aether"; text: string; links?: { href: string; label: string }[] };

export function ChatDock() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [lines, setLines] = useState<Line[]>([
    { role: "aether", text: "Ask about overdue bills, approvals, grants, or datasets." },
  ]);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [lines, open, busy]);

  async function send() {
    const message = input.trim();
    if (!message || busy) return;
    setInput("");
    setLines((current) => [...current, { role: "you", text: message }]);
    setBusy(true);
    try {
      const result = await api.chat(message);
      setLines((current) => [...current, { role: "aether", text: result.reply, links: result.links }]);
    } catch (err) {
      setLines((current) => [...current, { role: "aether", text: err instanceof Error ? err.message : "Chat failed" }]);
    } finally {
      setBusy(false);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <>
      {open && (
        <section className="chat-panel" aria-label="Chatbot">
          <header className="chat-panel-head">
            <div className="chat-panel-who">
              <span className="chat-avatar" aria-hidden>
                Ae
              </span>
              <div>
                <strong>Aether</strong>
                <span>
                  <i className="live-dot" /> Desk chat
                </span>
              </div>
            </div>
            <button type="button" className="chat-close" aria-label="Close chatbot" onClick={() => setOpen(false)}>
              Close
            </button>
          </header>
          <div className="chat-log">
            {lines.map((line, index) => (
              <div key={index} className={`chat-bubble ${line.role}`}>
                <p className="whitespace-pre-wrap">{line.text}</p>
                {line.links?.length ? (
                  <div className="chat-links">
                    {line.links.map((item) => (
                      <a key={item.href} className="chat-link" href={item.href}>
                        {item.label}
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {busy && (
              <div className="chat-bubble aether chat-typing" aria-live="polite">
                <span />
                <span />
                <span />
              </div>
            )}
            <div ref={end} />
          </div>
          <form
            className="chat-compose"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <input
              className="field chat-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={busy ? "Waiting…" : "Ask the desk"}
              disabled={busy}
            />
            <button className="btn-primary chat-send" type="submit" disabled={busy}>
              Send
            </button>
          </form>
        </section>
      )}
      <button
        className={`chat-fab ${open ? "open" : ""}`}
        type="button"
        aria-label={open ? "Close chatbot" : "Open chatbot"}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7A2.5 2.5 0 0 1 16.5 16H10l-4 3.2V16H7.5A2.5 2.5 0 0 1 5 13.5z" />
          </svg>
        )}
      </button>
    </>,
    document.body,
  );
}
