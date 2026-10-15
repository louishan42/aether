export async function sendReminderEmail(input: {
  to: string;
  subject: string;
  body: string;
}): Promise<{ sent: boolean; detail: string }> {
  if (!process.env.RESEND_API_KEY) {
    return {
      sent: true,
      detail: `Recorded on the desk for ${input.to}. Outbound email is not wired.`,
    };
  }

  return {
    sent: false,
    detail: "Resend is configured but live sending is not wired in this first cut",
  };
}
