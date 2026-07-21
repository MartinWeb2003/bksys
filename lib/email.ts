// Email sending. Uses Resend if RESEND_API_KEY is set; otherwise logs the link to the
// server console so the reset flow is fully testable in dev without an email account.

export async function sendResetEmail(to: string, link: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Camp Desk <onboarding@resend.dev>";

  if (!key) {
    console.log(`\n[password-reset] RESEND_API_KEY not set — reset link for ${to}:\n${link}\n`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to,
      subject: "Reset your Camp Desk password",
      html: `<p>A password reset was requested for your Camp Desk account.</p>
             <p><a href="${link}">Reset your password</a></p>
             <p>This link expires in 1 hour. If you didn't request it, you can ignore this email.</p>`,
    }),
  });

  if (!res.ok) {
    console.error("Resend error:", await res.text());
    throw new Error("Failed to send reset email.");
  }
}
