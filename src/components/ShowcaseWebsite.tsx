'use client';

import React, { useState } from 'react';
import {
  Activity, ArrowDownRight, ArrowRight, BookOpen, CheckCircle2, ChevronDown,
  CircleHelp, ClipboardCheck, FileText, HeartPulse, LockKeyhole, Menu,
  Microscope, MessageCircleQuestion, RotateCcw, Scale, ShieldCheck, Sparkles,
  Stethoscope, TrendingUp, X,
} from 'lucide-react';

const navItems = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Features', href: '#features' },
  { label: 'Quick facts', href: '#facts' },
  { label: 'Safety', href: '#safety' },
  { label: 'FAQ', href: '#faq' },
];

function Brand({ footer = false }: { footer?: boolean }) {
  return (
    <a href="#home" className={`inline-flex items-center ${footer ? 'w-44' : 'w-36 sm:w-40'} shrink-0`} aria-label="MEDUCID home">
      <img src="/meducid-logo.png" alt="MEDUCID" className="block h-auto w-full object-contain" />
    </a>
  );
}

function LimeButton({ children, href, onClick, className = '' }: { children: React.ReactNode; href?: string; onClick?: () => void; className?: string }) {
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`cta-shadow inline-flex items-center justify-center gap-3 rounded-xl border-2 border-ink bg-lime px-5 py-3.5 text-[11px] font-black uppercase tracking-[.045em] text-ink cursor-pointer ${className}`}
      >
        {children}
        <span className="grid h-6 w-6 place-items-center rounded-lg border border-ink bg-coral text-base leading-none">↗</span>
      </button>
    );
  }

  return (
    <a
      className={`cta-shadow inline-flex items-center justify-center gap-3 rounded-xl border-2 border-ink bg-lime px-5 py-3.5 text-[11px] font-black uppercase tracking-[.045em] text-ink cursor-pointer ${className}`}
      href={href}
    >
      {children}
      <span className="grid h-6 w-6 place-items-center rounded-lg border border-ink bg-coral text-base leading-none">↗</span>
    </a>
  );
}

