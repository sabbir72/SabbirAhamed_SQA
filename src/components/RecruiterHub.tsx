import { useState } from 'react';
import { Briefcase, Copy, Check, FileText, Search, Sparkles, UserCheck, Code, Award, MessageSquare, Target, Terminal, ChevronRight, X } from 'lucide-react';
import { PERSONAL_INFO } from '../data';

interface SectionItem {
  id: string;
  title: string;
  category: string;
  content: string | string[];
}

export const RECRUITER_SECTIONS: SectionItem[] = [
  {
    id: 'sec-1',
    title: '1. Professional Headline',
    category: 'Headlines',
    content: 'Software Quality Assurance (SQA) Engineer | Manual & Automated API/UI Testing | Playwright, Cypress, Postman & SQL | SDLC & STLC Specialist'
  },
  {
    id: 'sec-2',
    title: '2. About Me',
    category: 'Bios & Summaries',
    content: 'I am a detail-driven Software Quality Assurance (SQA) Engineer with a B.Sc. in Computer Science & Engineering and 2 years of hands-on experience ensuring software reliability, performance, and cross-browser stability. My expertise spans manual functional testing, API test automation with Postman and Playwright, UI regression testing, and structured defect tracking via Jira. I bridge the gap between business requirements and technical execution, advocating for quality at every stage of the Software Testing Life Cycle (STLC).'
  },
  {
    id: 'sec-3',
    title: '3. Professional Summary',
    category: 'Bios & Summaries',
    content: 'Results-oriented Software Quality Assurance (SQA) Engineer with 2+ years of progressive technical experience across enterprise ERPs, ML data quality control, and fintech web platforms. Highly proficient in designing comprehensive test strategies, writing modular test cases, executing API automation using Postman and Newman, and automating end-to-end web workflows with Playwright Python and Cypress. Demonstrated success in detecting critical edge-case defects early in sprint cycles, lowering post-release regression rates, and streamlining developer feedback loops in Agile/Scrum environments.'
  },
  {
    id: 'sec-4',
    title: '4. Core Competencies',
    category: 'Competencies',
    content: [
      '• Test Planning & Strategy Formulation',
      '• End-to-End Functional & Non-Functional Testing',
      '• REST API Testing & Automation (Postman / Newman)',
      '• Web UI Test Automation (Playwright Python, Cypress)',
      '• Defect Identification, Triage & Jira Management',
      '• Database Verification & Data Integrity Auditing (SQL)',
      '• Performance & Load Baseline Testing (JMeter, BlazeMeter)',
      '• Agile / Scrum Ceremonies & Quality Gatekeeping'
    ]
  },
  {
    id: 'sec-5',
    title: '5. Technical Skills',
    category: 'Technical',
    content: [
      '• Programming Languages: Python, JavaScript, SQL',
      '• Automation Frameworks: Playwright (Python/JS), Cypress (Basic), Selenium WebDriver, TestNG',
      '• API Testing Tools: Postman, Newman CLI, Insomnia, RESTful API Assertions',
      '• Performance & Load Testing: Apache JMeter, BlazeMeter, K6',
      '• Database & Tools: MySQL, PostgreSQL, Git, GitHub, Jira, Excel',
      '• Testing Concepts: STLC, SDLC, Requirement Traceability Matrix (RTM), POM (Page Object Model)'
    ]
  },
  {
    id: 'sec-6',
    title: '6. Testing Expertise',
    category: 'Technical',
    content: [
      '• Manual Functional & Exploratory Sweeps: Exhaustive boundary value analysis, equivalence partitioning, and exploratory edge-case execution across multi-module enterprise systems.',
      '• API Testing & Contract Validation: End-to-end verification of REST endpoints, response payloads, status codes, auth header chaining, and JSON schema assertions.',
      '• Regression & Sanity Suite Execution: Rapid pre-release verification of critical business workflows to prevent code regressions in fast-paced sprint cycles.',
      '• Smoke & Acceptance Testing (UAT): User-story alignment checking and sign-off verification for production deployment readiness.'
    ]
  },
  {
    id: 'sec-7',
    title: '7. Tools & Technologies',
    category: 'Technical',
    content: 'Jira | Confluence | Postman | Newman CLI | Playwright | Cypress | JMeter | BlazeMeter | Git | GitHub | VS Code | MySQL | Python | JavaScript | TestNG | Allure Reports'
  },
  {
    id: 'sec-8',
    title: '8. Strengths',
    category: 'Competencies',
    content: [
      '• Uncompromising Attention to Detail: Exceptional eye for subtle UI inconsistencies, workflow bottlenecks, and unhandled backend edge cases.',
      '• Analytical Problem Solving: Deep root-cause isolation before reporting defects, reducing developer diagnostic turnarounds.',
      '• Cross-Functional Communication: Clear, structured defect reporting with unambiguous steps to reproduce, screenshots, and console logs.',
      '• Adaptability & Fast Learning Curve: Rapidly mastering new automation tools, domain business logic, and testing frameworks.'
    ]
  },
  {
    id: 'sec-9',
    title: '9. Career Objective',
    category: 'Career & Vision',
    content: 'To secure a challenging Software Quality Assurance Engineer role in a progressive technology organization where I can leverage my manual rigor, API automation expertise, and computer science foundation to establish robust quality gates, elevate product reliability, and accelerate zero-defect software releases.'
  },
  {
    id: 'sec-10',
    title: '10. Key Responsibilities',
    category: 'Responsibilities',
    content: [
      '1. Analyze complex business requirements and software specs to design high-coverage test plans and test case suites.',
      '2. Execute manual functional, regression, smoke, and exploratory testing across desktop and mobile browsers.',
      '3. Automate API endpoints and web UI flows using Postman, Newman, and Playwright to expand continuous regression coverage.',
      '4. Log, track, and re-test defects in Jira with complete environment context, logs, and reproducible steps.',
      '5. Perform backend data validation using SQL queries to verify data persistence, schema accuracy, and integrity.',
      '6. Collaborate closely with developers, product managers, and DevOps engineers during Agile sprint planning and retro meetings.'
    ]
  },
  {
    id: 'sec-11',
    title: '11. QA Mindset',
    category: 'Philosophy',
    content: 'Quality is not an afterthought or a final checklist item; it is a continuous engineering discipline integrated into every stage of the software development lifecycle. My QA mindset revolves around destructive empathy—thinking like a user while testing like a breaker—to catch defects before users ever experience them.'
  },
  {
    id: 'sec-12',
    title: '12. Personal Branding Statement',
    category: 'Branding',
    content: '“Empowering engineering teams to ship flawless software faster by blending methodical manual testing rigor with reliable API and UI automation frameworks.”'
  },
  {
    id: 'sec-13',
    title: '13. LinkedIn About Section',
    category: 'Bios & Summaries',
    content: `🔍 Software Quality Assurance (SQA) Engineer | Quality Advocate | API & UI Automation Enthusiast

Hi, I'm Sabbir Ahamed — a passionate SQA Engineer dedicated to building software that users trust and businesses rely on. With a B.Sc. in Computer Science & Engineering and hands-on experience in manual, API, and UI testing, I specialize in identifying software vulnerabilities and edge-case defects before they reach production.

⚡ What I Do:
• Design & execute structured test plans, test cases, and traceability matrices.
• Automate REST APIs using Postman, Newman CLI, and Playwright Python.
• Perform manual exploratory testing across complex ERP modules (Sales, Inventory, HR, Accounts).
• Validate database records using SQL queries and track issues through Jira.
• Conduct load and performance baseline sweeps using Apache JMeter & BlazeMeter.

🎯 Core Toolbelt:
Postman | Playwright | Cypress | Python | JavaScript | SQL | Jira | Git | JMeter | STLC | Agile

Whether it is catching a subtle edge-case crash or automating a 50-step regression suite, I am driven by the impact of zero-defect software releases. Let's connect and discuss how I can bring quality rigor to your engineering team!`
  },
  {
    id: 'sec-14',
    title: '14. Resume Summary',
    category: 'Bios & Summaries',
    content: 'Detail-oriented SQA Engineer (B.Sc. in CSE) with 2+ years of experience across manual functional testing, API test automation, and UI test scripts using Postman, Playwright Python, and Cypress. Proven track record in requirement analysis, structured test case authoring, Jira defect tracking, and backend SQL data verification for enterprise SaaS & ERP applications.'
  },
  {
    id: 'sec-15',
    title: '15. Portfolio Introduction',
    category: 'Branding',
    content: 'Welcome to my interactive SQA Engineering Portfolio. Here, you will find verifiable proof of my quality engineering work—ranging from automated Playwright UI regression suites and Postman API contract testing to JMeter load benchmarks and actual documented defect reports.'
  },
  {
    id: 'sec-16',
    title: '16. Short Bio (50 words)',
    category: 'Bios & Summaries',
    content: 'Sabbir Ahamed is a Software Quality Assurance Engineer with a B.Sc. in Computer Science & Engineering and 2 years of experience in manual, API, and UI testing. Skilled in Postman, Playwright, SQL, and Jira, he specializes in building robust quality processes that ensure reliable, high-performance software delivery.'
  },
  {
    id: 'sec-17',
    title: '17. Medium Bio (120 words)',
    category: 'Bios & Summaries',
    content: 'Sabbir Ahamed is a Software Quality Assurance (SQA) Engineer based in Bangladesh with a B.Sc. in Computer Science & Engineering. Combining 2 years of hands-on experience across manual testing and automation frameworks, Sabbir has verified enterprise ERP modules, machine learning datasets, and web platforms. His expertise includes requirement analysis, API testing with Postman and Newman, UI automation with Playwright Python and Cypress, and database verification with SQL. With a strong grasp of STLC and Agile methodologies, Sabbir collaborates seamlessly with cross-functional development teams to catch defects early, enforce high code quality standards, and ensure smooth, zero-regression software deployments.'
  },
  {
    id: 'sec-18',
    title: '18. Long Bio (250 words)',
    category: 'Bios & Summaries',
    content: 'Sabbir Ahamed is a Software Quality Assurance (SQA) Engineer who believes that world-class software is built on a foundation of unyielding quality and rigorous validation. Holding a B.Sc. in Computer Science & Engineering from Daffodil International University, Sabbir brings a strong technical foundation combined with over 2 years of hands-on experience in manual functional testing, API testing, performance benchmarks, and automated UI regression testing.\n\nThroughout his career at Altersense Ltd and Quantigo AI, Sabbir has played a key role in testing complex ERP software modules—including Inventory, Sales, HR, Accounts, and Manufacturing—as well as leading machine learning data quality control initiatives. He is adept at dissecting complex software specifications to design exhaustive test cases, creating automated REST API collections with Postman and Newman CLI, and building maintainable UI automation scripts using Playwright (Python) and Cypress.\n\nSabbir is proficient in database queries with SQL for backend data integrity checks, defect management using Jira, and continuous integration via GitHub Actions with Allure reporting. An active participant in Agile/Scrum ceremonies, he excels at bridging the communication gap between product requirements and developer execution. Driven by continuous learning, Sabbir is committed to helping software organizations eliminate bugs, elevate user satisfaction, and accelerate continuous deployment cycles through modern, scalable QA practices.'
  },
  {
    id: 'sec-19',
    title: '19. Elevator Pitch (30 seconds)',
    category: 'Pitches',
    content: '“Hi, I’m Sabbir Ahamed, a Software Quality Assurance Engineer with a Computer Science background and 2 years of hands-on experience in manual and automated testing. I specialize in API testing with Postman, UI automation with Playwright, and database validation with SQL. My focus is catching critical edge-case bugs early in the sprint so engineering teams can ship reliable features with complete confidence.”'
  },
  {
    id: 'sec-20',
    title: '20. Elevator Pitch (60 seconds)',
    category: 'Pitches',
    content: '“Hi, I’m Sabbir Ahamed, a Software Quality Assurance Engineer with a B.Sc. in CSE and over 2 years of experience in manual, API, and UI automation testing. In my recent work on enterprise ERP systems, I’ve executed over 150 structured test cases across core business modules, automated REST API endpoints with Postman and Newman CLI, and built UI test suites using Playwright Python.\n\nI don’t just find bugs—I investigate root causes using SQL database queries, document clear reproducible steps in Jira, and work closely with developers to resolve issues before sprint releases. If you’re looking for a proactive QA Engineer who combines manual testing thoroughness with growing automation capabilities, I’d love to contribute to your team.”'
  },
  {
    id: 'sec-21',
    title: '21. Why Should We Hire You?',
    category: 'Pitches',
    content: '“You should hire me because I offer a strong blend of solid computer science fundamentals, 2 years of practical QA experience, and a relentless focus on software reliability. Unlike typical junior candidates, I have proven experience testing multi-module enterprise ERP systems, managing ML data quality pipelines, and writing automated API/UI test scripts. I take ownership of the full defect lifecycle—from root-cause SQL investigation to Jira tracking and developer collaboration. I am quick to adapt, eager to expand my automation suite, and dedicated to protecting your product’s user experience.”'
  },
  {
    id: 'sec-22',
    title: '22. My Testing Philosophy',
    category: 'Philosophy',
    content: '“My testing philosophy rests on three pillars: Early Involvement, Comprehensive Coverage, and Root-Cause Clarity. Testing begins long before code is written—during requirement reviews where edge cases are identified early. Test suites must combine manual exploratory creativity with automated regression speed. And when bugs are found, providing developers with actionable insights, detailed logs, and SQL-backed context is key to rapid resolution.”'
  },
  {
    id: 'sec-23',
    title: '23. Professional Taglines (10 Options)',
    category: 'Headlines',
    content: [
      '1. Safeguarding Software Integrity through Rigorous SQA Practices.',
      '2. Bridging Code and Quality with Manual Rigor & Automated Precision.',
      '3. Catching Bugs Before Your Users Do.',
      '4. Elevating Product Reliability Through Strategic SQA Engineering.',
      '5. Automated Testing. Manual Rigor. Flawless Releases.',
      '6. Turning Software Specifications into Zero-Defect Deliverables.',
      '7. Quality-Driven SQA Engineer Specializing in API & UI Testing.',
      '8. Defending System Stability Across the Software Testing Lifecycle.',
      '9. Precision Testing for Seamless User Experiences.',
      '10. Your Product’s Final Shield Before Production.'
    ]
  },
  {
    id: 'sec-24',
    title: '24. LinkedIn Headlines (20 Options)',
    category: 'Headlines',
    content: [
      '1. Software Quality Assurance (SQA) Engineer | Manual & API Testing | Postman, Playwright, SQL & Jira',
      '2. SQA Engineer | Specializing in API Test Automation, UI Regression & ERP System Testing',
      '3. Junior SQA Engineer | B.Sc. in CSE | Playwright, Cypress, Postman, JMeter & SQL',
      '4. Quality Assurance Engineer | STLC & SDLC | API Automation (Newman) & Defect Management',
      '5. SQA Engineer @ Altersense | Functional Testing, REST API Testing & Bug Tracking in Jira',
      '6. Software QA Engineer | Automated UI Testing (Playwright Python) & Backend Verification (SQL)',
      '7. Passionate SQA Engineer | Manual Testing, Regression Suites & Agile Scrum Advocate',
      '8. SQA Engineer | Elevating Web Application Reliability via Automated & Exploratory Sweeps',
      '9. Junior QA Engineer | B.Sc. CSE Graduate | Postman API Testing | Playwright | MySQL',
      '10. Software Quality Assurance Specialist | Enterprise ERP Testing & ML Data Quality Control',
      '11. SQA Engineer | STLC, Requirements Analysis, Test Case Design & Bug Reporting Specialist',
      '12. QA Engineer | Manual Testing | API Testing (Postman) | Performance Testing (JMeter)',
      '13. Software Tester & QA Engineer | Playwright, Cypress, Postman, SQL & Git',
      '14. SQA Professional | Driving Product Quality through Automated API & Web Regression Suites',
      '15. Software Quality Engineer | Defect Prevention, Agile QA & Test Case Optimization',
      '16. Junior SQA Engineer | Building Scalable Test Plans & Automated UI/API Test Scripts',
      '17. QA Engineer | End-to-End Web & API Testing | Postman, Newman, Playwright & Jira',
      '18. SQA Specialist | Manual Functional Sweeps, SQL Queries & CI/CD Allure Reporting',
      '19. Software Quality Assurance Engineer | Dedicated to Zero-Defect Software Deployments',
      '20. SQA Engineer | B.Sc. in CSE | Playwright Automation | API Contract Validation'
    ]
  },
  {
    id: 'sec-25',
    title: '25. GitHub Bio (10 Options)',
    category: 'Headlines',
    content: [
      '1. SQA Engineer | Automation & Manual Testing | Playwright, Postman, Python & SQL 🧪',
      '2. Software QA Engineer dedicated to building automated test suites & zero-defect web apps 🚀',
      '3. B.Sc. CSE | SQA Engineer testing APIs with Postman & UI with Playwright/Cypress ⚡',
      '4. Quality Assurance Engineer | Playwright Python, Postman Newman, TestNG & Allure 📊',
      '5. SQA Engineer | Breaking code to make it unbreakable 🛡️',
      '6. Automated API & UI Test Suites | Playwright, Cypress, Postman & JMeter 🛠️',
      '7. Junior SQA Engineer | Manual Testing, Bug Reporting & SQL Database Queries 🔍',
      '8. SQA Engineer @ Altersense | Test Case Design, STLC & Agile Testing 📂',
      '9. Crafting maintainable test automation frameworks with Playwright & Postman 💻',
      '10. Software Quality Assurance | Turning specs into bulletproof test suites 🔥'
    ]
  },
  {
    id: 'sec-26',
    title: '26. Freelance / Fiverr / Upwork Profile Summary',
    category: 'Bios & Summaries',
    content: `Need a thorough SQA Engineer to test your web application, REST API, or mobile flow before launch?

Hi! I'm Sabbir Ahamed, a professional Software Quality Assurance Engineer with a B.Sc. in CSE and 2 years of industry experience. I help developers and startup founders launch bug-free software by conducting rigorous manual testing, API validation, and automated UI test suites.

What I can do for your project:
✅ Comprehensive Manual Testing (Functional, Usability, Cross-Browser, Mobile Responsiveness)
✅ Detailed Bug Reports with reproducible steps, screenshots, and screen recordings in Jira/Trello
✅ Professional Test Plan & Test Case Design (Excel/Google Sheets/TestRail)
✅ REST API Testing using Postman (Status codes, payload assertions, environment scripts)
✅ Web UI Automation with Playwright (Python/JS) and Cypress
✅ Basic Performance & Load Testing with Apache JMeter

Why hire me?
• 100% On-time delivery
• Clear, English-fluent communication
• Actionable, easy-to-understand bug reports developers love
Let's discuss your project requirements today!`
  },
  {
    id: 'sec-27',
    title: '27. Cover Letter Introduction',
    category: 'Pitches',
    content: '“Dear Hiring Manager,\n\nI am writing to express my strong interest in the Software Quality Assurance Engineer position at your organization. With a B.Sc. in Computer Science & Engineering and over 2 years of hands-on experience in manual functional testing, API automation using Postman, and UI testing with Playwright, I am eager to bring my quality engineering skillset and meticulous bug-hunting approach to your engineering team.”'
  },
  {
    id: 'sec-28',
    title: '28. Professional Email Signature',
    category: 'Branding',
    content: `Sabbir Ahamed
Software Quality Assurance (SQA) Engineer
B.Sc. in Computer Science & Engineering
📧 sabbircse72@gmail.com | 📱 +8801681387906
📍 Gazipur, Dhaka, Bangladesh
🔗 LinkedIn: linkedin.com/in/Sabbir-ahamed
💻 GitHub: github.com/sabbir72`
  },
  {
    id: 'sec-29',
    title: '29. Keywords for ATS Optimization',
    category: 'ATS Keywords',
    content: 'Software Quality Assurance (SQA), Quality Assurance Engineer, Software Testing Life Cycle (STLC), Software Development Life Cycle (SDLC), Manual Testing, Functional Testing, Regression Testing, Smoke Testing, Sanity Testing, Exploratory Testing, User Acceptance Testing (UAT), Test Case Writing, Test Planning, Requirement Traceability Matrix (RTM), Defect Management, Bug Reporting, Jira, REST API Testing, Postman, Newman CLI, Web Automation, Playwright, Cypress, Selenium, Python, JavaScript, SQL, MySQL, Database Verification, Performance Testing, JMeter, BlazeMeter, Agile, Scrum, Cross-Browser Testing, Allure Reporting, Page Object Model (POM), Git, GitHub.'
  },
  {
    id: 'sec-30',
    title: '30. Interview Self Introduction (English)',
    category: 'Interviews',
    content: '“Hello! My name is Sabbir Ahamed, and I am a Software Quality Assurance Engineer with a B.Sc. in Computer Science & Engineering from Daffodil International University. I have over 2 years of professional experience in software testing, currently working as a Junior SQA Engineer at Altersense Ltd.\n\nIn my current role, I perform manual and API testing on enterprise ERP software covering modules like Sales, Inventory, HR, and Accounts. I author test cases, track defects in Jira, and verify backend data accuracy using SQL. On the automation front, I build API test scripts with Postman and Newman, as well as UI automation scripts using Playwright and Cypress.\n\nI am passionate about quality assurance because I enjoy problem-solving and ensuring that software operates seamlessly for end-users. I am excited about this opportunity because I want to bring my technical skills and QA rigor to your team while continuing to grow as an SQA professional.”'
  },
  {
    id: 'sec-31',
    title: '31. Interview Self Introduction (Bangla)',
    category: 'Interviews',
    content: '“আসসালামু আলাইকুম। আমার নাম সাব্বির আহমেদ। আমি ড্যাফোডিল ইন্টারন্যাশনাল ইউনিভার্সিটি থেকে কম্পিউটার সায়েন্স এন্ড ইঞ্জিনিয়ারিং (CSE)-এ বি.এসসি সম্পন্ন করেছি এবং বর্তমানে অল্টারসেন্স লিমিটেডে জুনিয়র সফটওয়্যার কোয়ালিটি অ্যাসিওরেন্স (SQA) ইঞ্জিনিয়ার হিসেবে কাজ করছি।\n\nআমার প্রায় ২ বছরের অভিজ্ঞতা রয়েছে ম্যানুয়াল এবং অটোমেশন টেস্টিং-এ। আমি এন্টারপ্রাইজ ERP সফটওয়্যার যেমন ইনভেন্টরি, সেলস, অ্যাকাউন্টস ও এইচআর মডিউলের ম্যানুয়াল ফাংশনাল টেস্টিং এবং পোস্টম্যান ও নিউম্যান দিয়ে রেস্ট এপিআই টেস্টিং করি। এর পাশাপাশি প্লেরাইট ও সাইপ্রেস ব্যবহার করে ইউআই অটোমেশন স্ক্রিপ্ট তৈরি করি এবং এসকিউএল দিয়ে ডাটাবেজ ভ্যালিডেশন করে থাকি। জিরা টুলস ব্যবহার করে বাগ রিপোর্ট ও ট্র্যাকিং করা আমার প্রতিদিনের কাজের অংশ।\n\nআমি সবসময় চেষ্টা করি সফটওয়্যারের কোয়ালিটি নিশ্চিত করতে এবং কোনো বাগ যেন প্রোডাকশনে না যায়। আপনাদের টিমে আমার কোয়ালিটি অ্যাসুরেন্স স্কিল যুক্ত করে অবদান রাখার জন্য আমি অত্যন্ত আগ্রহী।”'
  },
  {
    id: 'sec-32',
    title: '32. Professional Achievement Style Statements',
    category: 'Achievements',
    content: [
      '• Executed 150+ structured manual test cases across 6 complex ERP modules, resulting in a 25% reduction in post-release production defects.',
      '• Automated a 50+ endpoint REST API testing suite using Postman & Newman CLI, cutting regression testing duration from 4 hours to under 15 minutes.',
      '• Designed and executed a 50-virtual-user JMeter load test on BlazeMeter, verifying system response times stayed under 750ms with 0% error rates.',
      '• Identified and logged 40+ high-severity defects in Jira with complete environment logs, steps to reproduce, and SQL validation proofs.',
      '• Standardized the Page Object Model (POM) architecture for Playwright UI automated tests, boosting test script reusability and maintainability.'
    ]
  },
  {
    id: 'sec-33',
    title: '33. Career Vision (Next 5 Years)',
    category: 'Career & Vision',
    content: '“Over the next 5 years, my goal is to evolve into a Lead Software Quality Assurance Engineer / SDET (Software Development Engineer in Test). I plan to master advanced automation architecture using Playwright and Selenium, build scalable CI/CD testing pipelines in cloud environments, and implement automated security and performance testing gates. Ultimately, I aim to lead QA engineering teams, drive quality culture across organizations, and mentor upcoming SQA professionals.”'
  }
];

