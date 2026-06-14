import React from 'react';
import { motion } from 'motion/react';

export function SidebarListSkeleton() {
  const dummyItems = Array.from({ length: 4 });
  return (
    <div className="divide-y divide-slate-100">
      {dummyItems.map((_, i) => (
        <div key={i} className="p-3 select-none flex justify-between items-start gap-3 animate-pulse">
          <div className="flex-1 space-y-2 py-1">
            {/* Kecamatan mockup */}
            <div className="h-2 bg-slate-200 rounded w-1/3" />
            {/* Client name mockup */}
            <div className="h-3.5 bg-slate-200 rounded w-3/4" />
            {/* Status mockup */}
            <div className="h-3 bg-slate-200 rounded w-1/2" />
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            {/* Kelurahan tag mockup */}
            <div className="h-4 bg-slate-150 rounded-md w-14" />
            {/* Visit status badge mockup */}
            <div className="h-3.5 bg-slate-150 rounded-full w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function BentoDetailsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 auto-rows-auto animate-pulse">
      
      {/* CARD 1: PROFILE BLOCK mockup */}
      <div className="col-span-1 md:col-span-2 bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div className="w-16 h-16 bg-slate-200 rounded-2xl shrink-0" />
        <div className="flex-1 space-y-3 w-full">
          <div className="flex flex-col sm:flex-row justify-between gap-2">
            <div className="h-7 bg-slate-200 rounded w-1/2" />
            <div className="h-5 bg-slate-200 rounded-full w-24" />
          </div>
          <div className="h-3 bg-slate-200 rounded w-1/3" />
          <div className="h-4 bg-slate-200 rounded w-2/3" />
        </div>
      </div>

      {/* CARD 2: ASSISTANCE STATUS mockup */}
      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col justify-between gap-4">
        <div className="space-y-2">
          <div className="h-3 bg-slate-200 rounded w-1/4" />
          <div className="h-5 bg-slate-200 rounded w-2/3" />
        </div>
        <div className="h-8 bg-slate-200 rounded-xl w-full" />
      </div>

      {/* CARD 3: VITAL METRICS mockup */}
      <div className="col-span-1 md:col-span-3 bg-slate-50/70 p-6 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="space-y-2.5 p-3 bg-white rounded-xl border border-slate-150">
            <div className="h-2.5 bg-slate-200 rounded w-1/2" />
            <div className="h-4.5 bg-slate-200 rounded w-3/4" />
          </div>
        ))}
      </div>

      {/* CARD 4: FIELD DOCUMENTATION SKELETON WITH SIGHT IMAGES */}
      <div className="col-span-1 md:col-span-2 bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-4 bg-slate-200 rounded w-1/3" />
          <div className="h-4.5 bg-slate-200 rounded w-12" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="aspect-square bg-slate-200 rounded-xl" />
          ))}
        </div>
      </div>

      {/* CARD 5: ADMIN OPERATIONS AND HISTORY GRAPH */}
      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
        <div className="h-4 bg-slate-200 rounded w-1/3" />
        <div className="space-y-3 pt-2">
          <div className="h-2.5 bg-slate-200 rounded w-full" />
          <div className="h-2.5 bg-slate-200 rounded w-5/6" />
          <div className="h-2.5 bg-slate-200 rounded w-4/6" />
        </div>
        <div className="h-9 bg-slate-200 rounded-xl w-full mt-4" />
      </div>

    </div>
  );
}
