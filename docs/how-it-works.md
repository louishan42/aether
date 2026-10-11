# How grants, compliance, and datasets work

Aether is an operations desk. Invoices, customers, and bookings come from CSVs. Grants and compliance come from the **business profile**, not from those files.

## Datasets

Upload lives on `/datasets`.

| File | Kind | Agent |
| --- | --- | --- |
| `demo_data.csv` | invoices | collections |
| `demo_customers.csv` | customers | follow-up |
| `demo_bookings.csv` | appointments | booking reminders |
| any other CSV/TSV | auto-detect or custom | store only if custom |

Same files sit in two places (keep them in sync):

- `datasets/` — repo copies
- `frontend/public/` — what the Load demo buttons fetch

`datasets/invoices.csv`, `customers.csv`, and `appointments.csv` match the demo files. They are **not** auto-imported on startup.

**Load demo_data** and **Load demo customers & bookings** also save `DEMO_SME_PROFILE` (F&B, 8 staff) so Grants and Compliance stay in sync with the demo.

Delete a file on Datasets to drop its mapped invoices, customers, or bookings.

## Business profile

Settings (or a demo-profile button) stores:

- name, **industry** (required before grants/compliance show)
- employee count, annual revenue (SGD)
- exporting, digital tools, GST registration

Default profile is empty industry. The old Harbour Digital Studio auto-seed is removed. On boot, leftover Harbour profiles and only-legacy `invoices.csv` / `customers.csv` / `appointments.csv` imports are stripped.

## Grants

Catalog: `agents/catalogs/grants.ts`

- API returns `[]` until industry is set (`profileReady`).
- Matching is rule-based (staff, export, digital tools, industry text).
- **Prepare checklists** writes fit grants into Approvals.
- Screening only — not a funding decision.

Current catalog: PSG, EDG, MRA, SFEC, Startup SG Founder.

## Compliance

Catalog: `agents/catalogs/compliance.ts`

- API returns `[]` until industry is set.
- Items apply from profile (GST threshold, staff → CPF/WSH, PDPA/ACRA always after profile exists).
- Mark evidence submitted / waived / missing.
- **Review gaps** puts open applicable items into Approvals.
- Screening only — not legal advice.

## Agents and approvals

Runners in `agents/runners/run.ts` create drafts. The desk never sends mail unless a human approves. Invoice / customer / booking agents still run from imported records; grant and compliance agents refuse to run without an industry.
