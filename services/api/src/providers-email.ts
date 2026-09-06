const resendApiKey = process.env.RESEND_API_KEY;
const emailFrom = process.env.EMAIL_FROM;

export function emailProviderStatus() { return { provider: resendApiKey && emailFrom ? "resend" : "unconfigured" }; }

export async function sendTransactionalEmail(input: { to: string; subject: string; html: string }) {
  if (!resendApiKey || !emailFrom) return false;
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: emailFrom, to: [input.to], subject: input.subject, html: input.html }) });
  if (!response.ok) { console.error("Resend email failed", await response.text()); return false; }
  return true;
}
