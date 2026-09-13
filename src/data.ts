/**
 * -----------------------------------------
 * Project     : Sabbir Ahamed SQA Portfolio
 * Module      : Data Storage and Constants
 * Description : Centralized dataset containing personal profile information, SQA technical skills,
 *               work experience history, education details, portfolio projects, bug reports, and professional references.
 * Author      : Sabbir Ahamed
 * Last Updated: 2026-07-29
 * -----------------------------------------
 */

import { Skill, Experience, Education, Project, BugReport, Reference } from './types';
/**
 * Personal profile details and contact links
 */
export const PERSONAL_INFO = {
  name: 'Sabbir Ahamed',
  title: 'Software Quality Assurance Engineer',
  // Profile Photo Avatar Path or Image URL (Auto updated & centered)
  avatar: '/sabbir_avatar.jpeg',
  email: 'sabbircse72@gmail.com',
  phone: '+8801681387906',
  location: 'Tongi East, Gazipur, Dhaka, Bangladesh',
  github: 'https://github.com/sabbir72',
  linkedin: 'www.linkedin.com/in/sabbir-ahamed72',
  githubUser: 'sabbir72',
  linkedinUser: 'Sabbir ahamed',
  objective: 'Seeking a Software Quality Assurance Engineer position where I can leverage 2 years of hands-on experience in manual and automation testing, solid knowledge of software testing principles, and strong attention to detail to ensure high-quality and reliable software solutions, while continuously learning and growing in a professional environment.'
};

/**
 * Categorized technical skills inventory
 */
export const SKILL_CATEGORIES: Skill[] = [
  {
    category: 'Manual Testing',
    items: [
      'Requirement Analysis',
      'Test Planning & Design',
      'Test Cases & Writing',
      'Test Environment Setup',
      'Test Case Execution',
      'Bug Reporting & Lifecycle'
    ]
  },
  {
    category: 'Automation Testing',
    items: [
      'Cypress (Basic)',
      'Playwright (Basic)',
      'Selenium WebDriver',
      'TestNG',
      'Page Object Model (POM)',
      'Allure Reporting'
    ]
  },
  {
    category: 'API Testing Tools',
    items: [
      'Postman',
      'Insomnia',
      'Newman CLI',
      'API Test Automation',
      'Dynamic Assertions'
    ]
  },
  {
    category: 'Performance Testing',
    items: [
      'JMeter',
      'BlazeMeter',
      'K6 (Basic)',
      'Load & Stress Testing'
    ]
  },
  {
    category: 'Tools & Databases',
    items: [
      'Jira',
      'GitHub / Git',
      'CI/CD (GitHub Actions)',
      'MySQL (Basic)',
      'Excel'
    ]
  },
  {
    category: 'Core Concepts',
    items: [
      'STLC (Software Testing Life Cycle)',
      'SDLC (Software Development Life Cycle)',
      'Agile / Scrum Ceremonies',
      'ERP Systems',
      'SaaS & Fintech Manual Testing'
    ]
  }
];

/**
 * Professional work history and accomplishments
 */
export const WORK_EXPERIENCE: Experience[] = [
  {
    id: 'exp-1',
    role: 'Jr. SQA Engineer',
    company: 'Altersense Ltd',
    period: '03/2025 - Present',
    location: 'Tejgaon, Dhaka, Bangladesh',
    highlights: [
      'Performing manual testing on ERP-based software including Inventory, Sales, Purchase, HR, Accounts, and Manufacturing commercial modules.',
      'Writing, reviewing, and executing test cases based on business requirements and user stories.',
      'Identifying, reporting, and tracking defects using Jira and collaborating with developers to ensure timely resolution.',
      'Conducting functional, regression, and user acceptance testing (UAT).',
      'Performing API testing using Postman to validate backend functionality and data accuracy.',
      'Verifying data accuracy using basic SQL queries in the database.',
      'Actively participating in Agile ceremonies (daily standups, sprint planning, retrospectives) and following STLC & SDLC processes to ensure software quality.'
    ]
  },
  {
    id: 'exp-2',
    role: 'Data Annotator Lead (ML Team)',
    company: 'Altersense Ltd',
    period: '02/2024 - 02/2025',
    location: 'Tejgaon, Dhaka, Bangladesh',
    highlights: [
      'Led the annotation team to prepare high-quality structured training datasets for machine learning models.',
      'Managed Data Quality Control pipelines to ensure minimal error rates and high accuracy in output assets.',
      'Developed custom custom-made internal scripts and tools to speed up the labeling and verification workflows.',
      'Fostered seamless team collaboration across annotators, ML developers, and product stakeholders.',
      
    ]
  },
  {
    id: 'exp-3',
    role: 'Project Delivery Associate (Production)',
    company: 'Quantigo AI',
    period: '07/2022 - 09/2023',
    location: 'Uttara, Dhaka, Bangladesh',
    highlights: [
      'Supervised and performed accurate multi-format data labeling for advanced AI and vision models.',
      'Maintained extreme Quality Control procedures on high-volume deliverables.',
      'Coordinated team collaborations and tasks assignments to meet strict project deadlines.',
      
    ]
  }
];

