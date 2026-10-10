'use client';

import React from 'react';
import { ApplicationComputed } from '@/lib/types';

interface EligibilityPanelProps {
  computed?: ApplicationComputed;
  scholarshipCode?: string;
}

export default function EligibilityPanel({ computed, scholarshipCode = 'MNC' }: EligibilityPanelProps) {
  if (!computed || !computed.eligibility_flags) return null;

  const { passed_all_hard_rules, errors, warnings } = computed.eligibility_flags;

  return (
    <div
      className={`border p-4 my-4 ${
        errors.length > 0
          ? 'bg-red-50 border-red-300 text-red-900'
          : warnings.length > 0
          ? 'bg-amber-50 border-amber-300 text-amber-900'
          : 'bg-emerald-50 border-emerald-300 text-emerald-900'
      }`}
      role="region"
      aria-live="polite"
    >
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-current/20">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm tracking-wide uppercase">
            Live Eligibility Status ({scholarshipCode})
          </span>
          <span
            className={`text-xs px-2 py-0.5 font-bold uppercase ${
              passed_all_hard_rules
                ? 'bg-emerald-700 text-white'
                : 'bg-red-700 text-white'
            }`}
          >
            {passed_all_hard_rules ? 'Eligible to Submit' : 'Action Required'}
          </span>
        </div>
        {computed.merit_score > 0 && (
          <div className="text-xs font-semibold">
            Merit Metric: <span className="font-mono text-sm">{computed.merit_score.toFixed(2)}</span>
          </div>
        )}
      </div>

      {errors.length > 0 && (
        <div className="space-y-1 mb-2 text-xs">
          <div className="font-bold">Submission Blocking Conditions:</div>
          <ul className="list-disc list-inside space-y-0.5">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="space-y-1 text-xs">
          <div className="font-bold">Advisory Notices:</div>
          <ul className="list-disc list-inside space-y-0.5">
            {warnings.map((warn, i) => (
              <li key={i}>{warn}</li>
            ))}
          </ul>
        </div>
      )}

      {errors.length === 0 && warnings.length === 0 && (
        <p className="text-xs text-emerald-800">
          ✓ All entered academic and income details currently satisfy the official eligibility guidelines for {scholarshipCode}.
        </p>
      )}
    </div>
  );
}
