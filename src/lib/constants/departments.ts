// SIT Controlled Departments and Course Mappings (Phase 3c Item 4)

export interface DepartmentInfo {
  code: string;
  name: string;
}

export const SIT_DEPARTMENTS: readonly DepartmentInfo[] = [
  { code: 'CSE', name: 'Computer Science and Engineering' },
  { code: 'ISE', name: 'Information Science and Engineering' },
  { code: 'AIDS', name: 'Artificial Intelligence and Data Science' },
  { code: 'ECE', name: 'Electronics and Communication Engineering' },
  { code: 'EEE', name: 'Electrical and Electronics Engineering' },
  { code: 'ME', name: 'Mechanical Engineering' },
  { code: 'CV', name: 'Civil Engineering' },
  { code: 'EIE', name: 'Electronics and Instrumentation Engineering' },
  { code: 'CH', name: 'Chemical Engineering' },
  { code: 'BT', name: 'Biotechnology' },
  { code: 'MCA', name: 'Master of Computer Applications (MCA)' },
  { code: 'MBA', name: 'Master of Business Administration (MBA)' },
] as const;

export const SIT_DEPARTMENT_CODES = SIT_DEPARTMENTS.map((d) => d.code);

export function normalizeDepartment(val?: string | null): string | null {
  if (!val || typeof val !== 'string') return null;
  const clean = val.trim();
  if (!clean) return null;

  const upper = clean.toUpperCase();

  // 1. Direct code match (e.g. "ME", "CSE")
  const matchByCode = SIT_DEPARTMENTS.find((d) => d.code.toUpperCase() === upper);
  if (matchByCode) return matchByCode.code;

  // 2. Strip degree prefixes like "B.E. in ", "B.E. ", "B.Tech in ", "B.Tech ", "M.Tech in ", etc.
  const stripped = upper
    .replace(/^(B\.?E\.?|B\.?TECH|M\.?TECH)\s+(IN\s+)?/i, '')
    .trim();

  // Direct code match on stripped string
  const matchStrippedCode = SIT_DEPARTMENTS.find((d) => d.code.toUpperCase() === stripped);
  if (matchStrippedCode) return matchStrippedCode.code;

  // 3. Exact full name match (e.g. "Mechanical Engineering")
  const matchByName = SIT_DEPARTMENTS.find(
    (d) => d.name.toUpperCase() === upper || d.name.toUpperCase() === stripped
  );
  if (matchByName) return matchByName.code;

  // 4. Fallbacks for common alternate full names or aliases
  if (stripped === 'COMPUTER SCIENCE' || stripped === 'CS') return 'CSE';
  if (stripped === 'INFORMATION SCIENCE' || stripped === 'IS') return 'ISE';
  if (stripped === 'CIVIL' || stripped === 'CIVIL ENGG') return 'CV';
  if (stripped === 'MECHANICAL' || stripped === 'MECHANICAL ENGG') return 'ME';
  if (stripped === 'AI & DS' || stripped === 'AI-DS' || stripped === 'ARTIFICIAL INTELLIGENCE & DATA SCIENCE') return 'AIDS';
  if (stripped === 'MASTER OF COMPUTER APPLICATIONS') return 'MCA';
  if (stripped === 'MASTER OF BUSINESS ADMINISTRATION') return 'MBA';

  return null;
}

