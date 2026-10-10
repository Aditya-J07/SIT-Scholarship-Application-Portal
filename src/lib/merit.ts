import { ApplicationRecord, ApplicationFormData } from './types';

export function calculatePercentage(obtained: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Number(((obtained / total) * 100).toFixed(2));
}

export function calculateMeritScore(data: Partial<ApplicationFormData>): number {
  const year = data.year_of_study || 1;
  if (year === 1) {
    if (data.marks_obtained && data.marks_gross_total) {
      return calculatePercentage(data.marks_obtained, data.marks_gross_total);
    }
    return 0;
  } else {
    // Years 2 to 4: based on CGPA (on 10.0 scale, multiplied by 10 to give equivalent 0-100 merit metric)
    if (data.cgpa !== undefined && data.cgpa !== null) {
      return Number((data.cgpa * 10).toFixed(2));
    }
    // Fallback to percentage if CGPA not present
    if (data.marks_obtained && data.marks_gross_total) {
      return calculatePercentage(data.marks_obtained, data.marks_gross_total);
    }
    return 0;
  }
}

export interface YearGroupedApplicants {
  year: number;
  total: number;
  topTen: ApplicationRecord[];
  all: ApplicationRecord[];
}

export function rankApplicantsByYear(applications: ApplicationRecord[]): Record<number, YearGroupedApplicants> {
  // Only submitted or under_review or shortlisted/accepted/rejected applications
  const validApps = applications.filter((a) => a.status !== 'draft' && a.status !== 'withdrawn');

  const groups: Record<number, YearGroupedApplicants> = {
    1: { year: 1, total: 0, topTen: [], all: [] },
    2: { year: 2, total: 0, topTen: [], all: [] },
    3: { year: 3, total: 0, topTen: [], all: [] },
    4: { year: 4, total: 0, topTen: [], all: [] },
  };

  validApps.forEach((app) => {
    const year = app.data.year_of_study || 1;
    if (groups[year]) {
      groups[year].all.push(app);
    }
  });

  // Sort each year by merit score desc, then income asc (means: lower income breaks tie)
  Object.keys(groups).forEach((key) => {
    const yr = Number(key);
    groups[yr].all.sort((a, b) => {
      if (b.merit_score !== a.merit_score) {
        return b.merit_score - a.merit_score;
      }
      const incA = a.data.family_annual_income || 0;
      const incB = b.data.family_annual_income || 0;
      return incA - incB; // Lower income preferred on tie
    });
    groups[yr].total = groups[yr].all.length;
    groups[yr].topTen = groups[yr].all.slice(0, 10);
  });

  return groups;
}
