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
import { copyToClipboard } from '../utils/clipboard';
import { exportPaginatedPdf, renderA4PreviewPages, triggerVectorPrint } from '../utils/printDocument';
import { PrintPreviewModal } from './PrintPreviewModal';

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
export type PdfQualityMode = 'under-1mb' | 'normal';

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
  const [pdfQualityMode, setPdfQualityMode] = useState<PdfQualityMode>('under-1mb');
  const [lastPdfInfo, setLastPdfInfo] = useState<{ sizeLabel: string; mode: PdfQualityMode } | null>(null);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [isGeneratingPrintPreview, setIsGeneratingPrintPreview] = useState(false);
  const [printPreviewPages, setPrintPreviewPages] = useState<string[]>([]);

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
  }, [PROJECTS, selectedProjectIds]);

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

  const formatByteSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Discrete A4 page-by-page PDF Export with toggleable <1MB vs Normal Quality mode and clickable links
  const handleDownloadPDF = async () => {
    if (!resumeRef.current || isExportingPdf) return;
    setIsExportingPdf(true);

    try {
      const element = resumeRef.current;
      const margin = [12, 13, 12, 13] as [number, number, number, number];
      const filename = `${getCvBaseFileName()}.pdf`;

      const renderPdfPass = (scale: number, quality: number, compress: boolean) =>
        exportPaginatedPdf({
          sourceElement: element,
          margin,
          filename,
          scale,
          quality,
          compress,
          urlNormalizer: normalizeUrl,
        });

      let result: { pdf: any; byteLength: number };

      if (pdfQualityMode === 'under-1mb') {
        result = await renderPdfPass(1.85, 0.86, true);
        if (result.byteLength > 980 * 1024) {
          result = await renderPdfPass(1.5, 0.72, true);
        }
        if (result.byteLength > 995 * 1024) {
          result = await renderPdfPass(1.25, 0.62, true);
        }
      } else {
        // Normal / Full Quality mode (1MB cap turned OFF)
        result = await renderPdfPass(2.5, 0.99, false);
      }

      if (result.byteLength > 0) {
        setLastPdfInfo({
          sizeLabel: formatByteSize(result.byteLength),
          mode: pdfQualityMode,
        });
      }

      result.pdf.save(filename);
    } catch (err) {
      console.error('PDF generation error:', err);
      void handlePrint();
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Browser Print trigger with viewport-mounted 1px iframe & sandbox detection
  const handlePrint = async () => {
    return triggerVectorPrint({
      sourceElement: resumeRef.current,
      documentTitle: getCvBaseFileName(),
      marginMm: [12, 13, 12, 13],
      pageMarginCss: '12mm 13mm',
    });
  };

  // Opens exact A4 paginated Print & PDF Preview modal when user clicks "Print / PDF"
  const handleOpenPrintPreview = async () => {
    setIsPrintPreviewOpen(true);
    setPrintPreviewPages([]);
    if (!resumeRef.current) return;

    setIsGeneratingPrintPreview(true);
    try {
      const rendered = await renderA4PreviewPages({
        sourceElement: resumeRef.current,
        margin: [12, 13, 12, 13],
      });
      setPrintPreviewPages(rendered.pages);
    } catch (err) {
      console.error('Print preview render error:', err);
    } finally {
      setIsGeneratingPrintPreview(false);
    }
  };

  // Structured Microsoft Word Resume Generator matching active template, fonts, colors & alignment 1:1 with PDF
  const generateWordResumeHtml = () => {
    const esc = (value?: string | number | null): string =>
      String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const activeFontStack =
      fontFamily === 'serif'
        ? "'Merriweather', Georgia, Cambria, 'Times New Roman', serif"
        : fontFamily === 'corporate'
        ? "'Source Sans 3', Calibri, 'Segoe UI', Arial, sans-serif"
        : "'Inter', Calibri, 'Segoe UI', Arial, sans-serif";

    const portfolioOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://sabbir-sqa.vercel.app';
    const linkedinUrl = normalizeUrl(customInfo.linkedin);
    const githubUrl = normalizeUrl(customInfo.github);
    const portfolioUrl = normalizeUrl(portfolioOrigin);

    const renderSectionHeading = (titleText: string) => {
      if (template === 'modern-pro') {
        return `
          <table width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse; margin:10pt 0 5pt 0; page-break-after:avoid; break-after:avoid;">
            <tr>
              <td style="border-left:3pt solid #f59e0b; padding:0 0 0 7pt; font-size:8.5pt; font-weight:bold; text-transform:uppercase; color:#0f172a; line-height:1.3;">
                ${esc(titleText)}
              </td>
            </tr>
          </table>
        `;
      }
      if (template === 'minimal') {
        return `
          <div style="font-size:8.5pt; font-weight:bold; text-transform:uppercase; color:#0f172a; margin:10pt 0 4pt 0; line-height:1.35; page-break-after:avoid; break-after:avoid;">
            ${esc(titleText)}
          </div>
        `;
      }
      if (template === 'portfolio-style') {
        return `
          <div style="font-size:8.5pt; font-weight:bold; text-transform:uppercase; color:#ea580c; margin:10pt 0 4pt 0; line-height:1.35; page-break-after:avoid; break-after:avoid;">
            ${esc(titleText)}
          </div>
        `;
      }
      // classic-ats & executive
      return `
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse; margin:10pt 0 5pt 0; page-break-after:avoid; break-after:avoid;">
          <tr>
            <td style="font-size:8.5pt; font-weight:bold; text-transform:uppercase; color:#0f172a; border-bottom:1.15pt solid #0f172a; padding:0 0 3pt 0; line-height:1.35;">
              ${esc(titleText)}
            </td>
          </tr>
        </table>
      `;
    };

    const renderExperienceItems = () =>
      WORK_EXPERIENCE.map((exp) => {
        const parsed = exp.highlights.map(parseHighlightItem);
        const scopeLines = parsed.filter((item) => item.isScope);
        const bulletLines = parsed.filter((item) => !item.isScope);
        const companyColor = template === 'minimal' ? '#334155' : '#1e293b';

        return `
          <div style="margin-bottom:7pt;">
            <table width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse; page-break-inside:avoid; break-inside:avoid; page-break-after:avoid; break-after:avoid;">
              <tr>
                <td style="text-align:left; vertical-align:top; font-size:8.5pt; font-weight:bold; color:#0f172a; padding:0;">${esc(exp.role)}</td>
                <td style="text-align:right; vertical-align:top; font-size:7.5pt; font-weight:bold; color:${template === 'classic-ats' ? '#1e293b' : '#334155'}; white-space:nowrap; padding:0;">${esc(exp.period)}</td>
              </tr>
              <tr>
                <td style="text-align:left; vertical-align:top; font-size:7.5pt; font-weight:600; color:${companyColor}; padding:1.5pt 0 0 0;">${esc(exp.company)}</td>
                <td style="text-align:right; vertical-align:top; font-size:7.5pt; color:${template === 'classic-ats' ? '#334155' : '#475569'}; white-space:nowrap; padding:1.5pt 0 0 0;">${esc(exp.location)}</td>
              </tr>
            </table>
            ${scopeLines
              .map(
                (s) =>
                  `<p style="margin:2pt 0 0 0; font-size:7.5pt; font-weight:600; color:#0f172a; line-height:1.38;">${esc(s.text)}</p>`
              )
              .join('')}
            ${
              bulletLines.length > 0
                ? `<ul style="margin:2pt 0 0 13pt; padding:0; color:#111827;">
                    ${bulletLines
                      .map(
                        (b) =>
                          `<li style="font-size:8pt; line-height:1.4; color:#111827; margin-bottom:2pt; page-break-inside:avoid; break-inside:avoid;">${esc(b.text)}</li>`
                      )
                      .join('')}
                  </ul>`
                : ''
            }
          </div>
        `;
      }).join('');

    const renderTwoColGrid = <T,>(items: T[], renderCell: (item: T) => string, gapPt = 10) => {
      if (items.length === 0) return '';
      const rows: string[] = [];
      for (let i = 0; i < items.length; i += 2) {
        const left = items[i];
        const right = items[i + 1];
        rows.push(`
          <tr style="page-break-inside:avoid; break-inside:avoid;">
            <td width="49%" style="width:49%; vertical-align:top; padding:0 ${gapPt / 2}pt 4.5pt 0;">${renderCell(left)}</td>
            <td width="49%" style="width:49%; vertical-align:top; padding:0 0 4.5pt ${gapPt / 2}pt;">${right ? renderCell(right) : ''}</td>
          </tr>
        `);
      }
      return `
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse; table-layout:fixed;">
          ${rows.join('')}
        </table>
      `;
    };

    const renderReferencesBlock = (headingTitle: string) => {
      if (portfolioReferences.length === 0) return '';
      return `
        <div style="page-break-inside:avoid; break-inside:avoid;">
          ${renderSectionHeading(headingTitle)}
          ${renderTwoColGrid(
            portfolioReferences,
            (ref) => `
              <div style="font-size:7.5pt; line-height:1.38; color:#111827;">
                <p style="margin:0; font-size:7.5pt; font-weight:bold; color:#0f172a; line-height:1.38;">${esc(ref.name)}</p>
                <p style="margin:0; font-size:7.5pt; color:#334155; line-height:1.38;">${esc(ref.role)}, ${esc(ref.company)}</p>
                <p style="margin:0; font-size:7.5pt; color:#475569; line-height:1.38;">
                  <a href="mailto:${esc(ref.email)}" style="color:#475569; text-decoration:none;">${esc(ref.email)}</a> | <a href="tel:${esc(ref.phone)}" style="color:#475569; text-decoration:none;">${esc(ref.phone)}</a>
                </p>
              </div>
            `,
            14
          )}
        </div>
      `;
    };

    const renderEducationBlock = (headingTitle: string, withDetails: boolean) => `
      <div style="margin-bottom:9pt; page-break-inside:avoid; break-inside:avoid;">
        ${renderSectionHeading(headingTitle)}
        ${EDUCATION_HISTORY.map(
          (edu) => `
            <div style="margin-bottom:${withDetails ? '4.5pt' : '3pt'}; page-break-inside:avoid; break-inside:avoid;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse;">
                <tr>
                  <td style="text-align:left; vertical-align:top; font-size:8pt; color:#111827; padding:0;">
                    <span style="font-weight:bold; color:#0f172a;">${esc(edu.degree)}</span>
                    <span style="font-weight:${template === 'classic-ats' || template === 'portfolio-style' ? '600' : '500'}; color:#334155;"> — ${esc(edu.institution)}</span>
                  </td>
                  <td style="text-align:right; vertical-align:top; font-size:7.5pt; font-weight:bold; color:${template === 'classic-ats' ? '#1e293b' : '#334155'}; white-space:nowrap; padding:0;">${esc(edu.period)}</td>
                </tr>
              </table>
              ${
                withDetails && edu.details
                  ? `<p style="margin:1.5pt 0 0 0; font-size:7.5pt; color:#334155; line-height:1.36;">${esc(edu.details)}</p>`
                  : ''
              }
            </div>
          `
        ).join('')}
      </div>
    `;

    let bodyMarkup = '';

    if (template === 'modern-pro') {
      bodyMarkup = `
        <!-- Header Banner -->
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse; margin-bottom:10pt; page-break-inside:avoid; break-inside:avoid;">
          <tr>
            <td style="background-color:#0f172a; padding:10pt 14pt; color:#ffffff;">
              <div style="font-size:16pt; font-weight:bold; text-transform:uppercase; color:#ffffff; line-height:1.2; margin:0 0 2pt 0;">${esc(customInfo.name)}</div>
              <div style="font-size:8.5pt; font-weight:bold; text-transform:uppercase; letter-spacing:0.4pt; color:#fbbf24; margin:0 0 5pt 0;">${esc(customInfo.title)}</div>
              <div style="font-size:7.5pt; color:#e2e8f0; line-height:1.4;">
                <span>${esc(customInfo.location)}</span>
                &nbsp;|&nbsp;
                <a href="tel:${esc(customInfo.phone)}" style="color:#ffffff; font-weight:600; text-decoration:none;">${esc(customInfo.phone)}</a>
                &nbsp;|&nbsp;
                <a href="mailto:${esc(customInfo.email)}" style="color:#ffffff; font-weight:600; text-decoration:none;">${esc(customInfo.email)}</a>
                &nbsp;|&nbsp;
                <a href="${esc(linkedinUrl)}" style="color:#fbbf24; font-weight:600; text-decoration:underline;">LinkedIn</a>
                &nbsp;|&nbsp;
                <a href="${esc(githubUrl)}" style="color:#fbbf24; font-weight:600; text-decoration:underline;">GitHub</a>
                &nbsp;|&nbsp;
                <a href="${esc(portfolioUrl)}" style="color:#fbbf24; font-weight:600; text-decoration:underline;">Portfolio</a>
              </div>
            </td>
          </tr>
        </table>

        <!-- Career Objective -->
        <div style="margin-bottom:9pt; page-break-inside:avoid; break-inside:avoid;">
          ${renderSectionHeading('Career Objective')}
          <p style="margin:0; font-size:8pt; color:#111827; line-height:1.44; text-align:left;">${esc(activeCareerObjective)}</p>
        </div>

        <!-- Core Technical Toolkit -->
        <div style="margin-bottom:9pt; page-break-inside:avoid; break-inside:avoid;">
          ${renderSectionHeading('Core Technical Toolkit')}
          ${renderTwoColGrid(
            SKILL_CATEGORIES,
            (cat) => `
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse; background-color:#f8fafc; border:0.75pt solid #cbd5e1;">
                <tr>
                  <td style="padding:4.5pt 7pt; vertical-align:top;">
                    <div style="font-size:7.5pt; font-weight:bold; text-transform:uppercase; color:#0f172a; margin-bottom:2pt;">${esc(cat.category)}</div>
                    <div style="font-size:7.5pt; color:#1e293b; line-height:1.35;">${esc(cat.items.join(', '))}</div>
                  </td>
                </tr>
              </table>
            `,
            6
          )}
        </div>

        <!-- Work History -->
        <div style="margin-bottom:9pt;">
          ${renderSectionHeading('Work History')}
          ${renderExperienceItems()}
        </div>

        <!-- Selected SQA Projects -->
        ${
          selectedProjects.length > 0
            ? `<div style="margin-bottom:9pt;">
                ${renderSectionHeading('Selected SQA Projects')}
                ${selectedProjects
                  .map(
                    (p) => `
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse; background-color:#f8fafc; border:0.75pt solid #cbd5e1; margin-bottom:4.5pt; page-break-inside:avoid; break-inside:avoid;">
                      <tr>
                        <td style="padding:5pt 7pt; vertical-align:top;">
                          <table width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse; margin-bottom:2pt;">
                            <tr>
                              <td style="text-align:left; vertical-align:top; font-size:8pt; font-weight:bold; color:#0f172a;">${esc(p.title)}</td>
                              <td style="text-align:right; vertical-align:top; white-space:nowrap;">
                                <span style="font-size:7pt; font-weight:bold; background-color:#e2e8f0; color:#0f172a; padding:1pt 4pt;">${esc(p.type)}</span>
                                ${
                                  p.link
                                    ? `&nbsp;&nbsp;<a href="${esc(normalizeUrl(p.link))}" style="font-size:7.5pt; font-weight:600; color:#0a66c2; text-decoration:underline;">GitHub</a>`
                                    : ''
                                }
                              </td>
                            </tr>
                          </table>
                          <p style="margin:0; font-size:8pt; color:#1e293b; line-height:1.38; text-align:left;">${esc(p.description)}</p>
                        </td>
                      </tr>
                    </table>
                  `
                  )
                  .join('')}
              </div>`
            : ''
        }

        ${renderEducationBlock('Education', false)}
        ${renderReferencesBlock('References')}
      `;
    } else if (template === 'minimal') {
      bodyMarkup = `
        <!-- Minimal Header -->
        <div style="margin-bottom:9pt; page-break-inside:avoid; break-inside:avoid;">
          <div style="font-size:16.5pt; font-weight:600; color:#0f172a; line-height:1.2; margin:0 0 2pt 0;">${esc(customInfo.name)}</div>
          <div style="font-size:8.5pt; font-weight:600; color:#334155; margin:0 0 3pt 0;">${esc(customInfo.title)} | ${esc(customInfo.location)}</div>
          <div style="font-size:8pt; font-weight:500; color:#1e293b; padding-bottom:6pt; border-bottom:0.75pt solid #cbd5e1;">
            <a href="mailto:${esc(customInfo.email)}" style="color:#0f172a; font-weight:600; text-decoration:none;">${esc(customInfo.email)}</a>
            &nbsp;|&nbsp;
            <a href="tel:${esc(customInfo.phone)}" style="color:#0f172a; font-weight:600; text-decoration:none;">${esc(customInfo.phone)}</a>
            &nbsp;|&nbsp;
            <a href="${esc(linkedinUrl)}" style="color:#0a66c2; font-weight:600; text-decoration:underline;">LinkedIn</a>
            &nbsp;|&nbsp;
            <a href="${esc(githubUrl)}" style="color:#0f172a; font-weight:600; text-decoration:underline;">GitHub</a>
            &nbsp;|&nbsp;
            <a href="${esc(portfolioUrl)}" style="color:#c2410c; font-weight:600; text-decoration:underline;">Portfolio</a>
          </div>
        </div>

        <!-- Career Objective -->
        <div style="margin-bottom:9pt; page-break-inside:avoid; break-inside:avoid;">
          ${renderSectionHeading('Career Objective')}
          <p style="margin:0; font-size:8pt; color:#111827; line-height:1.44; text-align:left;">${esc(activeCareerObjective)}</p>
        </div>

        <!-- Experience -->
        <div style="margin-bottom:9pt;">
          ${renderSectionHeading('Experience')}
          ${renderExperienceItems()}
        </div>

        <!-- Projects -->
        ${
          selectedProjects.length > 0
            ? `<div style="margin-bottom:9pt;">
                ${renderSectionHeading('Projects')}
                ${selectedProjects
                  .map(
                    (p) => `
                    <div style="margin-bottom:5pt; page-break-inside:avoid; break-inside:avoid;">
                      <table width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse; margin-bottom:1.5pt;">
                        <tr>
                          <td style="text-align:left; vertical-align:top; font-size:8pt; font-weight:bold; color:#0f172a;">${esc(p.title)}</td>
                          <td style="text-align:right; vertical-align:top; white-space:nowrap;">
                            ${
                              p.link
                                ? `<a href="${esc(normalizeUrl(p.link))}" style="font-size:7.5pt; font-weight:600; color:#0a66c2; text-decoration:underline;">GitHub</a>`
                                : ''
                            }
                          </td>
                        </tr>
                      </table>
                      <p style="margin:0; font-size:8pt; color:#1e293b; line-height:1.4; text-align:left;">${esc(p.description)}</p>
                    </div>
                  `
                  )
                  .join('')}
              </div>`
            : ''
        }

        <!-- Skills -->
        <div style="margin-bottom:9pt; page-break-inside:avoid; break-inside:avoid;">
          ${renderSectionHeading('Skills')}
          <p style="margin:0; font-size:8pt; color:#111827; line-height:1.42; font-weight:500;">${esc(
            SKILL_CATEGORIES.flatMap((c) => c.items).join(' • ')
          )}</p>
        </div>

        ${renderEducationBlock('Education', false)}
        ${renderReferencesBlock('References')}
      `;
    } else if (template === 'executive') {
      bodyMarkup = `
        <!-- Executive Header -->
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse; margin-bottom:9pt; border-bottom:2pt solid #0f172a; page-break-inside:avoid; break-inside:avoid;">
          <tr>
            <td style="text-align:left; vertical-align:top; padding:0 10pt 7pt 0;">
              <div style="font-size:16pt; font-weight:bold; text-transform:uppercase; color:#0f172a; line-height:1.2; margin:0 0 2pt 0;">${esc(customInfo.name)}</div>
              <div style="font-size:8.5pt; font-weight:bold; text-transform:uppercase; letter-spacing:0.35pt; color:#334155;">${esc(customInfo.title)}</div>
            </td>
            <td style="text-align:right; vertical-align:top; white-space:nowrap; font-size:7.5pt; color:#111827; line-height:1.45; padding:0 0 7pt 0;">
              <div>
                <a href="mailto:${esc(customInfo.email)}" style="color:#0f172a; font-weight:bold; text-decoration:none;">${esc(customInfo.email)}</a> | <a href="tel:${esc(customInfo.phone)}" style="color:#0f172a; font-weight:600; text-decoration:none;">${esc(customInfo.phone)}</a>
              </div>
              <div style="font-weight:500; color:#334155;">${esc(customInfo.location)}</div>
              <div style="font-weight:600; padding-top:1pt;">
                <a href="${esc(linkedinUrl)}" style="color:#0a66c2; text-decoration:underline;">LinkedIn</a>
                &nbsp;|&nbsp;
                <a href="${esc(githubUrl)}" style="color:#0f172a; text-decoration:underline;">GitHub</a>
                &nbsp;|&nbsp;
                <a href="${esc(portfolioUrl)}" style="color:#c2410c; text-decoration:underline;">Portfolio</a>
              </div>
            </td>
          </tr>
        </table>

        <!-- Key Metrics Banner -->
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse; background-color:#f3f4f6; border:0.75pt solid #d1d5db; margin-bottom:9pt; page-break-inside:avoid; break-inside:avoid;">
          <tr>
            <td width="25%" style="text-align:center; padding:5.5pt 4pt;">
              <div style="font-size:9pt; font-weight:bold; color:#0f172a;">${esc(customInfo.experienceYears || '2')}+ Yrs</div>
              <div style="font-size:7.5pt; font-weight:600; color:#334155;">Experience</div>
            </td>
            <td width="25%" style="text-align:center; padding:5.5pt 4pt;">
              <div style="font-size:9pt; font-weight:bold; color:#0f172a;">150+</div>
              <div style="font-size:7.5pt; font-weight:600; color:#334155;">Test Cases</div>
            </td>
            <td width="25%" style="text-align:center; padding:5.5pt 4pt;">
              <div style="font-size:9pt; font-weight:bold; color:#0f172a;">100+</div>
              <div style="font-size:7.5pt; font-weight:600; color:#334155;">Bugs Logged</div>
            </td>
            <td width="25%" style="text-align:center; padding:5.5pt 4pt;">
              <div style="font-size:9pt; font-weight:bold; color:#0f172a;">0%</div>
              <div style="font-size:7.5pt; font-weight:600; color:#334155;">Error Rate</div>
            </td>
          </tr>
        </table>

        <!-- Career Objective -->
        <div style="margin-bottom:9pt; page-break-inside:avoid; break-inside:avoid;">
          ${renderSectionHeading('Career Objective')}
          <p style="margin:0; font-size:8pt; color:#111827; line-height:1.44; text-align:left;">${esc(activeCareerObjective)}</p>
        </div>

        <!-- Leadership & Technical Capabilities -->
        <div style="margin-bottom:9pt; page-break-inside:avoid; break-inside:avoid;">
          ${renderSectionHeading('Leadership & Technical Capabilities')}
          ${renderTwoColGrid(
            SKILL_CATEGORIES,
            (c) => `
              <div style="font-size:8pt; line-height:1.38;">
                <span style="font-weight:bold; color:#0f172a;">${esc(c.category)}: </span>
                <span style="color:#1e293b; font-weight:500;">${esc(c.items.join(', '))}</span>
              </div>
            `,
            12
          )}
        </div>

        <!-- Professional Career History -->
        <div style="margin-bottom:9pt;">
          ${renderSectionHeading('Professional Career History')}
          ${renderExperienceItems()}
        </div>

        <!-- Key Deliverables & Projects -->
        ${
          selectedProjects.length > 0
            ? `<div style="margin-bottom:9pt;">
                ${renderSectionHeading('Key Deliverables & Projects')}
                ${selectedProjects
                  .map(
                    (p) => `
                    <div style="margin-bottom:5pt; page-break-inside:avoid; break-inside:avoid;">
                      <table width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse; margin-bottom:1.5pt;">
                        <tr>
                          <td style="text-align:left; vertical-align:top; font-size:8pt; font-weight:bold; color:#0f172a;">${esc(p.title)}</td>
                          <td style="text-align:right; vertical-align:top; white-space:nowrap;">
                            ${
                              p.link
                                ? `<a href="${esc(normalizeUrl(p.link))}" style="font-size:7.5pt; font-weight:600; color:#0a66c2; text-decoration:underline;">GitHub Repo</a>`
                                : ''
                            }
                          </td>
                        </tr>
                      </table>
                      <p style="margin:0; font-size:8pt; color:#1e293b; line-height:1.4; text-align:left;">${esc(p.description)}</p>
                    </div>
                  `
                  )
                  .join('')}
              </div>`
            : ''
        }

        ${renderEducationBlock('Education', false)}
        ${renderReferencesBlock('References')}
      `;
    } else if (template === 'portfolio-style') {
      bodyMarkup = `
        <!-- Portfolio Style Header -->
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse; margin-bottom:9pt; border-bottom:1.5pt solid #f97316; page-break-inside:avoid; break-inside:avoid;">
          <tr>
            <td style="text-align:left; vertical-align:top; padding:0 10pt 7pt 0;">
              <div style="font-size:16pt; font-weight:bold; color:#0f172a; line-height:1.2; margin:0 0 2pt 0;">${esc(customInfo.name)}</div>
              <div style="font-size:8.5pt; font-weight:bold; text-transform:uppercase; color:#ea580c; margin:0 0 2pt 0;">${esc(customInfo.title)}</div>
              <div style="font-size:8pt; font-weight:500; color:#334155;">${esc(customInfo.location)}</div>
            </td>
            <td style="text-align:right; vertical-align:top; white-space:nowrap; font-size:7.5pt; color:#111827; line-height:1.45; padding:0 0 7pt 0;">
              <div><a href="mailto:${esc(customInfo.email)}" style="color:#0f172a; font-weight:bold; text-decoration:none;">${esc(customInfo.email)}</a></div>
              <div><a href="tel:${esc(customInfo.phone)}" style="color:#0f172a; text-decoration:none;">${esc(customInfo.phone)}</a></div>
              <div style="font-weight:600; padding-top:1pt;">
                <a href="${esc(linkedinUrl)}" style="color:#0a66c2; text-decoration:underline;">LinkedIn</a>
                &nbsp;|&nbsp;
                <a href="${esc(githubUrl)}" style="color:#0f172a; text-decoration:underline;">GitHub</a>
                &nbsp;|&nbsp;
                <a href="${esc(portfolioUrl)}" style="color:#c2410c; text-decoration:underline;">Portfolio</a>
              </div>
            </td>
          </tr>
        </table>

        <!-- Career Objective -->
        <div style="margin-bottom:9pt; page-break-inside:avoid; break-inside:avoid;">
          ${renderSectionHeading('Career Objective')}
          <p style="margin:0; font-size:8pt; color:#111827; line-height:1.44; text-align:left;">${esc(activeCareerObjective)}</p>
        </div>

        <!-- SQA Toolkit & Capabilities -->
        <div style="margin-bottom:9pt; page-break-inside:avoid; break-inside:avoid;">
          ${renderSectionHeading('SQA Toolkit & Capabilities')}
          <table width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse;">
            ${SKILL_CATEGORIES.map(
              (cat) => `
              <tr>
                <td width="118pt" style="width:118pt; vertical-align:top; font-size:8pt; font-weight:bold; color:#0f172a; padding:0 8pt 3pt 0; line-height:1.38;">${esc(cat.category)}:</td>
                <td style="vertical-align:top; font-size:8pt; color:#1e293b; padding:0 0 3pt 0; line-height:1.38;">${esc(cat.items.join(', '))}</td>
              </tr>
            `
            ).join('')}
          </table>
        </div>

        <!-- Experience & STLC Workflow -->
        <div style="margin-bottom:9pt;">
          ${renderSectionHeading('Experience & STLC Workflow')}
          ${renderExperienceItems()}
        </div>

        <!-- Verified Automation & QA Repositories -->
        ${
          selectedProjects.length > 0
            ? `<div style="margin-bottom:9pt;">
                ${renderSectionHeading('Verified Automation & QA Repositories')}
                ${selectedProjects
                  .map(
                    (p) => `
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse; background-color:#ffffff; border:0.75pt solid #cbd5e1; margin-bottom:4.5pt; page-break-inside:avoid; break-inside:avoid;">
                      <tr>
                        <td style="padding:5pt 7pt; vertical-align:top;">
                          <table width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse; margin-bottom:2pt;">
                            <tr>
                              <td style="text-align:left; vertical-align:top; font-size:8pt; font-weight:bold; color:#0f172a;">${esc(p.title)}</td>
                              <td style="text-align:right; vertical-align:top; white-space:nowrap;">
                                <span style="font-size:7pt; font-weight:bold; color:#1d4ed8;">${esc(p.type)}</span>
                                ${
                                  p.link
                                    ? `&nbsp;&nbsp;<a href="${esc(normalizeUrl(p.link))}" style="font-size:7.5pt; font-weight:600; color:#0a66c2; text-decoration:underline;">GitHub</a>`
                                    : ''
                                }
                              </td>
                            </tr>
                          </table>
                          <p style="margin:0; font-size:8pt; color:#1e293b; line-height:1.38; text-align:left;">${esc(p.description)}</p>
                        </td>
                      </tr>
                    </table>
                  `
                  )
                  .join('')}
              </div>`
            : ''
        }

        ${renderEducationBlock('Education', false)}
        ${renderReferencesBlock('References')}
      `;
    } else {
      // classic-ats (DEFAULT)
      bodyMarkup = `
        <!-- Classic ATS Centered Header -->
        <div style="text-align:center; margin-bottom:9pt; page-break-inside:avoid; break-inside:avoid;">
          <div style="font-size:16pt; font-weight:bold; text-transform:uppercase; color:#0f172a; line-height:1.2; margin:0 0 2pt 0;">${esc(customInfo.name)}</div>
          <div style="font-size:8.5pt; font-weight:bold; text-transform:uppercase; letter-spacing:0.35pt; color:#1e293b; margin:0 0 3pt 0;">${esc(customInfo.title)}</div>
          <div style="font-size:8pt; font-weight:500; color:#1e293b; margin:0 0 2.5pt 0;">
            ${customInfo.location ? `${esc(customInfo.location)} &nbsp;|&nbsp; ` : ''}
            <a href="tel:${esc(customInfo.phone)}" style="color:#0f172a; font-weight:600; text-decoration:none;">${esc(customInfo.phone)}</a>
            &nbsp;|&nbsp;
            <a href="mailto:${esc(customInfo.email)}" style="color:#0f172a; font-weight:600; text-decoration:none;">${esc(customInfo.email)}</a>
          </div>
          <div style="font-size:8pt; color:#1e293b; padding-bottom:6pt; border-bottom:1.15pt solid #0f172a;">
            LinkedIn: <a href="${esc(linkedinUrl)}" style="color:#0a66c2; font-weight:600; text-decoration:underline;">View Profile</a>
            &nbsp;|&nbsp;
            GitHub: <a href="${esc(githubUrl)}" style="color:#0f172a; font-weight:600; text-decoration:underline;">Repositories</a>
            &nbsp;|&nbsp;
            Portfolio: <a href="${esc(portfolioUrl)}" style="color:#c2410c; font-weight:600; text-decoration:underline;">Live Portfolio</a>
          </div>
        </div>

        <!-- Career Objective -->
        <div style="margin-bottom:9pt; page-break-inside:avoid; break-inside:avoid;">
          ${renderSectionHeading('Career Objective')}
          <p style="margin:0; font-size:8pt; color:#111827; line-height:1.44; text-align:left;">${esc(activeCareerObjective)}</p>
        </div>

        <!-- Technical Skills & Core Competencies -->
        <div style="margin-bottom:9pt; page-break-inside:avoid; break-inside:avoid;">
          ${renderSectionHeading('Technical Skills & Core Competencies')}
          <table width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse;">
            ${SKILL_CATEGORIES.map(
              (cat) => `
              <tr>
                <td width="118pt" style="width:118pt; vertical-align:top; font-size:8pt; font-weight:bold; color:#0f172a; padding:0 8pt 3pt 0; line-height:1.4;">${esc(cat.category)}:</td>
                <td style="vertical-align:top; font-size:8pt; color:#1e293b; padding:0 0 3pt 0; line-height:1.4;">${esc(cat.items.join(', '))}</td>
              </tr>
            `
            ).join('')}
          </table>
        </div>

        <!-- Professional Experience -->
        <div style="margin-bottom:9pt;">
          ${renderSectionHeading('Professional Experience')}
          ${renderExperienceItems()}
        </div>

        <!-- Featured SQA Automation & Testing Projects -->
        ${
          selectedProjects.length > 0
            ? `<div style="margin-bottom:9pt;">
                ${renderSectionHeading('Featured SQA Automation & Testing Projects')}
                ${selectedProjects
                  .map(
                    (proj) => `
                    <div style="margin-bottom:6pt; page-break-inside:avoid; break-inside:avoid;">
                      <table width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse; margin-bottom:1.5pt;">
                        <tr>
                          <td style="text-align:left; vertical-align:top; font-size:8pt; font-weight:bold; color:#0f172a;">
                            ${esc(proj.title)} <span style="font-size:7.2pt; font-weight:600; color:#475569;">(${esc(proj.type)})</span>
                          </td>
                          <td style="text-align:right; vertical-align:top; white-space:nowrap;">
                            ${
                              proj.link
                                ? `<a href="${esc(normalizeUrl(proj.link))}" style="font-size:7.5pt; font-weight:600; color:#0a66c2; text-decoration:underline;">GitHub Repo</a>`
                                : ''
                            }
                          </td>
                        </tr>
                      </table>
                      <p style="margin:0 0 1.5pt 0; font-size:8pt; color:#1e293b; line-height:1.4; text-align:left;">${esc(proj.description)}</p>
                      ${
                        proj.tags && proj.tags.length > 0
                          ? `<p style="margin:0; font-size:7.5pt; color:#334155; line-height:1.35;">
                              <span style="font-weight:bold; color:#0f172a;">Tools:</span> ${esc(proj.tags.join(' • '))}
                            </p>`
                          : ''
                      }
                    </div>
                  `
                  )
                  .join('')}
              </div>`
            : ''
        }

        ${renderEducationBlock('Education & Certifications', true)}
        ${renderReferencesBlock('Professional References')}
      `;
    }

    return `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office'
      xmlns:w='urn:schemas-microsoft-com:office:word'
      xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>${esc(customInfo.name)} - SQA Engineer Resume</title>
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
      size: 595.3pt 841.9pt; /* A4 Portrait matching PDF */
      margin: 34.0pt 36.85pt 34.0pt 36.85pt; /* 12mm top/bottom, 13mm left/right matching PDF */
      mso-header-margin: 24.0pt;
      mso-footer-margin: 24.0pt;
      mso-paper-source: 0;
    }
    div.Section1 { page: Section1; }
    body {
      font-family: ${activeFontStack};
      font-size: 8pt;
      line-height: 1.42;
      color: #111827;
      background-color: #ffffff;
      margin: 0;
      padding: 0;
    }
    p, div, td, li, span {
      font-family: ${activeFontStack};
    }
  </style>
</head>
<body>
  <div class="Section1">
    ${bodyMarkup}
  </div>
</body>
</html>`;
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
  const handleCopyPlainText = async () => {
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

    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
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

  const handleCopyCoverLetter = async () => {
    const ok = await copyToClipboard(generatedCoverLetter);
    if (ok) {
      setCopiedCover(true);
      setTimeout(() => setCopiedCover(false), 2000);
    }
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
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          <button
            type="button"
            onClick={handleDownloadDOCX}
            className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-200 text-xs font-mono font-semibold transition-colors cursor-pointer"
            title="Download formatted Word resume (.doc / .docx compatible, no layout breaks)"
          >
            <FileText className="w-3.5 h-3.5 text-blue-300" />
            <span>Word (.doc)</span>
          </button>

          <button
            type="button"
            onClick={handleOpenPrintPreview}
            className="flex items-center space-x-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-mono font-semibold transition-colors cursor-pointer"
            title="Preview exact A4 pages, Print, or Save PDF"
          >
            <Printer className="w-3.5 h-3.5 text-amber-300" />
            <span>Print / PDF</span>
          </button>

          <button
            type="button"
            onClick={() => setPdfQualityMode((prev) => (prev === 'under-1mb' ? 'normal' : 'under-1mb'))}
            className={`hidden md:flex items-center space-x-1.5 px-2.5 py-1.5 sm:py-2 rounded-lg border text-[11px] font-mono font-bold transition-colors cursor-pointer ${
              pdfQualityMode === 'under-1mb'
                ? 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-400/40 text-emerald-300'
                : 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-400/40 text-amber-200'
            }`}
            title="Switch between Under 1MB compressed PDF and Normal Full Quality PDF"
          >
            <span>{pdfQualityMode === 'under-1mb' ? 'Limit <1MB: ON' : 'Normal Size: ON'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={isExportingPdf}
            className="flex items-center space-x-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-accent-ink,#060911)] text-xs font-mono font-bold shadow-lg shadow-[var(--color-accent)]/20 transition-all cursor-pointer disabled:opacity-50"
            title={
              pdfQualityMode === 'under-1mb'
                ? 'Download PDF strictly under 1MB with clickable links'
                : 'Download Normal Full Quality PDF (1MB limit OFF) with clickable links'
            }
          >
            <Download className="w-3.5 h-3.5" />
            <span>
              {isExportingPdf
                ? 'Exporting...'
                : pdfQualityMode === 'under-1mb'
                ? 'Download PDF (<1MB)'
                : 'Download PDF (Normal)'}
            </span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer ml-1 sm:ml-2"
            title="Close Resume Builder"
            aria-label="Close Resume Builder"
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
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`py-2 rounded-lg text-center transition-colors cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-[var(--color-accent)] text-[var(--color-accent-ink,#060911)] font-extrabold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Template
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('projects-filter')}
              className={`py-2 rounded-lg text-center transition-colors cursor-pointer relative ${
                activeTab === 'projects-filter'
                  ? 'bg-[var(--color-accent)] text-[var(--color-accent-ink,#060911)] font-extrabold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Projects
              <span
                className={`ml-1 text-[9px] px-1 rounded-full ${
                  activeTab === 'projects-filter'
                    ? 'bg-black/20 text-[var(--color-accent-ink,#060911)] font-bold'
                    : 'bg-white/15 text-slate-200'
                }`}
              >
                {selectedProjectIds.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ats-score')}
              className={`py-2 rounded-lg text-center transition-colors cursor-pointer ${
                activeTab === 'ats-score'
                  ? 'bg-[var(--color-accent)] text-[var(--color-accent-ink,#060911)] font-extrabold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              ATS ({atsAnalysis.totalScore}%)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('cover-letter')}
              className={`py-2 rounded-lg text-center transition-colors cursor-pointer ${
                activeTab === 'cover-letter'
                  ? 'bg-[var(--color-accent)] text-[var(--color-accent-ink,#060911)] font-extrabold'
                  : 'text-slate-300 hover:text-white'
              }`}
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
                          ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-[var(--color-accent-ink,#060911)] font-bold shadow-sm'
                          : 'bg-[#12151C] border-white/10 text-slate-200 hover:text-white hover:border-white/25'
                      }`}
                    >
                      <span className="block text-xs font-bold leading-tight">{f.label}</span>
                      <span
                        className={`block text-[9px] mt-0.5 ${
                          fontFamily === f.id
                            ? 'text-[var(--color-accent-ink,#060911)]/80 font-semibold'
                            : 'text-slate-400'
                        }`}
                      >
                        {f.sub}
                      </span>
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

              {/* Extra Download Options & PDF Size/Quality Switcher */}
              <div className="pt-2 border-t border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono text-slate-200 font-bold uppercase">Export Formats &amp; PDF Size</label>
                  <span className="text-[10px] font-mono text-emerald-400 font-semibold">PDF &amp; Word Ready</span>
                </div>

                {/* Toggleable PDF Size & Quality Mode */}
                <div className="p-2.5 rounded-xl bg-[#12151C] border border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-200 font-semibold">PDF Size &amp; Quality Mode</span>
                    {lastPdfInfo && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                        Last: {lastPdfInfo.sizeLabel}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
                    <button
                      type="button"
                      onClick={() => setPdfQualityMode('under-1mb')}
                      className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                        pdfQualityMode === 'under-1mb'
                          ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-[var(--color-accent-ink,#060911)] font-bold shadow-sm'
                          : 'bg-[#0B0D12] border-white/10 text-slate-200 hover:border-white/25 hover:text-white'
                      }`}
                    >
                      <span className="block text-xs font-bold leading-tight">Under 1 MB</span>
                      <span
                        className={`block text-[9px] mt-0.5 ${
                          pdfQualityMode === 'under-1mb'
                            ? 'text-[var(--color-accent-ink,#060911)]/80 font-semibold'
                            : 'text-slate-400'
                        }`}
                      >
                        1MB Cap ON • Portal Safe
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPdfQualityMode('normal')}
                      className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                        pdfQualityMode === 'normal'
                          ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-[var(--color-accent-ink,#060911)] font-bold shadow-sm'
                          : 'bg-[#0B0D12] border-white/10 text-slate-200 hover:border-white/25 hover:text-white'
                      }`}
                    >
                      <span className="block text-xs font-bold leading-tight">Normal Quality</span>
                      <span
                        className={`block text-[9px] mt-0.5 ${
                          pdfQualityMode === 'normal'
                            ? 'text-[var(--color-accent-ink,#060911)]/80 font-semibold'
                            : 'text-slate-400'
                        }`}
                      >
                        1MB Cap OFF • 2.5x HD
                      </span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadDOCX}
                    className="w-full flex items-center justify-between py-2 px-3 bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/35 rounded-lg text-xs font-mono text-blue-100 transition-colors cursor-pointer text-left"
                    title="Clean ATS table layout that never breaks in Word"
                  >
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-blue-300 shrink-0" />
                      <div>
                        <div className="font-bold text-white">Download Word (.doc)</div>
                        <div className="text-[10px] text-blue-200">Zero layout break • Native MS Word tables</div>
                      </div>
                    </div>
                    <Download className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadPDF}
                    disabled={isExportingPdf}
                    className="w-full flex items-center justify-between py-2 px-3 bg-[var(--color-accent)]/15 hover:bg-[var(--color-accent)]/25 border border-[var(--color-accent)]/40 rounded-lg text-xs font-mono text-white transition-colors cursor-pointer text-left disabled:opacity-50"
                    title={
                      pdfQualityMode === 'under-1mb'
                        ? 'Direct PDF download with clickable links and strictly under 1MB size'
                        : 'Direct PDF download at full 2.5x normal high quality without 1MB compression'
                    }
                  >
                    <div className="flex items-center space-x-2">
                      <Download className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
                      <div>
                        <div className="font-bold text-white">
                          {isExportingPdf
                            ? 'Generating PDF...'
                            : pdfQualityMode === 'under-1mb'
                            ? 'Direct PDF (< 1MB)'
                            : 'Direct PDF (Normal Size)'}
                        </div>
                        <div className="text-[10px] text-slate-200">
                          {pdfQualityMode === 'under-1mb'
                            ? 'Clickable links • Compressed under 1MB'
                            : 'Clickable links • 2.5x Ultra-Sharp Quality'}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] bg-[var(--color-accent)] px-1.5 py-0.5 rounded text-[var(--color-accent-ink,#060911)] font-bold shrink-0">
                      {pdfQualityMode === 'under-1mb' ? '<1MB' : 'HD Full'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="w-full flex items-center justify-between py-2 px-3 bg-white/10 hover:bg-white/15 border border-white/15 rounded-lg text-xs font-mono text-slate-100 transition-colors cursor-pointer text-left"
                    title="Use browser print dialog to save 100% Vector PDF"
                  >
                    <div className="flex items-center space-x-2">
                      <Printer className="w-4 h-4 text-amber-300 shrink-0" />
                      <div>
                        <div className="font-bold text-white">Print / Vector PDF</div>
                        <div className="text-[10px] text-slate-300">Ctrl+P • 100% Vector &amp; Selectable Text</div>
                      </div>
                    </div>
                    <span className="text-[10px] bg-amber-400/20 px-1.5 py-0.5 rounded text-amber-200 font-bold shrink-0">Vector</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyPlainText}
                    className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-[#12151C] hover:bg-white/10 border border-white/15 rounded-lg text-xs font-mono text-white transition-colors cursor-pointer"
                  >
                    {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-300" />}
                    <span>{copiedText ? 'Copied to Clipboard!' : 'Copy Plain Text ATS'}</span>
                  </button>
                </div>

                {/* Suggestions / Advice Box */}
                <div className="mt-2 p-2.5 rounded-lg bg-white/5 border border-white/10 text-[11px] font-sans text-slate-200 space-y-1.5 leading-relaxed">
                  <div className="font-bold font-mono text-xs text-amber-300 flex items-center gap-1">
                    <span>💡 Quality &amp; Format Advice:</span>
                  </div>
                  <ul className="space-y-1 text-[10.5px] text-slate-200 list-disc list-inside">
                    <li><strong className="text-white">PDF (&lt;1MB / Normal):</strong> Toggle between strict &lt;1MB portal upload mode and full uncompressed HD quality anytime. All links stay active &amp; clickable.</li>
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
                          <Square className="w-4 h-4 text-slate-400" />
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
                  type="button"
                  onClick={handleCopyCoverLetter}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-accent-ink,#060911)] rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shadow-lg"
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
                  <div style={{ height: '1.5px', backgroundColor: '#0f172a', width: '100%', marginTop: '3px' }} />
                </div>

                {/* Career Objective */}
                <div className="cv-keep-together mb-3.5">
                  <div className="cv-section-heading mb-1.5">
                    <h2 className="text-[11px] font-bold uppercase text-[#0f172a] leading-[1.45] pb-1.5">Career Objective</h2>
                    <div style={{ height: '1.5px', backgroundColor: '#0f172a', width: '100%', marginTop: '2px' }} />
                  </div>
                  <p className="text-[10.5px] text-[#111827] leading-[1.44] text-left">{activeCareerObjective}</p>
                </div>

                {/* Technical Skills */}
                <div className="cv-keep-together mb-3.5">
                  <div className="cv-section-heading mb-1.5">
                    <h2 className="text-[11px] font-bold uppercase text-[#0f172a] leading-[1.45] pb-1.5">Technical Skills &amp; Core Competencies</h2>
                    <div style={{ height: '1.5px', backgroundColor: '#0f172a', width: '100%', marginTop: '2px' }} />
                  </div>
                  <div className="text-[10.5px]">
                    {SKILL_CATEGORIES.map((cat) => (
                      <div key={cat.category} className="cv-pdf-item grid grid-cols-[155px_1fr] gap-x-3 items-start leading-[1.4] mb-1">
                        <span className="font-bold text-[#0f172a]">{cat.category}:</span>
                        <span className="text-[#1e293b]">{cat.items.join(', ')}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Professional Experience */}
                <div className="mb-3.5">
                  <div className="cv-section-heading mb-1.5">
                    <h2 className="text-[11px] font-bold uppercase text-[#0f172a] leading-[1.45] pb-1.5">Professional Experience</h2>
                    <div style={{ height: '1.5px', backgroundColor: '#0f172a', width: '100%', marginTop: '2px' }} />
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
                      <h2 className="text-[11px] font-bold uppercase text-[#0f172a] leading-[1.45] pb-1.5">Featured SQA Automation &amp; Testing Projects</h2>
                      <div style={{ height: '1.5px', backgroundColor: '#0f172a', width: '100%', marginTop: '2px' }} />
                    </div>
                    {selectedProjects.map((proj) => (
                      <div key={proj.id} className="cv-keep-together cv-pdf-item text-[10.5px] mb-2">
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
                        {proj.tags && proj.tags.length > 0 && (
                          <p className="text-[10px] text-[#334155] leading-[1.35]">
                            <span className="font-bold text-[#0f172a]">Tools:</span> {proj.tags.join(' • ')}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Education */}
                <div className="cv-keep-together mb-3.5">
                  <div className="cv-section-heading mb-1.5">
                    <h2 className="text-[11px] font-bold uppercase text-[#0f172a] leading-[1.45] pb-1.5">Education &amp; Certifications</h2>
                    <div style={{ height: '1.5px', backgroundColor: '#0f172a', width: '100%', marginTop: '2px' }} />
                  </div>
                  {EDUCATION_HISTORY.map((edu) => (
                    <div key={edu.id} className="cv-pdf-item text-[10.5px] mb-1.5">
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
                  <div className="cv-keep-together pb-1">
                    <div className="cv-section-heading mb-1.5">
                      <h2 className="text-[11px] font-bold uppercase text-[#0f172a] leading-[1.45] pb-1.5">Professional References</h2>
                      <div style={{ height: '1.5px', backgroundColor: '#0f172a', width: '100%', marginTop: '2px' }} />
                    </div>
                    <div className="cv-refs-grid grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 pb-1">
                      {portfolioReferences.map((ref) => (
                        <div key={ref.id} className="cv-pdf-item text-[10px] text-[#111827] leading-[1.38] pb-0.5">
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
                    <div key={edu.id} className="cv-pdf-item flex justify-between items-start gap-4 text-[10.5px] mb-1">
                      <div>
                        <span className="font-bold" style={{ color: '#0f172a' }}>{edu.degree}</span> <span className="font-medium" style={{ color: '#334155' }}>— {edu.institution}</span>
                      </div>
                      <span className="text-[10px] font-bold shrink-0 whitespace-nowrap tabular-nums" style={{ color: '#334155' }}>{edu.period}</span>
                    </div>
                  ))}
                </div>

                {/* References */}
                {portfolioReferences.length > 0 && (
                  <div className="cv-keep-together pb-1">
                    <h2 className="cv-section-heading text-[11px] font-bold uppercase border-l-4 pl-2.5 mb-1.5 leading-[1.3]" style={{ color: '#0f172a', borderColor: '#f59e0b' }}>References</h2>
                    <div className="cv-refs-grid grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 pb-1">
                      {portfolioReferences.map((ref) => (
                        <div key={ref.id} className="cv-pdf-item text-[10px] leading-[1.38] pb-0.5" style={{ color: '#111827' }}>
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
                    <div key={edu.id} className="cv-pdf-item flex justify-between items-start gap-4 text-[10.5px] text-[#111827] font-medium mb-1">
                      <span><span className="font-bold text-[#0f172a]">{edu.degree}</span> — {edu.institution}</span>
                      <span className="text-[10px] font-bold shrink-0 whitespace-nowrap tabular-nums">{edu.period}</span>
                    </div>
                  ))}
                </div>

                {portfolioReferences.length > 0 && (
                  <div className="cv-keep-together pb-1">
                    <h2 className="cv-section-heading text-[11px] font-bold uppercase text-[#0f172a] mb-1">References</h2>
                    <div className="cv-refs-grid grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 pb-1">
                      {portfolioReferences.map((ref) => (
                        <div key={ref.id} className="cv-pdf-item text-[10px] text-[#111827] leading-[1.38] pb-0.5">
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
                    <h2 className="text-[11px] font-bold uppercase text-[#0f172a] leading-[1.45] pb-1.5">Career Objective</h2>
                    <div style={{ height: '1.5px', backgroundColor: '#0f172a', width: '100%', marginTop: '2px' }} />
                  </div>
                  <p className="text-[10.5px] text-[#111827] leading-[1.44] text-left">{activeCareerObjective}</p>
                </div>

                <div className="cv-keep-together mb-3.5">
                  <div className="cv-section-heading mb-1.5">
                    <h2 className="text-[11px] font-bold uppercase text-[#0f172a] leading-[1.45] pb-1.5">Leadership &amp; Technical Capabilities</h2>
                    <div style={{ height: '1.5px', backgroundColor: '#0f172a', width: '100%', marginTop: '2px' }} />
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10.5px] items-start">
                    {SKILL_CATEGORIES.map((c) => (
                      <div key={c.category} className="cv-pdf-item leading-[1.38]">
                        <span className="font-bold text-[#0f172a]">{c.category}: </span>
                        <span className="text-[#1e293b] font-medium">{c.items.join(', ')}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-3.5">
                  <div className="cv-section-heading mb-1.5">
                    <h2 className="text-[11px] font-bold uppercase text-[#0f172a] leading-[1.45] pb-1.5">Professional Career History</h2>
                    <div style={{ height: '1.5px', backgroundColor: '#0f172a', width: '100%', marginTop: '2px' }} />
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
                      <h2 className="text-[11px] font-bold uppercase text-[#0f172a] leading-[1.45] pb-1.5">Key Deliverables &amp; Projects</h2>
                      <div style={{ height: '1.5px', backgroundColor: '#0f172a', width: '100%', marginTop: '2px' }} />
                    </div>
                    {selectedProjects.map((p) => (
                      <div key={p.id} className="cv-keep-together cv-pdf-item text-[10.5px] mb-1.5">
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
                    <h2 className="text-[11px] font-bold uppercase text-[#0f172a] leading-[1.45] pb-1.5">Education</h2>
                    <div style={{ height: '1.5px', backgroundColor: '#0f172a', width: '100%', marginTop: '2px' }} />
                  </div>
                  {EDUCATION_HISTORY.map((e) => (
                    <div key={e.id} className="cv-pdf-item flex justify-between items-start gap-4 text-[10.5px] text-[#111827] mb-1">
                      <span><span className="font-bold text-[#0f172a]">{e.degree}</span> — {e.institution}</span>
                      <span className="text-[10px] font-bold shrink-0 whitespace-nowrap tabular-nums">{e.period}</span>
                    </div>
                  ))}
                </div>

                {portfolioReferences.length > 0 && (
                  <div className="cv-keep-together pb-1">
                    <div className="cv-section-heading mb-1.5">
                      <h2 className="text-[11px] font-bold uppercase text-[#0f172a] leading-[1.45] pb-1.5">References</h2>
                      <div style={{ height: '1.5px', backgroundColor: '#0f172a', width: '100%', marginTop: '2px' }} />
                    </div>
                    <div className="cv-refs-grid grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 pb-1">
                      {portfolioReferences.map((ref) => (
                        <div key={ref.id} className="cv-pdf-item text-[10px] text-[#111827] leading-[1.38] pb-0.5">
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
                      className="cv-pdf-item flex justify-between items-start gap-4 text-[10.5px] text-[#111827] font-medium mb-1"
                    >
                      <span>
                        <span className="font-bold text-[#0f172a]">{edu.degree}</span> <span className="font-semibold text-[#334155]">— {edu.institution}</span>
                      </span>
                      <span className="text-[10px] font-bold shrink-0 whitespace-nowrap tabular-nums">{edu.period}</span>
                    </div>
                  ))}
                </div>

                {portfolioReferences.length > 0 && (
                  <div className="cv-keep-together pb-1">
                    <h2 className="cv-section-heading text-[11px] font-bold uppercase mb-1" style={{ color: '#ea580c' }}>References</h2>
                    <div className="cv-refs-grid grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 pb-1">
                      {portfolioReferences.map((ref) => (
                        <div key={ref.id} className="cv-pdf-item text-[10px] text-[#111827] leading-[1.38] pb-0.5">
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

      <PrintPreviewModal
        isOpen={isPrintPreviewOpen}
        onClose={() => setIsPrintPreviewOpen(false)}
        title="ATS Resume"
        fileName={`${getCvBaseFileName()}.pdf`}
        pages={printPreviewPages}
        margin={[12, 13, 12, 13]}
        isLoading={isGeneratingPrintPreview}
        isExportingPdf={isExportingPdf}
        pdfQualityMode={pdfQualityMode}
        onTogglePdfQualityMode={() =>
          setPdfQualityMode((prev) => (prev === 'under-1mb' ? 'normal' : 'under-1mb'))
        }
        onDownloadPdf={handleDownloadPDF}
        onPrintNow={handlePrint}
        lastPdfInfo={lastPdfInfo}
      />
    </div>
  );
}
