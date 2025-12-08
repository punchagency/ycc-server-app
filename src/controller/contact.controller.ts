import { Request, Response } from 'express';
import sendMail from '../utils/SendMail';
import { contactUsNotification } from '../templates/contact-us-notification';

interface ReportIssueBody {
  bookingId: string;
  bookingDetails?: any;
  userEmail: string;
  userName: string;
  message: string;
}

interface ContactMessageBody {
  fullName: string;
  email: string;
  subject: string;
  message: string;
  location?: string;
}

// Helper function to escape HTML
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export const reportIssueToSupport = async (
  req: Request<{}, {}, ReportIssueBody>,
  res: Response
) => {
  try {
    const { bookingId, bookingDetails, userEmail, userName, message } = req.body;

    if (!bookingId || !userEmail || !userName || !message) {
      return res.status(400).json({ success: false, error: 'Missing required fields.' });
    }

    const supportEmail = process.env.SUPPPORT_EMAIL_USER || 'support@yachtcrewcenter.com';
    const subject = `Issues Concerning Booking With Booking ID ${bookingId}`;
    const html = `
      <h2>Booking Issue Reported</h2>
      <p><strong>User Name:</strong> ${userName}</p>
      <p><strong>User Email:</strong> ${userEmail}</p>
      <p><strong>Booking ID:</strong> ${bookingId}</p>
      <h3>Message:</h3>
      <p>${message.replace(/\n/g, '<br>')}</p>
      <h3>Booking Details:</h3>
      <pre style="background:#f4f4f4;padding:10px;border-radius:6px;">${JSON.stringify(
        bookingDetails,
        null,
        2
      )}</pre>
    `;

    // ✅ Call sendMail with a single object argument
    await sendMail({ email: supportEmail, subject, html });

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to send support email.' });
  }
};

export const sendContactMessage = async (
  req: Request<{}, {}, ContactMessageBody>,
  res: Response
) => {
  try {
    const { fullName, email, subject, message, location } = req.body || {};

    const trimmedFullName = (fullName || '').toString().trim();
    const trimmedEmail = (email || '').toString().trim();
    const trimmedSubject = (subject || '').toString().trim();
    const trimmedMessage = (message || '').toString().trim();
    const trimmedLocation = (location || '').toString().trim();

    if (!trimmedFullName || !trimmedEmail || !trimmedSubject || !trimmedMessage) {
      return res.status(400).json({ success: false, error: 'Missing required fields.' });
    }

    const simpleEmailRegex = /.+@.+\..+/;
    if (!simpleEmailRegex.test(trimmedEmail)) {
      return res.status(400).json({ success: false, error: 'Invalid email address.' });
    }

    const submittedAt = new Date().toISOString();

    let html = contactUsNotification
      .replace('{{fullName}}', escapeHtml(trimmedFullName))
      .replace('{{email}}', escapeHtml(trimmedEmail))
      .replace('{{subject}}', escapeHtml(trimmedSubject))
      .replace('{{message}}', escapeHtml(trimmedMessage))
      .replace('{{submittedAt}}', escapeHtml(submittedAt));

    if (trimmedLocation) {
      html = html
        .replace('{{#if location}}', '')
        .replace('{{/if}}', '')
        .replace('{{location}}', escapeHtml(trimmedLocation));
    } else {
      html = html.replace(/\{\{#if location\}\}[\s\S]*?\{\{\/if\}\}/, '');
    }

    const supportEmail = process.env.SUPPPORT_EMAIL_USER || 'support@yachtcrewcenter.com';
    const finalSubject = `Contact — ${trimmedSubject} — ${trimmedFullName}`;

    // ✅ Call sendMail with a single object argument
    await sendMail({ email: supportEmail, subject: finalSubject, html });

    return res.status(200).json({ success: true, message: 'Message sent successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to send contact message.' });
  }
};
