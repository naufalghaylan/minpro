import nodemailer from 'nodemailer';
import fs from 'node:fs';
import { join } from 'node:path';
import handlebars from 'handlebars';

const mailHost = process.env.MAIL_HOST ?? 'sandbox.smtp.mailtrap.io';
const mailPort = Number(process.env.MAIL_PORT ?? 2525);
const mailUser = process.env.MAIL_USER;
const mailPass = process.env.MAIL_PASS;
const mailFrom = process.env.MAIL_FROM ?? 'Event Platform <no-reply@eventplatform.local>';

if (!mailUser || !mailPass) {
  throw new Error('MAIL_USER and MAIL_PASS must be set for Mailtrap email sending.');
}

const transporter = nodemailer.createTransport({
  host: mailHost,
  port: mailPort,
  auth: {
    user: mailUser,
    pass: mailPass,
  },
});

const renderTemplate = (templatePath: string, context: Record<string, unknown>) => {
  const templateSource = fs.readFileSync(join(process.cwd(), templatePath), 'utf-8');
  const compiled = handlebars.compile(templateSource);

  return compiled(context);
};

export const sendResetPasswordEmail = async (params: {
  emailTo: string;
  name: string;
  resetLink: string;
}) => {
  const html = renderTemplate('src/templates/emails/reset-password.hbs', {
    name: params.name,
    resetLink: params.resetLink,
    supportEmail: mailFrom,
  });

  await transporter.sendMail({
    from: mailFrom,
    to: params.emailTo,
    subject: 'Reset password Event Platform',
    html,
  });
};

export const sendTransactionStatusEmail = async (params: {
  emailTo: string;
  name: string;
  eventName: string;
  transactionId: string;
  totalAmount: number;
  status: 'ACCEPTED' | 'REJECTED';
  reason?: string;
}) => {
  const html = renderTemplate('src/templates/emails/transaction-status.hbs', {
    name: params.name,
    eventName: params.eventName,
    transactionId: params.transactionId,
    totalAmount: params.totalAmount.toLocaleString('id-ID'),
    status: params.status,
    reason: params.reason,
    supportEmail: mailFrom,
  });

  const subject =
    params.status === 'ACCEPTED'
      ? 'Pembayaran kamu sudah diterima'
      : 'Pembayaran kamu ditolak';

  await transporter.sendMail({
    from: mailFrom,
    to: params.emailTo,
    subject,
    html,
  });
};