/**
 * Academic background and professional certifications
 */
export const EDUCATION_HISTORY: Education[] = [
  {
    id: 'edu-1',
    degree: 'SQA COURSE (Professional SQA Training)',
    institution: 'IT TRAINING BD',
    period: '07/2024 - 01/2025',
    location: 'Dhaka, Bangladesh',
    details: 'Professional Certificate - Hands-on practice in manual SQA methodologies, bug reporting, test planning, API testing, and automation fundamentals.'
  },
  {
    id: 'edu-2',
    degree: 'BSc in Computer Science and Engineering',
    institution: 'Daffodil International University (DIU)',
    period: '01/2018 - 01/2022',
    location: 'Ashulia, Savar, Dhaka, Bangladesh',
    details: 'CGPA: 3.19 out of 4.00'
  }
];

/**
 * Featured automation, API, performance, and manual SQA projects
 */
export const PROJECTS: Project[] = [
  {
    id: 'proj-erpnext-agent',
    title: 'ERPNext + Playwright + Ollama AI Agent',
    type: 'Automation',
    link: 'https://github.com/sabbir72/erpnext-playwright-agent',
    description: 'An autonomous browser testing agent that connects a local Ollama LLM (qwen2.5-coder:7b) to Playwright (Python) to autonomously inspect, navigate, and operate an ERPNext web instance. The agent dynamically decides browser actions (goto, click, fill, press, select, read_page, screenshot, wait), performs autonomous authentication, opens the Users list, captures verification artifacts, and executes smoke validation with Pytest.',
    metrics: [
      { label: 'LLM Model', value: 'Ollama (qwen2.5-coder:7b)' },
      { label: 'Browser Tool', value: 'Playwright (Python)' },
      { label: 'Target ERP', value: 'ERPNext Enterprise' },
      { label: 'Test Runner', value: 'Pytest (pytest -q)' }
    ],
    tags: ['Playwright', 'Python', 'Ollama AI', 'qwen2.5-coder', 'ERPNext', 'AI Agent', 'Autonomous Testing', 'Pytest'],
    assertions: [
      { name: 'Connect local Ollama instance & verify qwen2.5-coder:7b', status: 'PASS', duration: '320ms' },
      { name: 'Launch Playwright browser & navigate to ERPNext URL', status: 'PASS', duration: '890ms' },
      { name: 'AI agent inspects DOM & decides login action (fill + click)', status: 'PASS', duration: '640ms' },
      { name: 'Authenticate credentials & verify ERPNext desk access', status: 'PASS', duration: '580ms' },
      { name: 'Agent autonomy: navigate to Users list & inspect records', status: 'PASS', duration: '710ms' },
      { name: 'Capture full-page audit screenshot (users_list.png)', status: 'PASS', duration: '210ms' },
      { name: 'Execute Playwright smoke test suite (pytest -q)', status: 'PASS', duration: '490ms' }
    ],
    logs: [
      { timestamp: '10:00:01', level: 'INFO', message: 'Checking Ollama service: qwen2.5-coder:7b model active.' },
      { timestamp: '10:00:02', level: 'INFO', message: 'Starting Playwright browser runner with Python agent.py...' },
      { timestamp: '10:00:03', level: 'INFO', message: 'Navigating to ERPNext instance: http://localhost:8000' },
      { timestamp: '10:00:05', level: 'PASS', message: 'Agent decision: action="fill", selector="#login_email", value="***"' },
      { timestamp: '10:00:06', level: 'PASS', message: 'Agent decision: action="click", selector="button.btn-login"' },
      { timestamp: '10:00:08', level: 'PASS', message: 'Desk loaded. Agent goal: "Open Users list".' },
      { timestamp: '10:00:10', level: 'PASS', message: 'Agent executed: goto "/app/user" & captured screenshot.' },
      { timestamp: '10:00:12', level: 'PASS', message: 'Running smoke verification: pytest -q passed completely.' }
    ]
  },
  {
    id: 'proj-saucedemo',
    title: 'SauceDemo Playwright UI Automation',
    type: 'Automation',
    link: 'https://github.com/sabbir72/saucedemo',
    description: 'Built an end-to-end UI automation framework using Playwright (Python). Automated Login, Product Selection, Cart Validation, Checkout, and Logout scenarios. Integrated Allure Report to generate rich HTML reports with execution history, screenshots, logs, and test results. Configured GitHub Actions for automated test execution and CI/CD pipeline. Implemented reusable Page Object Model (POM), fixtures, and maintainable test architecture. Gained hands-on experience in professional reporting, automation framework design, and Continuous Integration workflows.',
    metrics: [
      { label: 'Language & Tool', value: 'Python & Playwright' },
      { label: 'Reporting', value: 'Allure HTML' },
      { label: 'Architecture', value: 'POM & Fixtures' },
      { label: 'CI/CD Pipeline', value: 'GitHub Actions' }
    ],
    tags: ['Playwright', 'Python', 'POM Architecture', 'Allure Reports', 'GitHub Actions', 'CI/CD'],
    assertions: [
      { name: 'Launch browser and navigate to SauceDemo homepage', status: 'PASS', duration: '850ms' },
      { name: 'Login with standard_user credentials', status: 'PASS', duration: '620ms' },
      { name: 'Verify items list is visible and sorted properly', status: 'PASS', duration: '310ms' },
      { name: 'Add products to cart and assert counter updates', status: 'PASS', duration: '410ms' },
      { name: 'Navigate to Checkout and complete user form', status: 'PASS', duration: '550ms' },
      { name: 'Assert total price matches item cost + tax', status: 'PASS', duration: '120ms' },
      { name: 'Submit order and verify confirmation message', status: 'PASS', duration: '480ms' }
    ],
    logs: [
      { timestamp: '08:00:01', level: 'INFO', message: 'Starting Playwright runner...' },
      { timestamp: '08:00:02', level: 'INFO', message: 'Chromium Browser launched successfully.' },
      { timestamp: '08:00:03', level: 'INFO', message: 'Navigating to: https://www.saucedemo.com/' },
      { timestamp: '08:00:04', level: 'PASS', message: 'Page loaded. Title asserts: "Swag Labs"' },
      { timestamp: '08:00:05', level: 'PASS', message: 'Login successful. Redirected to /inventory.html' },
      { timestamp: '08:00:08', level: 'PASS', message: 'All test cases passed in 7.2s!' }
    ]
  },
  {
    id: 'proj-bijoy',
    title: 'Web Application Automation – Bijoy Project 2025',
    type: 'Automation',
    link: 'https://github.com/sabbir72/Bijoy_Project_Test',
    description: 'Automated post-login flows and functional testing of a web application using Python and Pytest framework. Implemented structured test scripts, reusable fixtures, and conftest.py configuration management.',
    metrics: [
      { label: 'Language', value: 'Python' },
      { label: 'Framework', value: 'Pytest' },
      { label: 'Fixture Setup', value: 'conftest.py' },
      { label: 'Config', value: 'requirements.txt' }
    ],
    tags: ['Python', 'Pytest', 'Selenium', 'Fixtures', 'HTML Reports'],
    assertions: [
      { name: 'Pytest driver fixture initialization', status: 'PASS', duration: '920ms' },
      { name: 'User authorization token verification', status: 'PASS', duration: '410ms' },
      { name: 'Functional dashboard widgets loading check', status: 'PASS', duration: '510ms' },
      { name: 'Configure test data injection from JSON', status: 'PASS', duration: '120ms' }
    ],
    logs: [
      { timestamp: '11:00:00', level: 'INFO', message: 'Running pytest -v --html=report.html...' },
      { timestamp: '11:00:01', level: 'INFO', message: 'Loading test configurations from conftest.py' },
      { timestamp: '11:00:02', level: 'PASS', message: 'test_user_login PASSED' },
      { timestamp: '11:00:05', level: 'PASS', message: 'HTML report created successfully at report.html' }
    ]
  },
  {
    id: 'proj-webhishabee',
    title: 'Selenium Automation with Allure – WebHishabee',
    type: 'Automation',
    link: 'https://github.com/sabbir72/WebHishabee-Selenium-Automation',
    description: 'Automated UI testing of WebHishabee using Java, Selenium WebDriver, TestNG, and Allure reporting. Implemented structured Page Object Model (POM) pattern for scalable multi-page automation.',
    metrics: [
      { label: 'Language', value: 'Java' },
      { label: 'Framework', value: 'TestNG' },
      { label: 'Design Pattern', value: 'POM' },
      { label: 'Report Engine', value: 'Allure' }
    ],
    tags: ['Java', 'Selenium WebDriver', 'TestNG', 'Allure', 'Maven', 'POM'],
    assertions: [
      { name: 'Browser initialization and WebHishabee loads', status: 'PASS', duration: '1200ms' },
      { name: 'Login form validation with wrong credentials', status: 'PASS', duration: '450ms' },
      { name: 'Successful login & user dashboard navigation', status: 'PASS', duration: '950ms' },
      { name: 'Add business transaction in sales register', status: 'PASS', duration: '1100ms' },
      { name: 'Generate POS sales receipt validation', status: 'PASS', duration: '850ms' }
    ],
    logs: [
      { timestamp: '16:05:00', level: 'INFO', message: 'Initializing WebDriverManager with ChromeDriver...' },
      { timestamp: '16:05:03', level: 'INFO', message: 'Navigating to: https://web.hishabee.business/' },
      { timestamp: '16:05:08', level: 'PASS', message: 'Dashboard elements verified (Transaction panel, Quick Sell).' },
      { timestamp: '16:05:13', level: 'PASS', message: 'Allure report generated successfully.' }
    ]
  },
  {
    id: 'proj-java-single-page',
    title: 'Java Selenium Single Page Automation - Project 01',
    type: 'Automation',
    link: 'https://github.com/sabbir72/Java-Selenium-Project01',
    description: 'Automated login, product navigation, cart addition, alert handling, and session verification on a demo e-commerce site using Java, Selenium WebDriver, TestNG, and WebDriverManager.',
    metrics: [
      { label: 'Language', value: 'Java' },
      { label: 'Browser Tool', value: 'Selenium' },
      { label: 'Test Runner', value: 'TestNG' },
      { label: 'Driver Manager', value: 'WDM' }
    ],
    tags: ['Java', 'Selenium WebDriver', 'TestNG', 'WebDriverManager', 'Browser Automation'],
    assertions: [
      { name: 'Selenium WebDriver initialization via WebDriverManager', status: 'PASS', duration: '810ms' },
      { name: 'Automated login flow with session verification', status: 'PASS', duration: '640ms' },
      { name: 'Product search, cart addition, and alert handling', status: 'PASS', duration: '520ms' },
      { name: 'JavaScript execution and explicit wait assertions', status: 'PASS', duration: '310ms' }
    ],
    logs: [
      { timestamp: '12:10:00', level: 'INFO', message: 'Starting Java TestNG suite...' },
      { timestamp: '12:10:02', level: 'PASS', message: 'Browser launched and navigated to target e-commerce site.' },
      { timestamp: '12:10:05', level: 'PASS', message: 'Cart addition and alert popup verified successfully.' }
    ]
  },
  {
    id: 'proj-playwright-api',
    title: 'Playwright Python API Automation Framework',
    type: 'API',
    link: 'https://github.com/sabbir72/Playwright_API_Framework',
    description: 'A modular, high-coverage Python API testing framework built with Playwright request contexts and Pytest. Implements a clean layered architecture with API Client, dedicated Auth endpoints (/auth/login, /auth/me), conftest.py fixtures with JWT token injection, automated positive and negative error validation (400 responses for invalid/missing payloads), dual file/console logging, and Allure HTML reporting.',
    metrics: [
      { label: 'Core Tools', value: 'Playwright & Pytest' },
      { label: 'Focus Area', value: 'Auth APIs & Negative Tests' },
      { label: 'Test Data', value: 'JSON Payloads' },
      { label: 'Reporting', value: 'Allure HTML' }
    ],
    tags: ['Playwright', 'Python', 'Pytest', 'REST API', 'Allure Reports', 'JWT Auth', 'Fixtures', 'Negative Testing'],
    assertions: [
      { name: 'POST /auth/login - 200 OK with valid credentials & tokens', status: 'PASS', duration: '185ms' },
      { name: 'Validate JWT accessToken & refreshToken generation', status: 'PASS', duration: '45ms' },
      { name: 'GET /auth/me - Bearer token authorization & profile check', status: 'PASS', duration: '120ms' },
      { name: 'POST /auth/login - Wrong credentials return 400 Bad Request', status: 'PASS', duration: '140ms' },
      { name: 'Negative validations - Empty & missing fields return 400', status: 'PASS', duration: '95ms' },
      { name: 'GET /products/1 - Products API smoke assertion with schema', status: 'PASS', duration: '160ms' }
    ],
    logs: [
      { timestamp: '14:00:01', level: 'INFO', message: 'Initializing Playwright APIRequestContext with BASE_URL: https://dummyjson.com' },
      { timestamp: '14:00:02', level: 'INFO', message: 'Executing test_auth_positive.py via pytest -v' },
      { timestamp: '14:00:03', level: 'PASS', message: 'POST /auth/login succeeded. Tokens and user ID verified.' },
      { timestamp: '14:00:04', level: 'PASS', message: 'GET /auth/me Bearer header assertion PASSED.' },
      { timestamp: '14:00:05', level: 'PASS', message: 'test_auth_negative.py: 6 error scenarios evaluated green.' },
      { timestamp: '14:00:07', level: 'PASS', message: 'Allure HTML report generated in allure-results.' }
    ]
  },
  {
    id: 'proj-postman-crud',
    title: 'CRUD API Test with Dynamic Assertion',
    type: 'API',
    link: 'https://github.com/sabbir72/Postman-CRUD-API-Dynamic-Assertion',
    description: 'Automated API testing with Postman & Newman (CLI mode) including dynamic JavaScript assertions execution, environment variable chaining, and HTML report generation.',
    metrics: [
      { label: 'Tool', value: 'Postman' },
      { label: 'Runner', value: 'Newman CLI' },
      { label: 'Assertions', value: 'Dynamic JS' },
      { label: 'Report', value: 'HTML Report' }
    ],
    tags: ['Postman', 'Newman CLI', 'Dynamic Assertions', 'REST API', 'JavaScript'],
    assertions: [
      { name: 'POST request payload validation with JS script', status: 'PASS', duration: '120ms' },
      { name: 'GET endpoint status 200 OK & schema check', status: 'PASS', duration: '95ms' },
      { name: 'PUT dynamic update with bearer authorization token', status: 'PASS', duration: '150ms' },
      { name: 'DELETE endpoint response verification', status: 'PASS', duration: '110ms' }
    ],
    logs: [
      { timestamp: '13:00:00', level: 'INFO', message: 'Running Newman CLI: newman run collection.json' },
      { timestamp: '13:00:02', level: 'PASS', message: 'All dynamic assertions evaluated green.' }
    ]
  },
  {
    id: 'proj-postman-api',
    title: 'Restful Booker API Test Report',
    type: 'API',
    link: 'https://github.com/sabbir72/Restful-Booker-Postman-Automation',
    description: 'Automated API testing using Postman & Newman (htmlextra reporter) with 50 requests over 5 iterations. Average response 356 ms, 15 failures identified (response time & DELETE endpoint) with performance optimization recommendations.',
    metrics: [
      { label: 'API Requests', value: '50 Requests' },
      { label: 'Iterations', value: '5 Rounds' },
      { label: 'Avg Latency', value: '356 ms' },
      { label: 'Failures Identified', value: '15 Issues' }
    ],
    tags: ['Postman', 'Newman', 'htmlextra', 'Restful Booker', 'API Automation'],
    assertions: [
      { name: 'POST /auth - Tokens generated correctly', status: 'PASS', duration: '112ms' },
      { name: 'POST /booking - Schema matches expectations', status: 'PASS', duration: '145ms' },
      { name: 'GET /booking/:id - Assert fields integrity', status: 'PASS', duration: '84ms' },
      { name: 'PUT /booking/:id - Update booking is active', status: 'PASS', duration: '190ms' },
      { name: 'DELETE /booking/:id - Return 201 Created', status: 'PASS', duration: '135ms' }
    ],
    logs: [
      { timestamp: '14:30:10', level: 'INFO', message: 'Starting Newman CLI execution with htmlextra reporter...' },
      { timestamp: '14:30:16', level: 'INFO', message: 'Newman suite completed. 50 requests executed.' },
      { timestamp: '14:30:17', level: 'PASS', message: 'Htmlextra report saved.' }
    ]
  },
  {
    id: 'proj-postman-cicd',
    title: 'Postman API Testing CI/CD Automation',
    type: 'API',
    link: 'https://github.com/sabbir72/Postman-Newman-CICD-Automation',
    description: 'Implemented automated API testing using Postman & Newman integrated with GitHub Actions. Tests execute on every code push, HTML reports are generated, and test artifacts are archived automatically.',
    metrics: [
      { label: 'Tool', value: 'Postman' },
      { label: 'CLI', value: 'Newman' },
      { label: 'CI/CD Pipeline', value: 'GitHub Actions' },
      { label: 'Trigger', value: 'On Push' }
    ],
    tags: ['Postman', 'Newman', 'GitHub Actions', 'CI/CD', 'Automated Reports'],
    assertions: [
      { name: 'GitHub Actions workflow trigger on push', status: 'PASS', duration: '500ms' },
      { name: 'Node.js & Newman CLI environment setup', status: 'PASS', duration: '1200ms' },
      { name: 'Execute Postman collection against staging API', status: 'PASS', duration: '890ms' },
      { name: 'Upload HTML report artifacts to GitHub workflow run', status: 'PASS', duration: '450ms' }
    ],
    logs: [
      { timestamp: '15:20:00', level: 'INFO', message: 'GitHub Action triggered by commit push.' },
      { timestamp: '15:20:05', level: 'PASS', message: 'Postman collection executed. All tests passed.' }
    ]
  },
  {
    id: 'proj-blazemeter',
    title: 'BlazeMeter Use For Performance Testing',
    type: 'Performance',
    link: 'https://github.com/sabbir72/BlazeMeter-Performance-Testing',
    description: 'Performed load testing with 50 virtual users for 9 minutes using JMeter/BlazeMeter. System handled traffic efficiently with average response 723 ms, 90% responses within 1787 ms, 0% error rate, and stable CPU/memory usage.',
    metrics: [
      { label: 'Virtual Users', value: '50 Threads' },
      { label: 'Duration', value: '9 Minutes' },
      { label: 'Avg Latency', value: '723 ms' },
      { label: 'Error Rate', value: '0%' }
    ],
    tags: ['JMeter', 'BlazeMeter', 'Load Testing', 'Performance', 'Stress Testing'],
    assertions: [
      { name: 'Average Response Time < 1000ms', status: 'PASS', duration: '723ms' },
      { name: '90% Responses within 1800ms', status: 'PASS', duration: '1787ms' },
      { name: 'HTTP Error Rate == 0%', status: 'PASS', duration: '0.00%' },
      { name: 'CPU Utilization < 80% Average', status: 'PASS', duration: 'Stable' }
    ],
    logs: [
      { timestamp: '10:15:00', level: 'INFO', message: 'Configuring Thread Group: 50 Virtual Users. Ramp-up: 60s.' },
      { timestamp: '10:24:05', level: 'PASS', message: 'JMeter execution finished successfully. 0% error rate.' }
    ]
  },
  {
    id: 'proj-jmeter-u100',
    title: 'SQA_jmeter_u100_r2_l1_2025 Performance Suite',
    type: 'Performance',
    link: 'https://github.com/sabbir72/SQA_jmeter_u100_r2_l1_2025',
    description: 'Executed BlazeMeter/JMeter performance tests on BlazeDemo site (Windows), generated HTML reports, and pushed project to GitHub. Mastered load testing workflow, CLI execution, and cross-platform load testing.',
    metrics: [
      { label: 'Target Site', value: 'BlazeDemo' },
      { label: 'Environment', value: 'Windows CLI' },
      { label: 'Reporting', value: 'HTML Reports' },
      { label: 'Platform', value: 'BlazeMeter' }
    ],
    tags: ['JMeter', 'BlazeMeter', 'BlazeDemo', 'CLI Execution', 'HTML Reports'],
    assertions: [
      { name: 'BlazeDemo endpoint load capacity assertion', status: 'PASS', duration: '680ms' },
      { name: 'JMeter CLI execution without GUI overhead', status: 'PASS', duration: '510ms' },
      { name: 'Generate standalone HTML dashboard report', status: 'PASS', duration: '320ms' }
    ],
    logs: [
      { timestamp: '11:30:00', level: 'INFO', message: 'Executing jmeter -n -t testplan.jmx -l log.jtl -e -o ./report' },
      { timestamp: '11:35:00', level: 'PASS', message: 'Performance test completed. HTML dashboard generated.' }
    ]
  },
  {
    id: 'proj-manual-01',
    title: 'QA Functional Testing - Web Application (6 Modules)',
    type: 'Manual',
    link: 'https://github.com/sabbir72/Test_case-practice-project-01',
    description: 'Executed 35/38 test cases across Hosting, Domain, Account, Login, Blog and Support modules. No critical errors; minor issues noted. Full test details, execution summary, and bug report available on request.',
    metrics: [
      { label: 'Executed', value: '38 Test Cases' },
      { label: 'Pass Count', value: '35 / 38' },
      { label: 'Modules Tested', value: '6 Modules' },
      { label: 'Bugs Logged', value: '3 Issues' }
    ],
    tags: ['Manual Testing', 'Test Case Design', 'Jira', 'Bug Reporting', 'UAT', 'STLC'],
    assertions: [
      { name: 'Verify domain availability checker results', status: 'PASS' },
      { name: 'Assert account setup validation constraints', status: 'PASS' },
      { name: 'Verify user login with valid inputs', status: 'PASS' },
      { name: 'Review support ticket attachment sizes', status: 'PASS' },
      { name: 'Assert domain transfer form constraints', status: 'FAIL' },
      { name: 'Assert blog category filter on load', status: 'PASS' }
    ],
    logs: [
      { timestamp: '09:00:00', level: 'INFO', message: 'Loading manual testing worksheet...' },
      { timestamp: '09:15:00', level: 'PASS', message: 'Domain search gracefully sanitizes input.' },
      { timestamp: '10:05:00', level: 'INFO', message: 'Logged bug-01 in Jira. Assigning to developer team.' },
      { timestamp: '11:00:00', level: 'PASS', message: 'All 38 manual test cases evaluated.' }
    ]
  },
  {
    id: 'proj-manual-bkash',
    title: 'QA Test Cases – bKash Add Money & OrangeHRM Demo',
    type: 'Manual',
    link: 'https://docs.google.com/spreadsheets/d/154K1dZkp9sF0jpIdyg52Sr2S5glKd7P8_ZQu9Wch_ZY/edit?gid=0#gid=0',
    description: 'Created and executed detailed manual test cases for bKash Add Money happy path and OrangeHRM signup-to-leave flows. Defects logged and execution documented with full steps to reproduce.',
    metrics: [
      { label: 'Target Systems', value: 'bKash & OrangeHRM' },
      { label: 'Domain', value: 'FinTech & HR SaaS' },
      { label: 'Flows Tested', value: 'Add Money / Leave' },
      { label: 'Bug Reports', value: 'Logged in Jira' }
    ],
    tags: ['Manual Testing', 'bKash FinTech', 'OrangeHRM', 'Test Cases', 'Jira', 'Bug Tracking'],
    assertions: [
      { name: 'bKash Add Money card selection flow test', status: 'PASS' },
      { name: 'bKash OTP verification screen assertion', status: 'PASS' },
      { name: 'OrangeHRM employee leave request creation', status: 'PASS' },
      { name: 'OrangeHRM manager approval dashboard verification', status: 'FAIL' }
    ],
    logs: [
      { timestamp: '14:00:00', level: 'INFO', message: 'Testing bKash Add Money happy path...' },
      { timestamp: '14:15:00', level: 'PASS', message: 'bKash test cases executed.' },
      { timestamp: '15:00:00', level: 'INFO', message: 'Testing OrangeHRM Leave Approval flow.' },
      { timestamp: '15:20:00', level: 'WARN', message: 'Date timezone discrepancy discovered in manager view. Bug filed.' }
    ]
  }
];