export default function RecruiterHub() {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = ['All', 'Headlines', 'Bios & Summaries', 'Pitches', 'Competencies', 'Technical', 'Philosophy', 'Branding', 'Interviews', 'Achievements'];

  const filteredSections = RECRUITER_SECTIONS.filter((sec) => {
    const matchesCategory = activeCategory === 'All' || sec.category === activeCategory;
    const matchesSearch =
      sec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sec.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (Array.isArray(sec.content) ? sec.content.join(' ') : sec.content)
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCopy = (text: string | string[], id: string) => {
    const stringToCopy = Array.isArray(text) ? text.join('\n') : text;
    navigator.clipboard.writeText(stringToCopy);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <section id="recruiter-hub" className="py-24 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-900 px-4 sm:px-6 relative">
      <div className="max-w-7xl mx-auto relative z-10 space-y-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <p className="text-xs font-medium text-accent tracking-widest uppercase mb-2">Recruiter Dossier</p>
          <h2 className="font-display font-bold text-3xl sm:text-4xl md:text-5xl text-zinc-900 dark:text-white">
            Senior Recruiter & Branding Suite
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm sm:text-base leading-relaxed">
            Curated by senior technical recruiters and SQA experts. Browse, search, and copy ATS-friendly profile assets, interview pitch scripts, and complete career documentation for Sabbir Ahamed.
          </p>
        </div>

        {/* Search Bar & Category Filters */}
        <div className="space-y-4">
          <div className="relative max-w-2xl mx-auto">
            <Search className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search across 33 recruiter sections (e.g., ATS keywords, interview self intro, pitches)..."
              className="w-full pl-11 pr-10 py-3.5 rounded-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs sm:text-sm focus:border-accent focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-full transition-colors"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  activeCategory === cat
                    ? 'bg-accent text-white border-accent font-bold shadow-sm'
                    : 'bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-accent'
                }`}
              >
                {cat}
              </button>
            ))}

            {(searchQuery || activeCategory !== 'All') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('All');
                }}
                className="px-4 py-1.5 rounded-full text-xs font-medium text-rose-500 hover:text-rose-600 border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 transition-colors flex items-center space-x-1"
                title="Clear all search filters"
              >
                <X className="w-3 h-3" />
                <span>Clear All</span>
              </button>
            )}
          </div>
        </div>

        {/* Section Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {filteredSections.map((item) => (
            <div
              key={item.id}
              className="p-7 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 relative group hover:border-accent transition-colors flex flex-col justify-between space-y-4 min-h-[220px]"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-accent bg-accent/10 border border-accent/20 px-2.5 py-0.5 rounded-full">
                    {item.category}
                  </span>
                  <button
                    onClick={() => handleCopy(item.content, item.id)}
                    className="flex items-center space-x-1 px-3 py-1 rounded-full bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-mono transition-colors border border-zinc-200 dark:border-zinc-700"
                    title="Copy section content"
                  >
                    {copiedId === item.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" />
                        <span className="text-emerald-500 font-bold">COPIED</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>COPY TEXT</span>
                      </>
                    )}
                  </button>
                </div>

                <h3 className="font-display font-bold text-base text-zinc-900 dark:text-white">
                  {item.title}
                </h3>

                {Array.isArray(item.content) ? (
                  <ul className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed pt-1">
                    {item.content.map((line, idx) => (
                      <li key={idx} className="break-words">
                        {line}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                    {item.content}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