function Header({ onOpenDashboard }: { onOpenDashboard: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="relative z-30 border-t-[3px] border-teal bg-paper/95">
      <div className="mx-auto flex min-h-[82px] max-w-[1240px] items-center justify-between gap-4 px-5 sm:px-8">
        <Brand />
        <button
          onClick={() => setMenuOpen((value) => !value)}
          className="inline-flex items-center gap-2 rounded-lg border border-ink bg-cream px-3 py-2 text-xs font-extrabold md:hidden cursor-pointer"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
        >
          {menuOpen ? 'CLOSE' : 'MENU'} {menuOpen ? <X size={16} /> : <Menu size={16} />}
        </button>
        <div className={`${menuOpen ? 'flex' : 'hidden'} absolute left-4 right-4 top-[72px] flex-col gap-2 rounded-2xl border border-ink bg-cream p-3 shadow-xl md:static md:flex md:flex-row md:items-center md:gap-0 md:border md:p-1 md:shadow-none`}>
          <nav className="flex flex-col md:flex-row" aria-label="Main navigation">
            {navItems.map((item) => (
              <a key={item.href} onClick={closeMenu} href={item.href} className="rounded-lg px-4 py-3 text-sm font-semibold transition hover:bg-paper">{item.label}</a>
            ))}
            <button
              type="button"
              onClick={() => {
                closeMenu();
                onOpenDashboard();
              }}
              className="rounded-lg px-4 py-3 text-sm font-bold text-teal transition hover:bg-paper text-left md:text-center cursor-pointer"
            >
              Dashboard
            </button>
          </nav>
          <a
            href="https://github.com/anshk1234/MEDUCID"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-ink bg-cream px-3.5 py-3 text-[11px] font-black uppercase tracking-[.045em] text-ink hover:bg-lime hover:shadow-[3px_3px_0_#141414] transition-all cursor-pointer m-0.5"
            title="Star MEDUCID on GitHub"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span>Star on GitHub</span>
            <span className="text-coral">★</span>
          </a>
          <LimeButton onClick={() => { closeMenu(); onOpenDashboard(); }} className="m-0.5">
            Launch Dashboard
          </LimeButton>
        </div>
      </div>
    </header>
  );
}

function ReportMiniCard({ variant, icon: Icon, label, title, detail, caption, footerDark = false, onClick }: any) {
  return (
    <article
      onClick={onClick}
      className={`feature-tilt relative flex min-h-[230px] w-[155px] shrink-0 flex-col overflow-hidden rounded-2xl border border-ink/10 bg-cream shadow-lg sm:w-[190px] cursor-pointer ${variant}`}
    >
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-2 text-[9px] font-black uppercase tracking-[.12em] text-muted">
          <span>{label}</span><span className="grid h-7 w-7 place-items-center rounded-lg border border-ink bg-lime text-ink"><Icon size={15} /></span>
        </div>
        <div className="mt-5 text-[29px] font-black leading-none tracking-[-.06em]">{title}</div>
        <p className="mt-2 text-[11px] leading-snug text-muted">{detail}</p>
        <div className="mt-auto grid gap-2 pt-4" aria-hidden="true">
          <span className="h-1.5 rounded-full bg-black/10" />
          <span className="h-1.5 w-4/5 rounded-full bg-black/10" />
          <span className="h-1.5 w-3/5 rounded-full bg-black/10" />
        </div>
      </div>
      <div className={`flex min-h-[58px] items-center justify-center px-3 py-3 text-center text-[11px] font-extrabold leading-snug ${footerDark ? 'bg-wine text-white' : 'bg-[#f0eee6] text-[#5d2630]'}`}>{caption}</div>
    </article>
  );
}

function Hero({ onOpenDashboard }: { onOpenDashboard: () => void }) {
  return (
    <section id="home" className="relative isolate overflow-hidden pb-16 pt-10 text-center sm:pb-20 sm:pt-14">
      <div className="hero-blob" />
      <div className="mx-auto max-w-[1180px] px-5">
        <div className="mx-auto mb-5 inline-flex max-w-full items-center gap-2 rounded-xl border border-black/20 bg-ink px-2.5 py-2 text-[9px] font-black uppercase tracking-[.04em] text-lime shadow-md sm:text-[11px]">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-ink bg-lime text-ink"><HeartPulse size={17} /></span>
          Medical reports, explained in plain language
        </div>
        <h1 className="display-font mx-auto max-w-[940px] text-[clamp(2.9rem,7.5vw,6.5rem)] uppercase leading-[.92] text-ink tracking-tight">
          MAKE SENSE OF<br />YOUR <span className="script-font inline-block -rotate-3 text-[.94em] normal-case px-1.5">medical</span><br />REPORT.
        </h1>
        <p className="mx-auto mt-6 max-w-[570px] text-sm leading-7 text-[#55544e] sm:text-base">
          Understand the words, numbers, and abbreviations on your report, then walk into your next doctor’s appointment with better questions.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
          <LimeButton onClick={onOpenDashboard}>LET’S READ YOUR REPORT</LimeButton>
          <a className="inline-flex items-center gap-2 border-b border-black/40 px-1 py-3 text-xs font-extrabold cursor-pointer" href="#how-it-works">See how MEDUCID works <ArrowDownRight size={15} /></a>
          <button
            type="button"
            onClick={onOpenDashboard}
            className="inline-flex items-center gap-1 border-b border-black/40 px-1 py-3 text-xs font-extrabold cursor-pointer text-teal hover:text-ink"
          >
            Open Dashboard ↗
          </button>
        </div>
        <p className="mx-auto mt-4 max-w-md text-[10px] leading-5 text-muted">Designed to support informed conversations. Not a diagnosis, treatment recommendation, or substitute for medical care.</p>
        
        <div className="mx-auto mt-12 flex max-w-[1020px] items-center justify-start overflow-x-auto px-8 pb-8 pt-4 sm:mt-16 sm:justify-center">
          <ReportMiniCard onClick={onOpenDashboard} variant="card-tilt-1" icon={FileText} label="Your report" title="CBC" detail="Blood count · example" caption="Key terms, explained" />
          <ReportMiniCard onClick={onOpenDashboard} footerDark variant="card-tilt-2 -ml-3 z-[2]" icon={BookOpen} label="Plain language" title="01 / 03" detail="Clearer explanations" caption="Break the jargon down" />
          <ReportMiniCard onClick={onOpenDashboard} variant="card-tilt-3 -ml-3 z-[3]" icon={Activity} label="Your numbers" title="Context" detail="Units and ranges" caption="Read the report carefully" />
          <ReportMiniCard onClick={onOpenDashboard} footerDark variant="card-tilt-4 -ml-3 z-[2]" icon={ClipboardCheck} label="Next steps" title="Ask" detail="Your next conversation" caption="Prepare better questions" />
          <ReportMiniCard onClick={onOpenDashboard} variant="card-tilt-5 -ml-3 z-[1]" icon={Stethoscope} label="Your care" title="Together" detail="Patient and clinician" caption="Make the visit count" />
        </div>
      </div>
    </section>
  );
}

function SectionHeading({ eyebrow, title, children, center = false }: { eyebrow: string; title: React.ReactNode; children?: React.ReactNode; center?: boolean }) {
  return (
    <div className={`mb-9 max-w-[690px] ${center ? 'mx-auto text-center' : ''}`}>
      <div className="mb-3 text-[10px] font-black uppercase tracking-[.17em] text-muted">{eyebrow}</div>
      <h2 className="display-font text-[clamp(2.3rem,5vw,4rem)] uppercase leading-[.96] text-ink">{title}</h2>
      {children && <p className={`mt-4 max-w-[560px] text-sm leading-7 text-muted ${center ? 'mx-auto' : ''}`}>{children}</p>}
    </div>
  );
}

function HowItWorks() {
  const steps = [
    { number: '01', icon: FileText, title: 'Add your report', body: 'Start with a supported PDF or image of your report. Review the document before sharing anything sensitive.' },
    { number: '02', icon: BookOpen, title: 'Explore the explanation', body: 'Get plain-language definitions, an organized summary, and context for terms that are easy to misread.' },
    { number: '03', icon: ClipboardCheck, title: 'Prepare for a conversation', body: 'Build a shortlist of questions to take to a qualified professional. Your clinician interprets results in your full health context.' },
  ];

  return (
    <section id="how-it-works" className="mx-auto max-w-[1180px] px-5 py-20 sm:px-8 sm:py-24">
      <SectionHeading eyebrow="No medical dictionary required" title={<>From report to<br />“I get it.”</>}>A simple, guided flow that helps you understand what is written, what remains uncertain, and what to discuss with your clinician.</SectionHeading>
      <div className="grid gap-4 md:grid-cols-3">
        {steps.map(({ number, icon: Icon, title, body }) => (
          <article key={number} className="rounded-2xl border border-ink/10 bg-cream p-6 shadow-[0_5px_0_rgba(20,20,20,.04)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_12px_25px_rgba(20,20,20,.08)] sm:p-7">
            <div className="flex items-center justify-between"><span className="display-font text-4xl text-teal">{number}</span><span className="grid h-12 w-12 place-items-center rounded-xl border border-ink bg-lime"><Icon size={22} /></span></div>
            <h3 className="mt-8 text-xl font-black tracking-tight text-ink">{title}</h3>
            <p className="mt-3 text-sm leading-7 text-muted">{body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function Features() {
  const features = [
    { icon: FileText, title: 'Complex terms, simpler words.', body: 'Understand abbreviations and technical phrases without pretending every medical term is obvious.' },
    { icon: Activity, title: 'Find the important parts faster.', body: 'Organize a report into a readable summary, notable terms, and points that may warrant a professional explanation.' },
    { icon: CircleHelp, title: 'Know what you still need to ask.', body: 'Generate questions for your appointment instead of jumping to conclusions from a single number or flag.' },
    { icon: LockKeyhole, title: 'Support for understanding. Not a diagnosis.', body: 'Clear boundaries between explanation, uncertainty, and decisions that belong with a healthcare professional.' },
  ];

  return (
    <section id="features" className="bg-[#eeede5] py-20 sm:py-24">
      <div className="mx-auto max-w-[1180px] px-5 sm:px-8">
        <SectionHeading eyebrow="Made for real people, not lab manuals" title={<>Less decoding.<br />More understanding.</>}>A thoughtful approach to medical language, useful context, and the next conversation.</SectionHeading>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, body }, index) => (
            <article key={title} className={`feature-panel rounded-2xl border border-ink/10 p-6 ${index === 1 ? 'bg-teal text-white' : 'bg-cream'}`}>
              <span className={`grid h-12 w-12 place-items-center rounded-xl border ${index === 1 ? 'border-white/40 bg-lime text-ink' : 'border-ink bg-lime text-ink'}`}><Icon size={21} /></span>
              <h3 className="mt-7 text-lg font-black leading-tight">{title}</h3>
              <p className={`mt-3 text-sm leading-7 ${index === 1 ? 'text-white/75' : 'text-muted'}`}>{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

const FACTS = [
  {
    id: 'ranges', icon: Scale, tag: 'REFERENCE RANGES', title: 'A range is not the whole story.',
    body: 'Reference ranges can vary by laboratory and by the method used. Read the range printed on the report instead of relying on a number seen elsewhere.',
    takeaway: 'Keep the lab’s own range beside the result.',
  },
  {
    id: 'units', icon: Microscope, tag: 'UNITS MATTER', title: 'The number needs its unit.',
    body: 'A measurement without its unit can be misleading. Values from different reports should not be compared until their units and methods are understood.',
    takeaway: 'Check both the value and the unit.',
  },
  {
    id: 'trends', icon: TrendingUp, tag: 'CHANGE OVER TIME', title: 'A trend can add context.',
    body: 'Previous results may help a clinician understand change over time, but comparisons are most useful when the test, units, and context are comparable.',
    takeaway: 'Bring relevant previous reports to appointments.',
  },
  {
    id: 'flags', icon: Activity, tag: 'LAB FLAGS', title: 'A flag is not a diagnosis.',
    body: 'A label such as “high” or “low” tells you how a value compares with the report’s stated range. It does not, by itself, explain the cause or clinical meaning.',
    takeaway: 'Ask what the flag means in your situation.',
  },
  {
    id: 'context', icon: HeartPulse, tag: 'PERSONAL CONTEXT', title: 'Context changes interpretation.',
    body: 'Symptoms, medicines, medical history, and other findings can all matter when a clinician interprets a result. A single value rarely tells the complete story.',
    takeaway: 'Share relevant context with your healthcare professional.',
  },
  {
    id: 'questions', icon: MessageCircleQuestion, tag: 'YOUR APPOINTMENT', title: 'Questions are part of good care.',
    body: 'It is reasonable to ask what a result measures, whether follow-up is needed, and how it fits with your symptoms or previous results.',
    takeaway: 'Write down questions before your appointment.',
  },
];

function FactCards() {
  const [facts, setFacts] = useState(FACTS);
  const [shuffleCount, setShuffleCount] = useState(0);

  const shuffleFacts = () => {
    setFacts((current) => {
      const shuffled = [...current];
      for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      if (shuffled.every((item, index) => item.id === current[index]?.id)) {
        shuffled.push(shuffled.shift()!);
      }
      return shuffled;
    });
    setShuffleCount((count) => count + 1);
  };

  return (
    <section id="facts" className="relative overflow-hidden py-20 sm:py-24">
      <div className="facts-blob" aria-hidden="true" />
      <div className="relative mx-auto max-w-[1180px] px-5 sm:px-8">
        <div className="mb-9 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading eyebrow="Small details. Big context." title={<>Quick facts.<br />Clearer questions.</>}>A few useful reminders for reading medical reports with care. Shuffle the cards to discover a different order.</SectionHeading>
          <button onClick={shuffleFacts} className="shuffle-button mb-9 inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl border-2 border-ink bg-cream px-4 py-3 text-xs font-black uppercase tracking-wide shadow-[0_4px_0_rgba(0,0,0,.12)] transition hover:-translate-y-0.5 hover:bg-lime sm:self-auto cursor-pointer" aria-label="Shuffle the medical report facts">
            <RotateCcw size={16} className={shuffleCount ? 'shuffle-icon' : ''} key={shuffleCount} /> Shuffle facts
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {facts.map(({ id, icon: Icon, tag, title, body, takeaway }, index) => (
            <article key={`${id}-${shuffleCount}`} className={`fact-card group relative flex min-h-[285px] flex-col overflow-hidden rounded-2xl border border-ink/10 p-6 sm:p-7 ${index % 6 === 1 ? 'bg-teal text-white' : index % 6 === 4 ? 'bg-[#fff0eb]' : 'bg-cream'}`} style={{ animationDelay: `${index * 45}ms` }}>
              <div className="flex items-start justify-between gap-4">
                <span className={`text-[9px] font-black uppercase tracking-[.16em] ${index % 6 === 1 ? 'text-lime' : 'text-muted'}`}>{tag}</span>
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${index % 6 === 1 ? 'border-white/40 bg-lime text-ink' : 'border-ink bg-lime text-ink'}`}><Icon size={21} /></span>
              </div>
              <h3 className="mt-8 max-w-[290px] text-[1.55rem] font-black leading-[1.04] tracking-[-.04em]">{title}</h3>
              <p className={`mt-3 text-sm leading-6 ${index % 6 === 1 ? 'text-white/75' : 'text-muted'}`}>{body}</p>
              <div className={`mt-auto flex translate-y-2 items-start gap-2 border-t pt-4 opacity-80 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 ${index % 6 === 1 ? 'border-white/20' : 'border-ink/10'}`}>
                <CheckCircle2 size={16} className={`mt-0.5 shrink-0 ${index % 6 === 1 ? 'text-lime' : 'text-teal'}`} />
                <p className="text-xs font-extrabold leading-5">{takeaway}</p>
              </div>
              <span className="pointer-events-none absolute -bottom-8 -right-4 text-[100px] font-black leading-none opacity-[.035]" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            </article>
          ))}
        </div>
        <p className="mt-6 max-w-3xl text-[11px] leading-5 text-muted">These are general report-reading reminders, not interpretations of an individual result. Laboratory results should be discussed with a qualified healthcare professional who knows your circumstances.</p>
      </div>
    </section>
  );
}

function Safety() {
  return (
    <section id="safety" className="mx-auto max-w-[1180px] px-5 py-20 sm:px-8 sm:py-24">
      <div className="grid gap-7 rounded-3xl border-2 border-ink bg-cream p-6 shadow-[0_8px_0_rgba(0,0,0,.07)] sm:p-9 lg:grid-cols-[.8fr_1.2fr] lg:items-center lg:p-12">
        <div>
          <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl border-2 border-ink bg-lime"><ShieldCheck size={27} /></div>
          <div className="mb-3 text-[10px] font-black uppercase tracking-[.16em] text-muted">Clarity with boundaries</div>
          <h2 className="display-font text-[clamp(2.4rem,4vw,3.8rem)] uppercase leading-[.96] text-ink">Helpful by design.<br />Honest about limits.</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-paper p-5"><h3 className="font-black text-ink">What MEDUCID is built to support</h3><p className="mt-2 text-sm leading-6 text-muted">Understanding terminology, organizing what a report says, and preparing questions for a healthcare professional.</p></div>
          <div className="rounded-2xl bg-[#fff0eb] p-5"><h3 className="font-black text-ink">What it should never replace</h3><p className="mt-2 text-sm leading-6 text-muted">A diagnosis, emergency assessment, treatment instructions, or a clinician’s judgment about your health.</p></div>
          <div className="sm:col-span-2"><p className="text-xs leading-6 text-muted">Reference ranges can vary by laboratory, method, age, sex, pregnancy status, and clinical context. Discuss results with a qualified clinician. For urgent or severe symptoms, seek appropriate urgent medical care rather than relying on a report explainer.</p></div>
        </div>
      </div>
    </section>
  );
}

const FAQS = [
  { q: 'Does MEDUCID diagnose a condition?', a: 'No. The intended role is to explain report language and help users prepare questions. Diagnosis and treatment decisions require a qualified healthcare professional and appropriate clinical context.' },
  { q: 'Can one abnormal value tell me what is wrong?', a: 'Not reliably. A result may depend on the lab’s reference range, your history, symptoms, medicines, and other findings. Do not make a medical decision from a single value or an automated summary.' },
  { q: 'What happens to the report I upload?', a: 'This prototype processes files with secure in-memory extraction. Storage, retention, and access controls are fully managed through your private authenticated dashboard.' },
  { q: 'What file types can this prototype select?', a: 'The current interface can select PDF, JPG, and PNG files directly in your browser. Seamlessly connect to our advanced AI-powered Simplifier on the Dashboard.' },
];

function FAQ() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id="faq" className="bg-[#eeede5] py-20 sm:py-24">
      <div className="mx-auto grid max-w-[1180px] gap-8 px-5 sm:px-8 lg:grid-cols-[.7fr_1.3fr]">
        <SectionHeading eyebrow="Good questions" title={<>Before you<br />upload.</>}>Medical data deserves care. Here are a few things every user should understand before using a report-explanation tool.</SectionHeading>
        <div className="grid content-start gap-3">
          {FAQS.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <article key={faq.q} className="rounded-2xl border border-ink/10 bg-cream px-5">
                <button
                  onClick={() => setOpenIndex(isOpen ? -1 : index)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left text-sm font-extrabold cursor-pointer"
                >
                  <span className="text-ink">{faq.q}</span>
                  <ChevronDown size={18} className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && <p className="max-w-2xl pb-5 text-sm leading-7 text-muted">{faq.a}</p>}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FinalCta({ onOpenDashboard }: { onOpenDashboard: () => void }) {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-[1180px] px-5 sm:px-8">
        <div className="relative overflow-hidden rounded-3xl border-2 border-ink bg-lime p-8 text-center shadow-[0_7px_0_rgba(0,0,0,.08)] sm:p-14">
          <span className="pointer-events-none absolute right-6 top-0 rotate-12 text-[140px] font-black leading-none text-black/5" aria-hidden="true">+</span>
          <h2 className="display-font mx-auto max-w-[700px] text-[clamp(2.4rem,4.5vw,3.8rem)] uppercase leading-[.96] text-ink">
            Your report deserves<br />a clearer explanation.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[#424b26]">
            Make room for understanding, better questions, and a more informed conversation with your healthcare professional.
          </p>
          <div className="mt-8">
            <button
              type="button"
              onClick={onOpenDashboard}
              className="inline-flex items-center justify-center gap-3 rounded-xl border-2 border-ink bg-ink px-6 py-4 text-xs font-black uppercase tracking-wider text-white shadow-[0_4px_0_rgba(0,0,0,.2)] transition hover:bg-neutral-800 cursor-pointer"
            >
              START WITH A REPORT <span className="grid h-6 w-6 place-items-center rounded-lg border border-ink bg-coral text-base text-ink">↗</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer({ onOpenDashboard }: { onOpenDashboard: () => void }) {
  return (
    <footer className="bg-ink py-10 text-white">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-5 sm:px-8 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="inline-block rounded-lg bg-paper p-2"><Brand footer /></div>
          <p className="mt-4 max-w-sm text-xs leading-6 text-white/60">Medical language, made easier to approach. Built to support conversations with healthcare professionals.</p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-3 text-xs font-bold text-white/75">
          <a href="#how-it-works" className="hover:text-lime">How it works</a>
          <a href="#features" className="hover:text-lime">Features</a>
          <a href="#facts" className="hover:text-lime">Quick facts</a>
          <a href="#safety" className="hover:text-lime">Safety</a>
          <a href="#faq" className="hover:text-lime">FAQ</a>
          <button
            type="button"
            onClick={onOpenDashboard}
            className="text-lime font-bold hover:underline cursor-pointer bg-transparent border-0"
          >
            Open Dashboard ↗
          </button>
        </div>
        <p className="max-w-xs text-[10px] leading-5 text-white/45">© 2026 MEDUCID · Educational information, not medical advice.</p>
      </div>
    </footer>
  );
}

export function ShowcaseWebsite({ onOpenDashboard }: { onOpenDashboard: () => void }) {
  return (
    <div className="min-h-screen w-full bg-paper text-ink font-sans antialiased">
      <Header onOpenDashboard={onOpenDashboard} />
      <main>
        <Hero onOpenDashboard={onOpenDashboard} />
        <HowItWorks />
        <Features />
        <FactCards />
        <Safety />
        <FAQ />
        <FinalCta onOpenDashboard={onOpenDashboard} />
      </main>
      <Footer onOpenDashboard={onOpenDashboard} />
    </div>
  );
}