/**
 * Sample defect tracking logs demonstrated in the Bug Tracker component
 */
export const BUG_REPORTS: BugReport[] = [
  {
    id: 'BUG-001',
    title: 'Capital file extension causes crash in Domain Transfer attachment uploader',
    project: 'QA Functional Testing - Hosting & Domain Modules',
    severity: 'Major',
    description: 'Uploading authorization files with capital extensions (e.g., "auth_doc.PDF" instead of "auth_doc.pdf") causes the front-end JS compiler to crash, presenting a generic white screen to the user.',
    stepsToReproduce: [
      'Navigate to the Domain Transfer portal.',
      'Fill in the domain transfer key and registrant details.',
      'Click the "Upload Authorization Document" button.',
      'Choose a file named "my_license.PDF" (notice the capital extension).',
      'Observe the application response.'
    ],
    expectedResult: 'The file is accepted or a validation warning displays "Only .pdf format accepted". No crash occurs.',
    actualResult: 'The system locks up and crashes into a white-screen with "TypeError: Cannot read properties of undefined (reading \'split\')".',
    status: 'Resolved'
  },
  {
    id: 'BUG-002',
    title: 'bKash Add Money happy path failures when amount is exactly 10,000 BDT',
    project: 'QA Test Cases - bKash Add Money & OrangeHRM Demo',
    severity: 'Critical',
    description: 'When a user attempts to initiate an Add Money transaction of exactly 10,000 BDT using a saved VISA card, the gateway triggers an immediate session timeout instead of presenting the OTP screen.',
    stepsToReproduce: [
      'Log into the bKash mock interface.',
      'Select "Add Money" -> "Card to bKash" -> "VISA".',
      'Select a saved card from the checklist.',
      'Enter transaction amount of exactly "10000".',
      'Tap "Proceed".'
    ],
    expectedResult: 'The OTP verification page should load with the VISA secure gate.',
    actualResult: 'The application redirects immediately to the Dashboard with an error toast "Session Timeout: Transaction suspended".',
    status: 'Resolved'
  },
  {
    id: 'BUG-003',
    title: 'OrangeHRM leave requests display incorrect dates in manager dashboard',
    project: 'QA Test Cases - bKash Add Money & OrangeHRM Demo',
    severity: 'Minor',
    description: 'When applying for a leave from 2026-07-20 to 2026-07-25, the manager dashboard displays the date range offset by -1 day (showing 2026-07-19 to 2026-07-24) due to timezone timezone casting issues.',
    stepsToReproduce: [
      'Log in as an employee in the OrangeHRM demo.',
      'Apply for leave starting July 20, 2026, ending July 25, 2026.',
      'Submit the request.',
      'Log out and log in as the supervisor/manager.',
      'Open the "Pending Leave Approvals" list.'
    ],
    expectedResult: 'The leave dates should correctly show 2026-07-20 to 2026-07-25.',
    actualResult: 'The dashboard displays 2026-07-19 to 2026-07-24.',
    status: 'Open'
  }
];

/**
 * Professional references list
 */
export const PROFESSIONAL_REFERENCES: Reference[] = [
  {
    name: 'Etu Mahmuda Era',
    role: 'Senior SQA Engineer',
    company: 'I-Farmer',
    email: 'etumahmuda@gmail.com',
    phone: '01956891550'
  }
];
