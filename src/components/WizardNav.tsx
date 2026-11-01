'use client';

import React from 'react';
import { useLanguage } from './LanguageToggle';

interface WizardNavProps {
  currentStep: number;
  totalSteps?: number;
  onStepClick?: (step: number) => void;
  onNext?: () => void;
  onPrev?: () => void;
  isSaving?: boolean;
  isDirty?: boolean;
  lastSavedTime?: string | null;
  canProceed?: boolean;
  nextLabel?: string;
}

export default function WizardNav({
  currentStep,
  totalSteps = 7,
  onStepClick,
  isSaving = false,
  isDirty = false,
  lastSavedTime = null,
}: WizardNavProps) {
  const { t, lang } = useLanguage();

  const stepTitles = [
    t.step1_title,
    t.step2_title,
    t.step3_title,
    t.step4_title,
    t.step5_title,
    t.step6_title,
    t.step7_title,
  ];

  return (
    <div className="border-b border-gray-300 bg-white mb-6">
      {/* Header Info Bar */}
      <div className="bg-[#EEF1F6] px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-300 text-xs">
        <div className="font-bold text-[#AC3D47]">
          {t.step} {currentStep} {t.of} {totalSteps}: {stepTitles[currentStep - 1] || 'Application'}
        </div>
        <div className="flex items-center gap-2 mt-1 sm:mt-0 text-gray-600">
          {isSaving ? (
            <span className="text-amber-700 font-semibold">{lang === 'kn' ? 'ಕರಡು ಉಳಿಸಲಾಗುತ್ತಿದೆ...' : 'Saving draft...'}</span>
          ) : isDirty ? (
            <span className="text-amber-700 font-bold flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
              {lang === 'kn' ? 'ಉಳಿಸದ ಬದಲಾವಣೆಗಳಿವೆ' : 'Unsaved changes'}
            </span>
          ) : (
            <span className="text-emerald-700 font-medium">
              ✓ {t.saved_just_now} {lastSavedTime ? `(${lastSavedTime})` : ''}
            </span>
          )}
        </div>
      </div>

      {/* Responsive Step Progress Bar */}
      <div className="px-4 py-3 overflow-x-auto">
        <div className="flex items-center min-w-[580px] justify-between">
          {stepTitles.slice(0, totalSteps).map((title, idx) => {
            const stepNum = idx + 1;
            const isCurrent = stepNum === currentStep;
            const isCompleted = stepNum < currentStep;

            return (
              <button
                key={stepNum}
                type="button"
                onClick={() => onStepClick && onStepClick(stepNum)}
                className={`flex items-center gap-1.5 text-xs text-left focus:outline-none ${
                  isCurrent
                    ? 'font-bold text-[#AC3D47]'
                    : isCompleted
                    ? 'text-gray-700 hover:text-[#AC3D47]'
                    : 'text-gray-400 cursor-default'
                }`}
              >
                <div
                  className={`w-6 h-6 flex items-center justify-center font-bold text-[11px] border ${
                    isCurrent
                      ? 'bg-[#AC3D47] text-white border-[#AC3D47]'
                      : isCompleted
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-gray-100 text-gray-500 border-gray-300'
                  }`}
                >
                  {isCompleted ? '✓' : stepNum}
                </div>
                <span className="hidden lg:inline">{title.split(' ')[0]}</span>
                {stepNum < totalSteps && (
                  <div className={`h-[1px] w-4 ${isCompleted ? 'bg-emerald-600' : 'bg-gray-300'}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
