# Demo datasets

These CSVs are the Aether demo. They are **not** auto-loaded when the API starts.

| File | Same as | Used for |
| --- | --- | --- |
| `demo_data.csv` | `frontend/public/demo_data.csv` | invoice demo |
| `demo_customers.csv` | `frontend/public/demo_customers.csv` | customer follow-up demo |
| `demo_bookings.csv` | `frontend/public/demo_bookings.csv` | booking demo |
| `invoices.csv` | `demo_data.csv` | identical copy (not seeded) |
| `customers.csv` | `demo_customers.csv` | identical copy (not seeded) |
| `appointments.csv` | `demo_bookings.csv` | identical copy (not seeded) |

Load them from the Datasets page in the app, or POST `/api/workspace/datasets/import`.
