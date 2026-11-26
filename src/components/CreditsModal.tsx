'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ExternalLink } from 'lucide-react';

interface BuilderProfile {
  name: string;
  handle: string;
  url: string;
  avatar: string;
}

const BUILDERS: BuilderProfile[] = [
  {
    name: 'anshk1234',
    handle: '@anshk1234',
    url: 'https://github.com/anshk1234',
    avatar: 'https://github.com/anshk1234.png?size=96',
  },
  {
    name: 'aryanyadav78',
    handle: '@aryanyadav78',
    url: 'https://github.com/aryanyadav78',
    avatar: 'https://github.com/aryanyadav78.png?size=96',
  },
  {
    name: 'punit-jangid',
    handle: '@punit-jangid',
    url: 'https://github.com/punit-jangid',
    avatar: 'https://github.com/punit-jangid.png?size=96',
  },
  {
    name: 'AkXiom',
    handle: '@AkXiom',
    url: 'https://github.com/AkXiom',
    avatar: 'https://github.com/AkXiom.png?size=96',
  },
  {
    name: 'nixshay',
    handle: '@nixshay',
    url: 'https://github.com/nixshay',
    avatar: 'https://github.com/nixshay.png?size=96',
  },
  {
    name: 'Shivraj Jat',
    handle: '@jatshivraj371-ship-it',
    url: 'https://github.com/jatshivraj371-ship-it',
    avatar: 'https://github.com/jatshivraj371-ship-it.png?size=96',
  },
];

export function CreditsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 backdrop-blur-[2px] p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="credits-modal-title"
    >
      <div
        className="w-full max-w-xl bg-cream border-2 border-ink rounded-2xl shadow-[8px_8px_0_#141414] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-6 pb-4 border-b border-ink/15 bg-paper">
          <div className="space-y-2">
            <span className="inline-block font-mono text-[10px] font-black uppercase tracking-[0.06em] bg-lime text-ink border border-ink px-2.5 py-0.5 rounded-full">
              Team MEDUCID
            </span>
            <h2
              id="credits-modal-title"
              className="font-serif text-2xl sm:text-3xl font-bold text-ink tracking-[-0.02em]"
            >
              Builders &amp; Credits
            </h2>
            <p className="font-sans text-xs sm:text-sm text-muted leading-relaxed">
              A huge thank you to the builders behind MEDUCID, teamwork that made this project truly memorable:
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl border-2 border-ink/20 bg-cream hover:bg-lime hover:border-ink text-ink transition-colors cursor-pointer shrink-0"
            aria-label="Close credits"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Builders List */}
        <div className="p-6 space-y-2.5 max-h-[65vh] overflow-y-auto">
          <div className="grid grid-cols-12 px-3 pb-1 text-[10px] font-mono uppercase tracking-[0.06em] text-muted font-bold">
            <span className="col-span-6">Builder</span>
            <span className="col-span-6 text-right">GitHub</span>
          </div>

          {BUILDERS.map((b) => (
            <a
              key={b.url}
              href={b.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#eeede6] hover:bg-lime/40 border border-[#d7d6cf] hover:border-ink transition-all group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={b.avatar}
                  alt={b.name}
                  width={36}
                  height={36}
                  className="w-9 h-9 rounded-full border-2 border-ink bg-cream object-cover shrink-0"
                />
                <span className="font-sans text-sm font-bold text-ink truncate">
                  {b.name}
                </span>
              </div>

              <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-teal group-hover:text-ink shrink-0">
                <span>{b.handle}</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" />
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}

export function CreditsButton({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-ink bg-cream hover:bg-lime border-2 border-ink rounded-full shadow-[2px_2px_0_#141414] hover:shadow-[3px_3px_0_#141414] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer ${className}`}
        title="Builders & Credits"
      >
        <span>credits💗</span>
      </button>
      <CreditsModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
