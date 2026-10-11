import type { Stats } from "./types";
import { CHART_COLORS } from "./chartColors";

function drawPie(ctx: CanvasRenderingContext2D, slices: { label: string; value: number }[], x: number, y: number, r: number) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0) || 1;
  let angle = -Math.PI / 2;
  slices.forEach((slice, index) => {
    const sweep = ((slice.value || 0) / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, r, angle, angle + sweep);
    ctx.closePath();
    ctx.fillStyle = CHART_COLORS[index % CHART_COLORS.length];
    ctx.fill();
    angle += sweep;
  });
}

export async function exportLockedReport(stats: Stats, password: string, periodLabel = "All time") {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({
    encryption: {
      userPassword: password,
      ownerPassword: password,
      userPermissions: ["print"],
    },
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Aether monthly analysis", 14, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Period: ${periodLabel}`, 14, 28);
  doc.text(`Generated ${new Date().toLocaleString("en-SG", { timeZone: "Asia/Singapore" })} SGT`, 14, 34);
  doc.text(`Business: ${stats.profile?.name || "Demo"}`, 14, 40);

  const totals = stats.totals;
  doc.setFontSize(11);
  doc.text(
    `Invoices ${totals.invoices} · Overdue ${totals.overdue} · Customers ${totals.customers} · Bookings ${totals.appointments} · Grant fits ${totals.grantMatches}`,
    14,
    48,
  );

  const canvas = document.createElement("canvas");
  canvas.width = 280;
  canvas.height = 280;
  const ctx = canvas.getContext("2d");
  if (ctx && stats.charts) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 280, 280);
    drawPie(ctx, stats.charts.draftsByAgent, 140, 140, 110);
    doc.addImage(canvas.toDataURL("image/png"), "PNG", 14, 52, 70, 70);
    doc.text("Drafts by agent", 14, 128);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 280, 280);
    drawPie(ctx, stats.charts.invoicesByStatus, 140, 140, 110);
    doc.addImage(canvas.toDataURL("image/png"), "PNG", 95, 52, 70, 70);
    doc.text("Invoices by status", 95, 128);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 280, 280);
    drawPie(ctx, stats.charts.filesByKind, 140, 140, 110);
    doc.addImage(canvas.toDataURL("image/png"), "PNG", 176, 52, 70, 70);
    doc.text("Files by kind", 176, 128);
  }

  let y = 140;
  doc.setFont("helvetica", "bold");
  doc.text("Agent load", 14, y);
  doc.setFont("helvetica", "normal");
  y += 8;
  for (const row of stats.charts?.agentLoad ?? []) {
    doc.text(`${row.label}: ${row.value}`, 14, y);
    y += 6;
  }
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.text("Activity", 14, y);
  doc.setFont("helvetica", "normal");
  y += 8;
  for (const item of (stats.recentActivity ?? []).slice(0, 8)) {
    const line = `${item.action} ${item.result}`.slice(0, 90);
    doc.text(line, 14, y);
    y += 6;
    if (y > 280) break;
  }

  const slug = periodLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  doc.save(`aether-analysis-${slug || "period"}.pdf`);
}
