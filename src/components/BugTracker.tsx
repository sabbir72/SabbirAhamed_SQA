/**
 * -----------------------------------------
 * Project     : Sabbir Ahamed SQA Portfolio
 * Module      : Interactive Bug Tracker Component
 * Description : Renders SQA defect tracking queue with Jira format markdown export,
 *               severity filtering, virtual bug re-testing suite, and new defect entry modal.
 * Author      : Sabbir Ahamed
 * Last Updated: 2026-07-29
 * -----------------------------------------
 */

import React, { useState, FormEvent } from 'react';
import { AlertCircle, ArrowRight, ShieldAlert, CheckCircle2, Copy, Check, X, Plus, RefreshCw } from 'lucide-react';
import { BUG_REPORTS } from '../data';
import { BugReport } from '../types';

/**
 * BugTracker component displaying defect reports, bug details, and retest execution states.
 *
 * @returns {React.ReactNode} The rendered defect tracking UI component
 */
export default function BugTracker(): React.ReactNode {
  const [bugs, setBugs] = useState<BugReport[]>(BUG_REPORTS);
  const [selectedBugId, setSelectedBugId] = useState<string>(BUG_REPORTS[0].id);
  const [retestingBugId, setRetestingBugId] = useState<string | null>(null);
  const [retestResult, setRetestResult] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>('All');
  const [copiedJira, setCopiedJira] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Form state for creating custom defect reports
  const [newBug, setNewBug] = useState({
    title: '',
    project: 'SaaS E-Commerce Platform',
    severity: 'Major' as 'Critical' | 'Major' | 'Minor',
    description: '',
    stepsToReproduce: '',
    expectedResult: '',
    actualResult: ''
  });

  // Filter bug reports by severity or resolution status
  const filteredBugs = bugs.filter((b) => {
    if (filterSeverity === 'All') return true;
    if (filterSeverity === 'Resolved') return b.status === 'Resolved';
    return b.severity === filterSeverity;
  });

  const selectedBug = bugs.find((b) => b.id === selectedBugId) || bugs[0];

  /**
   * Simulates an automated re-test run on the selected defect ticket
   *
   * @param {BugReport} bug Target defect object
   */
  const handleRetest = (bug: BugReport) => {
    setRetestingBugId(bug.id);
    setRetestResult(null);

    setTimeout(() => {
      setRetestingBugId(null);
      if (bug.status === 'Resolved') {
        setRetestResult('VERIFIED PASSED: Bug fix verified! Hotfix successfully resolved the crash vector and all regression assertions passed.');
      } else {
        setRetestResult('UNRESOLVED: Timezone offset regression still reproduces on backend calendar service. Reopened ticket in Jira.');
      }
    }, 1800);
  };

  /**
   * Copies Jira-compliant markup format to user clipboard
   */
  const copyJiraMarkdown = () => {
    if (!selectedBug) return;
    const markdown = `
h2. [${selectedBug.id}] ${selectedBug.title}
*Project:* ${selectedBug.project}
*Severity:* ${selectedBug.severity}
*Status:* ${selectedBug.status}

h3. Description
${selectedBug.description}

h3. Steps to Reproduce
${selectedBug.stepsToReproduce.map((s, idx) => `${idx + 1}. ${s}`).join('\n')}

h3. Expected vs Actual
*Expected:* ${selectedBug.expectedResult}
*Actual:* ${selectedBug.actualResult}
    `.trim();

    navigator.clipboard.writeText(markdown);
    setCopiedJira(true);
    setTimeout(() => setCopiedJira(false), 2000);
  };

  /**
   * Handles creation and submission of new custom bug reports
   *
   * @param {FormEvent} e React form event
   */
  const handleCreateBug = (e: FormEvent) => {
    e.preventDefault();
    if (!newBug.title.trim() || !newBug.description.trim()) return;

    const stepsArray = newBug.stepsToReproduce
      ? newBug.stepsToReproduce.split('\n').filter((s) => s.trim().length > 0)
      : ['Navigate to application URL', 'Trigger standard workflow', 'Observe anomalous outcome'];

    const newTicket: BugReport = {
      id: `BUG-2026-${100 + bugs.length + 1}`,
      title: newBug.title.trim(),
      project: newBug.project.trim() || 'SaaS E-Commerce Platform',
      severity: newBug.severity,
      description: newBug.description.trim(),
      stepsToReproduce: stepsArray,
      expectedResult: newBug.expectedResult.trim() || 'System executes operation smoothly without errors.',
      actualResult: newBug.actualResult.trim() || 'System encounters error or unexpected UI degradation.',
      status: 'Open'
    };

    setBugs([newTicket, ...bugs]);
    setSelectedBugId(newTicket.id);
    setIsModalOpen(false);
    setNewBug({
      title: '',
      project: 'SaaS E-Commerce Platform',
      severity: 'Major',
      description: '',
      stepsToReproduce: '',
      expectedResult: '',
      actualResult: ''
    });
  };

  return (
    <section id="bugs" className="py-24 bg-[#0B0D12] text-[#F3F4F6] border-t border-white/10 px-4 sm:px-6 relative">
      <div className="max-w-7xl mx-auto relative z-10 space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <p className="text-xs font-mono font-bold text-[#FF6B35] tracking-widest uppercase mb-1">
            QUALITY CONTROL
          </p>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl md:text-5xl text-white">
            Defect Tracking & Bug Logs
          </h2>
          <p className="text-[#D1D5DB] text-sm sm:text-base leading-relaxed font-light">
            Examine sample defect tickets logged by Sabbir. Professional SQA demands high-precision bug reports complete with clear steps to reproduce, expected vs actual behavior, and severity classification.
          </p>
        </div>

        {/* Severity Filters */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {['All', 'Critical', 'Major', 'Resolved'].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-4 py-2 rounded-full text-xs font-mono transition-all border ${
                filterSeverity === sev
                  ? 'bg-[#FF6B35] text-white border-[#FF6B35] font-bold shadow-lg shadow-[#FF6B35]/20'
                  : 'bg-[#12151C] border-white/10 text-[#D1D5DB] hover:border-[#FF6B35]/50 hover:text-white'
              }`}
            >
              {sev}
            </button>
          ))}
          {filterSeverity !== 'All' && (
            <button
              onClick={() => setFilterSeverity('All')}
              className="px-4 py-2 rounded-full text-xs font-mono text-rose-400 hover:text-rose-300 border border-rose-500/30 bg-rose-500/10 transition-colors flex items-center space-x-1"
              title="Clear active filter"
            >
              <X className="w-3 h-3" />
              <span>Clear Filter</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left panel: Bug Tickets Queue */}
          <div className="lg:col-span-4 space-y-3">
            <div className="text-[#9CA3AF] font-mono text-[10px] uppercase tracking-wider px-2 flex items-center justify-between">
              <span>Queue ({filteredBugs.length} tickets)</span>
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-full bg-[#FF6B35] hover:bg-[#FF814F] text-white text-[10px] font-mono font-bold transition-all shadow-md shadow-[#FF6B35]/20"
              >
                <Plus className="w-3 h-3" />
                <span>Log Defect</span>
              </button>
            </div>
            {filteredBugs.map((bug) => (
              <button
                key={bug.id}
                onClick={() => {
                  setSelectedBugId(bug.id);
                  setRetestResult(null);
                }}
                className={`w-full text-left p-4 rounded-2xl border transition-all flex flex-col space-y-2.5 ${
                  selectedBugId === bug.id
                    ? 'glass-card border-[#FF6B35] shadow-lg shadow-[#FF6B35]/10'
                    : 'bg-[#12151C]/60 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-mono text-[10px] text-[#FF6B35] font-bold">{bug.id}</span>
                  <div className="flex items-center space-x-1.5">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                      bug.severity === 'Critical' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' :
                      bug.severity === 'Major' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                      'bg-white/10 text-[#9CA3AF] border border-white/10'
                    }`}>
                      {bug.severity}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                      bug.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                      'bg-[#FF6B35]/10 text-[#FF6B35] border border-[#FF6B35]/30'
                    }`}>
                      {bug.status}
                    </span>
                  </div>
                </div>
                <h4 className={`text-xs font-bold leading-relaxed line-clamp-2 ${
                  selectedBugId === bug.id ? 'text-white' : 'text-[#D1D5DB]'
                }`}>
                  {bug.title}
                </h4>
                <p className="text-[10px] font-mono text-[#9CA3AF] truncate">{bug.project}</p>
              </button>
            ))}
          </div>

          {/* Right panel: Ticket Inspector Details */}
          <div className="lg:col-span-8 p-7 rounded-2xl glass-card border border-white/10 space-y-6">
            {/* Header */}
            <div className="border-b border-white/10 pb-5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-1 bg-white/[0.04] border border-white/10 rounded-md font-mono text-[10px] font-bold text-[#FF6B35]">
                    {selectedBug.id}
                  </span>
                  <span className="text-[11px] font-mono text-[#9CA3AF]">Project: {selectedBug.project}</span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={copyJiraMarkdown}
                    className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[#D1D5DB] text-xs font-mono transition-colors"
                  >
                    {copiedJira ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedJira ? 'Jira Format Copied' : 'Copy Jira Ticket'}</span>
                  </button>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold ${
                    selectedBug.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-[#FF6B35]/10 text-[#FF6B35] border border-[#FF6B35]/30'
                  }`}>
                    {selectedBug.status.toUpperCase()}
                  </span>
                </div>
              </div>

              <h3 className="font-display font-bold text-lg sm:text-xl text-white leading-relaxed">
                {selectedBug.title}
              </h3>
            </div>

            {/* Bug Summary */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider font-mono">Bug Summary</h5>
              <p className="text-[#D1D5DB] text-xs sm:text-sm leading-relaxed font-light">{selectedBug.description}</p>
            </div>

            {/* Steps to Reproduce */}
            <div className="space-y-3 p-4 bg-white/[0.03] rounded-xl border border-white/10 text-xs">
              <h5 className="text-xs font-bold text-[#FF6B35] uppercase tracking-wider font-mono flex items-center space-x-1.5">
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Steps to Reproduce (STLC Audit)</span>
              </h5>
              <ol className="list-decimal list-inside space-y-1.5 text-[#D1D5DB]">
                {selectedBug.stepsToReproduce.map((step, i) => (
                  <li key={i} className="pl-1 leading-relaxed font-light">
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Expected vs Actual */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
              <div className="p-4 rounded-xl bg-white/[0.03] border border-emerald-500/20 space-y-1.5">
                <p className="text-emerald-400 font-bold uppercase text-[10px] flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Expected Result</span>
                </p>
                <p className="text-[#D1D5DB] text-[11px] font-sans leading-relaxed font-light">{selectedBug.expectedResult}</p>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.03] border border-rose-500/20 space-y-1.5">
                <p className="text-rose-400 font-bold uppercase text-[10px] flex items-center space-x-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Actual Result</span>
                </p>
                <p className="text-[#D1D5DB] text-[11px] font-sans leading-relaxed font-light">{selectedBug.actualResult}</p>
              </div>
            </div>

            {/* Retest Playground */}
            <div className="pt-4 border-t border-white/10 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <p className="text-[#9CA3AF] text-xs leading-normal">
                  Click to run a virtual re-test assertion cycle on this ticket.
                </p>
                <button
                  onClick={() => handleRetest(selectedBug)}
                  disabled={retestingBugId !== null}
                  className={`px-5 py-2.5 rounded-full font-semibold text-xs flex items-center space-x-2 transition-all shrink-0 select-none ${
                    retestingBugId !== null
                      ? 'bg-white/10 text-[#9CA3AF] cursor-not-allowed'
                      : 'shimmer bg-[#FF6B35] hover:bg-[#FF814F] text-white shadow-lg shadow-[#FF6B35]/20'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${retestingBugId === selectedBug.id ? 'animate-spin' : ''}`} />
                  <span>Re-Test Bug Vector</span>
                </button>
              </div>

              {/* Retest results */}
              {retestResult && (
                <div className={`p-4 rounded-xl font-mono text-[11px] leading-relaxed border ${
                  retestResult.startsWith('VERIFIED')
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                }`}>
                  {retestResult}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Log Defect Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#12151C] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-xl w-full space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto text-[#F3F4F6]">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-[#FF6B35]" />
                <h3 className="font-display font-bold text-lg text-white">
                  Log New Defect Ticket
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-[#9CA3AF] hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBug} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-wider text-[#9CA3AF] block">Bug Summary / Title *</label>
                <input
                  type="text"
                  required
                  value={newBug.title}
                  onChange={(e) => setNewBug({ ...newBug, title: e.target.value })}
                  placeholder="E.g., Cart total calculation mismatch during discount code application"
                  className="w-full px-4 py-2.5 rounded-full bg-white/[0.04] border border-white/10 text-white text-xs sm:text-sm focus:border-[#FF6B35] focus:outline-none placeholder:text-[#9CA3AF]/60"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-[#9CA3AF] block">Target Project / Module</label>
                  <input
                    type="text"
                    value={newBug.project}
                    onChange={(e) => setNewBug({ ...newBug, project: e.target.value })}
                    placeholder="SaaS E-Commerce Platform"
                    className="w-full px-4 py-2.5 rounded-full bg-white/[0.04] border border-white/10 text-white text-xs focus:border-[#FF6B35] focus:outline-none placeholder:text-[#9CA3AF]/60"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-[#9CA3AF] block">Severity Level</label>
                  <select
                    value={newBug.severity}
                    onChange={(e) => setNewBug({ ...newBug, severity: e.target.value as any })}
                    className="w-full px-4 py-2.5 rounded-full bg-[#12151C] border border-white/10 text-white text-xs focus:border-[#FF6B35] focus:outline-none"
                  >
                    <option value="Critical">Critical (Blocker)</option>
                    <option value="Major">Major (High Impact)</option>
                    <option value="Minor">Minor (Cosmetic/Low)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-wider text-[#9CA3AF] block">Detailed Description *</label>
                <textarea
                  required
                  rows={3}
                  value={newBug.description}
                  onChange={(e) => setNewBug({ ...newBug, description: e.target.value })}
                  placeholder="Provide precise context regarding where and when this bug occurs..."
                  className="w-full px-4 py-2.5 rounded-2xl bg-white/[0.04] border border-white/10 text-white text-xs focus:border-[#FF6B35] focus:outline-none placeholder:text-[#9CA3AF]/60"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-wider text-[#9CA3AF] block">Steps to Reproduce (1 per line)</label>
                <textarea
                  rows={3}
                  value={newBug.stepsToReproduce}
                  onChange={(e) => setNewBug({ ...newBug, stepsToReproduce: e.target.value })}
                  placeholder="1. Login as user&#10;2. Add item to cart&#10;3. Apply coupon promo CODE2026"
                  className="w-full px-4 py-2.5 rounded-2xl bg-white/[0.04] border border-white/10 text-white text-xs focus:border-[#FF6B35] focus:outline-none font-mono placeholder:text-[#9CA3AF]/60"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-[#9CA3AF] block">Expected Result</label>
                  <input
                    type="text"
                    value={newBug.expectedResult}
                    onChange={(e) => setNewBug({ ...newBug, expectedResult: e.target.value })}
                    placeholder="Discount applied and total reduces by 20%"
                    className="w-full px-4 py-2 rounded-full bg-white/[0.04] border border-white/10 text-white text-xs focus:border-[#FF6B35] focus:outline-none placeholder:text-[#9CA3AF]/60"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-[#9CA3AF] block">Actual Result</label>
                  <input
                    type="text"
                    value={newBug.actualResult}
                    onChange={(e) => setNewBug({ ...newBug, actualResult: e.target.value })}
                    placeholder="Total reflects double discount or throws 500 error"
                    className="w-full px-4 py-2 rounded-full bg-white/[0.04] border border-white/10 text-white text-xs focus:border-[#FF6B35] focus:outline-none placeholder:text-[#9CA3AF]/60"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-full text-xs font-medium text-[#D1D5DB] hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#FF6B35] hover:bg-[#FF814F] text-white text-xs font-bold transition-all shadow-md shadow-[#FF6B35]/20"
                >
                  Create Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
