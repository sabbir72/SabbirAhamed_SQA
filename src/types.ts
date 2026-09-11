/**
 * -----------------------------------------
 * Project     : Sabbir Ahamed SQA Portfolio
 * Module      : Global TypeScript Interface Definitions
 * Description : Defines interface contracts for SQA skills, work experiences,
 *               projects, test execution logs, bug tracking reports, and reference contacts.
 * Author      : Sabbir Ahamed
 * Last Updated: 2026-07-29
 * -----------------------------------------
 */

/**
 * Interface representing a technical or domain skill category
 */
export interface Skill {
  category: string;
  items: string[];
}

/**
 * Interface representing a professional SQA work experience entry
 */
export interface Experience {
  id: string;
  role: string;
  company: string;
  period: string;
  location: string;
  highlights: string[];
}

/**
 * Interface representing an educational degree or academic background
 */
export interface Education {
  id: string;
  degree: string;
  institution: string;
  period: string;
  location: string;
  details?: string;
}

/**
 * Interface representing a single line of log execution in the Interactive Test Runner
 */
export interface TestLog {
  timestamp: string;
  level: 'INFO' | 'PASS' | 'FAIL' | 'WARN';
  message: string;
}

/**
 * Interface representing an SQA portfolio project with metrics, test assertions, and logs
 */
export interface Project {
  id: string;
  title: string;
  type: 'Manual' | 'Automation' | 'API' | 'Performance';
  description: string;
  metrics?: {
    label: string;
    value: string;
  }[];
  assertions: {
    name: string;
    status: 'PASS' | 'FAIL';
    duration?: string;
  }[];
  logs: TestLog[];
  tags: string[];
  link?: string;
}

/**
 * Interface representing a bug report in the Interactive Bug Tracker component
 */
export interface BugReport {
  id: string;
  title: string;
  project: string;
  severity: 'Critical' | 'Major' | 'Minor';
  description: string;
  stepsToReproduce: string[];
  expectedResult: string;
  actualResult: string;
  status: 'Open' | 'Investigating' | 'Resolved';
}

/**
 * Interface representing professional reference contacts
 */
export interface Reference {
  name: string;
  role: string;
  company: string;
  email: string;
  phone: string;
}
