import { google } from 'googleapis';
import { FROM_EMAIL } from './constants';

export async function getGoogleAuth() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing Google OAuth credentials');
  }
  const auth = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'https://developers.google.com/oauthplayground'
  );
  auth.setCredentials({ refresh_token: refreshToken });
  return auth;
}

export async function sendEmail(
  auth: Awaited<ReturnType<typeof getGoogleAuth>>,
  options: {
    to: string;
    subject: string;
    text: string;
    attachments?: { filename: string; content: string; encoding: 'base64'; mimeType?: string }[];
  }
) {
  const gmail = google.gmail({ version: 'v1', auth });
  const boundary = 'boundary_string_for_email';
  const mailParts = [
    `To: ${options.to}`,
    `From: ${FROM_EMAIL}`,
    `Subject: =?utf-8?B?${Buffer.from(options.subject).toString('base64')}?=`,
    'Content-Type: multipart/mixed; boundary="' + boundary + '"',
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    options.text,
    '',
  ];
  if (options.attachments?.length) {
    for (const att of options.attachments) {
      const mime = att.mimeType || 'application/octet-stream';
      mailParts.push(`--${boundary}`);
      mailParts.push(`Content-Type: ${mime}; name="${att.filename}"`);
      mailParts.push('Content-Transfer-Encoding: base64');
      mailParts.push(`Content-Disposition: attachment; filename="${att.filename}"`);
      mailParts.push('');
      mailParts.push(att.content);
    }
  }
  mailParts.push(`--${boundary}--`);
  const mail = mailParts.join('\n');
  const rawMessage = Buffer.from(mail)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: rawMessage },
  });
}
