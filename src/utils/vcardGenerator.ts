/**
 * -----------------------------------------
 * Project     : Sabbir Ahamed SQA Portfolio
 * Module      : Virtual Visiting Card & vCard Manager
 * Description : Generates standard vCard 3.0 contact cards, handles contact file (.vcf) downloads,
 *               Web NFC (NDEFReader) contactless tag writing & emulation, and card sharing.
 * Author      : Sabbir Ahamed
 * Last Updated: 2026-10-20
 * -----------------------------------------
 */

import { ProfileData } from './portfolioStore';

/**
 * Standard vCard 3.0 string builder
 * Formats contact details according to RFC 2426 specifications
 * Compatible with iOS Contacts, Google Contacts, Android, and macOS Address Book.
 */
export function buildVCardString(profile: ProfileData, portfolioUrl?: string): string {
  // Never use AI Studio or run.app URLs in vCard
  const url = portfolioUrl && !portfolioUrl.includes('aistudio') && !portfolioUrl.includes('run.app') && !portfolioUrl.includes('sabbirahamed.com')
    ? portfolioUrl
    : 'https://sabbir-sqa.vercel.app';
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  
  // Clean phone number for tel URI
  const rawPhone = profile.phone || '+8801681387906';
  const cleanPhone = rawPhone.replace(/\s+/g, '');
  const email = profile.email || 'sabbircse72@gmail.com';
  const name = profile.name || 'Sabbir Ahamed';
  const title = profile.title || 'Software Quality Assurance Engineer';
  const location = profile.location || 'Tongi East, Gazipur, Dhaka, Bangladesh';
  const github = profile.github || 'https://github.com/sabbir72';
  const linkedin = profile.linkedin?.startsWith('http') 
    ? profile.linkedin 
    : `https://${profile.linkedin || 'www.linkedin.com/in/sabbir-ahamed72'}`;

  // Split name for N field (Last;First;Middle;Prefix;Suffix)
  const nameParts = name.trim().split(/\s+/);
  const firstName = nameParts[0] || 'Sabbir';
  const lastName = nameParts.slice(1).join(' ') || 'Ahamed';

  const vcardLines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `REV:${now}`,
    `N:${lastName};${firstName};;;`,
    `FN:${name}`,
    `ORG:Altersense Ltd;Manual & automation Test`,
    `TITLE:${title}`,
    `ROLE:Software Quality Assurance Engineer`,
    `TEL;TYPE=CELL,VOICE,PREF:${cleanPhone}`,
    `EMAIL;TYPE=INTERNET,PREF:${email}`,
    `URL;TYPE=WORK:${url}`,
    `URL;TYPE=LinkedIn:${linkedin}`,
    `URL;TYPE=GitHub:${github}`,
    `ADR;TYPE=WORK,POSTAL,PARCEL:;;Tongi East;Gazipur;Dhaka;1710;Bangladesh`,
    `LABEL;TYPE=WORK,POSTAL,PARCEL:${location}`,
    `NOTE:Altersense Ltd | SQA Engineer with 2+ years experience in manual and automation testing (Selenium, Playwright, Cypress), Postman API testing, and defect lifecycle management.`,
    'CATEGORIES:SQA Engineer,Software Tester,Manual and Automation,Tech Contact',
    'END:VCARD'
  ];

  return vcardLines.join('\r\n');
}

/**
 * Triggers direct browser download of standard .vcf file
 */
