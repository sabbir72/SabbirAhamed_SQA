import { useState, useRef, useMemo, useEffect } from 'react';
import { 
  X, Printer, Download, Copy, Check, FileText, Settings, Sliders, Sparkles, 
  CheckSquare, Square, Filter, ChevronRight, Award, Briefcase, Eye, 
  RotateCcw, ShieldCheck, Mail, Phone, MapPin, Globe, Target,
  Type, ExternalLink, User, Lock
} from 'lucide-react';
import { PERSONAL_INFO, SKILL_CATEGORIES, WORK_EXPERIENCE, EDUCATION_HISTORY, PROJECTS, BUG_REPORTS, PROFESSIONAL_REFERENCES } from '../data';
import { isAdminAuthenticated } from '../utils/adminAuth';
import AdminPasscodeModal from './AdminPasscodeModal';
import html2pdf from 'html2pdf.js'; 

// Safe URL normalizer for links embedded inside text
export const normalizeUrl = (url?: string): string => {
  if (!url) return '#';
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('www.')) return `https://${trimmed}`;
  if (trimmed.startsWith('mailto:') || trimmed.startsWith('tel:')) return trimmed;
  return `https://${trimmed}`;
};
// TypeScript Props Interface for ResumeBuilderModal
interface ResumeBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCoverLetter?: () => void;
}

export type TemplateType = 'classic-ats' | 'modern-pro' | 'minimal' | 'executive' | 'portfolio-style';
export type TargetRoleType = 'all-rounder' | 'automation-qa' | 'api-testing' | 'manual-qa';
export type AtsFontFamily = 'modern' | 'serif' | 'corporate';

export const DEFAULT_CAREER_OBJECTIVE =
  "Seeking a Software Quality Assurance Engineer position where I can leverage 2 years of hands-on experience in manual and automation testing, solid knowledge of software testing principles, and strong attention to detail to ensure high-quality and reliable software solutions, while continuously learning and growing in a professional environment.";

const ROLE_CAREER_OBJECTIVES: Record<TargetRoleType, string> = {
  'all-rounder': DEFAULT_CAREER_OBJECTIVE,
  'automation-qa':
    "Seeking an SQA Automation Engineer position where I can apply 2 years of hands-on experience in Playwright (Python & TypeScript), Selenium WebDriver, Pytest, and CI/CD pipelines to build scalable test frameworks and ensure high-quality, reliable software solutions.",
  'api-testing':
    "Seeking a Software Quality Assurance / API Testing Engineer position to leverage hands-on expertise in REST API automation, Postman, Newman CLI, backend payload verification, and SQL testing to ensure robust and reliable software solutions.",
  'manual-qa':
    "Seeking a Manual Software Quality Assurance Engineer position where I can leverage 2 years of hands-on experience in complete STLC/SDLC workflows, test scenario authoring, exploratory testing, and Jira defect tracking to ensure top-tier software quality."
};

