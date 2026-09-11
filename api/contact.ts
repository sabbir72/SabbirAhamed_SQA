/**
 * -----------------------------------------
 * Project     : Sabbir Ahamed SQA Portfolio
 * Module      : Vercel Serverless API Route
 * Description : Handles /api/contact POST requests on Vercel Serverless deployment
 *               disptaching transactional emails via Brevo REST API v3.
 * Author      : Sabbir Ahamed
 * Last Updated: 2026-07-29
 * -----------------------------------------
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow health checks or method checks
  if (req.method === 'GET') {
    return res.status(200).json({ status: 'ok', service: 'vercel-serverless-contact' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { name, email, subject, message } = req.body || {};

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        error: 'Missing required fields (name, email, subject, message).'
      });
    }

    const brevoApiKey = process.env.BREVO_API_KEY;
    const isKeyConfigured = Boolean(brevoApiKey && brevoApiKey !== 'YOUR_BREVO_API_KEY_HERE');

    const senderEmail = process.env.BREVO_SENDER_EMAIL || 'sabbircse72@gmail.com';
    const recipientEmail = process.env.BREVO_RECIPIENT_EMAIL || 'sabbircse72@gmail.com';

    const sanitizeInput = (str: string): string =>
      str.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    if (!isKeyConfigured) {
      console.warn(`[VERCEL API] BREVO_API_KEY is not set or using placeholder. Logging message locally.`);
      console.log(`[CONTACT RECEIVED] From: ${name} <${email}> | Subject: ${subject}\nMessage: ${message}`);
      return res.status(200).json({
        success: true,
        message: 'Message received successfully!',
        demoMode: true,
      });
    }

    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': brevoApiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: `${name} (Portfolio Form)`,
          email: senderEmail,
        },
        to: [
          {
            email: recipientEmail,
            name: 'Sabbir Ahamed',
          },
        ],
        replyTo: {
          email: email,
          name: name,
        },
        subject: `[Portfolio Contact] ${subject}`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
            <div style="margin-bottom: 20px; text-align: center;">
              <h2 style="color: #FF6B35; margin: 0; font-size: 22px;">New Portfolio Inquiry</h2>
              <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Sent from your SQA Portfolio Contact Form</p>
            </div>
            <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
            
            <div style="margin-bottom: 16px;">
              <p style="margin: 4px 0; font-size: 14px;"><strong>Sender Name:</strong> ${sanitizeInput(name)}</p>
              <p style="margin: 4px 0; font-size: 14px;"><strong>Sender Email:</strong> <a href="mailto:${email}" style="color: #2563eb;">${email}</a></p>
              <p style="margin: 4px 0; font-size: 14px;"><strong>Subject:</strong> ${sanitizeInput(subject)}</p>
            </div>

            <div style="background-color: #f8fafc; padding: 18px; border-left: 4px solid #FF6B35; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase;">Message Content:</p>
              <p style="margin: 0; font-size: 14px; line-height: 1.6; white-space: pre-wrap; color: #334155;">${sanitizeInput(message)}</p>
            </div>

            <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
            <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
              You can reply directly to this email to respond to ${name}.
            </p>
          </div>
        `,
      }),
    });

    if (!brevoResponse.ok) {
      const errorData = await brevoResponse.json().catch(() => ({}));
      console.error('[VERCEL API ERROR] Brevo API Error:', brevoResponse.status, errorData);

      let errorMessage = errorData?.message || `Brevo API returned error status ${brevoResponse.status}`;

      if (brevoResponse.status === 401) {
        errorMessage = 'Brevo API Authentication Failed (401 Unauthorized). Please check that your BREVO_API_KEY in .env is a valid, active v3 key from https://app.brevo.com/settings/keys/api and that sender email (sabbircse72@gmail.com) is verified.';
      } else if (errorData?.code === 'unauthorized_ip' || errorData?.message?.toLowerCase().includes('ip') || brevoResponse.status === 403) {
        errorMessage = 'Brevo IP restriction detected. Please disable "Authorised IPs" restriction in your Brevo Account Security Settings (https://app.brevo.com/security/authorised_ips).';
      }

      return res.status(brevoResponse.status || 400).json({
        error: errorMessage,
        details: errorData,
        status: brevoResponse.status
      });
    }

    const responseData = await brevoResponse.json().catch(() => ({}));
    return res.status(200).json({
      success: true,
      message: 'Message delivered successfully via Brevo!',
      messageId: responseData?.messageId,
    });
  } catch (err: unknown) {
    console.error('[VERCEL API ERROR]', err);
    return res.status(500).json({ error: 'Internal server error while sending email.' });
  }
}
