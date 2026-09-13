import { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, CheckCircle2, AlertTriangle, Terminal as TerminalIcon, Cpu, Zap, Activity, Code, FileCode, Copy, Check } from 'lucide-react';
import { PROJECTS } from '../data';
import { Project, TestLog } from '../types';

export default function InteractiveTestRunner() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(PROJECTS[0].id);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [activeLogs, setActiveLogs] = useState<TestLog[]>([]);
  const [passedAssertions, setPassedAssertions] = useState<string[]>([]);
  const [completed, setCompleted] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'terminal' | 'code'>('terminal');
  const [copiedCode, setCopiedCode] = useState(false);

  const consoleEndRef = useRef<HTMLDivElement>(null);

  const selectedProject = PROJECTS.find((p) => p.id === selectedProjectId) || PROJECTS[0];

  // Code snippets for each project type
  const getProjectCode = (projectId: string) => {
    switch (projectId) {
      case 'proj-erpnext-agent':
        return `# ERPNext + Playwright + Ollama AI Agent (agent.py)
# Connects local Ollama (qwen2.5-coder:7b) to Playwright
import os
from playwright.sync_api import sync_playwright
import ollama

def run_erpnext_ai_agent():
    # 1. Initialize local Ollama client
    client = ollama.Client()
    
    with sync_playwright() as p:
        # 2. Launch browser & navigate to ERPNext
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        page.goto(os.getenv("ERPNEXT_URL", "http://localhost:8000"))
        
        # 3. Agent inspects page & executes autonomous actions
        task = "Login to ERPNext and open the Users list."
        prompt = f"Goal: '{task}'. Choose next atomic browser action from [goto, click, fill, press, select, read_page, screenshot, wait]."
        response = client.chat(model="qwen2.5-coder:7b", messages=[{"role": "user", "content": prompt}])
        
        # 4. Perform autonomous login
        page.fill("input#login_email", os.getenv("ERPNEXT_USER", "administrator"))
        page.fill("input#login_password", os.getenv("ERPNEXT_PASS", "admin"))
        page.click("button.btn-login")
        page.wait_for_selector(".navbar")
        
        # 5. Open Users list & capture audit screenshot
        page.goto("http://localhost:8000/app/user")
        page.screenshot(path="users_list.png")
        print("AI Agent workflow finished successfully.")
        browser.close()

# Smoke Test Validation: pytest -q`;

      case 'proj-saucedemo':
      case 'proj-playwright-01':
        return `# Playwright Python UI Automation Script
from playwright.sync_api import sync_playwright

def test_erp_inventory_checkout():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1920, 'height': 1080})
        page = context.new_page()
        
        # 1. Login with authorization token
        page.goto("https://erp.altersense.com/login")
        page.fill("#username", "qa_auditor")
        page.fill("#password", "Secure_Pass_2026!")
        page.click("button[type='submit']")
        
        # 2. Verify dashboard loaded
        page.wait_for_selector(".dashboard-metric")
        assert page.title() == "Altersense Enterprise ERP | Dashboard"
        
        # 3. Create Inventory Dispatch Ticket
        page.goto("https://erp.altersense.com/inventory/dispatch/new")
        page.select_option("#warehouse_id", "WH-DHAKA-01")
        page.fill("#sku_item", "SKU-99201")
        page.fill("#quantity", "150")
        page.click("#btn-generate-ticket")
        
        # 4. Assert Success Toast Banner
        toast = page.wait_for_selector(".toast-success")
        assert "Inventory ticket generated successfully" in toast.inner_text()
        browser.close()`;

      case 'proj-playwright-api':
        return `# Playwright Python API Testing Framework (test/test_auth_positive.py)
import pytest
from api.auth_api import AuthAPI

def test_login_success(api_client):
    """Verify login with valid credentials returns 200 and valid tokens"""
    auth_api = AuthAPI(api_client)
    payload = {"username": "emilys", "password": "emilyspass"}
    
    # 1. Execute POST /auth/login
    response = auth_api.login(payload)
    assert response.status == 200, f"Expected 200, got {response.status}"
    
    data = response.json()
    # 2. Assert JWT token integrity
    assert "accessToken" in data and len(data["accessToken"]) > 0
    assert "refreshToken" in data
    assert data["username"] == "emilys"
    assert data["id"] > 0
    
    # 3. Authenticated endpoint verification (GET /auth/me)
    user_info = auth_api.get_user_info(data["accessToken"])
    assert user_info.status == 200
    assert user_info.json()["id"] == data["id"]
    print("Authentication flow & token validation passed!")

# Execute with: pytest test/test_auth_positive.py -v --alluredir=allure-results`;

      case 'proj-postman-crud':
      case 'proj-postman-01':
        return `// Postman REST API Test Script (Newman CLI Compatible)
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});

pm.test("Validate JWT Auth Bearer Header", function () {
    pm.request.headers.has("Authorization");
    pm.expect(pm.request.headers.get("Authorization")).to.include("Bearer eyJhbGciOiJSUzI1NiI");
});

pm.test("Assert JSON Payload Schema & Data Integrity", function () {
    const responseData = pm.response.json();
    pm.expect(responseData.status).to.eql("SUCCESS");
    pm.expect(responseData.data.transaction_id).to.be.a('string');
    pm.expect(responseData.data.amount).to.be.above(0);
    
    // Set dynamic transaction ID for downstream endpoints
    pm.environment.set("TXN_ID", responseData.data.transaction_id);
});`;

      case 'proj-jmeter-01':
        return `<!-- Apache JMeter Test Plan XML (BlazeMeter Scaled) -->
<jmeterTestPlan version="1.2" properties="5.0">
  <hashTree>
    <TestPlan guiclass="TestPlanGui" testclass="TestPlan" testname="ERP API Stress Sweep" enabled="true">
      <ThreadGroup guiclass="ThreadGroupGui" testclass="ThreadGroup" testname="50 Concurrent VUs" enabled="true">
        <stringProp font="Target">50</stringProp>
        <stringProp font="RampUp">10</stringProp>
        <stringProp font="LoopCount">100</stringProp>
      </ThreadGroup>
      <HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy" testname="POST /api/v1/auth/token">
        <stringProp name="HTTPSampler.domain">api.altersense.com</stringProp>
        <stringProp name="HTTPSampler.path">/api/v1/checkout</stringProp>
        <stringProp name="HTTPSampler.method">POST</stringProp>
      </HTTPSamplerProxy>
    </TestPlan>
  </hashTree>
</jmeterTestPlan>`;

      default:
        return `-- SQL Data Audit Verification Script for Manual Test Case TC-INV-802
SELECT i.sku_code, i.warehouse_id, i.stock_quantity, t.dispatch_status
FROM inventory_items i
JOIN warehouse_transactions t ON i.item_id = t.item_id
WHERE t.transaction_ref = 'TXN-2026-8802'
  AND i.warehouse_id = 'WH-DHAKA-01';

-- Expected Audit Check:
-- stock_quantity must reduce by exactly 150 units.
-- dispatch_status must update from 'PENDING' to 'DISPATCHED'.`;
    }
  };

  // Auto scroll console to bottom as logs append
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeLogs]);

  // Reset runner when selected project changes
  useEffect(() => {
    setIsRunning(false);
    setProgress(0);
    setActiveLogs([]);
    setPassedAssertions([]);
    setCompleted(false);
  }, [selectedProjectId]);

  const runTestSuite = () => {
    setIsRunning(true);
    setProgress(0);
    setActiveLogs([]);
    setPassedAssertions([]);
    setCompleted(false);
    setViewMode('terminal');

    const logs = selectedProject.logs;
    const assertions = selectedProject.assertions;
    const logInterval = 800; // interval between logs in ms
    const assertionRatio = Math.max(1, Math.floor(logs.length / assertions.length));

    let logIndex = 0;
    let assertionIndex = 0;

    const interval = setInterval(() => {
      if (logIndex < logs.length) {
        // Append a new log line
        const currentLog = logs[logIndex];
        setActiveLogs((prev) => [...prev, currentLog]);
        
        // Progress percentage calculation
        const currentProgress = Math.min(95, Math.round(((logIndex + 1) / logs.length) * 100));
        setProgress(currentProgress);

        // Periodically tick off assertions to match logs stream
        if (logIndex % assertionRatio === 0 && assertionIndex < assertions.length) {
          const currentAssertion = assertions[assertionIndex];
          if (currentAssertion.status === 'PASS') {
            setPassedAssertions((prev) => [...prev, currentAssertion.name]);
          }
          assertionIndex++;
        }

        logIndex++;
      } else {
        // Finish running
        clearInterval(interval);
        
        // Complete remaining assertions if any left
        assertions.forEach((a) => {
          if (a.status === 'PASS') {
            setPassedAssertions((prev) => {
              if (prev.includes(a.name)) return prev;
              return [...prev, a.name];
            });
          }
        });

        setProgress(100);
        setIsRunning(false);
        setCompleted(true);
      }
    }, logInterval);
  };

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(getProjectCode(selectedProjectId));
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <section id="test-runner" className="py-24 bg-[#0B0D12] text-[#F3F4F6] px-4 sm:px-6 relative border-t border-white/10">
      <div className="max-w-7xl mx-auto relative z-10 space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <p className="text-xs font-mono font-bold text-[#FF6B35] tracking-widest uppercase mb-1">
            TEST SUITES & AUTOMATION
          </p>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl md:text-5xl text-white">
            Interactive Test Console & Projects
          </h2>
          <p className="text-[#D1D5DB] text-sm sm:text-base leading-relaxed font-light">
            Select an automated SQA project below to execute test scripts, view real-time log outputs, and inspect actual Playwright/Postman code implementations.
          </p>
        </div>

        {/* Project Selection Tabs */}
        <div className="flex flex-wrap justify-center gap-2">
          {PROJECTS.map((project) => (
            <button
              key={project.id}
              onClick={() => setSelectedProjectId(project.id)}
              className={`px-4 py-2 rounded-full text-xs font-mono transition-all border ${
                selectedProjectId === project.id
                  ? 'bg-[#FF6B35] text-white border-[#FF6B35] font-bold shadow-lg shadow-[#FF6B35]/20'
                  : 'bg-[#12151C] border-white/10 text-[#D1D5DB] hover:border-[#FF6B35]/50 hover:text-white'
              }`}
            >
              [{project.type.toUpperCase()}] {project.title.split(' ')[0]}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left panel: Project Specs */}
          <div className="lg:col-span-5 flex flex-col justify-between p-7 rounded-2xl glass-card border border-white/10">
            <div className="space-y-6">
              <div>
                <span className="px-3 py-1 rounded-full text-[11px] font-mono font-bold tracking-wider bg-[#FF6B35]/10 text-[#FF6B35] border border-[#FF6B35]/20">
                  {selectedProject.type.toUpperCase()} TESTING SUITE
                </span>
                <h3 className="font-display font-bold text-xl sm:text-2xl text-white mt-4">
                  {selectedProject.title}
                </h3>
                <p className="mt-3 text-[#D1D5DB] text-xs sm:text-sm leading-relaxed font-light">
                  {selectedProject.description}
                </p>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5">
                {selectedProject.tags.map((tag) => (
                  <span key={tag} className="px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[#D1D5DB] text-[10px] font-mono">
                    {tag}
                  </span>
                ))}
              </div>

              {/* Metrics */}
              {selectedProject.metrics && (
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/10">
                  {selectedProject.metrics.map((metric) => (
                    <div key={metric.label} className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                      <p className="text-[10px] font-mono text-[#9CA3AF] uppercase tracking-wider">{metric.label}</p>
                      <p className="text-xs font-bold font-mono text-[#FF6B35] mt-0.5">{metric.value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Run Button */}
            <div className="mt-8 pt-6 border-t border-white/10 flex items-center gap-3">
              <button
                onClick={runTestSuite}
                disabled={isRunning}
                className={`flex-1 py-3.5 px-6 rounded-full font-semibold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all ${
                  isRunning
                    ? 'bg-white/10 text-[#9CA3AF] cursor-not-allowed'
                    : 'shimmer bg-[#FF6B35] hover:bg-[#FF814F] text-white shadow-lg shadow-[#FF6B35]/20'
                }`}
              >
                {isRunning ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Executing... {progress}%</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Execute Test Suite</span>
                  </>
                )}
              </button>

              {completed && (
                <button
                  onClick={() => {
                    setProgress(0);
                    setActiveLogs([]);
                    setPassedAssertions([]);
                    setCompleted(false);
                  }}
                  className="p-3.5 bg-white/10 text-[#D1D5DB] hover:text-white rounded-full font-mono text-xs hover:bg-white/20 transition-colors"
                  title="Reset runner state"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Right panel: Terminal / Code Viewer */}
          <div className="lg:col-span-7 flex flex-col justify-between overflow-hidden rounded-2xl bg-zinc-950 border border-zinc-800 font-mono text-xs shadow-xl min-h-[440px]">
            {/* Terminal Top Bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800 shrink-0">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setViewMode('terminal')}
                  className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-colors ${
                    viewMode === 'terminal' ? 'bg-accent text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <TerminalIcon className="w-3.5 h-3.5" />
                  <span>LIVE CONSOLE</span>
                </button>
                <button
                  onClick={() => setViewMode('code')}
                  className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-colors ${
                    viewMode === 'code' ? 'bg-accent text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>TEST SCRIPT CODE</span>
                </button>
              </div>

              {viewMode === 'code' ? (
                <button
                  onClick={handleCopySnippet}
                  className="flex items-center space-x-1 px-3 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px]"
                >
                  {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCode ? 'COPIED' : 'COPY SCRIPT'}</span>
                </button>
              ) : activeLogs.length > 0 ? (
                <button
                  onClick={() => {
                    setActiveLogs([]);
                    setProgress(0);
                    setPassedAssertions([]);
                    setCompleted(false);
                  }}
                  className="flex items-center space-x-1 px-3 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-[10px] transition-colors"
                  title="Clear console logs"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>CLEAR CONSOLE</span>
                </button>
              ) : null}
            </div>

            {/* Container Body */}
            <div className="flex-1 p-5 overflow-y-auto max-h-[390px]">
              {viewMode === 'code' ? (
                <pre className="text-zinc-300 text-[11px] font-mono leading-relaxed bg-zinc-900/60 p-4 rounded-xl border border-zinc-800/80 overflow-x-auto whitespace-pre">
                  {getProjectCode(selectedProjectId)}
                </pre>
              ) : (
                <div className="space-y-6">
                  {/* Idle Screen */}
                  {!isRunning && activeLogs.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center py-16 text-zinc-500 space-y-3">
                      <Cpu className="w-10 h-10 text-zinc-700 stroke-[1.5]" />
                      <div className="space-y-1">
                        <p className="text-zinc-400 font-bold">Runner Container: IDLE</p>
                        <p className="text-[11px] text-zinc-500 max-w-sm">Click "Execute Test Suite" to simulate live STLC runner assertions & logs stream.</p>
                      </div>
                    </div>
                  )}

                  {/* Logs Stream */}
                  {activeLogs.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-zinc-500 border-b border-zinc-800 pb-1 mb-2 text-[10px] uppercase tracking-wider flex items-center justify-between">
                        <span>STDOUT Console Stream</span>
                        {isRunning && <span className="animate-pulse text-accent text-[9px]">● STREAMING</span>}
                      </p>
                      {activeLogs.map((log, i) => (
                        <div key={i} className="flex items-start space-x-2 text-[11px] leading-relaxed">
                          <span className="text-zinc-600 shrink-0 select-none">[{log.timestamp}]</span>
                          <span className={`shrink-0 font-bold uppercase select-none ${
                            log.level === 'PASS' ? 'text-emerald-400' :
                            log.level === 'FAIL' ? 'text-rose-500' :
                            log.level === 'WARN' ? 'text-amber-500' : 'text-accent'
                          }`}>[{log.level}]</span>
                          <span className="text-zinc-300 break-all">{log.message}</span>
                        </div>
                      ))}
                      <div ref={consoleEndRef} />
                    </div>
                  )}

                  {/* Dynamic Assertions */}
                  {(isRunning || completed) && (
                    <div className="pt-4 border-t border-zinc-800">
                      <p className="text-zinc-500 pb-2 text-[10px] uppercase tracking-wider flex items-center justify-between">
                        <span>Validation Assertions Checklist</span>
                        <span className="text-emerald-400 text-[10px] font-bold">{passedAssertions.length} / {selectedProject.assertions.length} PASSED</span>
                      </p>
                      <div className="space-y-2">
                        {selectedProject.assertions.map((assertion) => {
                          const isChecked = passedAssertions.includes(assertion.name);
                          return (
                            <div
                              key={assertion.name}
                              className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                                isChecked
                                  ? 'bg-zinc-900 border-emerald-500/30 text-zinc-200'
                                  : 'bg-zinc-950 border-zinc-800 text-zinc-600'
                              }`}
                            >
                              <div className="flex items-center space-x-2.5">
                                <CheckCircle2 className={`w-4 h-4 shrink-0 ${
                                  isChecked ? 'text-emerald-400' : 'text-zinc-800'
                                }`} />
                                <span className="text-[11px] font-sans truncate pr-2">{assertion.name}</span>
                              </div>
                              {isChecked && assertion.duration && (
                                <span className="text-[9px] font-mono text-emerald-400 shrink-0 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                  {assertion.duration}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Status Footer */}
            <div className="px-4 py-2.5 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between shrink-0 text-[10px]">
              <div className="flex items-center space-x-2">
                <Activity className="w-3.5 h-3.5 text-accent" />
                <span className="text-zinc-400">Container State:</span>
                <span className={`font-bold uppercase ${
                  isRunning ? 'text-accent animate-pulse' :
                  completed ? 'text-emerald-400' : 'text-zinc-500'
                }`}>
                  {isRunning ? 'EXECUTING SUITE' : completed ? '100% SUITE PASSED' : 'STBY'}
                </span>
              </div>
              <div className="flex items-center space-x-3 text-zinc-500">
                <span>ERR: 0</span>
                <span>WARN: 0</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