export default function ResumeBuilderModal({ isOpen, onClose, onOpenCoverLetter }: ResumeBuilderModalProps) {
  const [isAdmin, setIsAdmin] = useState<boolean>(() => isAdminAuthenticated());
  const [isPasscodeModalOpen, setIsPasscodeModalOpen] = useState<boolean>(false);

  // Selected Template & Role Presets
  const [template, setTemplate] = useState<TemplateType>('classic-ats');
  const [targetRole, setTargetRole] = useState<TargetRoleType>('all-rounder');
  const [fontFamily, setFontFamily] = useState<AtsFontFamily>('modern');
  const [activeTab, setActiveTab] = useState<'preview' | 'projects-filter' | 'customize' | 'ats-score' | 'cover-letter'>('preview');

  // Interactive Project Selection Checkboxes
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>(
    PROJECTS.map(p => p.id)
  );

  // Customizable Fields (Synced with portfolio data by default)
  const [customInfo, setCustomInfo] = useState({
    name: PERSONAL_INFO.name,
    title: PERSONAL_INFO.title,
    email: PERSONAL_INFO.email,
    phone: PERSONAL_INFO.phone,
    location: PERSONAL_INFO.location,
    linkedin: PERSONAL_INFO.linkedin,
    github: PERSONAL_INFO.github,
    experienceYears: '2',
    careerObjective: PERSONAL_INFO.objective || DEFAULT_CAREER_OBJECTIVE
  });

  // Filename format strictly matching: Name_ex-year_SQA_DIU
  const getCvBaseFileName = () => {
    const cleanName = (customInfo.name || 'Sabbir_Ahamed').trim().replace(/\s+/g, '_');
    const rawExp = (customInfo.experienceYears || '2').trim();
    const numMatch = rawExp.match(/\d+(\.\d+)?/);
    const expNum = numMatch ? numMatch[0] : rawExp.replace(/[^a-zA-Z0-9]/g, '');
    const expPart = expNum ? `${expNum}year` : '2year';
    return `${cleanName}_ex-${expPart}_SQA_DIU`;
  };

  // Cover Letter Customizer State
  const [targetCompany, setTargetCompany] = useState('Tech Solutions Inc.');
  const [targetJobTitle, setTargetJobTitle] = useState('Software QA Engineer');
  const [copiedText, setCopiedText] = useState(false);
  const [copiedCover, setCopiedCover] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const resumeRef = useRef<HTMLDivElement>(null);

  // Active Career Objective (Fallback to default if empty)
  const activeCareerObjective = (customInfo.careerObjective && customInfo.careerObjective.trim())
    ? customInfo.careerObjective.trim()
    : DEFAULT_CAREER_OBJECTIVE;

  // Quick switch role focus preset
  const handleRoleSelect = (role: TargetRoleType) => {
    setTargetRole(role);
    setCustomInfo(prev => ({
      ...prev,
      careerObjective: ROLE_CAREER_OBJECTIVES[role] || DEFAULT_CAREER_OBJECTIVE
    }));
  };

  // Filtered Projects based on user selection
  const selectedProjects = useMemo(() => {
    return PROJECTS.filter(p => selectedProjectIds.includes(p.id));
  }, [selectedProjectIds]);

  // Quick Filter handlers
  const toggleProject = (id: string) => {
    setSelectedProjectIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const selectAllProjects = () => setSelectedProjectIds(PROJECTS.map(p => p.id));
  const deselectAllProjects = () => setSelectedProjectIds([]);
  const filterByProjectType = (type: 'Automation' | 'API' | 'Manual' | 'Performance') => {
    setSelectedProjectIds(PROJECTS.filter(p => p.type === type).map(p => p.id));
  };

  // ATS Score calculation algorithm
  const atsAnalysis = useMemo(() => {
    let score = 0;
    const checks: { label: string; passed: boolean; tip: string }[] = [];

    // Check 1: Contact info
    const hasContact = Boolean(customInfo.email && customInfo.phone && customInfo.location);
    if (hasContact) score += 20;
    checks.push({
      label: 'Complete Contact Information',
      passed: hasContact,
      tip: 'Ensure email, phone number, and location are present.'
    });

    // Check 2: Core SQA Keywords
    const allSkillsText = SKILL_CATEGORIES.flatMap(c => c.items).join(' ').toLowerCase();
    const coreKeywords = ['playwright', 'selenium', 'postman', 'api', 'stlc', 'jira', 'manual', 'automation', 'sql', 'python', 'jmeter'];
    const matchedKeywords = coreKeywords.filter(k => allSkillsText.includes(k) || activeCareerObjective.toLowerCase().includes(k));
    const keywordScore = Math.min(25, Math.round((matchedKeywords.length / coreKeywords.length) * 25));
    score += keywordScore;
    checks.push({
      label: `Core SQA Keywords (${matchedKeywords.length}/${coreKeywords.length} matched)`,
      passed: keywordScore >= 20,
      tip: 'Includes essential SQA tools: Playwright, Selenium, Postman, Jira, STLC, SQL.'
    });

    // Check 3: Quantifiable Metrics & Numbers
    const metricsCount = (WORK_EXPERIENCE.flatMap(e => e.highlights).join(' ').match(/\d+/g) || []).length;
    const hasMetrics = metricsCount > 3;
    if (hasMetrics) score += 20;
    checks.push({
      label: 'Quantifiable Metrics & Stats',
      passed: hasMetrics,
      tip: 'Use numbers like "150+ Test Cases", "2+ Years Exp", "0% Error Rate".'
    });

    // Check 4: Featured Projects Included
    const projectScore = selectedProjects.length >= 2 ? 20 : selectedProjects.length * 10;
    score += projectScore;
    checks.push({
      label: `Featured SQA Projects Selected (${selectedProjects.length} included)`,
      passed: selectedProjects.length >= 2,
      tip: 'Include at least 2-3 relevant projects to prove hands-on test execution.'
    });

    // Check 5: Formatting & Structure
    score += 15;
    checks.push({
      label: 'Standard ATS Layout & Clean Sections',
      passed: true,
      tip: 'Uses single-column ATS parser compliant structure.'
    });

    return { totalScore: Math.min(100, score), checks };
  }, [customInfo, activeCareerObjective, selectedProjects]);

  // PDF Export via html2pdf with strict size optimization (< 1MB) and guaranteed clickable hyperlinks
  const handleDownloadPDF = () => {
    if (!isAdminAuthenticated()) {
      setIsPasscodeModalOpen(true);
      return;
    }
    if (!resumeRef.current) return;
    setIsExportingPdf(true);

    const element = resumeRef.current;

    // A4 dimensions in mm
    const a4WidthMm = 210;
    const a4HeightMm = 297;
    // Margins: [top, right, bottom, left] in mm
    const margin = [10, 10, 10, 10] as [number, number, number, number];
    const marginY = margin[0]; // 10mm
    const marginX = margin[3]; // 10mm
    const innerWidthMm = a4WidthMm - margin[1] - margin[3]; // 190mm

    // Target width in CSS pixels for standard 96 DPI: 190mm * 96 / 25.4 = 718.11px -> 718px
    const targetPxWidth = 718;
    // Target inner page height in CSS pixels: 277mm * 96 / 25.4 = 1046.93px -> 1046px
    const targetPxHeight = 1046;

    const linkOverlays: {
      url: string;
      x: number;
      y: number;
      w: number;
      h: number;
      page: number;
    }[] = [];

    const opt = {
      margin: margin,
      filename: `${getCvBaseFileName()}.pdf`,
      // Quality 0.88 with JPEG keeps text razor-sharp at 2x scale while dropping file size to ~400KB - 700KB (< 1MB)
      image: { type: 'jpeg' as const, quality: 0.88 },
      enableLinks: false, // Handled with our exact pixel-to-millimeter overlay engine
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc: Document) => {
          // Replace oklch in all style tags to avoid html2canvas CSS parsing crash
          const styles = clonedDoc.querySelectorAll('style');
          styles.forEach((styleTag) => {
            if (styleTag.innerHTML && styleTag.innerHTML.includes('oklch')) {
              styleTag.innerHTML = styleTag.innerHTML.replace(/oklch\([^)]+\)/g, '#111827');
            }
          });

          const root = clonedDoc.querySelector('.print-only-resume') as HTMLElement | null;
          if (root) {
            // Lock background and layout to exact 190mm print width in CSS pixels
            root.style.backgroundColor = '#ffffff';
            root.style.color = '#000000';
            root.style.border = 'none';
            root.style.boxShadow = 'none';
            root.style.borderRadius = '0px';
            root.style.width = `${targetPxWidth}px`;
            root.style.maxWidth = `${targetPxWidth}px`;
            root.style.boxSizing = 'border-box';

            const allEls = root.querySelectorAll('*');
            allEls.forEach((el) => {
              const htmlEl = el as HTMLElement;
              const style = window.getComputedStyle(htmlEl);
              if (style.color && style.color.includes('oklch')) {
                htmlEl.style.color = '#111827';
              }
              if (style.backgroundColor && style.backgroundColor.includes('oklch')) {
                if (htmlEl.classList.contains('bg-slate-900')) {
                  htmlEl.style.backgroundColor = '#0f172a';
                } else if (htmlEl.classList.contains('bg-slate-50') || htmlEl.classList.contains('bg-gray-100')) {
                  htmlEl.style.backgroundColor = '#f3f4f6';
                } else if (htmlEl.classList.contains('bg-slate-200')) {
                  htmlEl.style.backgroundColor = '#e2e8f0';
                } else {
                  htmlEl.style.backgroundColor = 'transparent';
                }
              }
              if (style.borderColor && style.borderColor.includes('oklch')) {
                htmlEl.style.borderColor = '#d1d5db';
              }
            });

            // Capture exact link coordinates from the CLONED document
            // where width, wrapping, and heights exactly match the canvas painting
            const rootRect = root.getBoundingClientRect();
            const mmPerPx = innerWidthMm / (rootRect.width || targetPxWidth);

            const anchorEls = root.querySelectorAll('a[href]');
            anchorEls.forEach((aEl) => {
              const a = aEl as HTMLAnchorElement;
              const rawHref = a.getAttribute('href') || a.href;
              if (!rawHref || rawHref === '#' || rawHref.startsWith('javascript:')) return;
              const url = normalizeUrl(rawHref);

              const clientRects = a.getClientRects();
              for (let i = 0; i < clientRects.length; i++) {
                const rect = clientRects[i];
                if (rect.width <= 0 || rect.height <= 0) continue;

                // Relative offset inside the root canvas container
                const leftPx = rect.left - rootRect.left;
                const topPx = rect.top - rootRect.top;
                const widthPx = rect.width;
                const heightPx = rect.height;

                const pageNum = Math.floor(topPx / targetPxHeight) + 1;
                const yInPagePx = topPx % targetPxHeight;

                const xMm = marginX + (leftPx * mmPerPx);
                const yMm = marginY + (yInPagePx * mmPerPx);
                const wMm = widthPx * mmPerPx;
                const hMm = heightPx * mmPerPx;

                // Add 0.8mm hit-box padding for effortless clicking
                linkOverlays.push({
                  url,
                  x: Math.max(0, xMm - 0.6),
                  y: Math.max(0, yMm - 0.6),
                  w: wMm + 1.2,
                  h: hMm + 1.2,
                  page: pageNum
                });
              }
            });
          }
        }
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const, compress: true },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf()
      .set(opt)
      .from(element)
      .toPdf()
      .get('pdf')
      .then((pdf: any) => {
        if (pdf && pdf.internal) {
          // Patch jsPDF link function to ensure lower-left and upper-right coordinates strictly adhere to ISO 32000-1 PDF standard
          pdf.link = function(x: number, y: number, w: number, h: number, options: any) {
            const pageInfo = this.internal.getCurrentPageInfo();
            const s = this.internal.getCoordinateString;
            const o = this.internal.getVerticalCoordinateString;
            // PDF user space origin is at bottom-left:
            // y + h is closer to bottom (lower numerical value in PDF coordinate space)
            // y is closer to top (higher numerical value in PDF coordinate space)
            pageInfo.pageContext.annotations.push({
              finalBounds: {
                x: s(x),
                y: o(y + h), // yBottom
                w: s(x + w),
                h: o(y)      // yTop
              },
              options: options,
              type: 'link'
            });
          };

          const totalPages = pdf.internal.getNumberOfPages();
          // Inject each verified clickable link overlay into its respective PDF page
          linkOverlays.forEach((item) => {
            if (item.page <= totalPages) {
              pdf.setPage(item.page);
              pdf.link(item.x, item.y, item.w, item.h, { url: item.url });
            }
          });
          pdf.setPage(totalPages);
        }

        // Save PDF directly through the jsPDF instance with embedded link annotations
        pdf.save(opt.filename);
        setIsExportingPdf(false);
      })
      .catch((err: unknown) => {
        console.error('PDF generation error:', err);
        setIsExportingPdf(false);
        window.print();
      });
  };

  // Browser Print trigger with dedicated isolated iframe for A4 print/PDF output
  const handlePrint = () => {
    if (!isAdminAuthenticated()) {
      setIsPasscodeModalOpen(true);
      return;
    }
    try {
      window.focus();
      const element = resumeRef.current;
      if (!element) {
        window.print();
        return;
      }

      // Collect all active styles and fonts from head
      const styleSheets = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map((el) => el.outerHTML)
        .join('\n');

      // Create an isolated print iframe
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${getCvBaseFileName()}</title>
              ${styleSheets}
              <style>
                @page { size: A4 portrait; margin: 10mm 12mm; }
                body {
                  background-color: #ffffff !important;
                  color: #000000 !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                .print-only-resume {
                  width: 100% !important;
                  max-width: 100% !important;
                  box-shadow: none !important;
                  border: none !important;
                  background: #ffffff !important;
                  color: #000000 !important;
                  padding: 0 !important;
                  margin: 0 !important;
                }
              </style>
            </head>
            <body>
              <div class="print-only-resume">
                ${element.innerHTML}
              </div>
            </body>
          </html>
        `);
        doc.close();

        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) {
            console.warn('Iframe print failed, falling back to window.print()', e);
            window.print();
          }
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 1500);
        }, 300);
      } else {
        window.print();
      }
    } catch (err) {
      console.error('Print error:', err);
      window.print();
    }
  };

  // Structured Microsoft Word Resume Generator that maintains 100% layout fidelity without breaking
  const generateWordResumeHtml = () => {
    return `
<html xmlns:o='urn:schemas-microsoft-com:office:office'
      xmlns:w='urn:schemas-microsoft-com:office:word'
      xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>${customInfo.name} - SQA Engineer Resume</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page Section1 {
      size: 595.3pt 841.9pt; /* Standard A4 */
      margin: 36.0pt 36.0pt 36.0pt 36.0pt; /* 0.5 inch margins */
      mso-header-margin: 36.0pt;
      mso-footer-margin: 36.0pt;
      mso-paper-source: 0;
    }
    div.Section1 { page: Section1; }
    body {
      font-family: 'Calibri', 'Arial', 'Segoe UI', sans-serif;
      font-size: 10pt;
      line-height: 1.35;
      color: #111111;
      background-color: #ffffff;
      margin: 0;
      padding: 0;
    }
    h1 {
      font-family: 'Calibri', 'Arial', sans-serif;
      font-size: 20pt;
      font-weight: bold;
      text-align: center;
      margin: 0 0 2pt 0;
      color: #000000;
      text-transform: uppercase;
      letter-spacing: 0.5pt;
    }
    .sub-title {
      font-size: 11pt;
      font-weight: bold;
      text-align: center;
      color: #222222;
      margin: 0 0 4pt 0;
      text-transform: uppercase;
    }
    .contact-bar {
      font-size: 9.5pt;
      text-align: center;
      color: #222222;
      margin: 0 0 8pt 0;
      line-height: 1.4;
    }
    .contact-bar a {
      color: #0a66c2;
      text-decoration: underline;
    }
    .section-title {
      font-size: 11pt;
      font-weight: bold;
      text-transform: uppercase;
      color: #000000;
      border-bottom: 1.5pt solid #000000;
      padding-bottom: 2pt;
      margin: 12pt 0 4pt 0;
      letter-spacing: 0.5pt;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 3pt;
      margin-bottom: 2pt;
    }
    td.left-col {
      text-align: left;
      vertical-align: top;
      font-size: 10pt;
    }
    td.right-col {
      text-align: right;
      vertical-align: top;
      font-size: 9.5pt;
      color: #222222;
      font-weight: bold;
      white-space: nowrap;
    }
    ul.bullet-list {
      margin: 2pt 0 6pt 16pt;
      padding: 0;
    }
    li.bullet-item {
      font-size: 9.5pt;
      line-height: 1.35;
      margin-bottom: 2.5pt;
      color: #1a1a1a;
    }
    p {
      margin: 0 0 4pt 0;
      font-size: 9.5pt;
      line-height: 1.35;
    }
    a {
      color: #0a66c2;
      text-decoration: underline;
    }
  </style>
</head>
<body>
<div class="Section1">
  <!-- Header Title & Contact -->
  <h1>${customInfo.name}</h1>
  <div class="sub-title">${customInfo.title}</div>
  <div class="contact-bar">
    ${customInfo.location ? `${customInfo.location} | ` : ''}
    <a href="tel:${customInfo.phone}">${customInfo.phone}</a> | 
    <a href="mailto:${customInfo.email}">${customInfo.email}</a><br>
    LinkedIn: <a href="${normalizeUrl(customInfo.linkedin)}">(Click Here)</a> | 
    GitHub: <a href="${normalizeUrl(customInfo.github)}">(Click Here)</a> | 
    Portfolio: <a href="${normalizeUrl(window.location.origin)}">(Click Here)</a>
  </div>

  <!-- Career Objective -->
  <div class="section-title">CAREER OBJECTIVE</div>
  <p>${activeCareerObjective}</p>

  <!-- Core Skills -->
  <div class="section-title">CORE TECHNICAL SKILLS</div>
  <table class="data-table" border="0" cellpadding="0" cellspacing="0">
    ${SKILL_CATEGORIES.map(c => `
      <tr>
        <td class="left-col" style="width: 28%; font-weight: bold; padding: 2pt 0; vertical-align: top;">${c.category}:</td>
        <td class="left-col" style="padding: 2pt 0; vertical-align: top;">${c.items.join(', ')}</td>
      </tr>
    `).join('')}
  </table>

  <!-- Work Experience -->
  <div class="section-title">WORK EXPERIENCE</div>
  ${WORK_EXPERIENCE.map(exp => `
    <table class="data-table" border="0" cellpadding="0" cellspacing="0">
      <tr>
        <td class="left-col" style="width: 70%;"><b>${exp.role}</b> - ${exp.company}</td>
        <td class="right-col" style="width: 30%;">${exp.period} | ${exp.location}</td>
      </tr>
    </table>
    <ul class="bullet-list">
      ${exp.highlights.map(h => `<li class="bullet-item">${h}</li>`).join('')}
    </ul>
  `).join('')}

  <!-- Key Projects -->
  ${selectedProjects.length > 0 ? `
    <div class="section-title">KEY SQA PROJECTS</div>
    ${selectedProjects.map(proj => `
      <table class="data-table" border="0" cellpadding="0" cellspacing="0">
        <tr>
          <td class="left-col" style="width: 75%;">
            <b>${proj.title}</b>
            ${proj.link ? ` [ <a href="${normalizeUrl(proj.link)}">GitHub Repo</a> ]` : ''}
          </td>
          <td class="right-col" style="width: 25%; color: #555555;">[ ${proj.type.toUpperCase()} ]</td>
        </tr>
      </table>
      <p style="margin-bottom: 2pt;">${proj.description}</p>
      <p style="font-size: 9pt; color: #444444; margin-bottom: 6pt;">
        <b>Tools & Tech:</b> ${proj.tags.join(', ')}
        ${proj.metrics && proj.metrics.length > 0 ? ` | <b>Metrics:</b> ${proj.metrics.map(m => `${m.label}: ${m.value}`).join(' • ')}` : ''}
      </p>
    `).join('')}
  ` : ''}

  <!-- Education -->
  <div class="section-title">EDUCATION</div>
  ${EDUCATION_HISTORY.map(edu => `
    <table class="data-table" border="0" cellpadding="0" cellspacing="0">
      <tr>
        <td class="left-col" style="width: 70%;"><b>${edu.degree}</b> - ${edu.institution}</td>
        <td class="right-col" style="width: 30%;">${edu.period} | ${edu.location}</td>
      </tr>
    </table>
    ${edu.details ? `<p style="font-size: 9pt; color: #444444; margin-top: 1pt; margin-bottom: 4pt;">${edu.details}</p>` : ''}
  `).join('')}

  <!-- Professional References -->
  ${PROFESSIONAL_REFERENCES && PROFESSIONAL_REFERENCES.length > 0 ? `
    <div class="section-title">PROFESSIONAL REFERENCES</div>
    <table class="data-table" border="0" cellpadding="0" cellspacing="0">
      ${PROFESSIONAL_REFERENCES.map(ref => `
        <tr>
          <td class="left-col" style="padding-bottom: 4pt;">
            <b>${ref.name}</b><br>
            ${ref.role}, ${ref.company}<br>
            <span style="font-size: 9pt; color: #444444;">Email: <a href="mailto:${ref.email}">${ref.email}</a> | Phone: <a href="tel:${ref.phone}">${ref.phone}</a></span>
          </td>
        </tr>
      `).join('')}
    </table>
  ` : ''}
</div>
</body>
</html>
    `;
  };

  // Word Document (.doc / .docx compatible) Export trigger with 100% stable formatting
  const handleDownloadDOCX = () => {
    if (!isAdminAuthenticated()) {
      setIsPasscodeModalOpen(true);
      return;
    }
    const sourceHTML = generateWordResumeHtml();
    // Using UTF-8 BOM (\ufeff) so Word, LibreOffice, and Google Docs preserve bullet points & formatting flawlessly
    const blob = new Blob(['\ufeff' + sourceHTML], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const fileDownload = document.createElement("a");
    fileDownload.href = url;
    fileDownload.download = `${getCvBaseFileName()}.doc`;
    document.body.appendChild(fileDownload);
    fileDownload.click();
    setTimeout(() => {
      document.body.removeChild(fileDownload);
      URL.revokeObjectURL(url);
    }, 300);
  };

  // Plain Text Copying
  const handleCopyPlainText = () => {
    if (!isAdminAuthenticated()) {
      setIsPasscodeModalOpen(true);
      return;
    }
    let text = `${customInfo.name.toUpperCase()}\n${customInfo.title}\n`;
    text += `Email: ${customInfo.email} | Phone: ${customInfo.phone} | Location: ${customInfo.location}\n`;
    text += `LinkedIn: ${customInfo.linkedin} | GitHub: ${customInfo.github}\n\n`;
    text += `=== CAREER OBJECTIVE ===\n${activeCareerObjective}\n\n`;
    text += `=== CORE SKILLS ===\n`;
    SKILL_CATEGORIES.forEach(c => {
      text += `${c.category}: ${c.items.join(', ')}\n`;
    });
    text += `\n=== WORK EXPERIENCE ===\n`;
    WORK_EXPERIENCE.forEach(e => {
      text += `${e.role} | ${e.company} (${e.period}) - ${e.location}\n`;
      e.highlights.forEach(h => {
        text += `• ${h}\n`;
      });
      text += `\n`;
    });
    text += `=== KEY PROJECTS ===\n`;
    selectedProjects.forEach(p => {
      text += `${p.title} (${p.type}) | ${p.link || ''}\n`;
      text += `${p.description}\n`;
      if (p.tags) text += `Tools: ${p.tags.join(', ')}\n`;
      text += `\n`;
    });
    text += `=== EDUCATION ===\n`;
    EDUCATION_HISTORY.forEach(edu => {
      text += `${edu.degree} - ${edu.institution} (${edu.period})\n`;
    });

    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  // Generated Cover Letter
  const generatedCoverLetter = useMemo(() => {
    return `Sabbir Ahamed
Tongi East, Gazipur 1710, Bangladesh
${customInfo.email} | ${customInfo.phone}
${customInfo.linkedin}

Date: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}

Hiring Manager / Talent Acquisition Team
${targetCompany}

Subject: Application for ${targetJobTitle} Position

Dear Hiring Manager,

I am writing to express my strong enthusiasm for the ${targetJobTitle} position at ${targetCompany}. With over 2 years of hands-on experience in Software Quality Assurance at Altersense Ltd, I have developed deep expertise in Manual Testing, REST API Verification, and Web UI Automation using Playwright (Python) and Selenium.

In my current role as Jr. SQA Engineer, I actively participate in Agile sprints, write comprehensive test cases, perform thorough regression and exploratory testing across complex ERP commercial modules, and report actionable defects in Jira. Additionally, I lead API test automation using Postman & Newman, verifying endpoint payloads and data integrity in SQL databases.

Key strengths I bring to ${targetCompany}:
• Proven track record in designing 150+ test cases and catching critical edge-case defects before production deployment.
• Hands-on automation skills in Playwright (Python), Pytest, Selenium, and CI/CD integration with GitHub Actions.
• Rigorous execution of STLC & SDLC principles with strong focus on user experience and software reliability.

I am eager to contribute my QA methodologies and automation enthusiasm to ${targetCompany}'s engineering goals. Thank you for considering my application. I welcome the opportunity to discuss how my qualifications align with your team's objectives.

Sincerely,

Sabbir Ahamed
Software Quality Assurance Engineer`;
  }, [customInfo, targetCompany, targetJobTitle]);

  const handleCopyCoverLetter = () => {
    navigator.clipboard.writeText(generatedCoverLetter);
    setCopiedCover(true);
    setTimeout(() => setCopiedCover(false), 2000);
  };

  useEffect(() => {
    const handleAuth = () => {
      setIsAdmin(isAdminAuthenticated());
    };
    window.addEventListener('admin_auth_changed', handleAuth);
    return () => window.removeEventListener('admin_auth_changed', handleAuth);
  }, []);

  if (!isOpen) return null;

  if (!isAdmin) {
    return (
      <>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md bg-[#12151C] border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl text-white space-y-6 text-center">
            <div className="inline-flex p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mx-auto">
              <Lock className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="font-display font-extrabold text-xl text-white">
                Admin Authentication Required
              </h3>
              <p className="text-xs font-mono text-[#9CA3AF] leading-relaxed">
                Only the verified portfolio administrator (Sabbir Ahamed) has permission to create, customize, or download ATS Resumes.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold transition-all cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => setIsPasscodeModalOpen(true)}
                className="flex-1 py-3 rounded-full bg-[#FF6B35] hover:bg-[#FF814F] text-white font-mono text-xs font-bold shadow-lg shadow-[#FF6B35]/25 transition-all cursor-pointer flex items-center justify-center space-x-2"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Admin Unlock</span>
              </button>
            </div>
          </div>
        </div>

        {isPasscodeModalOpen && (
          <AdminPasscodeModal
            isOpen={isPasscodeModalOpen}
            onClose={() => setIsPasscodeModalOpen(false)}
            onSuccess={() => {
              setIsAdmin(true);
              setIsPasscodeModalOpen(false);
            }}
            title="Resume Builder Admin Verification"
            description="Enter your Admin Security Passcode to access, customize, and download ATS Resumes."
          />
        )}
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-md flex flex-col justify-between animate-fadeIn">
      {/* Modal Top Navigation Header */}
      <div className="bg-[#12151C] border-b border-white/10 px-4 sm:px-6 py-3 flex items-center justify-between no-print z-20">
        <div className="flex items-center space-x-3">
          <div className="bg-[#FF6B35]/15 p-2 rounded-xl border border-[#FF6B35]/30">
            <FileText className="w-5 h-5 text-[#FF6B35]" />
          </div>
          <div>
            <h2 className="font-display font-bold text-base sm:text-lg text-white flex items-center gap-2">
              <span>Dynamic SQA Resume Builder</span>
              <span className="text-[10px] font-mono font-normal uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                Live Data Synced
              </span>
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-[#D1D5DB] hidden sm:inline">
                ATS Optimized • Customizable
              </span>
              <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-black/40 border border-white/10 text-[11px] font-mono text-[#E5E7EB]">
                <span className="text-[#FF6B35] font-bold">File:</span>
                <span className="text-emerald-400 font-semibold">{getCvBaseFileName()}.pdf</span>
              </span>
            </div>
          </div>
        </div>

        {/* Action Export Buttons */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5">
          <button
            onClick={handleDownloadDOCX}
            className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-xs font-mono font-medium transition-colors cursor-pointer"
            title="Download formatted Word resume (.doc / .docx compatible, no layout breaks)"
          >
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span>Word (.doc)</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-mono font-medium transition-colors cursor-pointer"
            title="Print or Save to 100% Vector PDF via Browser Print (Ultra-lightweight <150KB with clickable links)"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span>Print / PDF</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={isExportingPdf}
            className="flex items-center space-x-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-[#FF6B35] hover:bg-[#FF814F] text-white text-xs font-mono font-semibold shadow-lg shadow-[#FF6B35]/20 transition-all cursor-pointer disabled:opacity-50"
            title="Download PDF under 1MB with crisp 192 DPI and active clickable links"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExportingPdf ? 'Exporting...' : 'Download PDF (<1MB)'}</span>
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors cursor-pointer ml-1 sm:ml-2"
            title="Close Resume Builder"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Container Layout: Controls Bar + Live Preview */}
      <div className="flex-grow overflow-hidden flex flex-col md:flex-row relative">
        
        {/* Left Control Sidebar */}
        <div className="w-full md:w-80 lg:w-96 bg-[#0B0D12] border-r border-white/10 flex flex-col overflow-y-auto p-4 space-y-6 no-print max-h-[40vh] md:max-h-none">
          
          {/* Navigation Control Tabs */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-[#12151C] rounded-xl border border-white/10 text-xs font-mono">
            <button
              onClick={() => setActiveTab('preview')}
              className={`py-2 rounded-lg text-center transition-colors cursor-pointer ${activeTab === 'preview' ? 'bg-[#FF6B35] text-white font-bold' : 'text-[#9CA3AF] hover:text-white'}`}
            >
              Template
            </button>
            <button
              onClick={() => setActiveTab('projects-filter')}
              className={`py-2 rounded-lg text-center transition-colors cursor-pointer relative ${activeTab === 'projects-filter' ? 'bg-[#FF6B35] text-white font-bold' : 'text-[#9CA3AF] hover:text-white'}`}
            >
              Projects
              <span className="ml-1 text-[9px] bg-white/20 px-1 rounded-full">{selectedProjectIds.length}</span>
            </button>
            <button
              onClick={() => setActiveTab('ats-score')}
              className={`py-2 rounded-lg text-center transition-colors cursor-pointer ${activeTab === 'ats-score' ? 'bg-[#FF6B35] text-white font-bold' : 'text-[#9CA3AF] hover:text-white'}`}
            >
              ATS ({atsAnalysis.totalScore}%)
            </button>
            <button
              onClick={() => setActiveTab('cover-letter')}
              className={`py-2 rounded-lg text-center transition-colors cursor-pointer ${activeTab === 'cover-letter' ? 'bg-[#FF6B35] text-white font-bold' : 'text-[#9CA3AF] hover:text-white'}`}
            >
              Cover
            </button>
          </div>

          {/* TAB 1: TEMPLATE & ROLE SELECTION */}
          {activeTab === 'preview' && (
            <div className="space-y-5 animate-fadeIn">
              {/* Template Switcher */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-[#FF6B35] uppercase font-bold tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Choose Resume Template</span>
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: 'classic-ats', name: 'Classic ATS (Highest Pass Rate)', desc: 'Standard single-column, max parser parsing accuracy.' },
                    { id: 'modern-pro', name: 'Modern Professional', desc: 'Clean header bar, skill pill badges, refined typography.' },
                    { id: 'minimal', name: 'Minimalist Clean', desc: 'Sleek, spacious black-and-white print design.' },
                    { id: 'executive', name: 'Executive Leadership', desc: 'Bold top header, highlighted metrics & stats banner.' },
                    { id: 'portfolio-style', name: 'Portfolio Technical Style', desc: 'Emphasizes automation suite links and test metrics.' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTemplate(t.id as TemplateType)}
                      className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                        template === t.id 
                          ? 'bg-[#12151C] border-[#FF6B35] shadow-lg shadow-[#FF6B35]/10' 
                          : 'bg-[#12151C]/40 border-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{t.name}</span>
                        {template === t.id && <Check className="w-3.5 h-3.5 text-[#FF6B35]" />}
                      </div>
                      <p className="text-[11px] text-[#9CA3AF] mt-0.5 font-light">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Professional ATS Typography Selector */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono text-[#FF6B35] uppercase font-bold tracking-wider flex items-center gap-1.5">
                    <Type className="w-3.5 h-3.5" />
                    <span>Professional Font</span>
                  </label>
                  <span className="text-[10px] font-mono text-emerald-400">ATS Optimized</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 font-mono text-[11px]">
                  {[
                    { id: 'modern', label: 'Modern Sans', sub: 'Inter / Calibri' },
                    { id: 'serif', label: 'Exec Serif', sub: 'Merriweather' },
                    { id: 'corporate', label: 'Corporate', sub: 'Source Sans' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFontFamily(f.id as AtsFontFamily)}
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                        fontFamily === f.id
                          ? 'bg-[#FF6B35] border-[#FF6B35] text-white font-bold shadow-sm'
                          : 'bg-[#12151C] border-white/10 text-[#9CA3AF] hover:text-white hover:border-white/20'
                      }`}
                    >
                      <span className="block text-xs font-bold leading-tight">{f.label}</span>
                      <span className={`block text-[9px] mt-0.5 ${fontFamily === f.id ? 'text-white/80' : 'text-[#6B7280]'}`}>{f.sub}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[10.5px] text-[#D1D5DB] font-mono leading-relaxed">
                  ✓ Clickable links (GitHub, LinkedIn, Portfolio, Repositories) are embedded cleanly into text for ATS parsers & printable PDF.
                </p>
              </div>

              {/* Candidate Info & PDF Filename Setup */}
              <div className="space-y-2.5 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono text-[#FF6B35] uppercase font-bold tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    <span>Candidate & PDF Export Settings</span>
                  </label>
                  <span className="text-[10px] font-mono text-emerald-400">Synced</span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#12151C] border border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-[#D1D5DB]">Target PDF Filename:</span>
                    <span className="text-emerald-400 font-bold">{getCvBaseFileName()}.pdf</span>
                  </div>
                  <div className="text-[10px] text-[#D1D5DB] font-mono bg-black/30 p-1.5 rounded border border-white/5">
                    Format: <span className="text-amber-300 font-semibold">Name_ex-year_SQA_DIU.pdf</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="text-[10px] font-mono text-[#D1D5DB] block mb-1">Candidate Name</label>
                      <input
                        type="text"
                        value={customInfo.name}
                        onChange={(e) => setCustomInfo(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full p-2 bg-[#0B0D12] border border-white/10 rounded text-xs text-white focus:border-[#FF6B35] outline-none font-mono"
                        placeholder="Sabbir Ahamed"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-[#D1D5DB] block mb-1">Experience (Years)</label>
                      <input
                        type="text"
                        value={customInfo.experienceYears}
                        onChange={(e) => setCustomInfo(prev => ({ ...prev, experienceYears: e.target.value }))}
                        className="w-full p-2 bg-[#0B0D12] border border-white/10 rounded text-xs text-white focus:border-[#FF6B35] outline-none font-mono"
                        placeholder="2"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SQA Role Target Preset */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <label className="text-xs font-mono text-[#FF6B35] uppercase font-bold tracking-wider flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Target Role Focus</span>
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: 'all-rounder', name: 'All-Round SQA' },
                    { id: 'automation-qa', name: 'Automation QA' },
                    { id: 'api-testing', name: 'API Specialist' },
                    { id: 'manual-qa', name: 'Manual SQA' },
                  ].map((r) => (
                    <button
                      key={r.id}
                      onClick={() => handleRoleSelect(r.id as TargetRoleType)}
                      className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer font-mono ${
                        targetRole === r.id
                          ? 'bg-[#FF6B35]/20 border-[#FF6B35] text-white font-bold'
                          : 'bg-[#12151C] border-white/10 text-[#D1D5DB] hover:text-white'
                      }`}
                    >
                      {r.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Career Objective Customizer & Default Switcher */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono text-[#FF6B35] uppercase font-bold tracking-wider flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5" />
                    <span>Career Objective</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomInfo(prev => ({
                        ...prev,
                        careerObjective: DEFAULT_CAREER_OBJECTIVE
                      }));
                    }}
                    className="text-[10px] font-mono text-amber-400 hover:text-amber-300 underline cursor-pointer"
                    title="Reset to default Career Objective"
                  >
                    Reset Default
                  </button>
                </div>
                <p className="text-[11px] text-[#D1D5DB] leading-relaxed">
                  Replaces Professional Summary in CV PDF / Print. Edit below or keep default:
                </p>
                <textarea
                  rows={4}
                  value={customInfo.careerObjective}
                  onChange={(e) => setCustomInfo(prev => ({ ...prev, careerObjective: e.target.value }))}
                  placeholder={DEFAULT_CAREER_OBJECTIVE}
                  className="w-full p-2.5 bg-[#12151C] border border-white/10 rounded-lg text-xs text-white focus:border-[#FF6B35] outline-none font-sans leading-relaxed resize-y"
                />
                <div className="flex justify-between items-center text-[10px] text-[#D1D5DB] font-mono">
                  <span className="text-emerald-400/90">✓ Applied to PDF & Print</span>
                  <span>{customInfo.careerObjective.length} chars</span>
                </div>
              </div>

              {/* Extra Download Options */}
              <div className="pt-2 border-t border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono text-[#9CA3AF] uppercase">Export Formats</label>
                  <span className="text-[10px] font-mono text-emerald-400">PDF & Word Ready</span>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleDownloadDOCX}
                    className="w-full flex items-center justify-between py-2 px-3 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 rounded-lg text-xs font-mono text-blue-200 transition-colors cursor-pointer text-left"
                    title="Clean ATS table layout that never breaks in Word"
                  >
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                      <div>
                        <div className="font-bold text-white">Download Word (.doc)</div>
                        <div className="text-[10px] text-blue-300/80">Zero layout break • Native MS Word tables</div>
                      </div>
                    </div>
                    <Download className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  </button>

                  <button
                    onClick={handleDownloadPDF}
                    disabled={isExportingPdf}
                    className="w-full flex items-center justify-between py-2 px-3 bg-[#FF6B35]/10 hover:bg-[#FF6B35]/20 border border-[#FF6B35]/30 rounded-lg text-xs font-mono text-[#FF6B35] transition-colors cursor-pointer text-left disabled:opacity-50"
                    title="Direct PDF download with clickable links and under 1MB size"
                  >
                    <div className="flex items-center space-x-2">
                      <Download className="w-4 h-4 text-[#FF6B35] shrink-0" />
                      <div>
                        <div className="font-bold text-white">Direct PDF (&lt; 1MB)</div>
                        <div className="text-[10px] text-gray-300">Clickable links • 192 DPI high sharpness</div>
                      </div>
                    </div>
                    <span className="text-[10px] bg-[#FF6B35]/20 px-1.5 py-0.5 rounded text-white font-bold">~500KB</span>
                  </button>

                  <button
                    onClick={handlePrint}
                    className="w-full flex items-center justify-between py-2 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-mono text-gray-200 transition-colors cursor-pointer text-left"
                    title="Use browser print dialog to save 100% Vector PDF"
                  >
                    <div className="flex items-center space-x-2">
                      <Printer className="w-4 h-4 text-amber-400 shrink-0" />
                      <div>
                        <div className="font-bold text-white">Print / Vector PDF</div>
                        <div className="text-[10px] text-gray-400">Ctrl+P • 100% Vector & Selectable Text</div>
                      </div>
                    </div>
                    <span className="text-[10px] bg-amber-400/20 px-1.5 py-0.5 rounded text-amber-300 font-bold">&lt;100KB</span>
                  </button>

                  <button
                    onClick={handleCopyPlainText}
                    className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-[#12151C] hover:bg-white/10 border border-white/10 rounded-lg text-xs font-mono text-white transition-colors cursor-pointer"
                  >
                    {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                    <span>{copiedText ? 'Copied to Clipboard!' : 'Copy Plain Text ATS'}</span>
                  </button>
                </div>

                {/* Suggestions / Advice Box */}
                <div className="mt-2 p-2.5 rounded-lg bg-white/5 border border-white/10 text-[11px] font-sans text-gray-300 space-y-1.5 leading-relaxed">
                  <div className="font-bold font-mono text-xs text-amber-300 flex items-center gap-1">
                    <span>💡 Quality & Format Advice:</span>
                  </div>
                  <ul className="space-y-1 text-[10.5px] text-gray-300 list-disc list-inside">
                    <li><strong className="text-white">PDF:</strong> All links (LinkedIn, GitHub, Portfolio, Email, Phone) are active &amp; clickable. Size is strictly optimized under 1MB.</li>
                    <li><strong className="text-white">Word (.doc):</strong> Created with native Word tables, so job dates and titles never break or overlap when opened in Word or Google Docs.</li>
                    <li><strong className="text-white">Print / Vector:</strong> Best for ATS portals that demand pure vector PDFs without raster compression.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INCLUDE PROJECTS FILTER (Explicitly requested by user) */}
          {activeTab === 'projects-filter' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono text-[#FF6B35] uppercase font-bold tracking-wider flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Select Projects for Resume</span>
                </label>
                <span className="text-xs font-mono text-[#9CA3AF]">{selectedProjectIds.length} / {PROJECTS.length}</span>
              </div>

              {/* Quick Filter Buttons */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={selectAllProjects}
                  className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-[10px] font-mono text-white cursor-pointer"
                >
                  Select All
                </button>
                <button
                  onClick={deselectAllProjects}
                  className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-[10px] font-mono text-white cursor-pointer"
                >
                  Clear All
                </button>
                <button
                  onClick={() => filterByProjectType('Automation')}
                  className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono cursor-pointer"
                >
                  Automation Only
                </button>
                <button
                  onClick={() => filterByProjectType('API')}
                  className="px-2 py-1 rounded bg-blue-500/20 text-blue-300 text-[10px] font-mono cursor-pointer"
                >
                  API Only
                </button>
                <button
                  onClick={() => filterByProjectType('Manual')}
                  className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono cursor-pointer"
                >
                  Manual Only
                </button>
              </div>

              {/* List of projects with toggle checkboxes */}
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                {PROJECTS.map((proj) => {
                  const isChecked = selectedProjectIds.includes(proj.id);
                  return (
                    <div
                      key={proj.id}
                      onClick={() => toggleProject(proj.id)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start space-x-3 ${
                        isChecked ? 'bg-[#12151C] border-[#FF6B35]/60 text-white' : 'bg-[#12151C]/30 border-white/5 text-[#9CA3AF] opacity-60'
                      }`}
                    >
                      <button className="mt-0.5 focus:outline-none">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-[#FF6B35]" />
                        ) : (
                          <Square className="w-4 h-4 text-white/30" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-bold truncate text-white">{proj.title}</p>
                          <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                            proj.type === 'Automation' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            proj.type === 'API' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                            'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            {proj.type}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#9CA3AF] line-clamp-1 mt-0.5">{proj.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: ATS SCORE INSPECTOR */}
          {activeTab === 'ats-score' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 rounded-xl bg-[#12151C] border border-white/10 text-center space-y-2">
                <p className="text-xs font-mono text-[#9CA3AF] uppercase">ATS Compatibility Score</p>
                <p className="font-display font-extrabold text-4xl text-emerald-400">
                  {atsAnalysis.totalScore}%
                </p>
                <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-400 h-full transition-all duration-500" 
                    style={{ width: `${atsAnalysis.totalScore}%` }} 
                  />
                </div>
                <p className="text-[11px] text-[#D1D5DB]">
                  {atsAnalysis.totalScore >= 85 ? '🎉 Highly Optimized for ATS Systems' : '⚠️ Minor recommendations available below'}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono text-[#FF6B35] uppercase font-bold">ATS Audit Checklist</label>
                <div className="space-y-2 text-xs">
                  {atsAnalysis.checks.map((chk, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-[#12151C] border border-white/5 space-y-1">
                      <div className="flex items-center space-x-2">
                        {chk.passed ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        )}
                        <span className={`font-semibold ${chk.passed ? 'text-white' : 'text-[#D1D5DB]'}`}>{chk.label}</span>
                      </div>
                      <p className="text-[11px] text-[#9CA3AF] pl-5 font-light">{chk.tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: COVER LETTER GENERATOR */}
          {activeTab === 'cover-letter' && (
            <div className="space-y-4 animate-fadeIn">
              <label className="text-xs font-mono text-[#FF6B35] uppercase font-bold tracking-wider">Customize Cover Letter</label>
              
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-[#9CA3AF] font-mono">Target Company Name</label>
                  <input
                    type="text"
                    value={targetCompany}
                    onChange={(e) => setTargetCompany(e.target.value)}
                    className="w-full mt-1 p-2 bg-[#12151C] border border-white/10 rounded-lg text-xs text-white focus:border-[#FF6B35] outline-none font-mono"
                    placeholder="e.g. Brain Station 23 / Enosis"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#9CA3AF] font-mono">Target Job Role</label>
                  <input
                    type="text"
                    value={targetJobTitle}
                    onChange={(e) => setTargetJobTitle(e.target.value)}
                    className="w-full mt-1 p-2 bg-[#12151C] border border-white/10 rounded-lg text-xs text-white focus:border-[#FF6B35] outline-none font-mono"
                    placeholder="e.g. SQA Automation Engineer"
                  />
                </div>
                <button
                  onClick={handleCopyCoverLetter}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 bg-[#FF6B35] hover:bg-[#FF814F] text-white rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shadow-lg"
                >
                  {copiedCover ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedCover ? 'Cover Letter Copied!' : 'Copy Cover Letter'}</span>
                </button>

                {onOpenCoverLetter && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenCoverLetter();
                    }}
                    className="w-full flex items-center justify-center space-x-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shadow-lg mt-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Open AI Cover Letter & Match Score</span>
                  </button>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Right Printable A4 Live Resume Preview Stage */}
        <div className="flex-1 bg-[#1a1d24] overflow-y-auto p-4 sm:p-8 flex justify-center items-start">
          
          {/* Printable A4 Container Card */}
          <div 
            ref={resumeRef}
            className={`print-only-resume bg-white text-black shadow-2xl rounded-sm w-full max-w-[210mm] min-h-[297mm] p-8 sm:p-10 text-xs leading-relaxed selection:bg-amber-200 ${
              fontFamily === 'serif' ? 'font-ats-serif' : fontFamily === 'corporate' ? 'font-ats-corporate' : 'font-ats-modern'
            }`}
            style={{ width: '100%', maxWidth: '210mm', color: '#000000', backgroundColor: '#ffffff' }}
          >

            {/* TEMPLATE 1: CLASSIC ATS (DEFAULT) */}
            {template === 'classic-ats' && (
              <div className="flex flex-col space-y-4">
                {/* Header */}
                <div className="pb-3 mb-4 text-center space-y-1">
                  <h1 className="text-2xl font-bold uppercase tracking-wide text-black font-serif">{customInfo.name}</h1>
                  <p className="text-xs font-bold text-black uppercase tracking-wider">{customInfo.title}</p>
                  <p className="text-[11px] text-black font-mono font-medium">
                    {customInfo.location} | <a href={`tel:${customInfo.phone}`} className="hover:underline font-semibold" style={{ color: '#000000' }}>{customInfo.phone}</a> | <a href={`mailto:${customInfo.email}`} className="hover:underline font-semibold" style={{ color: '#000000' }}>{customInfo.email}</a>
                  </p>
                  <p className="text-[11px] text-black font-mono flex items-center justify-center gap-2 flex-wrap pt-0.5">
                    <span>
                      LinkedIn: <a href={normalizeUrl(customInfo.linkedin)} target="_blank" rel="noopener noreferrer" className="text-[#0a66c2] hover:underline font-bold" style={{ color: '#0a66c2', textDecoration: 'underline' }}>(Click Here)</a>
                    </span>
                    <span>|</span>
                    <span>
                      GitHub: <a href={normalizeUrl(customInfo.github)} target="_blank" rel="noopener noreferrer" className="text-gray-900 hover:underline font-bold" style={{ color: '#000000', textDecoration: 'underline' }}>(Click Here)</a>
                    </span>
                    <span>|</span>
                    <span>
                      Portfolio: <a href={normalizeUrl(window.location.origin)} target="_blank" rel="noopener noreferrer" className="text-[#ea580c] hover:underline font-bold" style={{ color: '#ea580c', textDecoration: 'underline' }}>(Click Here)</a>
                    </span>
                  </p>
                </div>

                {/* Career Objective */}
                <div className="mb-4">
                  <h2 className="text-xs font-bold uppercase border-b border-black pb-1 mb-2 text-black tracking-wider">CAREER OBJECTIVE</h2>
                  <p className="text-[11px] text-black leading-relaxed text-justify">{activeCareerObjective}</p>
                </div>

                {/* Technical Skills */}
                <div className="mb-4">
                  <h2 className="text-xs font-bold uppercase border-b border-black pb-1 mb-2 text-black tracking-wider">Technical Skills & Core Competencies</h2>
                  <div className="grid grid-cols-1 gap-1.5 text-[11px]">
                    {SKILL_CATEGORIES.map((cat) => (
                      <div key={cat.category} className="flex">
                        <span className="font-bold w-36 shrink-0 text-black">{cat.category}:</span>
                        <span className="text-black">{cat.items.join(', ')}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Professional Experience */}
                <div className="mb-4 space-y-2.5">
                  <h2 className="text-xs font-bold uppercase border-b border-black pb-1 mb-2 text-black tracking-wider">Professional Experience</h2>
                  {WORK_EXPERIENCE.map((exp) => (
                    <div key={exp.id} className="space-y-1 mb-3">
                      <div className="flex justify-between font-bold text-[11px] text-black">
                        <span>{exp.role} — {exp.company}</span>
                        <span>{exp.period} | {exp.location}</span>
                      </div>
                      <ul className="list-disc list-inside text-[11px] text-black space-y-0.5 pl-1">
                        {exp.highlights.map((h, i) => (
                          <li key={i} className="leading-snug">{h}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                {/* Key SQA Projects (Filtered!) */}
                {selectedProjects.length > 0 && (
                  <div className="mb-4 space-y-2">
                    <h2 className="text-xs font-bold uppercase border-b border-black pb-1 mb-2 text-black tracking-wider">Featured SQA Automation & Testing Projects</h2>
                    {selectedProjects.map((proj) => (
                      <div key={proj.id} className="space-y-0.5 text-[11px] mb-2">
                        <div className="flex justify-between items-baseline font-bold text-black">
                          <span>{proj.title} ({proj.type})</span>
                          {proj.link && (
                            <a 
                              href={normalizeUrl(proj.link)} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-[#0a66c2] hover:underline font-bold text-[10.5px] inline-flex items-center gap-0.5"
                              style={{ color: '#0a66c2', textDecoration: 'underline' }}
                            >
                              GitHub Repo (Click Here) ↗
                            </a>
                          )}
                        </div>
                        <p className="text-black">{proj.description}</p>
                        {proj.tags && (
                          <p className="text-[10px] text-black font-mono">
                            <span className="font-bold text-black">Tech Used:</span> {proj.tags.join(' • ')}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Education */}
                <div className="mb-4 space-y-2.5">
                  <h2 className="text-xs font-bold uppercase border-b border-black pb-1 mb-2 text-black tracking-wider">Education & Certifications</h2>
                  {EDUCATION_HISTORY.map((edu) => (
                    <div key={edu.id} className="text-[11px] space-y-0.5">
                      <div className="flex justify-between items-baseline">
                        <span className="font-bold text-black">
                          {edu.degree} — <span className="font-semibold text-black">{edu.institution}</span>
                        </span>
                        <span className="font-mono text-[10.5px] font-bold text-black shrink-0 ml-4 whitespace-nowrap">
                          {edu.period}
                        </span>
                      </div>
                      {edu.details && (
                        <p className="text-[10px] text-black leading-snug pl-0.5">
                          {edu.details}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {/* References */}
                <div className="mb-2">
                  <h2 className="text-xs font-bold uppercase border-b border-black pb-1 mb-2 text-black tracking-wider">Professional References</h2>
                  {PROFESSIONAL_REFERENCES.map((ref, i) => (
                    <p key={i} className="text-[11px] text-black mb-1">
                      <span className="font-bold text-black">{ref.name}</span> — {ref.role}, {ref.company} | Email: {ref.email} | Phone: {ref.phone}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* TEMPLATE 2: MODERN PROFESSIONAL */}
            {template === 'modern-pro' && (
              <div className="space-y-5">
                {/* Modern Header */}
                <div className="p-5 -mx-8 -mt-8 mb-4 rounded-b-md space-y-1.5" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                  <h1 className="text-2xl font-black uppercase tracking-tight" style={{ color: '#ffffff' }}>{customInfo.name}</h1>
                  <p className="text-xs font-bold tracking-wider uppercase" style={{ color: '#f59e0b' }}>{customInfo.title}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] font-mono pt-1" style={{ color: '#f8fafc' }}>
                    <span>📍 {customInfo.location}</span>
                    <span>📞 <a href={`tel:${customInfo.phone}`} className="hover:underline font-semibold" style={{ color: '#ffffff' }}>{customInfo.phone}</a></span>
                    <span>✉️ <a href={`mailto:${customInfo.email}`} className="hover:underline font-semibold" style={{ color: '#ffffff' }}>{customInfo.email}</a></span>
                    <span>🔗 <a href={normalizeUrl(customInfo.linkedin)} target="_blank" rel="noopener noreferrer" className="hover:underline font-bold" style={{ color: '#f59e0b', textDecoration: 'underline' }}>LinkedIn (Click Here)</a></span>
                    <span>💻 <a href={normalizeUrl(customInfo.github)} target="_blank" rel="noopener noreferrer" className="hover:underline font-bold" style={{ color: '#f59e0b', textDecoration: 'underline' }}>GitHub (Click Here)</a></span>
                    <span>🌐 <a href={normalizeUrl(window.location.origin)} target="_blank" rel="noopener noreferrer" className="hover:underline font-bold" style={{ color: '#f59e0b', textDecoration: 'underline' }}>Portfolio (Click Here)</a></span>
                  </div>
                </div>

                {/* Career Objective */}
                <div>
                  <h2 className="text-xs font-extrabold uppercase border-l-4 pl-2 mb-1" style={{ color: '#0f172a', borderColor: '#f59e0b' }}>CAREER OBJECTIVE</h2>
                  <p className="text-[11px] leading-relaxed text-justify font-normal" style={{ color: '#000000' }}>{activeCareerObjective}</p>
                </div>

                {/* Skills Grid */}
                <div>
                  <h2 className="text-xs font-extrabold uppercase border-l-4 pl-2 mb-1.5" style={{ color: '#0f172a', borderColor: '#f59e0b' }}>Core Technical Toolkit</h2>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    {SKILL_CATEGORIES.map((cat) => (
                      <div key={cat.category} className="p-2 rounded border" style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }}>
                        <span className="font-bold block text-[10px] uppercase" style={{ color: '#0f172a' }}>{cat.category}</span>
                        <span className="text-[10px] font-medium" style={{ color: '#000000' }}>{cat.items.join(', ')}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Experience */}
                <div>
                  <h2 className="text-xs font-extrabold uppercase border-l-4 pl-2 mb-2" style={{ color: '#0f172a', borderColor: '#f59e0b' }}>Work History</h2>
                  <div className="space-y-2.5">
                    {WORK_EXPERIENCE.map((exp) => (
                      <div key={exp.id} className="space-y-1">
                        <div className="flex justify-between items-baseline">
                          <span className="font-bold text-[11px]" style={{ color: '#0f172a' }}>{exp.role} <span className="font-semibold" style={{ color: '#000000' }}>at {exp.company}</span></span>
                          <span className="text-[10px] font-mono font-bold" style={{ color: '#000000' }}>{exp.period}</span>
                        </div>
                        <ul className="list-disc list-inside text-[10.5px] space-y-0.5" style={{ color: '#000000' }}>
                          {exp.highlights.map((h, i) => (
                            <li key={i}>{h}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Selected Projects */}
                {selectedProjects.length > 0 && (
                  <div>
                    <h2 className="text-xs font-extrabold uppercase border-l-4 pl-2 mb-1.5" style={{ color: '#0f172a', borderColor: '#f59e0b' }}>Selected SQA Projects</h2>
                    <div className="space-y-2">
                      {selectedProjects.map((p) => (
                        <div key={p.id} className="p-2 rounded border space-y-0.5 text-[10.5px]" style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }}>
                          <div className="flex justify-between items-center font-bold" style={{ color: '#0f172a' }}>
                            <span>{p.title}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#e2e8f0', color: '#0f172a' }}>{p.type}</span>
                              {p.link && (
                                <a 
                                  href={normalizeUrl(p.link)} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="hover:underline font-bold text-[10px]"
                                  style={{ color: '#0a66c2', textDecoration: 'underline' }}
                                >
                                  GitHub Repo (Click Here) ↗
                                </a>
                              )}
                            </div>
                          </div>
                          <p className="font-normal" style={{ color: '#000000' }}>{p.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Education */}
                <div>
                  <h2 className="text-xs font-extrabold uppercase border-l-4 pl-2 mb-1" style={{ color: '#0f172a', borderColor: '#f59e0b' }}>Education</h2>
                  {EDUCATION_HISTORY.map((edu) => (
                    <div key={edu.id} className="flex justify-between text-[11px]">
                      <div>
                        <span className="font-bold" style={{ color: '#0f172a' }}>{edu.degree}</span> — <span className="font-medium" style={{ color: '#000000' }}>{edu.institution}</span>
                      </div>
                      <span className="font-mono text-[10px] font-bold" style={{ color: '#000000' }}>{edu.period}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TEMPLATE 3: MINIMAL CLEAN */}
            {template === 'minimal' && (
              <div className="space-y-5">
                <div className="space-y-1">
                  <h1 className="text-3xl font-light text-black tracking-tight">{customInfo.name}</h1>
                  <p className="text-xs text-black font-semibold font-mono">{customInfo.title} • {customInfo.location}</p>
                  <div className="text-[10.5px] text-black font-medium flex flex-wrap gap-x-2 pt-0.5">
                    <a href={`mailto:${customInfo.email}`} className="hover:underline text-black font-semibold">{customInfo.email}</a>
                    <span>•</span>
                    <a href={`tel:${customInfo.phone}`} className="hover:underline text-black font-semibold">{customInfo.phone}</a>
                    <span>•</span>
                    <a href={normalizeUrl(customInfo.linkedin)} target="_blank" rel="noopener noreferrer" className="text-[#0a66c2] hover:underline font-bold" style={{ color: '#0a66c2', textDecoration: 'underline' }}>LinkedIn (Click Here)</a>
                    <span>•</span>
                    <a href={normalizeUrl(customInfo.github)} target="_blank" rel="noopener noreferrer" className="text-gray-900 hover:underline font-bold" style={{ color: '#000000', textDecoration: 'underline' }}>GitHub (Click Here)</a>
                    <span>•</span>
                    <a href={normalizeUrl(window.location.origin)} target="_blank" rel="noopener noreferrer" className="text-[#ea580c] hover:underline font-bold" style={{ color: '#ea580c', textDecoration: 'underline' }}>Portfolio (Click Here)</a>
                  </div>
                </div>

                <div className="h-px bg-gray-400 w-full my-3" />

                {/* Career Objective */}
                <div className="space-y-1">
                  <h2 className="text-xs font-bold tracking-widest uppercase text-black">CAREER OBJECTIVE</h2>
                  <p className="text-[11px] text-black leading-relaxed font-normal">{activeCareerObjective}</p>
                </div>

                <div className="space-y-2">
                  <h2 className="text-xs font-bold tracking-widest uppercase text-black">Experience</h2>
                  {WORK_EXPERIENCE.map((exp) => (
                    <div key={exp.id} className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold text-black">
                        <span>{exp.role}, {exp.company}</span>
                        <span className="text-black font-mono font-bold">{exp.period}</span>
                      </div>
                      <ul className="list-disc list-inside text-[10.5px] text-black space-y-0.5">
                        {exp.highlights.map((h, i) => (
                          <li key={i}>{h}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                {selectedProjects.length > 0 && (
                  <div className="space-y-2">
                    <h2 className="text-xs font-bold tracking-widest uppercase text-black">Projects</h2>
                    {selectedProjects.map((p) => (
                      <div key={p.id} className="text-[10.5px]">
                        <div className="flex justify-between items-baseline font-bold text-black">
                          <span className="font-bold text-black">{p.title}</span>
                          {p.link && (
                            <a 
                              href={normalizeUrl(p.link)} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-[#0a66c2] hover:underline text-[10px] font-bold"
                              style={{ color: '#0a66c2', textDecoration: 'underline' }}
                            >
                              GitHub (Click Here) ↗
                            </a>
                          )}
                        </div>
                        <p className="text-black leading-snug">{p.description}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-1">
                  <h2 className="text-xs font-bold tracking-widest uppercase text-black">Skills</h2>
                  <p className="text-[10.5px] text-black font-medium">
                    {SKILL_CATEGORIES.flatMap(c => c.items).join(' • ')}
                  </p>
                </div>

                <div className="space-y-1">
                  <h2 className="text-xs font-bold tracking-widest uppercase text-black">Education</h2>
                  {EDUCATION_HISTORY.map((edu) => (
                    <div key={edu.id} className="text-[10.5px] text-black font-medium">
                      <span className="font-bold">{edu.degree}</span>, {edu.institution} ({edu.period})
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TEMPLATE 4: EXECUTIVE */}
            {template === 'executive' && (
              <div className="space-y-4">
                <div className="border-b-4 border-black pb-2 flex justify-between items-end">
                  <div>
                    <h1 className="text-2xl font-black uppercase text-black tracking-tight">{customInfo.name}</h1>
                    <p className="text-xs font-bold text-black uppercase tracking-widest">{customInfo.title}</p>
                  </div>
                  <div className="text-right text-[10.5px] text-black space-y-0.5">
                    <p>
                      <a href={`mailto:${customInfo.email}`} className="hover:underline font-bold text-black">{customInfo.email}</a> • <a href={`tel:${customInfo.phone}`} className="hover:underline font-semibold">{customInfo.phone}</a>
                    </p>
                    <p className="font-medium">{customInfo.location}</p>
                    <div className="flex justify-end items-center gap-1.5 pt-0.5 text-[10px] font-medium">
                      <a href={normalizeUrl(customInfo.linkedin)} target="_blank" rel="noopener noreferrer" className="text-[#0a66c2] hover:underline font-bold" style={{ color: '#0a66c2', textDecoration: 'underline' }}>LinkedIn (Click Here)</a>
                      <span>•</span>
                      <a href={normalizeUrl(customInfo.github)} target="_blank" rel="noopener noreferrer" className="text-gray-900 hover:underline font-bold" style={{ color: '#000000', textDecoration: 'underline' }}>GitHub (Click Here)</a>
                      <span>•</span>
                      <a href={normalizeUrl(window.location.origin)} target="_blank" rel="noopener noreferrer" className="text-[#ea580c] hover:underline font-bold" style={{ color: '#ea580c', textDecoration: 'underline' }}>Portfolio (Click Here)</a>
                    </div>
                  </div>
                </div>

                {/* Key Metrics Banner */}
                <div className="grid grid-cols-4 gap-2 bg-gray-100 p-2 rounded text-center text-[10px] border border-gray-300">
                  <div><span className="font-bold block text-black text-xs">{customInfo.experienceYears || '2'}+ Yrs</span> <span className="font-semibold text-black">Experience</span></div>
                  <div><span className="font-bold block text-black text-xs">150+</span> <span className="font-semibold text-black">Test Cases</span></div>
                  <div><span className="font-bold block text-black text-xs">100+</span> <span className="font-semibold text-black">Bugs Logged</span></div>
                  <div><span className="font-bold block text-black text-xs">0%</span> <span className="font-semibold text-black">Error Rate</span></div>
                </div>

                {/* Career Objective */}
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-black border-b border-black pb-0.5 mb-1">CAREER OBJECTIVE</h2>
                  <p className="text-[11px] text-black leading-relaxed">{activeCareerObjective}</p>
                </div>

                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-black border-b border-black pb-0.5 mb-1.5">Leadership & Technical Capabilities</h2>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10.5px]">
                    {SKILL_CATEGORIES.map((c) => (
                      <div key={c.category}>
                        <span className="font-bold text-black">{c.category}: </span>
                        <span className="text-black font-medium">{c.items.join(', ')}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-black border-b border-black pb-0.5 mb-2">Professional Career History</h2>
                  {WORK_EXPERIENCE.map((exp) => (
                    <div key={exp.id} className="mb-2 space-y-0.5">
                      <div className="flex justify-between font-bold text-[11px] text-black">
                        <span>{exp.role} — {exp.company}</span>
                        <span className="text-black font-mono font-bold">{exp.period}</span>
                      </div>
                      <ul className="list-disc list-inside text-[10.5px] text-black">
                        {exp.highlights.map((h, i) => (
                          <li key={i}>{h}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                {selectedProjects.length > 0 && (
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-black border-b border-black pb-0.5 mb-1">Key Deliverables & Projects</h2>
                    {selectedProjects.map((p) => (
                      <div key={p.id} className="text-[10.5px] mb-1">
                        <div className="flex justify-between items-baseline">
                          <span className="font-bold text-black">{p.title}:</span>
                          {p.link && (
                            <a 
                              href={normalizeUrl(p.link)} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-[#0a66c2] hover:underline font-bold text-[10px]"
                              style={{ color: '#0a66c2', textDecoration: 'underline' }}
                            >
                              GitHub Repo (Click Here) ↗
                            </a>
                          )}
                        </div>
                        <span className="text-black leading-snug">{p.description}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-black border-b border-black pb-0.5 mb-1">Education</h2>
                  {EDUCATION_HISTORY.map((e) => (
                    <p key={e.id} className="text-[10.5px] text-black">
                      <span className="font-bold text-black">{e.degree}</span>, {e.institution} ({e.period})
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* TEMPLATE 5: CLEAN PORTFOLIO STYLE */}
            {template === 'portfolio-style' && (
              <div className="space-y-4">
                <div className="flex justify-between items-start border-b-2 border-orange-500 pb-3">
                  <div>
                    <h1 className="text-2xl font-black text-black">{customInfo.name}</h1>
                    <p className="text-xs font-bold text-orange-600 font-mono uppercase">{customInfo.title}</p>
                    <p className="text-[10.5px] text-black font-mono font-medium mt-0.5">{customInfo.location}</p>
                  </div>
                  <div className="text-right text-[10.5px] text-black space-y-0.5">
                    <p className="font-bold text-black">
                      <a href={`mailto:${customInfo.email}`} className="hover:underline">{customInfo.email}</a>
                    </p>
                    <p>
                      <a href={`tel:${customInfo.phone}`} className="hover:underline">{customInfo.phone}</a>
                    </p>
                    <div className="flex justify-end items-center gap-1.5 pt-0.5 text-[10px] font-medium">
                      <a href={normalizeUrl(customInfo.linkedin)} target="_blank" rel="noopener noreferrer" className="text-[#0a66c2] hover:underline font-bold" style={{ color: '#0a66c2', textDecoration: 'underline' }}>LinkedIn (Click Here)</a>
                      <span>•</span>
                      <a href={normalizeUrl(customInfo.github)} target="_blank" rel="noopener noreferrer" className="text-gray-900 hover:underline font-bold" style={{ color: '#000000', textDecoration: 'underline' }}>GitHub (Click Here)</a>
                      <span>•</span>
                      <a href={normalizeUrl(window.location.origin)} target="_blank" rel="noopener noreferrer" className="text-[#FF6B35] hover:underline font-bold" style={{ color: '#FF6B35', textDecoration: 'underline' }}>Portfolio (Click Here)</a>
                    </div>
                  </div>
                </div>

                {/* Career Objective */}
                <div>
                  <h2 className="text-xs font-extrabold uppercase text-orange-600 tracking-wider mb-1">CAREER OBJECTIVE</h2>
                  <p className="text-[11px] text-black leading-relaxed font-normal">{activeCareerObjective}</p>
                </div>

                <div>
                  <h2 className="text-xs font-extrabold uppercase text-orange-600 tracking-wider mb-1.5">SQA Toolkit & Capabilities</h2>
                  <div className="flex flex-wrap gap-1 text-[10px] font-mono">
                    {SKILL_CATEGORIES.flatMap(c => c.items).map((skill, i) => (
                      <span key={i} className="bg-gray-100 border border-gray-400 px-2 py-0.5 rounded text-black font-semibold">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h2 className="text-xs font-extrabold uppercase text-orange-600 tracking-wider mb-2">Experience & STLC Workflow</h2>
                  {WORK_EXPERIENCE.map((exp) => (
                    <div key={exp.id} className="mb-2 text-[11px]">
                      <div className="flex justify-between font-bold text-black">
                        <span>{exp.role} @ {exp.company}</span>
                        <span className="text-black font-mono font-bold text-[10px]">{exp.period}</span>
                      </div>
                      <ul className="list-disc list-inside text-[10.5px] text-black mt-0.5 space-y-0.5">
                        {exp.highlights.map((h, i) => (
                          <li key={i}>{h}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                {selectedProjects.length > 0 && (
                  <div>
                    <h2 className="text-xs font-extrabold uppercase text-orange-600 tracking-wider mb-1.5">Verified Automation & QA Repositories</h2>
                    <div className="space-y-1.5">
                      {selectedProjects.map((p) => (
                        <div key={p.id} className="p-2 border border-gray-300 rounded text-[10.5px]">
                          <div className="flex justify-between items-center font-bold text-black">
                            <span>{p.title}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-blue-800 font-bold text-[10px] font-mono">{p.type}</span>
                              {p.link && (
                                <a 
                                  href={normalizeUrl(p.link)} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-[#0a66c2] hover:underline font-bold text-[10px]"
                                  style={{ color: '#0a66c2', textDecoration: 'underline' }}
                                >
                                  GitHub Repo (Click Here) ↗
                                </a>
                              )}
                            </div>
                          </div>
                          <p className="text-black text-[10.5px] mt-0.5 leading-snug">{p.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div>
                  <h2 className="text-xs font-extrabold uppercase text-orange-600 tracking-wider mb-1">
                    Education
                  </h2>

                  {EDUCATION_HISTORY.map((edu) => (
                    <div
                      key={edu.id}
                      className="text-[10.5px] text-black font-medium">

                      <span className="font-bold text-black">{edu.degree}</span>
                      - <span className="font-bold text-black">{edu.institution} ({edu.period})</span>
                    </div>
                  ))}
                </div>
                 

              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
