# Architecture

```
frontend/   operations UI (Next.js)
backend/    REST API (Express + Prisma)
agents/     catalogs, tools, runners
datasets/   demo CSVs (mirrors frontend/public)
```

```
Aether desk
  → Express API
    → agents/runners
      → agents/tools
      → backend store (memory + optional Postgres)
```

- Live UI: https://aether-eight-ecru.vercel.app
- Live API: https://aether-9snf.onrender.com
- Repo: https://github.com/louishan42/aether

Grants and compliance read `agents/catalogs/*` against the saved SME profile. Datasets only feed invoices, customers, and bookings. See [how-it-works.md](how-it-works.md).