export function downloadVCardFile(profile: ProfileData): void {
  const vcardString = buildVCardString(profile);
  const blob = new Blob([vcardString], { type: 'text/vcard;charset=utf-8' });
  const filename = `${profile.name.replace(/\s+/g, '_')}_SQA_Card.vcf`;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Checks if the current browser environment supports the W3C Web NFC API
 */
export function isWebNfcSupported(): boolean {
  return typeof window !== 'undefined' && 'NDEFReader' in window;
}

/**
 * Writes the visiting card URL to an NFC Tag (e.g., NTAG213, NTAG215, NTAG216)
 * Available on Android Chrome with NFC enabled
 */
export async function writeVisitingCardToNfc(cardUrl: string): Promise<{ success: boolean; message: string }> {
  if (!isWebNfcSupported()) {
    return {
      success: false,
      message: 'Web NFC is not supported on this browser/OS. (Requires Chrome on Android with NFC hardware enabled).'
    };
  }

  try {
    const ndef = new (window as any).NDEFReader();
    await ndef.write({
      records: [
        { recordType: 'url', data: cardUrl },
        { 
          recordType: 'text', 
          data: 'Sabbir Ahamed - Software Quality Assurance Engineer | Tap to view Digital Business Card' 
        }
      ]
    });
    return {
      success: true,
      message: 'Successfully programmed NFC tag! Tap any modern smartphone to open this visiting card.'
    };
  } catch (err: any) {
    console.error('[NFC WRITE ERROR]', err);
    if (err.name === 'NotAllowedError') {
      return { success: false, message: 'NFC permission was denied by the user.' };
    }
    return { success: false, message: `NFC Write error: ${err.message || 'Operation failed'}` };
  }
}

/**
 * Plays a high-tech synthesized acoustic chime for NFC tap simulation
 */
export function playNfcTapAudio(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // First high ping
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1760, ctx.currentTime); // A6
    osc1.frequency.exponentialRampToValueAtTime(2637, ctx.currentTime + 0.12); // E7
    gain1.gain.setValueAtTime(0.2, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.25);

    // Subtle low frequency resonance
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(587.33, ctx.currentTime + 0.05); // D5
    gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.05);
    osc2.stop(ctx.currentTime + 0.35);

    // Haptic feedback if supported on mobile
    if ('vibrate' in navigator) {
      navigator.vibrate([40, 60, 80]);
    }
  } catch (e) {
    // Audio context may be restricted by autoplay policy
  }
}

/**
 * Formatted plain text for quick clipboard copying
 */
