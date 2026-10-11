export type Period = "month" | "30" | "all";

export function periodRange(period: Period) {
  if (period === "all") return { from: "", to: "", label: "All time" };

  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const [year, month] = parts.split("-").map(Number);

  if (period === "month") {
    const last = new Date(year, month, 0).getDate();
    const mm = String(month).padStart(2, "0");
    const from = `${year}-${mm}-01T00:00:00+08:00`;
    const to = `${year}-${mm}-${String(last).padStart(2, "0")}T23:59:59+08:00`;
    const label = new Date(`${year}-${mm}-01T00:00:00+08:00`).toLocaleString("en-SG", {
      month: "long",
      year: "numeric",
      timeZone: "Asia/Singapore",
    });
    return { from, to, label };
  }

  return {
    from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    to: now.toISOString(),
    label: "Last 30 days",
  };
}
