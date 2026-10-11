# Aether

Operations desk for Singapore SMEs: collections, grants, follow-ups, compliance, and bookings.

This folder is the **Aether** product. It is not SmeflowAI / SMEFlow.

## Live

- App: https://aether-eight-ecru.vercel.app
- API: https://aether-9snf.onrender.com
- Source: https://github.com/louishan42/aether

Canonical local copy for sharing: `/Users/louiswalker/Desktop/Aether`

## Folders

```
Aether/
  frontend/   Next.js UI (sidebar, pages, demo CSVs)
  backend/    Express API, Prisma schema, store
  agents/     grant/compliance catalogs, tools, runners
  datasets/   demo CSVs (same content as frontend/public)
  docs/       how grants, compliance, and datasets work
  tests/
```

## Local run

```bash
cd backend && cp .env.example .env && npm install && npm run dev
cd frontend && npm install && npm run dev
```

- App: http://localhost:3000
- Datasets: http://localhost:3000/datasets
- API: http://localhost:4000/api/health

Do not commit a real `.env`. Use `.env.example` only.

## How the desk works

- **Datasets** — drop or load CSVs. Demo buttons import `frontend/public/demo_data.csv`, `demo_customers.csv`, and `demo_bookings.csv`, and save the Demo SME profile so grants/compliance match.
- **Grants / compliance** — empty until Settings has an industry. Nothing is auto-seeded (no Harbour Digital Studio, no leftover `invoices.csv` / `customers.csv` / `appointments.csv` seed).
- Details: [docs/how-it-works.md](docs/how-it-works.md)
- Architecture: [docs/architecture.md](docs/architecture.md)
- Technical write-up: `Aether-technical-documentation.docx`
