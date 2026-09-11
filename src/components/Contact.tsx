import { useState, FormEvent } from 'react';
import { 
  Send, CheckCircle2, Mail, Phone, MapPin, Linkedin, Github, 
  FileText, ArrowRight, Copy, Check, ExternalLink, Sparkles
} from 'lucide-react';
import { PERSONAL_INFO } from '../data';

interface ContactProps {
  onOpenResumeBuilder?: () => void;
}

export default function Contact({ onOpenResumeBuilder }: ContactProps) {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success'>('idle');
  const [errors, setErrors] = useState<{ name?: string; email?: string; subject?: string; message?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(PERSONAL_INFO.email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};
    if (!formData.name.trim()) newErrors.name = 'Full name is required';
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Please provide a bit more detail (at least 10 characters)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setStatus('sending');
    setServerError(null);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message. Please check server configuration.');
      }

      setStatus('success');
    } catch (err: any) {
      console.error('Contact submit error:', err);
      setServerError(err.message || 'Failed to send message. Please try again later.');
      setStatus('idle');
    }
  };

  return (
    <section id="contact" className="py-24 sm:py-28 bg-[#0B0D12] text-[#F3F4F6] border-t border-white/10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Subtle Ambient Glows */}
      <div className="absolute top-1/3 left-10 w-96 h-96 bg-[#FF6B35]/5 rounded-full blur-[140px] pointer-events-none" aria-hidden="true" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" aria-hidden="true" />

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-[#FF6B35]/10 border border-[#FF6B35]/25 text-[#FF6B35] text-xs font-mono font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Get In Touch</span>
          </div>
          <h2 className="font-display font-black text-3xl sm:text-4xl md:text-5xl text-white tracking-tight">
            Interested in Working Together?
          </h2>
          <p className="text-[#D1D5DB] text-base sm:text-lg font-light leading-relaxed">
            If you're looking for a Software Quality Assurance Engineer or would like to discuss a job opportunity, I'd be happy to connect. Feel free to reach out anytime.
          </p>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* LEFT COLUMN: Recruiter Contact Card & Details (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between p-6 sm:p-8 rounded-3xl glass-card border border-white/10 relative overflow-hidden space-y-8 h-full bg-[#12151C]/80 shadow-2xl">
            
            {/* Top Profile Intro */}
            <div className="space-y-6">
              
              {/* Availability Status Badge */}
              <div className="inline-flex items-center space-x-2.5 px-3.5 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span>Available for Full-Time Software QA Opportunities</span>
              </div>

              <div>
                <h3 className="font-display font-extrabold text-2xl text-white tracking-tight">
                  {PERSONAL_INFO.name}
                </h3>
                <p className="text-xs font-mono font-semibold text-[#FF6B35] uppercase tracking-wider mt-1">
                  {PERSONAL_INFO.title}
                </p>
                <p className="mt-3 text-xs sm:text-sm text-[#9CA3AF] font-light leading-relaxed">
                  2+ years of hands-on experience ensuring software quality through Manual Testing, REST API Validation, and Playwright UI Automation. Dedicated to helping engineering teams ship bug-free products.
                </p>
              </div>

              {/* Direct Contact Links */}
              <div className="space-y-3 font-mono text-xs text-[#F3F4F6] pt-2">
                
                {/* Email Item */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#FF6B35]/50 transition-all group">
                  <div className="flex items-center space-x-3 truncate mr-2">
                    <div className="p-2 rounded-xl bg-[#FF6B35]/10 text-[#FF6B35]">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <span className="block text-[10px] text-[#9CA3AF] uppercase font-sans">Email Address</span>
                      <a href={`mailto:${PERSONAL_INFO.email}`} className="text-white hover:text-[#FF6B35] transition-colors truncate font-mono text-xs font-medium">
                        {PERSONAL_INFO.email}
                      </a>
                    </div>
                  </div>
                  <button
                    onClick={handleCopyEmail}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-[#9CA3AF] hover:text-white transition-colors shrink-0 cursor-pointer"
                    title="Copy Email Address"
                  >
                    {copiedEmail ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {/* Phone Item */}
                <div className="flex items-center space-x-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#FF6B35]/50 transition-all">
                  <div className="p-2 rounded-xl bg-[#FF6B35]/10 text-[#FF6B35]">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-[#9CA3AF] uppercase font-sans">Phone Number</span>
                    <a href={`tel:${PERSONAL_INFO.phone}`} className="text-white hover:text-[#FF6B35] transition-colors font-mono text-xs font-medium">
                      {PERSONAL_INFO.phone}
                    </a>
                  </div>
                </div>

                {/* Location Item */}
                <div className="flex items-center space-x-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
                  <div className="p-2 rounded-xl bg-[#FF6B35]/10 text-[#FF6B35]">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-[#9CA3AF] uppercase font-sans">Current Location</span>
                    <span className="text-white font-sans text-xs font-medium">
                      {PERSONAL_INFO.location}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Links: LinkedIn, GitHub & Resume Builder */}
            <div className="pt-6 border-t border-white/10 space-y-4">
              <div className="flex items-center space-x-3">
                <a
                  href={`https://${PERSONAL_INFO.linkedin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-white/[0.04] hover:bg-blue-600/20 text-[#D1D5DB] hover:text-white border border-white/10 hover:border-blue-500/50 text-xs font-mono font-medium transition-all"
                >
                  <Linkedin className="w-4 h-4 text-blue-400" />
                  <span>LinkedIn Profile</span>
                  <ExternalLink className="w-3 h-3 text-[#9CA3AF]" />
                </a>

                <a
                  href={PERSONAL_INFO.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-white/[0.04] hover:bg-white/10 text-[#D1D5DB] hover:text-white border border-white/10 text-xs font-mono font-medium transition-all"
                >
                  <Github className="w-4 h-4 text-white" />
                  <span>GitHub Repos</span>
                  <ExternalLink className="w-3 h-3 text-[#9CA3AF]" />
                </a>
              </div>


            </div>

          </div>

          {/* RIGHT COLUMN: Recruiter Direct Contact Form (7 cols) */}
          <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 rounded-3xl glass-card border border-white/10 relative overflow-hidden bg-[#12151C]/90 shadow-2xl">
            
            {status !== 'success' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-display font-extrabold text-2xl text-white tracking-tight">
                    Send Me a Message
                  </h3>
                  <p className="text-xs sm:text-sm text-[#9CA3AF] font-light mt-1">
                    Have a position open or a question? Fill out the form below and I'll get back to you promptly.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {serverError && (
                    <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs font-mono space-y-2 leading-relaxed">
                      <div className="flex items-center space-x-2 text-rose-400 font-bold">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                        <span>Brevo Email Delivery Notice:</span>
                      </div>
                      <p className="text-white/90 font-sans">{serverError}</p>

                      <div className="pt-2 border-t border-rose-500/20 space-y-1.5 text-[11px] text-rose-300">
                        <p className="font-bold uppercase tracking-wider text-[#FF6B35]">How to resolve in Brevo Dashboard:</p>
                        <ul className="list-disc list-inside space-y-1 text-white/80 font-sans">
                          <li>
                            <strong>Authorised IPs:</strong> Open <a href="https://app.brevo.com/security/authorised_ips" target="_blank" rel="noreferrer" className="underline text-blue-400 hover:text-blue-300">Brevo Security Settings</a> and disable IP restrictions so Cloud Run/Vercel can connect.
                          </li>
                          <li>
                            <strong>API Key:</strong> Ensure <code className="bg-black/40 px-1 py-0.5 rounded text-[#FF6B35]">BREVO_API_KEY</code> in <code className="bg-black/40 px-1 py-0.5 rounded">.env</code> is a fresh, active v3 key from <a href="https://app.brevo.com/settings/keys/api" target="_blank" rel="noreferrer" className="underline text-blue-400 hover:text-blue-300">Brevo API Keys</a>.
                          </li>
                          <li>
                            <strong>Verified Sender:</strong> Ensure <code className="bg-black/40 px-1 py-0.5 rounded">sabbircse72@gmail.com</code> is verified in <a href="https://app.brevo.com/senders" target="_blank" rel="noreferrer" className="underline text-blue-400 hover:text-blue-300">Brevo Senders</a>.
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Full Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-mono text-[#D1D5DB] font-medium block">
                        Full Name <span className="text-[#FF6B35]">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm focus:border-[#FF6B35] focus:bg-white/[0.06] focus:outline-none transition-all placeholder:text-[#9CA3AF]/50 font-sans"
                        placeholder="Your Name"
                      />
                      {errors.name && <p className="text-[11px] font-mono text-rose-400 pt-0.5">{errors.name}</p>}
                    </div>

                    {/* Email Address */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-mono text-[#D1D5DB] font-medium block">
                        Email Address <span className="text-[#FF6B35]">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm focus:border-[#FF6B35] focus:bg-white/[0.06] focus:outline-none transition-all placeholder:text-[#9CA3AF]/50 font-sans"
                        placeholder="Your Email Address"
                      />
                      {errors.email && <p className="text-[11px] font-mono text-rose-400 pt-0.5">{errors.email}</p>}
                    </div>
                  </div>

                  {/* Subject */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-[#D1D5DB] font-medium block">
                      Subject <span className="text-[#FF6B35]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm focus:border-[#FF6B35] focus:bg-white/[0.06] focus:outline-none transition-all placeholder:text-[#9CA3AF]/50 font-sans"
                      placeholder="Subject (e.g. SQA Engineer Position Opportunity)"
                    />
                    {errors.subject && <p className="text-[11px] font-mono text-rose-400 pt-0.5">{errors.subject}</p>}
                  </div>

                  {/* Message */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-[#D1D5DB] font-medium block">
                      Message <span className="text-[#FF6B35]">*</span>
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-white text-sm focus:border-[#FF6B35] focus:bg-white/[0.06] focus:outline-none transition-all resize-none placeholder:text-[#9CA3AF]/50 font-sans leading-relaxed"
                      placeholder="Tell me about the opportunity or project..."
                    />
                    {errors.message && <p className="text-[11px] font-mono text-rose-400 pt-0.5">{errors.message}</p>}
                  </div>

                  {/* Submit Button & Direct Mailto Fallback */}
                  <div className="space-y-3">
                    <button
                      type="submit"
                      disabled={status === 'sending'}
                      className="w-full py-4 bg-[#FF6B35] hover:bg-[#FF814F] text-white font-bold text-sm rounded-2xl flex items-center justify-center space-x-2.5 transition-all shadow-xl shadow-[#FF6B35]/25 hover:shadow-[#FF6B35]/40 active:scale-[0.99] cursor-pointer shimmer disabled:opacity-50"
                    >
                      {status === 'sending' ? (
                        <span className="flex items-center space-x-2 font-mono">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Sending Message...</span>
                        </span>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Send Message</span>
                        </>
                      )}
                    </button>

                    <a
                      href={`mailto:${PERSONAL_INFO.email}?subject=${encodeURIComponent(formData.subject || 'Portfolio Inquiry')}&body=${encodeURIComponent(`Hi Sabbir,\n\n${formData.message || ''}\n\nFrom: ${formData.name || ''} (${formData.email || ''})`)}`}
                      className="w-full py-3 bg-white/[0.05] hover:bg-white/[0.10] text-[#D1D5DB] hover:text-white border border-white/10 font-mono text-xs rounded-2xl flex items-center justify-center space-x-2 transition-all cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5 text-[#FF6B35]" />
                      <span>Or Open directly in Gmail / Mail App</span>
                      <ExternalLink className="w-3 h-3 text-[#9CA3AF]" />
                    </a>
                  </div>
                </form>
              </div>
            )}

            {/* Success State Screen */}
            {status === 'success' && (
              <div className="min-h-[360px] flex flex-col items-center justify-center text-center space-y-5 py-8 animate-fadeIn">
                <div className="p-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <div className="space-y-2 max-w-md">
                  <h4 className="font-display font-extrabold text-2xl text-white">
                    Message Sent Successfully!
                  </h4>
                  <p className="text-sm text-[#D1D5DB] font-light leading-relaxed">
                    Thank you for reaching out, <span className="font-semibold text-white">{formData.name}</span>! Your message has been delivered. I will review it and reply as soon as possible.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setFormData({ name: '', email: '', subject: '', message: '' });
                    setStatus('idle');
                  }}
                  className="mt-4 px-6 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-full text-xs font-mono font-semibold transition-all cursor-pointer"
                >
                  Send Another Message
                </button>
              </div>
            )}

          </div>

        </div>

      </div>
    </section>
  );
}
