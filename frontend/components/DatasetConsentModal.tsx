"use client";

export function DatasetConsentModal({
  open,
  busy,
  onApprove,
  onDecline,
  understood,
  onUnderstood,
}: {
  open: boolean;
  busy?: boolean;
  onApprove: () => void;
  onDecline: () => void;
  understood: boolean;
  onUnderstood: (value: boolean) => void;
}) {
  if (!open) return null;

  return (
    <div className="warn-scrim" role="presentation" onClick={onDecline}>
      <div
        className="warn-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dataset-warn-title"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="warn-kicker">Warning</p>
        <h2 id="dataset-warn-title" className="mt-2 text-xl font-semibold tracking-tight">
          Personal data in this file
        </h2>
        <p className="mt-3 text-sm leading-relaxed">
          This upload may include NRIC numbers, names, emails, phone numbers, invoices, or other personal and business records.
          Only add a file you are allowed to use on this desk.
        </p>
        <p className="mt-3 text-sm leading-relaxed">
          Aether does not sell datasets or use your files as a data product. Storage on this desk is not a permanent archive.
          You can delete a file here to remove its rows.
        </p>
        <p className="mt-3 text-sm font-medium">You Control Your Data · Zero Data Monetization</p>
        <label className="mt-5 flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={understood}
            onChange={(event) => onUnderstood(event.target.checked)}
          />
          <span>I understand the warning. I approve this upload and confirm Aether does not sell this dataset.</span>
        </label>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" className="btn-ghost" disabled={busy} onClick={onDecline}>
            Do not upload
          </button>
          <button type="button" className="btn-primary" disabled={busy || !understood} onClick={onApprove}>
            {busy ? "Importing…" : "Approve and upload"}
          </button>
        </div>
      </div>
    </div>
  );
}
