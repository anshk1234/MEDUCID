'use client';

import React from 'react';
import { ShieldAlert } from 'lucide-react';

export function NoticeBanner() {
  return (
    <div className="bg-[#F3F1EB] border-b border-[#E7E4DC] px-4 py-2 text-xs text-[#525252] flex items-center justify-center shrink-0">
      <div className="flex items-center gap-2 font-normal tracking-tight text-center truncate">
        <ShieldAlert className="w-3.5 h-3.5 text-[#115E59] shrink-0 inline" />
        <span>
          <strong className="text-[#171717] font-medium">Synthetic / de-identified data.</strong> Clinical interpretation and diagnosis belong to a qualified medical professional.
        </span>
      </div>
    </div>
  );
}
