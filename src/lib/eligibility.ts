import { ApplicationFormData, ApplicationComputed, ScholarshipRules } from './types';

export function evaluateEligibility(
  data: Partial<ApplicationFormData>,
  rules: ScholarshipRules = {},
  scholarshipCode = 'MNC'
): ApplicationComputed['eligibility_flags'] {
  const warnings: string[] = [];
  const errors: string[] = [];

  let income_exceeded = false;
  let backlog_disqualified = false;
  let cet_disqualified = false;
  let other_assistance_exceeded = false;
  let amount_warn_exceeded = false;

  // 1. Income limit rule (MNC: max Rs. 3,00,000)
  const maxIncome = rules.income_limit ?? (scholarshipCode === 'MNC' ? 300000 : 500000);
  if (data.family_annual_income !== undefined && data.family_annual_income > maxIncome) {
    income_exceeded = true;
    const formattedMax = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(maxIncome);
    const msg = `Annual family income exceeds maximum limit of ${formattedMax} per annum.`;
    errors.push(msg);
  }

  // 2. CET admission rule (MNC: only CET admitted)
  if (rules.cet_required ?? (scholarshipCode === 'MNC')) {
    if (data.admitted_through_cet === false) {
      cet_disqualified = true;
      errors.push('Student must be admitted through CET (Common Entrance Test). Management/ComedK quota is not eligible.');
    }
  }

  // 3. Backlog rule (MNC: years 2-4 requires no backlog history)
  if ((rules.allow_backlog === false || scholarshipCode === 'MNC') && data.year_of_study && data.year_of_study > 1) {
    if (data.has_backlog_history === true) {
      backlog_disqualified = true;
      errors.push('Student has active or past backlog history. Only students with zero backlogs are eligible.');
    }
  }

  // 4. Other financial assistance rule (max 30% of annual fee)
  if (data.annual_fee && data.getting_other_scholarship && data.other_scholarship_amount_per_month) {
    const annualOtherAssistance = data.other_scholarship_amount_per_month * 12;
    const maxAllowedAssistance = (rules.max_assistance_pct ?? 30) / 100 * data.annual_fee;
    if (annualOtherAssistance > maxAllowedAssistance) {
      other_assistance_exceeded = true;
      const pct = Math.round((annualOtherAssistance / data.annual_fee) * 100);
      errors.push(`Other financial assistance received (${pct}% of fee) exceeds the allowed limit of 30% of total fee.`);
    }
  }

  // 5. Scholarship amount requested (soft warning if yearly requested > 50% of annual fee)
  if (data.annual_fee && data.scholarship_amount_required_per_month) {
    const annualRequested = data.scholarship_amount_required_per_month * 12;
    const maxFeePct = (rules.max_scholarship_pct ?? 50) / 100;
    const maxRequestedAllowed = maxFeePct * data.annual_fee;
    if (annualRequested > maxRequestedAllowed) {
      amount_warn_exceeded = true;
      warnings.push(
        `Requested scholarship amount (Rs. ${annualRequested.toLocaleString('en-IN')}/yr) exceeds the 50% guideline limit of Rs. ${Math.round(maxRequestedAllowed).toLocaleString('en-IN')}/yr. Final sanction will be capped by the committee.`
      );
    }
  }

  // Bank name resemblance warning (soft warning)
  if (data.full_name && data.bank_acc_holder_name) {
    const cleanStudent = data.full_name.trim().toLowerCase().replace(/[^a-z]/g, '');
    const cleanBank = data.bank_acc_holder_name.trim().toLowerCase().replace(/[^a-z]/g, '');
    if (cleanStudent.length > 3 && cleanBank.length > 3 && !cleanBank.includes(cleanStudent.slice(0, 4)) && !cleanStudent.includes(cleanBank.slice(0, 4))) {
      warnings.push('Bank account holder name does not closely match the student name. Account must be in student’s own name.');
    }
  }

  const passed_all_hard_rules = errors.length === 0;

  return {
    passed_all_hard_rules,
    income_exceeded,
    backlog_disqualified,
    cet_disqualified,
    other_assistance_exceeded,
    amount_warn_exceeded,
    warnings,
    errors,
  };
}
