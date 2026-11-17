import { useState, useRef, useMemo, useEffect } from 'react';
import { 
  X, Printer, Download, Copy, Check, FileText, Settings, Sliders, Sparkles, 
  CheckSquare, Square, Filter, ChevronRight, Award, Briefcase, Eye, 
  RotateCcw, ShieldCheck, Mail, Phone, MapPin, Globe, Target,
  Type, ExternalLink, User
} from 'lucide-react';
import { PERSONAL_INFO, EDUCATION_HISTORY, BUG_REPORTS } from '../data';
import { getStoredProjects, getStoredExperiences, getStoredSkills, getStoredReferences, PORTFOLIO_UPDATED_EVENT } from '../utils/portfolioStore';
import { Reference } from '../types';
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

// Clean highlight formatter (normalizes scope lines like "System Coverage: ..." cleanly)
const parseHighlightItem = (raw: string) => {
  const cleaned = raw.replace(/^>>\s*/, '').replace(/\s*<<$/, '').trim();
  const isScope = /^system coverage:/i.test(cleaned);
  return { text: cleaned, isScope };
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

export const ROLE_CAREER_OBJECTIVES: Record<TargetRoleType, string> = {
  'all-rounder': DEFAULT_CAREER_OBJECTIVE,
  'automation-qa':
    "Seeking an SQA Automation Engineer position where I can apply 2 years of hands-on experience in Playwright (Python & TypeScript), Selenium WebDriver, Pytest, and CI/CD pipelines to build scalable test frameworks and ensure high-quality, reliable software solutions.",
  'api-testing':
    "Seeking a Software Quality Assurance / API Testing Engineer position to leverage hands-on expertise in REST API automation, Postman, Newman CLI, backend payload verification, and SQL testing to ensure robust and reliable software solutions.",
  'manual-qa':
    "Seeking a Manual Software Quality Assurance Engineer position where I can leverage 2 years of hands-on experience in complete STLC/SDLC workflows, test scenario authoring, exploratory testing, and Jira defect tracking to ensure top-tier software quality."
};

export default function ResumeBuilderModal({ isOpen, onClose, onOpenCoverLetter }: ResumeBuilderModalProps) {

  // Selected Template & Role Presets
  const [template, setTemplate] = useState<TemplateType>('classic-ats');
  const [targetRole, setTargetRole] = useState<TargetRoleType>('all-rounder');
  const [fontFamily, setFontFamily] = useState<AtsFontFamily>('modern');
  const [activeTab, setActiveTab] = useState<'preview' | 'projects-filter' | 'customize' | 'ats-score' | 'cover-letter'>('preview');

  // Dynamic Portfolio Datasets from portfolioStore
  const [portfolioProjects, setPortfolioProjects] = useState(() => getStoredProjects());
  const [portfolioExperiences, setPortfolioExperiences] = useState(() => getStoredExperiences());
  const [portfolioSkills, setPortfolioSkills] = useState(() => getStoredSkills());
  const [portfolioReferences, setPortfolioReferences] = useState<Reference[]>(() => getStoredReferences());

  useEffect(() => {
    const handleSync = () => {
      setPortfolioProjects(getStoredProjects());
      setPortfolioExperiences(getStoredExperiences());
      setPortfolioSkills(getStoredSkills());
      setPortfolioReferences(getStoredReferences());
    };
    window.addEventListener(PORTFOLIO_UPDATED_EVENT, handleSync);
    return () => window.removeEventListener(PORTFOLIO_UPDATED_EVENT, handleSync);
  }, []);

  const WORK_EXPERIENCE = portfolioExperiences;
  const SKILL_CATEGORIES = portfolioSkills;
  const PROJECTS = portfolioProjects;

  // Interactive Project Selection Checkboxes
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>(() =>
    getStoredProjects().map(p => p.id)
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

  // PDF Export via html2pdf with exact font sync, accurate color conversion, and crisp A4 pagination
  const handleDownloadPDF = async () => {
    if (!resumeRef.current) return;
    setIsExportingPdf(true);

    try {
      const fontsReady = (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready;
      if (fontsReady) {
        await Promise.race([fontsReady, new Promise((resolve) => setTimeout(resolve, 700))]);
      }
    } catch {
      // Proceed even if font API is unavailable
    }

    const element = resumeRef.current;

    // A4 dimensions in mm: [top, left, bottom, right]
    const a4WidthMm = 210;
    const margin = [12, 13, 12, 13] as [number, number, number, number];
    const marginY = margin[0]; // 12mm
    const marginX = margin[1]; // 13mm
    const innerWidthMm = a4WidthMm - margin[1] - margin[3]; // 184mm
    const innerHeightMm = 297 - margin[0] - margin[2]; // 273mm

    // Target width in CSS pixels at 96 DPI: 184mm * 96 / 25.4 = 695.4px -> 695px
    const targetPxWidth = 695;
    // Match html2pdf's internal pxPageHeight ratio: floor(width * inner.ratio)
    const targetPxHeight = Math.floor(targetPxWidth * (innerHeightMm / innerWidthMm));

    // Pre-clean a detached clone BEFORE html2pdf runs pagebreaks.js so pagebreaks.js measures
    // the exact 695px width & zero-padding layout that html2canvas screenshots (prevents height drift & line slicing)
    const stagedClone = element.cloneNode(true) as HTMLElement;
    stagedClone.className = stagedClone.className
      .replace(/\b(shadow-\S+|rounded-\S+|min-h-\S+|p-\d+|sm:p-\S+|max-w-\S+)\b/g, '')
      .trim();
    stagedClone.style.padding = '0px';
    stagedClone.style.margin = '0px';
    stagedClone.style.minHeight = 'auto';
    stagedClone.style.border = 'none';
    stagedClone.style.boxShadow = 'none';
    stagedClone.style.borderRadius = '0px';
    stagedClone.style.width = `${targetPxWidth}px`;
    stagedClone.style.maxWidth = `${targetPxWidth}px`;
    stagedClone.style.boxSizing = 'border-box';
    stagedClone.style.backgroundColor = '#ffffff';
    stagedClone.style.color = '#111827';
    stagedClone.style.fontVariantLigatures = 'none';

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
      image: { type: 'jpeg' as const, quality: 0.94 },
      enableLinks: false,
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        windowWidth: 960,
        onclone: (clonedDoc: Document) => {
          // Accurately convert any oklch(...) color expressions into rgba(...) so backgrounds/borders keep exact tones
          const colorCache = new Map<string, string>();
          const colorCanvas = clonedDoc.createElement('canvas');
          colorCanvas.width = 1;
          colorCanvas.height = 1;
          const colorCtx = colorCanvas.getContext('2d', { willReadFrequently: true });
          const convertOklch = (val: string) => {
            if (colorCache.has(val)) return colorCache.get(val)!;
            let resolved = '#111827';
            if (colorCtx) {
              try {
                colorCtx.clearRect(0, 0, 1, 1);
                colorCtx.fillStyle = 'rgba(0,0,0,0)';
                colorCtx.fillStyle = val;
                colorCtx.fillRect(0, 0, 1, 1);
                const [r, g, b, a] = colorCtx.getImageData(0, 0, 1, 1).data;
                resolved = a === 0 ? 'transparent' : a < 255 ? `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})` : `rgb(${r}, ${g}, ${b})`;
              } catch {
                resolved = '#111827';
              }
            }
            colorCache.set(val, resolved);
            return resolved;
          };

          const styles = clonedDoc.querySelectorAll('style');
          styles.forEach((styleTag) => {
            if (styleTag.innerHTML && styleTag.innerHTML.includes('oklch')) {
              styleTag.innerHTML = styleTag.innerHTML.replace(/oklch\([^)]+\)/g, (match) => convertOklch(match));
            }
          });

          // Inject crisp list indent and ligature-free rendering rules without wiping pagebreak spacer heights
          const extraStyle = clonedDoc.createElement('style');
          extraStyle.textContent = `
            .print-only-resume {
              padding: 0 !important;
              margin: 0 !important;
              min-height: auto !important;
              box-shadow: none !important;
              border-radius: 0 !important;
              font-variant-ligatures: none !important;
            }
            .print-only-resume * {
              box-sizing: border-box !important;
              font-variant-ligatures: none !important;
            }
            ul {
              list-style-position: outside !important;
            }
          `;
          clonedDoc.head.appendChild(extraStyle);

          const root = clonedDoc.querySelector('.print-only-resume') as HTMLElement | null;
          if (root) {
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

                const leftPx = rect.left - rootRect.left;
                const topPx = rect.top - rootRect.top;
                const widthPx = rect.width;
                const heightPx = rect.height;

                const pageNum = Math.floor(topPx / targetPxHeight) + 1;
                const yInPagePx = topPx % targetPxHeight;

                const xMm = marginX + leftPx * mmPerPx;
                const yMm = marginY + yInPagePx * mmPerPx;
                const wMm = widthPx * mmPerPx;
                const hMm = heightPx * mmPerPx;

                linkOverlays.push({
                  url,
                  x: Math.max(0, xMm - 0.5),
                  y: Math.max(0, yMm - 0.5),
                  w: wMm + 1.0,
                  h: hMm + 1.0,
                  page: pageNum,
                });
              }
            });
          }
        },
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const, compress: true },
      pagebreak: {
        mode: ['css', 'legacy'],
        avoid: ['.cv-keep-together', '.cv-section-heading', 'h1', 'h2', 'h3', 'li', 'tr'],
      },
    };

    html2pdf()
      .set(opt)
      .from(stagedClone)
      .toPdf()
      .get('pdf')
      .then((pdf: any) => {
        if (pdf && pdf.internal) {
          pdf.link = function (x: number, y: number, w: number, h: number, options: any) {
            const pageInfo = this.internal.getCurrentPageInfo();
            const s = this.internal.getCoordinateString;
            const o = this.internal.getVerticalCoordinateString;
            pageInfo.pageContext.annotations.push({
              finalBounds: {
                x: s(x),
                y: o(y + h),
                w: s(x + w),
                h: o(y),
              },
              options: options,
              type: 'link',
            });
          };

          const totalPages = pdf.internal.getNumberOfPages();
          linkOverlays.forEach((item) => {
            if (item.page <= totalPages) {
              pdf.setPage(item.page);
              pdf.link(item.x, item.y, item.w, item.h, { url: item.url });
            }
          });
          pdf.setPage(totalPages);
        }

        pdf.save(opt.filename);
        setIsExportingPdf(false);
      })
      .catch((err: unknown) => {
        console.error('PDF generation error:', err);
        setIsExportingPdf(false);
        window.print();
      });
  };

  // Browser Print trigger with dedicated isolated iframe, font-ready sync, and crisp A4 layout
  const handlePrint = () => {
    try {
      window.focus();
      const element = resumeRef.current;
      if (!element) {
        window.print();
        return;
      }

      const styleSheets = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map((el) => el.outerHTML)
        .join('\n');

      const printSafeClass = element.className
        .replace(/\b(shadow-\S+|rounded-\S+|min-h-\S+|p-\d+|sm:p-\S+|max-w-\S+)\b/g, '')
        .trim();

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
                @page { size: A4 portrait; margin: 12mm 13mm; }
                html, body {
                  background-color: #ffffff !important;
                  color: #111827 !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  width: 100% !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                .print-only-resume {
                  width: 100% !important;
                  max-width: 100% !important;
                  min-height: auto !important;
                  box-shadow: none !important;
                  border: none !important;
                  border-radius: 0 !important;
                  background: #ffffff !important;
                  color: #111827 !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  font-variant-ligatures: none !important;
                }
                .print-only-resume * {
                  box-sizing: border-box !important;
                }
                .cv-section-heading, h1, h2, h3 {
                  break-after: avoid !important;
                  page-break-after: avoid !important;
                  break-inside: avoid !important;
                  page-break-inside: avoid !important;
                }
                .cv-keep-together, li, tr {
                  break-inside: avoid !important;
                  page-break-inside: avoid !important;
                }
                p {
                  orphans: 3;
                  widows: 3;
                }
                ul {
                  list-style-position: outside !important;
                }
              </style>
            </head>
            <body>
              <div class="${printSafeClass}">
                ${element.innerHTML}
              </div>
            </body>
          </html>
        `);
        doc.close();

        const triggerIframePrint = () => {
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
          }, 1800);
        };

        const fontsReady = (doc as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready;
        if (fontsReady) {
          Promise.race([fontsReady, new Promise((resolve) => setTimeout(resolve, 600))]).then(() => {
            setTimeout(triggerIframePrint, 120);
          });
        } else {
          setTimeout(triggerIframePrint, 400);
        }
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
      page-break-after: avoid;
      break-after: avoid;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 3pt;
      margin-bottom: 2pt;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .keep-block {
      page-break-inside: avoid;
      break-inside: avoid;
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
      line-height: 1.38;
      margin-bottom: 2.5pt;
      color: #1a1a1a;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    p {
      margin: 0 0 4pt 0;
      font-size: 9.5pt;
      line-height: 1.38;
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
  <p class="keep-block">${activeCareerObjective}</p>

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
    <table class="data-table" border="0" cellpadding="0" cellspacing="0" style="page-break-after: avoid; break-after: avoid;">
      <tr>
        <td class="left-col" style="width: 68%;"><b>${exp.role}</b></td>
        <td class="right-col" style="width: 32%;">${exp.period}</td>
      </tr>
      <tr>
        <td class="left-col" style="width: 68%; color: #334155;">${exp.company}</td>
        <td class="right-col" style="width: 32%; font-weight: normal; color: #475569;">${exp.location}</td>
      </tr>
    </table>
    <ul class="bullet-list">
      ${exp.highlights.map(h => {
        const parsed = parseHighlightItem(h);
        return parsed.isScope
          ? `<li class="bullet-item" style="list-style: none; margin-left: -14pt; font-weight: bold; color: #0f172a;">${parsed.text}</li>`
          : `<li class="bullet-item">${parsed.text}</li>`;
      }).join('')}
    </ul>
  `).join('')}

  <!-- Key Projects -->
  ${selectedProjects.length > 0 ? `
    <div class="section-title">KEY SQA PROJECTS</div>
    ${selectedProjects.map(proj => `
      <div class="keep-block" style="margin-bottom: 6pt;">
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
        <p style="font-size: 9pt; color: #444444; margin-bottom: 4pt;">
          <b>Tools & Tech:</b> ${proj.tags.join(', ')}
          ${proj.metrics && proj.metrics.length > 0 ? ` | <b>Metrics:</b> ${proj.metrics.map(m => `${m.label}: ${m.value}`).join(' • ')}` : ''}
        </p>
      </div>
    `).join('')}
  ` : ''}

  <!-- Education -->
  <div class="section-title">EDUCATION</div>
  ${EDUCATION_HISTORY.map(edu => `
    <div class="keep-block" style="margin-bottom: 4pt;">
      <table class="data-table" border="0" cellpadding="0" cellspacing="0">
        <tr>
          <td class="left-col" style="width: 70%;"><b>${edu.degree}</b> - ${edu.institution}</td>
          <td class="right-col" style="width: 30%;">${edu.period} | ${edu.location}</td>
        </tr>
      </table>
      ${edu.details ? `<p style="font-size: 9pt; color: #444444; margin-top: 1pt; margin-bottom: 2pt;">${edu.details}</p>` : ''}
    </div>
  `).join('')}

  <!-- Professional References -->
  ${portfolioReferences.length > 0 ? `
    <div class="section-title">PROFESSIONAL REFERENCES</div>
    <table class="data-table" border="0" cellpadding="0" cellspacing="0">
      ${portfolioReferences.map(ref => `
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

I am writing to express my strong enthusiasm for the ${targetJobTitle} position at ${targetCompany}. With hands-on Automation & Quality Engineering experience across Courier Management and ERP systems at CarryBee and Altersense Ltd, I have developed deep expertise in Web & Mobile UI Automation, Backend Microservices API Testing, and CI/CD Quality Pipelines.

In my current Mid-Level Automation & Quality Engineering role at CarryBee, I design and maintain end-to-end UI, API, and integration regression suites across web and mobile platforms, integrate AI-assisted and agentic testing workflows into CI/CD pipelines, and collaborate closely with developers on root-cause analysis—building on my prior ERP & API testing experience at Altersense Ltd.

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-md flex flex-col justify-between animate-fadeIn">
      {/* Modal Top Navigation Header */}
      <div className="bg-[#12151C] border-b border-white/10 px-4 sm:px-6 py-3 flex items-center justify-between no-print z-20">
        <div className="flex items-center space-x-3">
          <div className="bg-[var(--color-accent)]/15 p-2 rounded-xl border border-[var(--color-accent)]/30">
            <FileText className="w-5 h-5 text-[var(--color-accent)]" />
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
                <span className="text-[var(--color-accent)] font-bold">File:</span>
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
            className="flex items-center space-x-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-xs font-mono font-semibold shadow-lg shadow-[var(--color-accent)]/20 transition-all cursor-pointer disabled:opacity-50"
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
              className={`py-2 rounded-lg text-center transition-colors cursor-pointer ${activeTab === 'preview' ? 'bg-[var(--color-accent)] text-white font-bold' : 'text-[#9CA3AF] hover:text-white'}`}
            >
              Template
            </button>
            <button
              onClick={() => setActiveTab('projects-filter')}
              className={`py-2 rounded-lg text-center transition-colors cursor-pointer relative ${activeTab === 'projects-filter' ? 'bg-[var(--color-accent)] text-white font-bold' : 'text-[#9CA3AF] hover:text-white'}`}
            >
              Projects
              <span className="ml-1 text-[9px] bg-white/20 px-1 rounded-full">{selectedProjectIds.length}</span>
            </button>
            <button
              onClick={() => setActiveTab('ats-score')}
              className={`py-2 rounded-lg text-center transition-colors cursor-pointer ${activeTab === 'ats-score' ? 'bg-[var(--color-accent)] text-white font-bold' : 'text-[#9CA3AF] hover:text-white'}`}
            >
              ATS ({atsAnalysis.totalScore}%)
            </button>
            <button
              onClick={() => setActiveTab('cover-letter')}
              className={`py-2 rounded-lg text-center transition-colors cursor-pointer ${activeTab === 'cover-letter' ? 'bg-[var(--color-accent)] text-white font-bold' : 'text-[#9CA3AF] hover:text-white'}`}
            >
              Cover
            </button>
          </div>

          {/* TAB 1: TEMPLATE & ROLE SELECTION */}
          {activeTab === 'preview' && (
            <div className="space-y-5 animate-fadeIn">
              {/* Template Switcher */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-[var(--color-accent)] uppercase font-bold tracking-wider flex items-center gap-1.5">
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
                          ? 'bg-[#12151C] border-[var(--color-accent)] shadow-lg shadow-[var(--color-accent)]/10' 
                          : 'bg-[#12151C]/40 border-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{t.name}</span>
                        {template === t.id && <Check className="w-3.5 h-3.5 text-[var(--color-accent)]" />}
                      </div>
                      <p className="text-[11px] text-[#9CA3AF] mt-0.5 font-light">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Professional ATS Typography Selector */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono text-[var(--color-accent)] uppercase font-bold tracking-wider flex items-center gap-1.5">
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
                          ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white font-bold shadow-sm'
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
                  <label className="text-xs font-mono text-[var(--color-accent)] uppercase font-bold tracking-wider flex items-center gap-1.5">
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
                        className="w-full p-2 bg-[#0B0D12] border border-white/10 rounded text-xs text-white focus:border-[var(--color-accent)] outline-none font-mono"
                        placeholder="Sabbir Ahamed"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-[#D1D5DB] block mb-1">Experience (Years)</label>
                      <input
                        type="text"
                        value={customInfo.experienceYears}
                        onChange={(e) => setCustomInfo(prev => ({ ...prev, experienceYears: e.target.value }))}
                        className="w-full p-2 bg-[#0B0D12] border border-white/10 rounded text-xs text-white focus:border-[var(--color-accent)] outline-none font-mono"
                        placeholder="2"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SQA Role Target Preset */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <label className="text-xs font-mono text-[var(--color-accent)] uppercase font-bold tracking-wider flex items-center gap-1.5">
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
                          ? 'bg-[var(--color-accent)]/20 border-[var(--color-accent)] text-white font-bold'
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
                  <label className="text-xs font-mono text-[var(--color-accent)] uppercase font-bold tracking-wider flex items-center gap-1.5">
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
                  className="w-full p-2.5 bg-[#12151C] border border-white/10 rounded-lg text-xs text-white focus:border-[var(--color-accent)] outline-none font-sans leading-relaxed resize-y"
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
                    className="w-full flex items-center justify-between py-2 px-3 bg-[var(--color-accent)]/10 hover:bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/30 rounded-lg text-xs font-mono text-[var(--color-accent)] transition-colors cursor-pointer text-left disabled:opacity-50"
                    title="Direct PDF download with clickable links and under 1MB size"
                  >
                    <div className="flex items-center space-x-2">
                      <Download className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
                      <div>
                        <div className="font-bold text-white">Direct PDF (&lt; 1MB)</div>
                        <div className="text-[10px] text-gray-300">Clickable links • 192 DPI high sharpness</div>
                      </div>
                    </div>
                    <span className="text-[10px] bg-[var(--color-accent)]/20 px-1.5 py-0.5 rounded text-white font-bold">~500KB</span>
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
                <label className="text-xs font-mono text-[var(--color-accent)] uppercase font-bold tracking-wider flex items-center gap-1.5">
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
                        isChecked ? 'bg-[#12151C] border-[var(--color-accent)]/60 text-white' : 'bg-[#12151C]/30 border-white/5 text-[#9CA3AF] opacity-60'
                      }`}
                    >
                      <button className="mt-0.5 focus:outline-none">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-[var(--color-accent)]" />
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
                <label className="text-xs font-mono text-[var(--color-accent)] uppercase font-bold">ATS Audit Checklist</label>
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
              <label className="text-xs font-mono text-[var(--color-accent)] uppercase font-bold tracking-wider">Customize Cover Letter</label>
              
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-[#9CA3AF] font-mono">Target Company Name</label>
                  <input
                    type="text"
                    value={targetCompany}
                    onChange={(e) => setTargetCompany(e.target.value)}
                    className="w-full mt-1 p-2 bg-[#12151C] border border-white/10 rounded-lg text-xs text-white focus:border-[var(--color-accent)] outline-none font-mono"
                    placeholder="e.g. Brain Station 23 / Enosis"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#9CA3AF] font-mono">Target Job Role</label>
                  <input
                    type="text"
                    value={targetJobTitle}
                    onChange={(e) => setTargetJobTitle(e.target.value)}
                    className="w-full mt-1 p-2 bg-[#12151C] border border-white/10 rounded-lg text-xs text-white focus:border-[var(--color-accent)] outline-none font-mono"
                    placeholder="e.g. SQA Automation Engineer"
                  />
                </div>
                <button
                  onClick={handleCopyCoverLetter}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shadow-lg"
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
            className={`print-only-resume bg-white text-[#111827] shadow-2xl rounded-sm w-full max-w-[210mm] min-h-[297mm] p-7 sm:p-[13mm] text-[10.5px] leading-[1.42] selection:bg-amber-200 ${
              fontFamily === 'serif' ? 'font-ats-serif' : fontFamily === 'corporate' ? 'font-ats-corporate' : 'font-ats-modern'
            }`}
            style={{ width: '100%', maxWidth: '210mm', color: '#111827', backgroundColor: '#ffffff' }}
          >

            {/* TEMPLATE 1: CLASSIC ATS (DEFAULT) */}
            {template === 'classic-ats' && (
              <div>
                {/* Header */}
                <div className="cv-keep-together mb-3.5 text-center">
                  <h1 className="text-[21px] font-bold uppercase text-[#0f172a] leading-tight mb-0.5">{customInfo.name}</h1>
                  <p className="text-[11px] font-bold text-[#1e293b] uppercase tracking-wide mb-1">{customInfo.title}</p>
                  <p className="text-[10.5px] text-[#1e293b] font-medium mb-1">
                    {customInfo.location} &nbsp;|&nbsp; <a href={`tel:${customInfo.phone}`} className="hover:underline font-semibold" style={{ color: '#0f172a' }}>{customInfo.phone}</a> &nbsp;|&nbsp; <a href={`mailto:${customInfo.email}`} className="hover:underline font-semibold" style={{ color: '#0f172a' }}>{customInfo.email}</a>
                  </p>
                  <p className="text-[10.5px] text-[#1e293b] flex items-center justify-center gap-2 flex-wrap pb-2.5">
                    <span>
                      LinkedIn: <a href={normalizeUrl(customInfo.linkedin)} target="_blank" rel="noopener noreferrer" className="hover:underline font-semibold" style={{ color: '#0a66c2', textDecoration: 'underline' }}>View Profile</a>
                    </span>
                    <span>|</span>
                    <span>
                      GitHub: <a href={normalizeUrl(customInfo.github)} target="_blank" rel="noopener noreferrer" className="hover:underline font-semibold" style={{ color: '#0f172a', textDecoration: 'underline' }}>Repositories</a>
                    </span>
                    <span>|</span>
                    <span>
                      Portfolio: <a href={normalizeUrl(window.location.origin)} target="_blank" rel="noopener noreferrer" className="hover:underline font-semibold" style={{ color: '#c2410c', textDecoration: 'underline' }}>Live Portfolio</a>
                    </span>
                  </p>
                  <div style={{ height: '1.5px', backgroundColor: '#0f172a', width: '100%' }} />
                </div>

                {/* Career Objective */}
                <div className="cv-keep-together mb-3.5">
                  <div className="cv-section-heading mb-1.5">
                    <h2 className="text-[11px] font-bold uppercase text-[#0f172a] leading-[1.35] pb-1">Career Objective</h2>
                    <div style={{ height: '1.5px', backgroundColor: '#0f172a', width: '100%' }} />
                  </div>
                  <p className="text-[10.5px] text-[#111827] leading-[1.44] text-left">{activeCareerObjective}</p>
                </div>

                {/* Technical Skills */}
                <div className="cv-keep-together mb-3.5">
                  <div className="cv-section-heading mb-1.5">
                    <h2 className="text-[11px] font-bold uppercase text-[#0f172a] leading-[1.35] pb-1">Technical Skills &amp; Core Competencies</h2>
                    <div style={{ height: '1.5px', backgroundColor: '#0f172a', width: '100%' }} />
                  </div>
                  <div className="text-[10.5px]">
                    {SKILL_CATEGORIES.map((cat) => (
                      <div key={cat.category} className="grid grid-cols-[155px_1fr] gap-x-3 items-start leading-[1.4] mb-1">
                        <span className="font-bold text-[#0f172a]">{cat.category}:</span>
                        <span className="text-[#1e293b]">{cat.items.join(', ')}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Professional Experience */}
                <div className="mb-3.5">
                  <div className="cv-section-heading mb-1.5">
                    <h2 className="text-[11px] font-bold uppercase text-[#0f172a] leading-[1.35] pb-1">Professional Experience</h2>
                    <div style={{ height: '1.5px', backgroundColor: '#0f172a', width: '100%' }} />
                  </div>
                  {WORK_EXPERIENCE.map((exp) => {
                    const parsed = exp.highlights.map(parseHighlightItem);
                    const scopeLines = parsed.filter(item => item.isScope);
                    const bulletLines = parsed.filter(item => !item.isScope);
                    return (
                      <div key={exp.id} className="mb-2.5">
                        <div className="cv-keep-together">
                          <div className="cv-section-heading mb-1">
                            <div className="flex justify-between items-start gap-4 font-bold text-[11px] text-[#0f172a]">
                              <span>{exp.role}</span>
                              <span className="text-[10px] font-bold text-[#1e293b] shrink-0 whitespace-nowrap tabular-nums">{exp.period}</span>
                            </div>
                            <div className="flex justify-between items-start gap-4 text-[10px] text-[#334155] mt-0.5">
                              <span className="font-semibold text-[#1e293b]">{exp.company}</span>
                              <span className="text-right shrink-0">{exp.location}</span>
                            </div>
                            {scopeLines.map((s, idx) => (
                              <p key={idx} className="text-[10px] font-semibold text-[#0f172a] mt-0.5">{s.text}</p>
                            ))}
                          </div>
                          {bulletLines.length > 0 && (
                            <ul className="list-disc pl-4 text-[10.5px] text-[#111827]">
                              <li className="leading-[1.4] mb-0.5">{bulletLines[0].text}</li>
                            </ul>
                          )}
                        </div>
                        {bulletLines.length > 1 && (
                          <ul className="list-disc pl-4 text-[10.5px] text-[#111827]">
                            {bulletLines.slice(1).map((b, i) => (
                              <li key={i} className="cv-keep-together leading-[1.4] mb-0.5">{b.text}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Key SQA Projects (Filtered!) */}
                {selectedProjects.length > 0 && (
                  <div className="mb-3.5">
                    <div className="cv-section-heading mb-1.5">
                      <h2 className="text-[11px] font-bold uppercase text-[#0f172a] leading-[1.35] pb-1">Featured SQA Automation &amp; Testing Projects</h2>
                      <div style={{ height: '1.5px', backgroundColor: '#0f172a', width: '100%' }} />
                    </div>
                    {selectedProjects.map((proj) => (
                      <div key={proj.id} className="cv-keep-together text-[10.5px] mb-2">
                        <div className="flex justify-between items-start gap-4 font-bold text-[#0f172a] mb-0.5">
                          <span>
                            {proj.title} <span className="text-[9.5px] font-semibold text-[#475569]">({proj.type})</span>
                          </span>
                          {proj.link && (
                            <a 
                              href={normalizeUrl(proj.link)} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="hover:underline font-semibold text-[10px] shrink-0 whitespace-nowrap"
                              style={{ color: '#0a66c2', textDecoration: 'underline' }}
                            >
                              GitHub Repo
                            </a>
                          )}
                        </div>
                        <p className="text-[#1e293b] leading-[1.4] text-left mb-0.5">{proj.description}</p>
                        {(proj.tags || (proj.metrics && proj.metrics.length > 0)) && (
                          <p className="text-[10px] text-[#334155] leading-[1.35]">
                            {proj.tags && (
                              <>
                                <span className="font-bold text-[#0f172a]">Tools:</span> {proj.tags.join(' • ')}
                              </>
                            )}
                            {proj.metrics && proj.metrics.length > 0 && (
                              <span>
                                {proj.tags ? '  |  ' : ''}
                                <span className="font-bold text-[#0f172a]">Impact:</span>{' '}
                                {proj.metrics.map(m => `${m.label}: ${m.value}`).join(' • ')}
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Education */}
                <div className="cv-keep-together mb-3.5">
                  <div className="cv-section-heading mb-1.5">
                    <h2 className="text-[11px] font-bold uppercase text-[#0f172a] leading-[1.35] pb-1">Education &amp; Certifications</h2>
                    <div style={{ height: '1.5px', backgroundColor: '#0f172a', width: '100%' }} />
                  </div>
                  {EDUCATION_HISTORY.map((edu) => (
                    <div key={edu.id} className="text-[10.5px] mb-1.5">
                      <div className="flex justify-between items-start gap-4">
                        <span className="font-bold text-[#0f172a]">
                          {edu.degree} <span className="font-semibold text-[#334155]">— {edu.institution}</span>
                        </span>
                        <span className="text-[10px] font-bold text-[#1e293b] shrink-0 whitespace-nowrap tabular-nums">
                          {edu.period}
                        </span>
                      </div>
                      {edu.details && (
                        <p className="text-[10px] text-[#334155] leading-[1.36] mt-0.5">
                          {edu.details}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {/* References (grouped cleanly so neither heading nor contact line ever splits across pages) */}
                {portfolioReferences.length > 0 && (
                  <div className="cv-keep-together">
                    <div className="cv-section-heading mb-1.5">
                      <h2 className="text-[11px] font-bold uppercase text-[#0f172a] leading-[1.35] pb-1">Professional References</h2>
                      <div style={{ height: '1.5px', backgroundColor: '#0f172a', width: '100%' }} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                      {portfolioReferences.map((ref) => (
                        <div key={ref.id} className="text-[10px] text-[#111827] leading-[1.38]">
                          <p className="font-bold text-[#0f172a]">{ref.name}</p>
                          <p className="text-[#334155]">{ref.role}, {ref.company}</p>
                          <p className="text-[#475569]">{ref.email} | {ref.phone}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TEMPLATE 2: MODERN PROFESSIONAL */}
            {template === 'modern-pro' && (
              <div>
                {/* Modern Header */}
                <div className="cv-keep-together px-5 py-3.5 rounded-md mb-3.5" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                  <h1 className="text-[21px] font-bold uppercase leading-tight mb-0.5" style={{ color: '#ffffff' }}>{customInfo.name}</h1>
                  <p className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: '#fbbf24' }}>{customInfo.title}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px]" style={{ color: '#e2e8f0' }}>
                    <span>{customInfo.location}</span>
                    <span>|</span>
                    <span><a href={`tel:${customInfo.phone}`} className="hover:underline font-semibold" style={{ color: '#ffffff' }}>{customInfo.phone}</a></span>
                    <span>|</span>
                    <span><a href={`mailto:${customInfo.email}`} className="hover:underline font-semibold" style={{ color: '#ffffff' }}>{customInfo.email}</a></span>
                    <span>|</span>
                    <span><a href={normalizeUrl(customInfo.linkedin)} target="_blank" rel="noopener noreferrer" className="hover:underline font-semibold" style={{ color: '#fbbf24', textDecoration: 'underline' }}>LinkedIn</a></span>
                    <span>|</span>
                    <span><a href={normalizeUrl(customInfo.github)} target="_blank" rel="noopener noreferrer" className="hover:underline font-semibold" style={{ color: '#fbbf24', textDecoration: 'underline' }}>GitHub</a></span>
                    <span>|</span>
                    <span><a href={normalizeUrl(window.location.origin)} target="_blank" rel="noopener noreferrer" className="hover:underline font-semibold" style={{ color: '#fbbf24', textDecoration: 'underline' }}>Portfolio</a></span>
                  </div>
                </div>

                {/* Career Objective */}
                <div className="cv-keep-together mb-3.5">
                  <h2 className="cv-section-heading text-[11px] font-bold uppercase border-l-4 pl-2.5 mb-1.5 leading-[1.3]" style={{ color: '#0f172a', borderColor: '#f59e0b' }}>Career Objective</h2>
                  <p className="text-[10.5px] leading-[1.44] text-left font-normal" style={{ color: '#111827' }}>{activeCareerObjective}</p>
                </div>

                {/* Skills Grid */}
                <div className="cv-keep-together mb-3.5">
                  <h2 className="cv-section-heading text-[11px] font-bold uppercase border-l-4 pl-2.5 mb-1.5 leading-[1.3]" style={{ color: '#0f172a', borderColor: '#f59e0b' }}>Core Technical Toolkit</h2>
                  <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                    {SKILL_CATEGORIES.map((cat) => (
                      <div key={cat.category} className="px-2.5 py-1.5 rounded border" style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }}>
                        <span className="font-bold block text-[10px] uppercase mb-0.5" style={{ color: '#0f172a' }}>{cat.category}</span>
                        <span className="text-[10px] leading-[1.35] block" style={{ color: '#1e293b' }}>{cat.items.join(', ')}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Experience */}
                <div className="mb-3.5">
                  <h2 className="cv-section-heading text-[11px] font-bold uppercase border-l-4 pl-2.5 mb-1.5 leading-[1.3]" style={{ color: '#0f172a', borderColor: '#f59e0b' }}>Work History</h2>
                  {WORK_EXPERIENCE.map((exp) => {
                    const parsed = exp.highlights.map(parseHighlightItem);
                    const scopeLines = parsed.filter(item => item.isScope);
                    const bulletLines = parsed.filter(item => !item.isScope);
                    return (
                      <div key={exp.id} className="mb-2.5">
                        <div className="cv-keep-together">
                          <div className="cv-section-heading mb-1">
                            <div className="flex justify-between items-start gap-4">
                              <span className="font-bold text-[11px]" style={{ color: '#0f172a' }}>{exp.role}</span>
                              <span className="text-[10px] font-bold shrink-0 whitespace-nowrap tabular-nums" style={{ color: '#334155' }}>{exp.period}</span>
                            </div>
                            <div className="flex justify-between items-start gap-4 text-[10px] mt-0.5" style={{ color: '#475569' }}>
                              <span className="font-semibold" style={{ color: '#1e293b' }}>{exp.company}</span>
                              <span className="text-right shrink-0">{exp.location}</span>
                            </div>
                            {scopeLines.map((s, idx) => (
                              <p key={idx} className="text-[10px] font-semibold mt-0.5" style={{ color: '#0f172a' }}>{s.text}</p>
                            ))}
                          </div>
                          {bulletLines.length > 0 && (
                            <ul className="list-disc pl-4 text-[10.5px]" style={{ color: '#111827' }}>
                              <li className="leading-[1.4] mb-0.5">{bulletLines[0].text}</li>
                            </ul>
                          )}
                        </div>
                        {bulletLines.length > 1 && (
                          <ul className="list-disc pl-4 text-[10.5px]" style={{ color: '#111827' }}>
                            {bulletLines.slice(1).map((b, i) => (
                              <li key={i} className="cv-keep-together leading-[1.4] mb-0.5">{b.text}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Selected Projects */}
                {selectedProjects.length > 0 && (
                  <div className="mb-3.5">
                    <h2 className="cv-section-heading text-[11px] font-bold uppercase border-l-4 pl-2.5 mb-1.5 leading-[1.3]" style={{ color: '#0f172a', borderColor: '#f59e0b' }}>Selected SQA Projects</h2>
                    {selectedProjects.map((p) => (
                      <div key={p.id} className="cv-keep-together px-2.5 py-1.5 rounded border text-[10.5px] mb-1.5" style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }}>
                        <div className="flex justify-between items-start gap-3 font-bold mb-0.5" style={{ color: '#0f172a' }}>
                          <span>{p.title}</span>
                          <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#e2e8f0', color: '#0f172a' }}>{p.type}</span>
                            {p.link && (
                              <a 
                                href={normalizeUrl(p.link)} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="hover:underline font-semibold text-[10px]"
                                style={{ color: '#0a66c2', textDecoration: 'underline' }}
                              >
                                GitHub
                              </a>
                            )}
                          </div>
                        </div>
                        <p className="font-normal leading-[1.38] text-left" style={{ color: '#1e293b' }}>{p.description}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Education */}
                <div className="cv-keep-together mb-3.5">
                  <h2 className="cv-section-heading text-[11px] font-bold uppercase border-l-4 pl-2.5 mb-1.5 leading-[1.3]" style={{ color: '#0f172a', borderColor: '#f59e0b' }}>Education</h2>
                  {EDUCATION_HISTORY.map((edu) => (
                    <div key={edu.id} className="flex justify-between items-start gap-4 text-[10.5px] mb-1">
                      <div>
                        <span className="font-bold" style={{ color: '#0f172a' }}>{edu.degree}</span> <span className="font-medium" style={{ color: '#334155' }}>— {edu.institution}</span>
                      </div>
                      <span className="text-[10px] font-bold shrink-0 whitespace-nowrap tabular-nums" style={{ color: '#334155' }}>{edu.period}</span>
                    </div>
                  ))}
                </div>

                {/* References */}
                {portfolioReferences.length > 0 && (
                  <div className="cv-keep-together">
                    <h2 className="cv-section-heading text-[11px] font-bold uppercase border-l-4 pl-2.5 mb-1.5 leading-[1.3]" style={{ color: '#0f172a', borderColor: '#f59e0b' }}>References</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                      {portfolioReferences.map((ref) => (
                        <div key={ref.id} className="text-[10px] leading-[1.38]" style={{ color: '#111827' }}>
                          <p className="font-bold" style={{ color: '#0f172a' }}>{ref.name}</p>
                          <p style={{ color: '#334155' }}>{ref.role}, {ref.company}</p>
                          <p style={{ color: '#475569' }}>{ref.email} | {ref.phone}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TEMPLATE 3: MINIMAL CLEAN */}
            {template === 'minimal' && (
              <div>
                <div className="cv-keep-together mb-3.5">
                  <h1 className="text-[22px] font-semibold text-[#0f172a] leading-tight mb-0.5">{customInfo.name}</h1>
                  <p className="text-[11px] text-[#334155] font-semibold mb-1">{customInfo.title} | {customInfo.location}</p>
                  <div className="text-[10.5px] text-[#1e293b] font-medium flex flex-wrap gap-x-2 pb-2.5">
                    <a href={`mailto:${customInfo.email}`} className="hover:underline font-semibold" style={{ color: '#0f172a' }}>{customInfo.email}</a>
                    <span>|</span>
                    <a href={`tel:${customInfo.phone}`} className="hover:underline font-semibold" style={{ color: '#0f172a' }}>{customInfo.phone}</a>
                    <span>|</span>
                    <a href={normalizeUrl(customInfo.linkedin)} target="_blank" rel="noopener noreferrer" className="hover:underline font-semibold" style={{ color: '#0a66c2', textDecoration: 'underline' }}>LinkedIn</a>
                    <span>|</span>
                    <a href={normalizeUrl(customInfo.github)} target="_blank" rel="noopener noreferrer" className="hover:underline font-semibold" style={{ color: '#0f172a', textDecoration: 'underline' }}>GitHub</a>
                    <span>|</span>
                    <a href={normalizeUrl(window.location.origin)} target="_blank" rel="noopener noreferrer" className="hover:underline font-semibold" style={{ color: '#c2410c', textDecoration: 'underline' }}>Portfolio</a>
                  </div>
                  <div style={{ height: '1px', backgroundColor: '#cbd5e1', width: '100%' }} />
                </div>

                {/* Career Objective */}
                <div className="cv-keep-together mb-3.5">
                  <h2 className="cv-section-heading text-[11px] font-bold uppercase text-[#0f172a] mb-1">Career Objective</h2>
                  <p className="text-[10.5px] text-[#111827] leading-[1.44] text-left font-normal">{activeCareerObjective}</p>
                </div>

                <div className="mb-3.5">
                  <h2 className="cv-section-heading text-[11px] font-bold uppercase text-[#0f172a] mb-1.5">Experience</h2>
                  {WORK_EXPERIENCE.map((exp) => {
                    const parsed = exp.highlights.map(parseHighlightItem);
                    const scopeLines = parsed.filter(item => item.isScope);
                    const bulletLines = parsed.filter(item => !item.isScope);
                    return (
                      <div key={exp.id} className="mb-2.5">
                        <div className="cv-keep-together">
                          <div className="cv-section-heading mb-1">
                            <div className="flex justify-between items-start gap-4 text-[11px] font-bold text-[#0f172a]">
                              <span>{exp.role}</span>
                              <span className="text-[#334155] text-[10px] font-bold shrink-0 whitespace-nowrap tabular-nums">{exp.period}</span>
                            </div>
                            <div className="flex justify-between items-start gap-4 text-[10px] text-[#475569] mt-0.5">
                              <span className="font-semibold text-[#334155]">{exp.company}</span>
                              <span className="text-right shrink-0">{exp.location}</span>
                            </div>
                            {scopeLines.map((s, idx) => (
                              <p key={idx} className="text-[10px] font-semibold text-[#0f172a] mt-0.5">{s.text}</p>
                            ))}
                          </div>
                          {bulletLines.length > 0 && (
                            <ul className="list-disc pl-4 text-[10.5px] text-[#111827]">
                              <li className="leading-[1.4] mb-0.5">{bulletLines[0].text}</li>
                            </ul>
                          )}
                        </div>
                        {bulletLines.length > 1 && (
                          <ul className="list-disc pl-4 text-[10.5px] text-[#111827]">
                            {bulletLines.slice(1).map((b, i) => (
                              <li key={i} className="cv-keep-together leading-[1.4] mb-0.5">{b.text}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>

                {selectedProjects.length > 0 && (
                  <div className="mb-3.5">
                    <h2 className="cv-section-heading text-[11px] font-bold uppercase text-[#0f172a] mb-1.5">Projects</h2>
                    {selectedProjects.map((p) => (
                      <div key={p.id} className="cv-keep-together text-[10.5px] mb-1.5">
                        <div className="flex justify-between items-start gap-4 font-bold text-[#0f172a] mb-0.5">
                          <span>{p.title}</span>
                          {p.link && (
                            <a 
                              href={normalizeUrl(p.link)} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="hover:underline text-[10px] font-semibold shrink-0 whitespace-nowrap"
                              style={{ color: '#0a66c2', textDecoration: 'underline' }}
                            >
                              GitHub
                            </a>
                          )}
                        </div>
                        <p className="text-[#1e293b] leading-[1.4] text-left">{p.description}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="cv-keep-together mb-3.5">
                  <h2 className="cv-section-heading text-[11px] font-bold uppercase text-[#0f172a] mb-1">Skills</h2>
                  <p className="text-[10.5px] text-[#111827] leading-[1.42] font-medium">
                    {SKILL_CATEGORIES.flatMap(c => c.items).join(' • ')}
                  </p>
                </div>

                <div className="cv-keep-together mb-3.5">
                  <h2 className="cv-section-heading text-[11px] font-bold uppercase text-[#0f172a] mb-1">Education</h2>
                  {EDUCATION_HISTORY.map((edu) => (
                    <div key={edu.id} className="flex justify-between items-start gap-4 text-[10.5px] text-[#111827] font-medium mb-1">
                      <span><span className="font-bold text-[#0f172a]">{edu.degree}</span> — {edu.institution}</span>
                      <span className="text-[10px] font-bold shrink-0 whitespace-nowrap tabular-nums">{edu.period}</span>
                    </div>
                  ))}
                </div>

                {portfolioReferences.length > 0 && (
                  <div className="cv-keep-together">
                    <h2 className="cv-section-heading text-[11px] font-bold uppercase text-[#0f172a] mb-1">References</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                      {portfolioReferences.map((ref) => (
                        <div key={ref.id} className="text-[10px] text-[#111827] leading-[1.38]">
                          <p className="font-bold text-[#0f172a]">{ref.name}</p>
                          <p className="text-[#334155]">{ref.role}, {ref.company}</p>
                          <p className="text-[#475569]">{ref.email} | {ref.phone}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TEMPLATE 4: EXECUTIVE */}
            {template === 'executive' && (
              <div>
                <div className="cv-keep-together mb-3.5">
                  <div className="pb-2.5 flex justify-between items-start gap-4">
                    <div>
                      <h1 className="text-[21px] font-bold uppercase text-[#0f172a] leading-tight mb-0.5">{customInfo.name}</h1>
                      <p className="text-[11px] font-bold text-[#334155] uppercase tracking-wide">{customInfo.title}</p>
                    </div>
                    <div className="text-right text-[10px] text-[#111827] space-y-0.5 shrink-0">
                      <p>
                        <a href={`mailto:${customInfo.email}`} className="hover:underline font-bold" style={{ color: '#0f172a' }}>{customInfo.email}</a> | <a href={`tel:${customInfo.phone}`} className="hover:underline font-semibold" style={{ color: '#0f172a' }}>{customInfo.phone}</a>
                      </p>
                      <p className="font-medium text-[#334155]">{customInfo.location}</p>
                      <div className="flex justify-end items-center gap-1.5 pt-0.5 text-[10px] font-semibold">
                        <a href={normalizeUrl(customInfo.linkedin)} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: '#0a66c2', textDecoration: 'underline' }}>LinkedIn</a>
                        <span>|</span>
                        <a href={normalizeUrl(customInfo.github)} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: '#0f172a', textDecoration: 'underline' }}>GitHub</a>
                        <span>|</span>
                        <a href={normalizeUrl(window.location.origin)} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: '#c2410c', textDecoration: 'underline' }}>Portfolio</a>
                      </div>
                    </div>
                  </div>
                  <div style={{ height: '2.5px', backgroundColor: '#0f172a', width: '100%' }} />
                </div>

                {/* Key Metrics Banner */}
                <div className="cv-keep-together grid grid-cols-4 gap-2 p-2 rounded text-center text-[10px] border mb-3.5" style={{ backgroundColor: '#f3f4f6', borderColor: '#d1d5db' }}>
                  <div><span className="font-bold block text-[#0f172a] text-xs">{customInfo.experienceYears || '2'}+ Yrs</span> <span className="font-semibold text-[#334155]">Experience</span></div>
                  <div><span className="font-bold block text-[#0f172a] text-xs">150+</span> <span className="font-semibold text-[#334155]">Test Cases</span></div>
                  <div><span className="font-bold block text-[#0f172a] text-xs">100+</span> <span className="font-semibold text-[#334155]">Bugs Logged</span></div>
                  <div><span className="font-bold block text-[#0f172a] text-xs">0%</span> <span className="font-semibold text-[#334155]">Error Rate</span></div>
                </div>

                {/* Career Objective */}
                <div className="cv-keep-together mb-3.5">
                  <div className="cv-section-heading mb-1.5">
                    <h2 className="text-[11px] font-bold uppercase text-[#0f172a] leading-[1.35] pb-1">Career Objective</h2>
                    <div style={{ height: '1.5px', backgroundColor: '#0f172a', width: '100%' }} />
                  </div>
                  <p className="text-[10.5px] text-[#111827] leading-[1.44] text-left">{activeCareerObjective}</p>
                </div>

                <div className="cv-keep-together mb-3.5">
                  <div className="cv-section-heading mb-1.5">
                    <h2 className="text-[11px] font-bold uppercase text-[#0f172a] leading-[1.35] pb-1">Leadership &amp; Technical Capabilities</h2>
                    <div style={{ height: '1.5px', backgroundColor: '#0f172a', width: '100%' }} />
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10.5px] items-start">
                    {SKILL_CATEGORIES.map((c) => (
                      <div key={c.category} className="leading-[1.38]">
                        <span className="font-bold text-[#0f172a]">{c.category}: </span>
                        <span className="text-[#1e293b] font-medium">{c.items.join(', ')}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-3.5">
                  <div className="cv-section-heading mb-1.5">
                    <h2 className="text-[11px] font-bold uppercase text-[#0f172a] leading-[1.35] pb-1">Professional Career History</h2>
                    <div style={{ height: '1.5px', backgroundColor: '#0f172a', width: '100%' }} />
                  </div>
                  {WORK_EXPERIENCE.map((exp) => {
                    const parsed = exp.highlights.map(parseHighlightItem);
                    const scopeLines = parsed.filter(item => item.isScope);
                    const bulletLines = parsed.filter(item => !item.isScope);
                    return (
                      <div key={exp.id} className="mb-2.5">
                        <div className="cv-keep-together">
                          <div className="cv-section-heading mb-1">
                            <div className="flex justify-between items-start gap-4 font-bold text-[11px] text-[#0f172a]">
                              <span>{exp.role}</span>
                              <span className="text-[#334155] text-[10px] font-bold shrink-0 whitespace-nowrap tabular-nums">{exp.period}</span>
                            </div>
                            <div className="flex justify-between items-start gap-4 text-[10px] text-[#475569] mt-0.5">
                              <span className="font-semibold text-[#1e293b]">{exp.company}</span>
                              <span className="text-right shrink-0">{exp.location}</span>
                            </div>
                            {scopeLines.map((s, idx) => (
                              <p key={idx} className="text-[10px] font-semibold text-[#0f172a] mt-0.5">{s.text}</p>
                            ))}
                          </div>
                          {bulletLines.length > 0 && (
                            <ul className="list-disc pl-4 text-[10.5px] text-[#111827]">
                              <li className="leading-[1.4] mb-0.5">{bulletLines[0].text}</li>
                            </ul>
                          )}
                        </div>
                        {bulletLines.length > 1 && (
                          <ul className="list-disc pl-4 text-[10.5px] text-[#111827]">
                            {bulletLines.slice(1).map((b, i) => (
                              <li key={i} className="cv-keep-together leading-[1.4] mb-0.5">{b.text}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>

                {selectedProjects.length > 0 && (
                  <div className="mb-3.5">
                    <div className="cv-section-heading mb-1.5">
                      <h2 className="text-[11px] font-bold uppercase text-[#0f172a] leading-[1.35] pb-1">Key Deliverables &amp; Projects</h2>
                      <div style={{ height: '1.5px', backgroundColor: '#0f172a', width: '100%' }} />
                    </div>
                    {selectedProjects.map((p) => (
                      <div key={p.id} className="cv-keep-together text-[10.5px] mb-1.5">
                        <div className="flex justify-between items-start gap-4 mb-0.5">
                          <span className="font-bold text-[#0f172a]">{p.title}</span>
                          {p.link && (
                            <a 
                              href={normalizeUrl(p.link)} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="hover:underline font-semibold text-[10px] shrink-0 whitespace-nowrap"
                              style={{ color: '#0a66c2', textDecoration: 'underline' }}
                            >
                              GitHub Repo
                            </a>
                          )}
                        </div>
                        <p className="text-[#1e293b] leading-[1.4] text-left">{p.description}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="cv-keep-together mb-3.5">
                  <div className="cv-section-heading mb-1.5">
                    <h2 className="text-[11px] font-bold uppercase text-[#0f172a] leading-[1.35] pb-1">Education</h2>
                    <div style={{ height: '1.5px', backgroundColor: '#0f172a', width: '100%' }} />
                  </div>
                  {EDUCATION_HISTORY.map((e) => (
                    <div key={e.id} className="flex justify-between items-start gap-4 text-[10.5px] text-[#111827] mb-1">
                      <span><span className="font-bold text-[#0f172a]">{e.degree}</span> — {e.institution}</span>
                      <span className="text-[10px] font-bold shrink-0 whitespace-nowrap tabular-nums">{e.period}</span>
                    </div>
                  ))}
                </div>

                {portfolioReferences.length > 0 && (
                  <div className="cv-keep-together">
                    <div className="cv-section-heading mb-1.5">
                      <h2 className="text-[11px] font-bold uppercase text-[#0f172a] leading-[1.35] pb-1">References</h2>
                      <div style={{ height: '1.5px', backgroundColor: '#0f172a', width: '100%' }} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                      {portfolioReferences.map((ref) => (
                        <div key={ref.id} className="text-[10px] text-[#111827] leading-[1.38]">
                          <p className="font-bold text-[#0f172a]">{ref.name}</p>
                          <p className="text-[#334155]">{ref.role}, {ref.company}</p>
                          <p className="text-[#475569]">{ref.email} | {ref.phone}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TEMPLATE 5: CLEAN PORTFOLIO STYLE */}
            {template === 'portfolio-style' && (
              <div>
                <div className="cv-keep-together mb-3.5">
                  <div className="flex justify-between items-start gap-4 pb-2.5">
                    <div>
                      <h1 className="text-[21px] font-bold text-[#0f172a] leading-tight mb-0.5">{customInfo.name}</h1>
                      <p className="text-[11px] font-bold uppercase mb-0.5" style={{ color: '#ea580c' }}>{customInfo.title}</p>
                      <p className="text-[10.5px] text-[#334155] font-medium">{customInfo.location}</p>
                    </div>
                    <div className="text-right text-[10px] text-[#111827] space-y-0.5 shrink-0">
                      <p className="font-bold text-[#0f172a]">
                        <a href={`mailto:${customInfo.email}`} className="hover:underline" style={{ color: '#0f172a' }}>{customInfo.email}</a>
                      </p>
                      <p>
                        <a href={`tel:${customInfo.phone}`} className="hover:underline" style={{ color: '#0f172a' }}>{customInfo.phone}</a>
                      </p>
                      <div className="flex justify-end items-center gap-1.5 pt-0.5 text-[10px] font-semibold">
                        <a href={normalizeUrl(customInfo.linkedin)} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: '#0a66c2', textDecoration: 'underline' }}>LinkedIn</a>
                        <span>|</span>
                        <a href={normalizeUrl(customInfo.github)} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: '#0f172a', textDecoration: 'underline' }}>GitHub</a>
                        <span>|</span>
                        <a href={normalizeUrl(window.location.origin)} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: '#c2410c', textDecoration: 'underline' }}>Portfolio</a>
                      </div>
                    </div>
                  </div>
                  <div style={{ height: '2px', backgroundColor: '#f97316', width: '100%' }} />
                </div>

                {/* Career Objective */}
                <div className="cv-keep-together mb-3.5">
                  <h2 className="cv-section-heading text-[11px] font-bold uppercase mb-1" style={{ color: '#ea580c' }}>Career Objective</h2>
                  <p className="text-[10.5px] text-[#111827] leading-[1.44] text-left font-normal">{activeCareerObjective}</p>
                </div>

                <div className="cv-keep-together mb-3.5">
                  <h2 className="cv-section-heading text-[11px] font-bold uppercase mb-1.5" style={{ color: '#ea580c' }}>SQA Toolkit &amp; Capabilities</h2>
                  <div className="text-[10.5px]">
                    {SKILL_CATEGORIES.map((cat) => (
                      <div key={cat.category} className="grid grid-cols-[155px_1fr] gap-x-3 items-start leading-[1.38] mb-1">
                        <span className="font-bold text-[#0f172a]">{cat.category}:</span>
                        <span className="text-[#1e293b]">{cat.items.join(', ')}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-3.5">
                  <h2 className="cv-section-heading text-[11px] font-bold uppercase mb-1.5" style={{ color: '#ea580c' }}>Experience &amp; STLC Workflow</h2>
                  {WORK_EXPERIENCE.map((exp) => {
                    const parsed = exp.highlights.map(parseHighlightItem);
                    const scopeLines = parsed.filter(item => item.isScope);
                    const bulletLines = parsed.filter(item => !item.isScope);
                    return (
                      <div key={exp.id} className="text-[10.5px] mb-2.5">
                        <div className="cv-keep-together">
                          <div className="cv-section-heading mb-1">
                            <div className="flex justify-between items-start gap-4 font-bold text-[11px] text-[#0f172a]">
                              <span>{exp.role}</span>
                              <span className="text-[#334155] font-bold text-[10px] shrink-0 whitespace-nowrap tabular-nums">{exp.period}</span>
                            </div>
                            <div className="flex justify-between items-start gap-4 text-[10px] text-[#475569] mt-0.5">
                              <span className="font-semibold text-[#1e293b]">{exp.company}</span>
                              <span className="text-right shrink-0">{exp.location}</span>
                            </div>
                            {scopeLines.map((s, idx) => (
                              <p key={idx} className="text-[10px] font-semibold text-[#0f172a] mt-0.5">{s.text}</p>
                            ))}
                          </div>
                          {bulletLines.length > 0 && (
                            <ul className="list-disc pl-4 text-[10.5px] text-[#111827]">
                              <li className="leading-[1.4] mb-0.5">{bulletLines[0].text}</li>
                            </ul>
                          )}
                        </div>
                        {bulletLines.length > 1 && (
                          <ul className="list-disc pl-4 text-[10.5px] text-[#111827]">
                            {bulletLines.slice(1).map((b, i) => (
                              <li key={i} className="cv-keep-together leading-[1.4] mb-0.5">{b.text}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>

                {selectedProjects.length > 0 && (
                  <div className="mb-3.5">
                    <h2 className="cv-section-heading text-[11px] font-bold uppercase mb-1.5" style={{ color: '#ea580c' }}>Verified Automation &amp; QA Repositories</h2>
                    {selectedProjects.map((p) => (
                      <div key={p.id} className="cv-keep-together px-2.5 py-1.5 border rounded text-[10.5px] mb-1.5" style={{ borderColor: '#cbd5e1', backgroundColor: '#ffffff' }}>
                        <div className="flex justify-between items-start gap-3 font-bold text-[#0f172a] mb-0.5">
                          <span>{p.title}</span>
                          <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
                            <span className="font-bold text-[9.5px]" style={{ color: '#1d4ed8' }}>{p.type}</span>
                            {p.link && (
                              <a 
                                href={normalizeUrl(p.link)} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="hover:underline font-semibold text-[10px]"
                                style={{ color: '#0a66c2', textDecoration: 'underline' }}
                              >
                                GitHub
                              </a>
                            )}
                          </div>
                        </div>
                        <p className="text-[#1e293b] text-[10.5px] leading-[1.38] text-left">{p.description}</p>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="cv-keep-together mb-3.5">
                  <h2 className="cv-section-heading text-[11px] font-bold uppercase mb-1" style={{ color: '#ea580c' }}>
                    Education
                  </h2>
                  {EDUCATION_HISTORY.map((edu) => (
                    <div
                      key={edu.id}
                      className="flex justify-between items-start gap-4 text-[10.5px] text-[#111827] font-medium mb-1"
                    >
                      <span>
                        <span className="font-bold text-[#0f172a]">{edu.degree}</span> <span className="font-semibold text-[#334155]">— {edu.institution}</span>
                      </span>
                      <span className="text-[10px] font-bold shrink-0 whitespace-nowrap tabular-nums">{edu.period}</span>
                    </div>
                  ))}
                </div>

                {portfolioReferences.length > 0 && (
                  <div className="cv-keep-together">
                    <h2 className="cv-section-heading text-[11px] font-bold uppercase mb-1" style={{ color: '#ea580c' }}>References</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                      {portfolioReferences.map((ref) => (
                        <div key={ref.id} className="text-[10px] text-[#111827] leading-[1.38]">
                          <p className="font-bold text-[#0f172a]">{ref.name}</p>
                          <p className="text-[#334155]">{ref.role}, {ref.company}</p>
                          <p className="text-[#475569]">{ref.email} | {ref.phone}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
