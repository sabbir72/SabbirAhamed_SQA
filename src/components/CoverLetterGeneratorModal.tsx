import { useState, useRef, useMemo, useEffect, FormEvent } from 'react';
import { 
  X, Sparkles, Send, Copy, Check, Printer, Download, Edit3, Eye, 
  RotateCcw, FileText, CheckCircle2, AlertTriangle, Lightbulb, 
  Building2, Briefcase, Calendar, MapPin, Globe, UserCheck, 
  ChevronRight, Bookmark, Trash2, Award, ArrowRight, Type, ExternalLink, Lock
} from 'lucide-react';
import { PERSONAL_INFO, SKILL_CATEGORIES, WORK_EXPERIENCE, PROJECTS, EDUCATION_HISTORY } from '../data';
import { isAdminAuthenticated } from '../utils/adminAuth';
import AdminPasscodeModal from './AdminPasscodeModal';
import html2pdf from 'html2pdf.js';

interface CoverLetterGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCompany?: string;
  initialJobTitle?: string;
}

export type CoverLetterTone = 'professional' | 'formal' | 'enthusiastic';
export type CoverLetterTemplate = 'modern-executive' | 'classic-corporate' | 'minimalist-tech';
export type CoverLetterFontFamily = 'serif' | 'modern' | 'corporate';

function normalizeUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function renderTextWithLinks(text: string) {
  const regex = /(SQA Portfolio \(Click Here\)|Portfolio \(Click Here\)|GitHub \(Click Here\)|LinkedIn \(Click Here\)|Click Here)/gi;
  const tokens = text.split(regex);
  return tokens.map((token, i) => {
    const lower = token.toLowerCase();
    if (lower.includes('linkedin')) {
      return (
        <a
          key={i}
          href={normalizeUrl(PERSONAL_INFO.linkedin)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#0a66c2] hover:underline font-semibold"
          style={{ color: '#0a66c2', textDecoration: 'underline' }}
        >
          {token}
        </a>
      );
    }
    if (lower.includes('github')) {
      return (
        <a
          key={i}
          href={normalizeUrl(PERSONAL_INFO.github)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#111827] hover:underline font-semibold"
          style={{ color: '#111827', textDecoration: 'underline' }}
        >
          {token}
        </a>
      );
    }
    if (lower.includes('portfolio')) {
      return (
        <a
          key={i}
          href={normalizeUrl(typeof window !== 'undefined' ? window.location.origin : 'https://sabbirahamed.dev')}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#ea580c] hover:underline font-semibold"
          style={{ color: '#ea580c', textDecoration: 'underline' }}
        >
          {token}
        </a>
      );
    }
    if (lower === 'click here') {
      return (
        <a
          key={i}
          href={normalizeUrl(PERSONAL_INFO.github)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#0a66c2] hover:underline font-semibold"
          style={{ color: '#0a66c2', textDecoration: 'underline' }}
        >
          {token}
        </a>
      );
    }
    return token;
  });
}

export interface SavedCoverLetter {
  id: string;
  companyName: string;
  jobTitle: string;
  hiringManager: string;
  date: string;
  content: string;
  matchScore: number;
  tone: CoverLetterTone;
  createdAt: string;
}

export default function CoverLetterGeneratorModal({ 
  isOpen, 
  onClose,
  initialCompany = '',
  initialJobTitle = '' 
}: CoverLetterGeneratorModalProps) {
  // Form State (Only required / optional user inputs)
  const [companyName, setCompanyName] = useState(initialCompany || 'Tech Solutions Inc.');
  const [jobTitle, setJobTitle] = useState(initialJobTitle || 'Software Quality Assurance Engineer');
  const [hiringManager, setHiringManager] = useState('Hiring Manager');
  const [date, setDate] = useState(
    new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  );
  const [companyLocation, setCompanyLocation] = useState('Remote / Dhaka');
  const [jobDescription, setJobDescription] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');

  // Config State
  const [tone, setTone] = useState<CoverLetterTone>('professional');
  const [template, setTemplate] = useState<CoverLetterTemplate>('modern-executive');
  const [fontFamily, setFontFamily] = useState<CoverLetterFontFamily>('serif');
  const [isEditing, setIsEditing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [customContent, setCustomContent] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState<boolean>(() => isAdminAuthenticated());
  const [isPasscodeModalOpen, setIsPasscodeModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleAuth = () => {
      setIsAdmin(isAdminAuthenticated());
    };
    window.addEventListener('admin_auth_changed', handleAuth);
    return () => window.removeEventListener('admin_auth_changed', handleAuth);
  }, []);

  // UI Feedback State
  const [copied, setCopied] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [savedLetters, setSavedLetters] = useState<SavedCoverLetter[]>([]);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'match-score' | 'history'>('preview');

  const printRef = useRef<HTMLDivElement>(null);

  // Auto-Detect Role Type for specialized SQA emphasis
  const detectedRoleCategory = useMemo(() => {
    const combinedText = `${jobTitle} ${jobDescription}`.toLowerCase();
    if (combinedText.includes('automation') || combinedText.includes('playwright') || combinedText.includes('selenium') || combinedText.includes('pytest')) {
      return 'automation';
    } else if (combinedText.includes('api') || combinedText.includes('postman') || combinedText.includes('rest') || combinedText.includes('endpoint')) {
      return 'api';
    } else if (combinedText.includes('manual') || combinedText.includes('test case') || combinedText.includes('stlc') || combinedText.includes('jira')) {
      return 'manual';
    }
    return 'general';
  }, [jobTitle, jobDescription]);

  // Generate Intelligent Cover Letter Content
  const generateLetterText = (
    cName: string, 
    jTitle: string, 
    hMgr: string, 
    dt: string, 
    loc: string, 
    tne: CoverLetterTone, 
    roleCat: string
  ): string => {
    const managerGreeting = hMgr.trim() ? `Dear ${hMgr},` : 'Dear Hiring Manager,';
    
    // Greeting & Intro Paragraph
    let intro = '';
    if (tne === 'formal') {
      intro = `I am submitting this letter to formally express my strong interest in the ${jTitle} position at ${cName}. With over two years of dedicated experience in Software Quality Assurance at Altersense Ltd, I have developed extensive competence in end-to-end testing, REST API validation, and automated test scripting.`;
    } else if (tne === 'enthusiastic') {
      intro = `I was thrilled to learn about the ${jTitle} opportunity at ${cName}! As an SQA Engineer with a proven track record of shipping reliable, bug-free applications at Altersense Ltd, I am inspired by ${cName}'s technical vision and eager to bring my quality assurance testing toolkit to your team.`;
    } else {
      // Professional (Default)
      intro = `I am writing to express my strong enthusiasm for the ${jTitle} position at ${cName}. With over 2 years of hands-on Software Quality Assurance experience at Altersense Ltd, I bring deep expertise across manual test planning, REST API verification, and UI automation using Playwright (Python).`;
    }

    // Technical Focus Paragraph based on SQA Role Category
    let techFocus = '';
    if (roleCat === 'automation') {
      techFocus = `In my SQA engineering workflow, I specialize in UI and E2E test automation using Playwright (Python), Pytest, and Page Object Model (POM) architecture. I have built automated test suites that cut regression execution time significantly, integrated test suites with GitHub Actions CI/CD pipelines, and produced rich Allure test reports for cross-functional engineering visibility.`;
    } else if (roleCat === 'api') {
      techFocus = `My core QA strengths focus heavily on REST API Testing and backend validation. Using Postman and Newman CLI, I design automated test collections, validate HTTP status response codes, verify JSON schemas, and chain environment variables. Furthermore, I perform SQL query verifications to ensure backend database integrity matches API responses.`;
    } else if (roleCat === 'manual') {
      techFocus = `Throughout my software quality career, I strictly follow SDLC and STLC methodologies. I excel at converting complex functional requirements into 150+ granular test cases, executing smoke, functional, and exploratory testing across ERP and web applications, and reporting detailed, reproducible defects in Jira.`;
    } else {
      techFocus = `My testing approach bridges rigorous manual verification with modern automation. At Altersense Ltd, I manage the complete testing life cycle—writing detailed test cases, performing regression testing, validating REST API endpoints with Postman, and developing automated web test scripts in Playwright with Python.`;
    }

    // Projects & Value Highlight Paragraph
    const projectHighlight = `In my live SQA Portfolio (Click Here), I have documented verified testing repositories with source code available on GitHub (Click Here). Key projects include an automated eCommerce E2E Playwright Python Suite, a comprehensive REST API Postman Collection with automated assertions, and a Live SQA Bug Reporting & Test Management System. You may also view my verified credentials on LinkedIn (Click Here).`;

    // Closing Paragraph
    let closing = '';
    if (tne === 'formal') {
      closing = `Thank you for taking the time to review my application for ${cName}. I welcome the opportunity to discuss how my quality assurance qualifications and technical rigor align with your software development goals.`;
    } else if (tne === 'enthusiastic') {
      closing = `I would love the opportunity to discuss how my testing methodology and passion for high-quality software can contribute to ${cName}'s continued success. Thank you for your time and consideration!`;
    } else {
      closing = `I am confident that my QA methodologies and automation enthusiasm make me a strong candidate for ${cName}. Thank you for your consideration, and I welcome the chance to speak with you regarding this opportunity.`;
    }

    return `${PERSONAL_INFO.name}
${PERSONAL_INFO.location}
${PERSONAL_INFO.email} | ${PERSONAL_INFO.phone}
${PERSONAL_INFO.linkedin} | ${PERSONAL_INFO.github}

${dt}

${hMgr}
${cName}
${loc ? loc : ''}

Subject: Application for ${jTitle} Position

${managerGreeting}

${intro}

${techFocus}

${projectHighlight}

${closing}

Sincerely,

${PERSONAL_INFO.name}
${PERSONAL_INFO.title}`;
  };

  // Compute Auto-Generated Letter
  const defaultLetterContent = useMemo(() => {
    return generateLetterText(
      companyName || 'Company Name',
      jobTitle || 'Software QA Engineer',
      hiringManager || 'Hiring Manager',
      date,
      companyLocation,
      tone,
      detectedRoleCategory
    );
  }, [companyName, jobTitle, hiringManager, date, companyLocation, tone, detectedRoleCategory]);

  const activeLetterText = customContent || defaultLetterContent;

  // Calculate ATS Job Description Match Analysis
  const matchAnalysis = useMemo(() => {
    const jdText = (jobDescription + ' ' + jobTitle).toLowerCase();
    
    // Core SQA skills in portfolio
    const portfolioSkills = [
      { name: 'Manual Testing', category: 'Testing', found: true },
      { name: 'Playwright (Python)', category: 'Automation', found: true },
      { name: 'Postman & REST API', category: 'API', found: true },
      { name: 'STLC / SDLC', category: 'Methodology', found: true },
      { name: 'Jira Defect Tracking', category: 'Tools', found: true },
      { name: 'SQL & Database Testing', category: 'Backend', found: true },
      { name: 'Regression Testing', category: 'Testing', found: true },
      { name: 'Pytest & POM Architecture', category: 'Automation', found: true },
      { name: 'GitHub Actions CI/CD', category: 'DevOps', found: true },
      { name: 'Newman CLI', category: 'API', found: true }
    ];

    // Check JD matches
    let matchCount = 0;
    const totalChecks = 8;

    const matchedSkillsList: string[] = [];
    const missingSkillsList: string[] = [];

    const keySkillMap: { [key: string]: string } = {
      'playwright': 'Playwright Automation',
      'python': 'Python Test Scripts',
      'api': 'REST API Testing (Postman)',
      'manual': 'Manual Test Cases',
      'jira': 'Jira Defect Tracking',
      'sql': 'SQL Queries & Validation',
      'pytest': 'Pytest Framework',
      'ci/cd': 'GitHub Actions CI/CD',
      'stlc': 'STLC & Agile Methodology',
      'regression': 'Regression Testing'
    };

    Object.keys(keySkillMap).forEach(key => {
      if (jdText.includes(key) || !jobDescription) {
        matchedSkillsList.push(keySkillMap[key]);
        matchCount++;
      }
    });

    // Detect if JD mentions tools not explicit in portfolio
    if (jdText.includes('cypress')) missingSkillsList.push('Cypress (Mention Playwright adaptability)');
    if (jdText.includes('selenium')) missingSkillsList.push('Selenium (Highlight Python test automation background)');
    if (jdText.includes('jmeter') || jdText.includes('performance')) missingSkillsList.push('JMeter / Performance Testing');
    if (jdText.includes('appium') || jdText.includes('mobile')) missingSkillsList.push('Appium Mobile Testing');

    const score = Math.min(96, Math.max(78, Math.round(75 + (matchedSkillsList.length * 2.5))));

    const suggestions = [
      `Emphasize your ${detectedRoleCategory.toUpperCase()} testing experience in the first paragraph.`,
      `Highlight your 150+ written test cases and zero critical post-release bugs metric.`,
      `Mention your GitHub repo links for Playwright Python & Postman collections.`
    ];

    if (missingSkillsList.length > 0) {
      suggestions.push(`Address ${missingSkillsList[0].split(' ')[0]} by expressing fast adaptability in framework concepts.`);
    }

    return {
      score,
      matchedSkills: matchedSkillsList.length > 0 ? matchedSkillsList : ['Manual Testing', 'REST API Validation', 'Playwright Python', 'Jira', 'SQL'],
      missingSkills: missingSkillsList,
      suggestions
    };
  }, [jobDescription, jobTitle, detectedRoleCategory]);

  // Handlers
  const handleGenerate = () => {
    if (!isAdminAuthenticated()) {
      setIsPasscodeModalOpen(true);
      return;
    }
    setIsGenerating(true);
    setTimeout(() => {
      const generated = generateLetterText(
        companyName || 'Target Company',
        jobTitle || 'Software QA Engineer',
        hiringManager || 'Hiring Manager',
        date,
        companyLocation,
        tone,
        detectedRoleCategory
      );
      setCustomContent(generated);
      setIsGenerating(false);
      setActiveTab('preview');
    }, 600);
  };

  const handleCopy = () => {
    if (!isAdminAuthenticated()) {
      setIsPasscodeModalOpen(true);
      return;
    }
    navigator.clipboard.writeText(activeLetterText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Browser Print trigger with dedicated isolated iframe for A4 print/PDF output
  const handlePrint = () => {
    if (!isAdminAuthenticated()) {
      setIsPasscodeModalOpen(true);
      return;
    }
    try {
      window.focus();
      const element = printRef.current;
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
              <title>${PERSONAL_INFO.name.replace(/[^a-zA-Z0-9 ]/g, '')} - Cover Letter (${companyName.replace(/[^a-zA-Z0-9 ]/g, '')})</title>
              ${styleSheets}
              <style>
                @page { size: A4 portrait; margin: 12mm 15mm; }
                body {
                  background-color: #ffffff !important;
                  color: #111827 !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                .print-cover-letter-root {
                  width: 100% !important;
                  max-width: 100% !important;
                  box-shadow: none !important;
                  border: none !important;
                  background: #ffffff !important;
                  color: #111827 !important;
                  padding: 0 !important;
                  margin: 0 !important;
                }
              </style>
            </head>
            <body>
              <div class="print-cover-letter-root">
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

  const handleDownloadPdf = () => {
    if (!isAdminAuthenticated()) {
      setIsPasscodeModalOpen(true);
      return;
    }
    if (!printRef.current) return;
    setIsExportingPdf(true);

    const element = printRef.current;
    const opt = {
      margin: [15, 15, 15, 15] as [number, number, number, number],
      filename: `${PERSONAL_INFO.name.replace(/\s+/g, '_')}_Cover_Letter_${companyName.replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        logging: false,
        onclone: (clonedDoc: Document) => {
          // Strip or replace oklch functions in all style tags to prevent html2canvas CSS parser crash
          const styles = clonedDoc.querySelectorAll('style');
          styles.forEach((styleTag) => {
            if (styleTag.innerHTML && styleTag.innerHTML.includes('oklch')) {
              styleTag.innerHTML = styleTag.innerHTML.replace(/oklch\([^)]+\)/g, '#111827');
            }
          });

          const root = clonedDoc.querySelector('.print-cover-letter-root') as HTMLElement | null;
          if (root) {
            root.style.backgroundColor = '#ffffff';
            root.style.color = '#111827';
            root.style.border = 'none';
            root.style.boxShadow = 'none';
            root.style.borderRadius = '0px';
            root.style.padding = '0px';
            const allEls = root.querySelectorAll('*');
            allEls.forEach((el) => {
              const htmlEl = el as HTMLElement;
              const style = window.getComputedStyle(htmlEl);
              if (style.color && style.color.includes('oklch')) {
                htmlEl.style.color = '#111827';
              }
              if (style.backgroundColor && style.backgroundColor.includes('oklch')) {
                htmlEl.style.backgroundColor = '#ffffff';
              }
              if (style.borderColor && style.borderColor.includes('oklch')) {
                htmlEl.style.borderColor = '#e5e7eb';
              }
            });
          }
        }
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      enableLinks: true
    };

    html2pdf().set(opt).from(element).save().then(() => {
      setIsExportingPdf(false);
    }).catch((err: unknown) => {
      console.error('PDF export error:', err);
      setIsExportingPdf(false);
      window.print();
    });
  };

  const handleSaveToHistory = () => {
    if (!isAdminAuthenticated()) {
      setIsPasscodeModalOpen(true);
      return;
    }
    const newEntry: SavedCoverLetter = {
      id: Date.now().toString(),
      companyName: companyName || 'Company',
      jobTitle: jobTitle || 'SQA Role',
      hiringManager,
      date,
      content: activeLetterText,
      matchScore: matchAnalysis.score,
      tone,
      createdAt: new Date().toLocaleDateString()
    };
    setSavedLetters(prev => [newEntry, ...prev]);
    setActiveTab('history');
  };

  const handleDeleteSaved = (id: string) => {
    setSavedLetters(prev => prev.filter(item => item.id !== id));
  };

  if (!isOpen) return null;

  if (!isAdmin) {
    return (
      <>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md bg-[#12151C] border border-blue-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl text-white space-y-6 text-center">
            <div className="inline-flex p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 mx-auto">
              <Lock className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="font-display font-extrabold text-xl text-white">
                Admin Authentication Required
              </h3>
              <p className="text-xs font-mono text-[#9CA3AF] leading-relaxed">
                Only the verified portfolio administrator (Sabbir Ahamed) has permission to generate, customize, or download tailored Cover Letters.
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
                className="flex-1 py-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold shadow-lg shadow-blue-600/25 transition-all cursor-pointer flex items-center justify-center space-x-2"
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
            title="Cover Letter Admin Verification"
            description="Enter your Admin Security Passcode to generate and download customized Cover Letters."
          />
        )}
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/85 backdrop-blur-md flex flex-col justify-between animate-fadeIn">
      
      {/* Top Modal Header */}
      <div className="bg-[#12151C] border-b border-white/10 px-4 sm:px-6 py-3 flex items-center justify-between no-print z-20">
        <div className="flex items-center space-x-3">
          <div className="bg-[#FF6B35]/15 p-2 rounded-xl border border-[#FF6B35]/30 text-[#FF6B35]">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="font-display font-bold text-base sm:text-lg text-white flex items-center gap-2">
              <span>AI Cover Letter Generator & ATS Matcher</span>
              <span className="text-[10px] font-mono font-bold uppercase bg-[#FF6B35]/10 text-[#FF6B35] border border-[#FF6B35]/30 px-2 py-0.5 rounded-full">
                Auto-Synced
              </span>
            </h2>
            <p className="text-xs text-[#9CA3AF] hidden sm:block">
              Generates tailored, recruiter-friendly SQA cover letters & calculates Job Description match score.
            </p>
          </div>
        </div>

        {/* Action Header Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-mono font-medium transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#FF6B35]" />}
            <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy Text'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-mono font-medium transition-colors cursor-pointer"
            title="Print or Save to PDF"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span>Print / PDF</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
            className="flex items-center space-x-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-[#FF6B35] hover:bg-[#FF814F] text-white text-xs font-mono font-bold shadow-lg shadow-[#FF6B35]/25 transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExportingPdf ? 'Exporting...' : 'Download PDF'}</span>
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors cursor-pointer ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Body Grid */}
      <div className="flex-grow overflow-hidden flex flex-col md:flex-row relative">
        
        {/* LEFT PANEL: Inputs & AI Options */}
        <div className="w-full md:w-80 lg:w-96 bg-[#0B0D12] border-r border-white/10 flex flex-col overflow-y-auto p-4 space-y-5 no-print max-h-[40vh] md:max-h-none shrink-0">
          
          {/* Navigation Control Tabs */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-[#12151C] rounded-xl border border-white/10 text-xs font-mono">
            <button
              onClick={() => setActiveTab('preview')}
              className={`py-2 rounded-lg text-center transition-colors cursor-pointer ${activeTab === 'preview' ? 'bg-[#FF6B35] text-white font-bold' : 'text-[#9CA3AF] hover:text-white'}`}
            >
              Preview
            </button>
            <button
              onClick={() => setActiveTab('editor')}
              className={`py-2 rounded-lg text-center transition-colors cursor-pointer ${activeTab === 'editor' ? 'bg-[#FF6B35] text-white font-bold' : 'text-[#9CA3AF] hover:text-white'}`}
            >
              Inputs
            </button>
            <button
              onClick={() => setActiveTab('match-score')}
              className={`py-2 rounded-lg text-center transition-colors cursor-pointer ${activeTab === 'match-score' ? 'bg-[#FF6B35] text-white font-bold' : 'text-[#9CA3AF] hover:text-white'}`}
            >
              Match ({matchAnalysis.score}%)
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-2 rounded-lg text-center transition-colors cursor-pointer ${activeTab === 'history' ? 'bg-[#FF6B35] text-white font-bold' : 'text-[#9CA3AF] hover:text-white'}`}
            >
              Saved ({savedLetters.length})
            </button>
          </div>

          {/* Form Inputs & AI Tone Panel */}
          <div className="space-y-4">
            
            <div className="p-3 rounded-xl bg-[#12151C] border border-white/10 space-y-1">
              <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider block">
                ✓ Auto-Loaded Portfolio Profile
              </span>
              <p className="text-xs font-bold text-white">{PERSONAL_INFO.name} • {PERSONAL_INFO.title}</p>
              <p className="text-[11px] text-[#9CA3AF] font-mono">{PERSONAL_INFO.email} | {PERSONAL_INFO.phone}</p>
            </div>

            {/* Inputs Section */}
            <div className="space-y-3">
              <label className="text-xs font-mono text-[#FF6B35] uppercase font-bold tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                <span>Target Job Details</span>
              </label>

              {/* Company Name (Required) */}
              <div>
                <label className="text-[11px] text-[#D1D5DB] font-mono block mb-1">
                  Company Name <span className="text-[#FF6B35]">*</span>
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Google, Square Health, Meta"
                  className="w-full px-3 py-2 rounded-xl bg-[#12151C] border border-white/10 text-white text-xs focus:border-[#FF6B35] focus:outline-none"
                />
              </div>

              {/* Position / Job Title (Required) */}
              <div>
                <label className="text-[11px] text-[#D1D5DB] font-mono block mb-1">
                  Position / Job Title <span className="text-[#FF6B35]">*</span>
                </label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Software QA Engineer, Automation Lead"
                  className="w-full px-3 py-2 rounded-xl bg-[#12151C] border border-white/10 text-white text-xs focus:border-[#FF6B35] focus:outline-none"
                />
              </div>

              {/* Hiring Manager Name (Optional) */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-[#9CA3AF] font-mono block mb-1">Hiring Manager</label>
                  <input
                    type="text"
                    value={hiringManager}
                    onChange={(e) => setHiringManager(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full px-3 py-2 rounded-xl bg-[#12151C] border border-white/10 text-white text-xs focus:border-[#FF6B35] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#9CA3AF] font-mono block mb-1">Date</label>
                  <input
                    type="text"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#12151C] border border-white/10 text-white text-xs focus:border-[#FF6B35] focus:outline-none"
                  />
                </div>
              </div>

              {/* Location & Website (Optional) */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-[#9CA3AF] font-mono block mb-1">Company Location</label>
                  <input
                    type="text"
                    value={companyLocation}
                    onChange={(e) => setCompanyLocation(e.target.value)}
                    placeholder="e.g. Remote / Dhaka"
                    className="w-full px-3 py-2 rounded-xl bg-[#12151C] border border-white/10 text-white text-xs focus:border-[#FF6B35] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#9CA3AF] font-mono block mb-1">Website (Optional)</label>
                  <input
                    type="text"
                    value={companyWebsite}
                    onChange={(e) => setCompanyWebsite(e.target.value)}
                    placeholder="e.g. company.com"
                    className="w-full px-3 py-2 rounded-xl bg-[#12151C] border border-white/10 text-white text-xs focus:border-[#FF6B35] focus:outline-none"
                  />
                </div>
              </div>

              {/* Job Description (Optional - For AI ATS Match Analysis) */}
              <div>
                <label className="text-[11px] text-[#D1D5DB] font-mono block mb-1 flex items-center justify-between">
                  <span>Job Description (Optional for AI Match Analysis)</span>
                  <span className="text-[9px] text-[#FF6B35] font-normal">Auto Keyword Scan</span>
                </label>
                <textarea
                  rows={3}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste job posting text here to calculate match score & highlight relevant skills..."
                  className="w-full px-3 py-2 rounded-xl bg-[#12151C] border border-white/10 text-white text-xs focus:border-[#FF6B35] focus:outline-none resize-none font-sans"
                />
              </div>

            </div>

            {/* AI Writing Style & Tone Selector */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <label className="text-xs font-mono text-[#FF6B35] uppercase font-bold tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Tone & Template</span>
              </label>

              <div className="grid grid-cols-3 gap-1.5 font-mono text-xs">
                {[
                  { id: 'professional', label: 'Professional' },
                  { id: 'formal', label: 'Formal' },
                  { id: 'enthusiastic', label: 'Enthusiastic' }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTone(t.id as CoverLetterTone)}
                    className={`py-2 px-1 rounded-lg border text-center transition-all cursor-pointer ${
                      tone === t.id 
                        ? 'bg-[#FF6B35] border-[#FF6B35] text-white font-bold' 
                        : 'bg-[#12151C] border-white/5 text-[#9CA3AF] hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Cover Letter Template Selector */}
              <div className="grid grid-cols-3 gap-1.5 font-mono text-[11px] pt-1">
                {[
                  { id: 'modern-executive', label: 'Modern' },
                  { id: 'classic-corporate', label: 'Classic' },
                  { id: 'minimalist-tech', label: 'Minimal' }
                ].map((tmpl) => (
                  <button
                    key={tmpl.id}
                    onClick={() => setTemplate(tmpl.id as CoverLetterTemplate)}
                    className={`py-1.5 px-1 rounded-lg border text-center transition-all cursor-pointer ${
                      template === tmpl.id 
                        ? 'bg-blue-600 border-blue-500 text-white font-bold' 
                        : 'bg-[#12151C] border-white/5 text-[#9CA3AF] hover:text-white'
                    }`}
                  >
                    {tmpl.label}
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
                  { id: 'serif', label: 'Exec Serif', sub: 'Merriweather' },
                  { id: 'modern', label: 'Modern Sans', sub: 'Inter / Calibri' },
                  { id: 'corporate', label: 'Corporate', sub: 'Source Sans' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFontFamily(f.id as CoverLetterFontFamily)}
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
              <p className="text-[10.5px] text-[#9CA3AF] font-mono leading-relaxed">
                ✓ Hyperlinks for LinkedIn, GitHub, and Portfolio are natively interactive in the exported PDF and printout.
              </p>
            </div>

            {/* Trigger AI Generator Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !companyName.trim() || !jobTitle.trim()}
              className="w-full py-3.5 bg-[#FF6B35] hover:bg-[#FF814F] text-white font-bold text-xs font-mono rounded-xl flex items-center justify-center space-x-2 transition-all shadow-lg shadow-[#FF6B35]/25 cursor-pointer disabled:opacity-50 shimmer"
            >
              {isGenerating ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>AI Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Cover Letter with AI</span>
                </>
              )}
            </button>

            {/* Save to History Button */}
            <button
              onClick={handleSaveToHistory}
              className="w-full py-2.5 bg-[#12151C] hover:bg-white/10 text-white font-mono text-xs rounded-xl border border-white/10 flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <Bookmark className="w-3.5 h-3.5 text-amber-400" />
              <span>Save Letter to History</span>
            </button>

          </div>

        </div>

        {/* RIGHT PANEL: Live A4 Preview & Match Analysis */}
        <div className="flex-1 bg-[#1A1D26] overflow-y-auto p-4 sm:p-8 flex justify-center items-start">
          
          {/* TAB 1 & 2: LIVE A4 PREVIEW OR EDITABLE TEXTAREA */}
          {(activeTab === 'preview' || activeTab === 'editor') && (
            <div className="w-full max-w-[210mm] space-y-4">
              
              {/* Preview Control Toolbar */}
              <div className="flex items-center justify-between no-print bg-[#12151C] p-3 rounded-2xl border border-white/10 text-xs font-mono">
                <div className="flex items-center space-x-3">
                  <span className="text-[#9CA3AF]">Mode:</span>
                  <button
                    onClick={() => setIsEditing(false)}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${!isEditing ? 'bg-[#FF6B35] text-white font-bold' : 'text-[#9CA3AF] hover:text-white'}`}
                  >
                    A4 Visual Preview
                  </button>
                  <button
                    onClick={() => setIsEditing(true)}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${isEditing ? 'bg-[#FF6B35] text-white font-bold' : 'text-[#9CA3AF] hover:text-white'}`}
                  >
                    Edit Text
                  </button>
                </div>

                <div className="flex items-center space-x-2 text-[11px] text-emerald-400 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Ready for A4 Print / PDF</span>
                </div>
              </div>

              {/* Editable Text Area Mode */}
              {isEditing ? (
                <div className="p-6 bg-white rounded-2xl shadow-2xl space-y-3 border border-gray-300">
                  <label className="text-xs font-mono text-gray-700 font-bold block">
                    Edit Cover Letter Text Directly:
                  </label>
                  <textarea
                    rows={22}
                    value={customContent || activeLetterText}
                    onChange={(e) => setCustomContent(e.target.value)}
                    className="w-full p-4 rounded-xl border border-gray-300 text-gray-900 text-sm font-sans leading-relaxed focus:outline-none focus:border-blue-600 resize-none font-mono"
                  />
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setCustomContent(defaultLetterContent)}
                      className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-mono transition-colors cursor-pointer"
                    >
                      Reset to AI Default
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-5 py-2 rounded-xl bg-[#FF6B35] hover:bg-[#FF814F] text-white text-xs font-mono font-bold transition-all cursor-pointer"
                    >
                      Done Editing
                    </button>
                  </div>
                </div>
              ) : (
                /* Standard Rendered A4 Printable View */
                <div 
                  ref={printRef}
                  className={`print-cover-letter-root bg-white text-gray-900 p-8 sm:p-12 rounded-lg shadow-2xl border border-gray-200 min-h-[297mm] flex flex-col justify-between leading-relaxed text-sm select-text ${
                    fontFamily === 'serif' ? 'font-ats-serif' : fontFamily === 'corporate' ? 'font-ats-corporate' : 'font-ats-modern'
                  }`}
                  style={{ backgroundColor: '#ffffff', color: '#111827' }}
                >
                  
                  <div className="space-y-6">
                    
                    {/* Modern Executive Header */}
                    {template === 'modern-executive' && (
                      <div className="border-b-2 border-orange-500 pb-4 mb-4 flex justify-between items-start">
                        <div>
                          <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight" style={{ color: '#111827' }}>
                            {PERSONAL_INFO.name}
                          </h1>
                          <p className="text-xs font-bold text-orange-600 font-mono uppercase tracking-wider mt-0.5" style={{ color: '#ea580c' }}>
                            {PERSONAL_INFO.title}
                          </p>
                        </div>
                        <div className="text-right text-[11px] text-gray-600 font-mono space-y-0.5" style={{ color: '#4b5563' }}>
                          <p>{PERSONAL_INFO.location}</p>
                          <p className="font-semibold text-gray-900" style={{ color: '#111827' }}>
                            <a href={`mailto:${PERSONAL_INFO.email}`} className="hover:underline">{PERSONAL_INFO.email}</a>
                          </p>
                          <p>
                            <a href={`tel:${PERSONAL_INFO.phone}`} className="hover:underline">{PERSONAL_INFO.phone}</a>
                          </p>
                          <div className="pt-0.5 space-x-2 text-[10.5px]">
                            <a href={normalizeUrl(PERSONAL_INFO.linkedin)} target="_blank" rel="noopener noreferrer" className="text-[#0a66c2] hover:underline font-semibold" style={{ color: '#0a66c2', textDecoration: 'underline' }}>LinkedIn (Click Here)</a>
                            <span>•</span>
                            <a href={normalizeUrl(PERSONAL_INFO.github)} target="_blank" rel="noopener noreferrer" className="text-gray-900 hover:underline font-semibold" style={{ color: '#111827', textDecoration: 'underline' }}>GitHub (Click Here)</a>
                            <span>•</span>
                            <a href={normalizeUrl(typeof window !== 'undefined' ? window.location.origin : 'https://sabbirahamed.dev')} target="_blank" rel="noopener noreferrer" className="text-[#ea580c] hover:underline font-semibold" style={{ color: '#ea580c', textDecoration: 'underline' }}>Portfolio (Click Here)</a>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Classic Corporate Header */}
                    {template === 'classic-corporate' && (
                      <div className="text-center border-b border-gray-300 pb-4 mb-4 space-y-1">
                        <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-wider" style={{ color: '#111827' }}>
                          {PERSONAL_INFO.name}
                        </h1>
                        <p className="text-xs text-gray-600 font-mono" style={{ color: '#4b5563' }}>
                          {PERSONAL_INFO.title} • {PERSONAL_INFO.location}
                        </p>
                        <p className="text-xs text-gray-700 font-mono flex items-center justify-center gap-2 flex-wrap" style={{ color: '#374151' }}>
                          <a href={`mailto:${PERSONAL_INFO.email}`} className="hover:underline">{PERSONAL_INFO.email}</a>
                          <span>|</span>
                          <a href={`tel:${PERSONAL_INFO.phone}`} className="hover:underline">{PERSONAL_INFO.phone}</a>
                          <span>|</span>
                          <a href={normalizeUrl(PERSONAL_INFO.linkedin)} target="_blank" rel="noopener noreferrer" className="text-[#0a66c2] hover:underline font-semibold" style={{ color: '#0a66c2', textDecoration: 'underline' }}>LinkedIn (Click Here)</a>
                          <span>|</span>
                          <a href={normalizeUrl(PERSONAL_INFO.github)} target="_blank" rel="noopener noreferrer" className="text-gray-900 hover:underline font-semibold" style={{ color: '#111827', textDecoration: 'underline' }}>GitHub (Click Here)</a>
                          <span>|</span>
                          <a href={normalizeUrl(typeof window !== 'undefined' ? window.location.origin : 'https://sabbirahamed.dev')} target="_blank" rel="noopener noreferrer" className="text-[#ea580c] hover:underline font-semibold" style={{ color: '#ea580c', textDecoration: 'underline' }}>Portfolio (Click Here)</a>
                        </p>
                      </div>
                    )}

                    {/* Minimalist Tech Header */}
                    {template === 'minimalist-tech' && (
                      <div className="border-l-4 border-gray-900 pl-4 py-1 mb-4 space-y-0.5" style={{ borderColor: '#111827' }}>
                        <h1 className="text-xl font-black text-gray-900 uppercase" style={{ color: '#111827' }}>
                          {PERSONAL_INFO.name}
                        </h1>
                        <div className="text-xs font-mono text-gray-600 flex items-center gap-2 flex-wrap pt-0.5" style={{ color: '#4b5563' }}>
                          <span>{PERSONAL_INFO.title}</span>
                          <span>|</span>
                          <a href={`mailto:${PERSONAL_INFO.email}`} className="hover:underline text-gray-800">{PERSONAL_INFO.email}</a>
                          <span>|</span>
                          <a href={`tel:${PERSONAL_INFO.phone}`} className="hover:underline text-gray-800">{PERSONAL_INFO.phone}</a>
                          <span>|</span>
                          <a href={normalizeUrl(PERSONAL_INFO.linkedin)} target="_blank" rel="noopener noreferrer" className="text-[#0a66c2] hover:underline font-semibold" style={{ color: '#0a66c2', textDecoration: 'underline' }}>LinkedIn (Click Here)</a>
                          <span>|</span>
                          <a href={normalizeUrl(PERSONAL_INFO.github)} target="_blank" rel="noopener noreferrer" className="text-gray-900 hover:underline font-semibold" style={{ color: '#111827', textDecoration: 'underline' }}>GitHub (Click Here)</a>
                        </div>
                      </div>
                    )}

                    {/* Date & Recipient Info Block */}
                    <div className="space-y-3 text-xs text-gray-800 font-mono pt-2" style={{ color: '#1f2937' }}>
                      <p className="font-semibold">{date}</p>
                      <div>
                        <p className="font-bold text-gray-900 text-sm" style={{ color: '#111827' }}>{hiringManager || 'Hiring Manager'}</p>
                        <p className="font-bold text-gray-800" style={{ color: '#111827' }}>{companyName}</p>
                        {companyLocation && <p>{companyLocation}</p>}
                        {companyWebsite && <p className="text-gray-500">{companyWebsite}</p>}
                      </div>
                      <p className="font-bold text-gray-900 text-sm pt-2" style={{ color: '#111827' }}>
                        Subject: Application for {jobTitle} Position
                      </p>
                    </div>

                    {/* Cover Letter Body Text */}
                    <div className="text-sm text-gray-800 leading-relaxed space-y-4 pt-2 text-justify" style={{ color: '#1f2937' }}>
                      {activeLetterText.split('\n\n').slice(3, -2).map((paragraph, pIdx) => (
                        <p key={pIdx} className="leading-relaxed">
                          {renderTextWithLinks(paragraph)}
                        </p>
                      ))}
                    </div>

                    {/* Closing & Sign-off */}
                    <div className="pt-4 space-y-2 text-sm text-gray-900" style={{ color: '#111827' }}>
                      <p>Sincerely,</p>
                      <div className="pt-2 font-bold font-display text-base" style={{ color: '#111827' }}>
                        {PERSONAL_INFO.name}
                      </div>
                      <p className="text-xs text-gray-600 font-mono" style={{ color: '#4b5563' }}>
                        {PERSONAL_INFO.title}
                      </p>
                    </div>

                  </div>

                  {/* Clean Page Footer */}
                  <div className="pt-8 border-t border-gray-200 text-[10px] text-gray-500 font-mono flex justify-between items-center" style={{ color: '#6b7280', borderColor: '#e5e7eb' }}>
                    <span>Confidential Cover Letter • Prepared for {companyName}</span>
                    <span>Page 1 of 1</span>
                  </div>

                </div>
              )}

            </div>
          )}

          {/* TAB 3: ATS JOB MATCH SCORE & ANALYSIS */}
          {activeTab === 'match-score' && (
            <div className="w-full max-w-2xl bg-[#12151C] p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6 text-white animate-fadeIn">
              
              {/* Header Match Score Banner */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-2xl bg-[#181C26] border border-white/10 text-center sm:text-left">
                <div>
                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-mono font-bold uppercase mb-2">
                    <Award className="w-3.5 h-3.5" />
                    <span>AI ATS Match Analysis</span>
                  </div>
                  <h3 className="font-display font-extrabold text-2xl text-white">
                    Job Alignment for {companyName || 'Target Company'}
                  </h3>
                  <p className="text-xs text-[#9CA3AF] mt-1 font-light">
                    Role: <span className="text-white font-medium">{jobTitle}</span>
                  </p>
                </div>

                <div className="flex flex-col items-center">
                  <span className="font-display font-black text-5xl text-emerald-400">
                    🎯 {matchAnalysis.score}%
                  </span>
                  <span className="text-[10px] font-mono text-[#D1D5DB] mt-1">Strong Match Score</span>
                </div>
              </div>

              {/* Matched Skills */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Matching Portfolio Skills ({matchAnalysis.matchedSkills.length})</span>
                </h4>
                <div className="flex flex-wrap gap-2 text-xs font-mono">
                  {matchAnalysis.matchedSkills.map((skill, idx) => (
                    <span key={idx} className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                      ✓ {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Missing or Extra Skills */}
              {matchAnalysis.missingSkills.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-white/10">
                  <h4 className="text-xs font-mono text-amber-400 font-bold uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>Recommended Skill Enhancements ({matchAnalysis.missingSkills.length})</span>
                  </h4>
                  <div className="flex flex-wrap gap-2 text-xs font-mono">
                    {matchAnalysis.missingSkills.map((skill, idx) => (
                      <span key={idx} className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
                        ⚠ {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Improvement Suggestions */}
              <div className="space-y-3 pt-2 border-t border-white/10">
                <h4 className="text-xs font-mono text-[#FF6B35] font-bold uppercase tracking-wider flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-[#FF6B35]" />
                  <span>Actionable AI Suggestions to Boost Selection Chance</span>
                </h4>
                <div className="space-y-2 text-xs text-[#D1D5DB]">
                  {matchAnalysis.suggestions.map((tip, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-start space-x-2">
                      <ChevronRight className="w-4 h-4 text-[#FF6B35] shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{tip}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: SAVED COVER LETTERS HISTORY */}
          {activeTab === 'history' && (
            <div className="w-full max-w-2xl bg-[#12151C] p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6 text-white animate-fadeIn">
              <div className="flex justify-between items-center">
                <h3 className="font-display font-extrabold text-2xl text-white">
                  Saved Cover Letters ({savedLetters.length})
                </h3>
                <span className="text-xs font-mono text-[#9CA3AF]">Stored in session</span>
              </div>

              {savedLetters.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <FileText className="w-12 h-12 text-[#9CA3AF]/40 mx-auto" />
                  <p className="text-sm text-[#9CA3AF]">No saved cover letters yet.</p>
                  <p className="text-xs text-[#9CA3AF]/70">Generate a cover letter and click "Save Letter to History".</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedLetters.map((letter) => (
                    <div key={letter.id} className="p-4 rounded-2xl bg-[#181C26] border border-white/10 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-base text-white">{letter.companyName}</h4>
                          <p className="text-xs font-mono text-[#FF6B35]">{letter.jobTitle}</p>
                          <p className="text-[10px] text-[#9CA3AF] font-mono mt-0.5">Saved on {letter.createdAt}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                            {letter.matchScore}% Match
                          </span>
                          <button
                            onClick={() => handleDeleteSaved(letter.id)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-end space-x-2 pt-2 border-t border-white/5">
                        <button
                          onClick={() => {
                            setCustomContent(letter.content);
                            setCompanyName(letter.companyName);
                            setJobTitle(letter.jobTitle);
                            setActiveTab('preview');
                          }}
                          className="px-4 py-1.5 rounded-lg bg-[#FF6B35] text-white font-mono text-xs font-bold cursor-pointer hover:bg-[#FF814F]"
                        >
                          Load & Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
