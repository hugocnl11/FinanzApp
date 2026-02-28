import nodemailer from "nodemailer";

type MailPayload = {
  to: string;
  subject: string;
  html: string;
};

const buildTransport = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP no configurado");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
};

export async function sendMail(payload: MailPayload) {
  const from = process.env.SMTP_FROM ?? "FinanzApp <no-reply@finanzapp.com>";
  const transport = buildTransport();
  await transport.sendMail({
    from,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
  });
}