export function getFormattedCardText(profile: ProfileData, cardUrl: string): string {
  const cleanUrl = cardUrl.replace(/\?card=1#vcard$/, '');
  const linkedin = profile.linkedin?.startsWith('http')
    ? profile.linkedin
    : `https://${profile.linkedin || 'linkedin.com/in/sabbir-ahamed72'}`;
  const github = profile.github?.startsWith('http')
    ? profile.github
    : `https://${profile.github || 'github.com/sabbir72'}`;

  return [
    `${profile.name}`,
    `${profile.title} — Altersense Ltd`,
    `Phone / WhatsApp: ${profile.phone}`,
    `Email: ${profile.email}`,
    `Location: ${profile.location}`,
    `Portfolio: ${cleanUrl}`,
    `LinkedIn: ${linkedin}`,
    `GitHub: ${github}`,
  ].join('\n');
}

/**
 * Generates and downloads a standard .ics (iCalendar) invite for an SQA technical interview or meeting
 */
export function downloadIcsMeetingInvite(profile: ProfileData, cardUrl: string): void {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0); // 10:00 AM
  
  const end = new Date(tomorrow);
  end.setMinutes(end.getMinutes() + 45); // 45 min meeting

  const pad = (n: number) => String(n).padStart(2, '0');
  const formatUtc = (d: Date) => 
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sabbir Ahamed SQA//Virtual Card Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:sqa-meeting-${Date.now()}@sabbirahamed.com`,
    `DTSTAMP:${formatUtc(new Date())}`,
    `DTSTART:${formatUtc(tomorrow)}`,
    `DTEND:${formatUtc(end)}`,
    `SUMMARY:SQA Technical Discussion / Interview with ${profile.name}`,
    `DESCRIPTION:Technical interview or discussion regarding Software Quality Assurance, SDET, and Automation Testing with ${profile.name}.\\n\\nPortfolio: ${cardUrl}\\nEmail: ${profile.email}\\nPhone: ${profile.phone}`,
    `ORGANIZER;CN="${profile.name}":mailto:${profile.email}`,
    'LOCATION:Google Meet / Zoom / Phone Call',
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder: SQA Meeting with Sabbir Ahamed in 15 minutes',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ];

  const blob = new Blob([icsLines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Meeting_With_${profile.name.replace(/\s+/g, '_')}_SQA.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Returns a direct Google Calendar Web Link to schedule a meeting with Sabbir
 */
export function getGoogleCalendarMeetingUrl(profile: ProfileData, cardUrl: string): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  const end = new Date(tomorrow);
  end.setMinutes(end.getMinutes() + 45);

  const pad = (n: number) => String(n).padStart(2, '0');
  const formatUtc = (d: Date) => 
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;

  const dates = `${formatUtc(tomorrow)}/${formatUtc(end)}`;
  const title = encodeURIComponent(`SQA Interview / Meeting with ${profile.name}`);
  const details = encodeURIComponent(
    `Discussion regarding Software Quality Assurance, Test Automation, and Opportunities.\n\nSabbir Ahamed - SQA Engineer\nPortfolio: ${cardUrl}\nEmail: ${profile.email}\nPhone: ${profile.phone}`
  );
  const location = encodeURIComponent('Google Meet / Online');

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}&add=${encodeURIComponent(profile.email)}`;
}

/**
 * Executive Plain-Text Email Signature
 */
export function getEmailSignatureText(profile: ProfileData, company = 'Altersense Ltd'): string {
  const name = profile.name || 'Sabbir Ahamed';
  const title = profile.title || 'Software Quality Assurance Engineer';
  const email = profile.email || 'sabbircse72@gmail.com';
  const phone = profile.phone || '+8801681387906';
  const location = profile.location || 'Dhaka, Bangladesh';
  const cleanLinkedin = (profile.linkedin || 'linkedin.com/in/sabbir-ahamed72').replace(/^https?:\/\/(www\.)?/, '');
  const cleanGithub = (profile.github || 'github.com/sabbir72').replace(/^https?:\/\/(www\.)?/, '');

  return [
    name,
    `${title} · ${company}`,
    `${email}  |  ${phone}`,
    location,
    `Portfolio: sabbir-sqa.vercel.app  |  LinkedIn: ${cleanLinkedin}  |  GitHub: ${cleanGithub}`,
  ].join('\n');
}

/**
 * Generates an executive, email-client-safe HTML signature
 * compatible with Gmail, Outlook, Apple Mail, and Webmail clients.
 */
export function generateEmailSignatureHtml(profile: ProfileData, cardUrl?: string, company = 'Altersense Ltd'): string {
  const name = profile.name || 'Sabbir Ahamed';
  const title = profile.title || 'Software Quality Assurance Engineer';
  const email = profile.email || 'sabbircse72@gmail.com';
  const phone = profile.phone || '+8801681387906';
  const location = profile.location || 'Dhaka, Bangladesh';
  const portfolioUrl = cardUrl && !cardUrl.includes('run.app') && !cardUrl.includes('aistudio')
    ? cardUrl.replace(/\?card=1#vcard$/, '')
    : 'https://sabbir-sqa.vercel.app';
  const linkedinUrl = profile.linkedin?.startsWith('http')
    ? profile.linkedin
    : `https://${profile.linkedin || 'www.linkedin.com/in/sabbir-ahamed72'}`;
  const githubUrl = profile.github?.startsWith('http')
    ? profile.github
    : `https://${profile.github || 'github.com/sabbir72'}`;

  return `<table cellpadding="0" cellspacing="0" border="0" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; line-height: 1.45; border-collapse: collapse;">
  <tr>
    <td style="border-left: 3px solid #0284c7; padding-left: 14px;">
      <div style="font-size: 16px; font-weight: 700; color: #0f172a; letter-spacing: -0.2px;">${name}</div>
      <div style="font-size: 13px; font-weight: 600; color: #0284c7; margin-top: 2px;">${title} <span style="color: #94a3b8; font-weight: 400;">&bull;</span> <span style="color: #334155; font-weight: 600;">${company}</span></div>
      <table cellpadding="0" cellspacing="0" border="0" style="margin-top: 8px; font-size: 12px; color: #475569;">
        <tr>
          <td style="padding-bottom: 3px;">
            <a href="mailto:${email}" style="color: #0f172a; text-decoration: none; font-weight: 500;">${email}</a>
            <span style="color: #cbd5e1; padding: 0 7px;">|</span>
            <a href="tel:${phone}" style="color: #0f172a; text-decoration: none; font-weight: 500;">${phone}</a>
            <span style="color: #cbd5e1; padding: 0 7px;">|</span>
            <span style="color: #64748b;">${location}</span>
          </td>
        </tr>
        <tr>
          <td style="padding-top: 3px;">
            <a href="${portfolioUrl}" style="color: #0284c7; text-decoration: none; font-weight: 600;">Portfolio</a>
            <span style="color: #cbd5e1; padding: 0 7px;">&bull;</span>
            <a href="${linkedinUrl}" style="color: #0284c7; text-decoration: none; font-weight: 600;">LinkedIn</a>
            <span style="color: #cbd5e1; padding: 0 7px;">&bull;</span>
            <a href="${githubUrl}" style="color: #0284c7; text-decoration: none; font-weight: 600;">GitHub</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`.trim();
}
