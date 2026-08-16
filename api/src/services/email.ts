interface SendEmailParams {
  toEmail: string;
  toName?: string;
  subject: string;
  documentTitle: string;
  shareUrl: string;
  message?: string;
}

export async function sendEmailViaBrevo({
  toEmail,
  toName,
  subject,
  documentTitle,
  shareUrl,
  message,
}: SendEmailParams): Promise<{ success: boolean; message: string }> {
  const apiKey = process.env.BREVO_API_KEY;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px; color: #18181b; }
        .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .header { background: linear-gradient(135deg, #4f46e5, #3b82f6); padding: 32px 24px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
        .content { padding: 32px 24px; line-height: 1.6; }
        .doc-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 20px 0; font-weight: 600; color: #0f172a; }
        .btn { display: inline-block; background: #4f46e5; color: #ffffff !important; font-weight: 600; text-decoration: none; padding: 14px 28px; border-radius: 10px; margin-top: 20px; box-shadow: 0 2px 6px rgba(79,70,229,0.3); }
        .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>SnapServe Vault</h1>
        </div>
        <div class="content">
          <p>Hello ${toName || "there"},</p>
          <p>A document has been shared with you via SnapServe Vault:</p>
          <div class="doc-card">
            📄 ${documentTitle}
          </div>
          ${message ? `<p style="font-style: italic; background: #fffbe0; padding: 12px; border-left: 3px solid #f59e0b; border-radius: 6px;">"${message}"</p>` : ""}
          <p>Click the button below to view and complete the document:</p>
          <div style="text-align: center;">
            <a href="${shareUrl}" class="btn" target="_blank">View Document</a>
          </div>
        </div>
        <div class="footer">
          Sent automatically via SnapServe Vault · Brevo API Integration
        </div>
      </div>
    </body>
    </html>
  `;

  if (!apiKey) {
    console.log(`[Brevo Email Simulation] To: ${toEmail} | Subject: ${subject} | URL: ${shareUrl}`);
    return { success: true, message: "Email simulated! Add BREVO_API_KEY to api/.env to send live emails." };
  }

  const senders = [
    {
      email: process.env.BREVO_SENDER_EMAIL_1 || process.env.BREVO_SENDER_EMAIL || "ramsiva97465@gmail.com",
      name: process.env.BREVO_SENDER_NAME || "SnapServe Vault",
    },
    {
      email: process.env.BREVO_SENDER_EMAIL_2 || "sivaramsiva605@gmail.com",
      name: process.env.BREVO_SENDER_NAME || "SnapServe Vault",
    },
    {
      email: process.env.BREVO_SENDER_EMAIL_3 || "snapserve.ai@gmail.com",
      name: process.env.BREVO_SENDER_NAME || "SnapServe Vault",
    },
  ];

  let lastError = "";
  for (const sender of senders) {
    try {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          sender,
          to: [{ email: toEmail, name: toName || toEmail }],
          subject,
          htmlContent,
        }),
      });

      const data: any = await res.json();
      if (res.ok) {
        return { success: true, message: `Email sent successfully via Brevo API (${sender.email})! 📧` };
      }
      lastError = data.message || "Failed to send email via Brevo API";
      console.warn(`Brevo email try failed for sender ${sender.email}:`, data);
    } catch (err: any) {
      lastError = err.message || "Network error";
    }
  }

  return { success: false, message: lastError || "Failed to send email via Brevo API" };
}
