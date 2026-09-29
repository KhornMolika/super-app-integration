export type FsaEntityType = 'ADMINISTRATIVE' | 'SECTOR_REGULATOR' | 'OVERSIGHT_UNIT';

export interface FsaOrganizationDef {
  name: string;
  code: string;
  domain: string;
  description: string;
  contactEmail: string;
  entityType: FsaEntityType;
  entityTypeLabel: string;
  parentAuthority: string;
  parentMinistry: string;
}

export const FSA_AUTHORITY_NAME = 'Non-Bank Financial Services Authority (FSA)';
export const FSA_PARENT_MINISTRY = 'Ministry of Economy and Finance (MEF)';

export const FSA_ORGANIZATIONS: FsaOrganizationDef[] = [
  // 1-4. Administrative & Policy Body (General Secretariat of FSA)
  {
    name: 'Financial Technology Center (FTC)',
    code: 'FTC',
    domain: 'fintech.fsa.gov.kh',
    description: 'Houses FinTech Development, FinTech Regulation, and Training & Dissemination Divisions under the General Secretariat of the FSA.',
    contactEmail: 'fintech@fsa.gov.kh',
    entityType: 'ADMINISTRATIVE',
    entityTypeLabel: 'Administrative & Policy Body',
    parentAuthority: FSA_AUTHORITY_NAME,
    parentMinistry: FSA_PARENT_MINISTRY,
  },
  {
    name: 'General Affairs Dept. (GAD)',
    code: 'GAD',
    domain: 'gad.fsa.gov.kh',
    description: 'Oversees Administrative, Finance, and Information Technology Management Divisions under the General Secretariat of the FSA.',
    contactEmail: 'general.affairs@fsa.gov.kh',
    entityType: 'ADMINISTRATIVE',
    entityTypeLabel: 'Administrative & Policy Body',
    parentAuthority: FSA_AUTHORITY_NAME,
    parentMinistry: FSA_PARENT_MINISTRY,
  },
  {
    name: 'Policy Dept. (PD)',
    code: 'PD',
    domain: 'policy.fsa.gov.kh',
    description: 'Formulates policies across Financial Policy, Financial Stability, and Macroeconomic Statistics Divisions under the General Secretariat of the FSA.',
    contactEmail: 'policy@fsa.gov.kh',
    entityType: 'ADMINISTRATIVE',
    entityTypeLabel: 'Administrative & Policy Body',
    parentAuthority: FSA_AUTHORITY_NAME,
    parentMinistry: FSA_PARENT_MINISTRY,
  },
  {
    name: 'Technical and Legal Affairs Dept. (TLAD)',
    code: 'TLAD',
    domain: 'tlad.fsa.gov.kh',
    description: 'Handles Legal Affairs, Financial Intelligence, and Partnership Divisions under the General Secretariat of the FSA.',
    contactEmail: 'legal@fsa.gov.kh',
    entityType: 'ADMINISTRATIVE',
    entityTypeLabel: 'Administrative & Policy Body',
    parentAuthority: FSA_AUTHORITY_NAME,
    parentMinistry: FSA_PARENT_MINISTRY,
  },
  // 5-10. Sector-Specific Regulators
  {
    name: 'Insurance Regulator of Cambodia (IRC)',
    code: 'IRC',
    domain: 'irc.gov.kh',
    description: 'Regulatory authority governing insurance markets, underwriting operations, and policyholder protections in Cambodia.',
    contactEmail: 'info@irc.gov.kh',
    entityType: 'SECTOR_REGULATOR',
    entityTypeLabel: 'Sector-Specific Regulator',
    parentAuthority: FSA_AUTHORITY_NAME,
    parentMinistry: FSA_PARENT_MINISTRY,
  },
  {
    name: 'Securities and Exchange Regulator of Cambodia (SERC)',
    code: 'SERC',
    domain: 'serc.gov.kh',
    description: 'Regulates securities, public offerings, derivatives, and capital markets in Cambodia.',
    contactEmail: 'info@serc.gov.kh',
    entityType: 'SECTOR_REGULATOR',
    entityTypeLabel: 'Sector-Specific Regulator',
    parentAuthority: FSA_AUTHORITY_NAME,
    parentMinistry: FSA_PARENT_MINISTRY,
  },
  {
    name: 'Social Security Regulator (SSR)',
    code: 'SSR',
    domain: 'ssr.gov.kh',
    description: 'Regulates and oversees pension funds, social health insurance, and occupational risk schemes.',
    contactEmail: 'info@ssr.gov.kh',
    entityType: 'SECTOR_REGULATOR',
    entityTypeLabel: 'Sector-Specific Regulator',
    parentAuthority: FSA_AUTHORITY_NAME,
    parentMinistry: FSA_PARENT_MINISTRY,
  },
  {
    name: 'Trust Regulator (TR)',
    code: 'TR',
    domain: 'trustregulator.gov.kh',
    description: 'Regulates, inspects, and develops trust operations, commercial trusts, and public/private trust entities.',
    contactEmail: 'info@trustregulator.gov.kh',
    entityType: 'SECTOR_REGULATOR',
    entityTypeLabel: 'Sector-Specific Regulator',
    parentAuthority: FSA_AUTHORITY_NAME,
    parentMinistry: FSA_PARENT_MINISTRY,
  },
  {
    name: 'Accounting and Auditing Regulator (ACAR)',
    code: 'ACAR',
    domain: 'acar.gov.kh',
    description: 'Regulates accounting professions, statutory audits, and financial reporting standards across Cambodia.',
    contactEmail: 'info@acar.gov.kh',
    entityType: 'SECTOR_REGULATOR',
    entityTypeLabel: 'Sector-Specific Regulator',
    parentAuthority: FSA_AUTHORITY_NAME,
    parentMinistry: FSA_PARENT_MINISTRY,
  },
  {
    name: 'Real Estate Business and Pawnshop Regulator (RPR)',
    code: 'RPR',
    domain: 'rpr.gov.kh',
    description: 'Regulates real estate development businesses, evaluation services, and pawnshop operations.',
    contactEmail: 'info@rpr.gov.kh',
    entityType: 'SECTOR_REGULATOR',
    entityTypeLabel: 'Sector-Specific Regulator',
    parentAuthority: FSA_AUTHORITY_NAME,
    parentMinistry: FSA_PARENT_MINISTRY,
  },
  // 11. Oversight & Compliance Unit
  {
    name: 'Internal Audit Unit (IAU)',
    code: 'IAU',
    domain: 'iau.fsa.gov.kh',
    description: 'Conducts internal audits, governance assessments, and regulatory compliance reviews across FSA departments.',
    contactEmail: 'audit@fsa.gov.kh',
    entityType: 'OVERSIGHT_UNIT',
    entityTypeLabel: 'Oversight & Compliance Unit',
    parentAuthority: FSA_AUTHORITY_NAME,
    parentMinistry: FSA_PARENT_MINISTRY,
  },
];

export const FSA_ORGANIZATION_GROUPS = [
  {
    label: 'Administrative & Policy Body (FSA)',
    type: 'ADMINISTRATIVE' as FsaEntityType,
    organizations: FSA_ORGANIZATIONS.filter((o) => o.entityType === 'ADMINISTRATIVE'),
  },
  {
    label: 'Sector-Specific Regulators (FSA)',
    type: 'SECTOR_REGULATOR' as FsaEntityType,
    organizations: FSA_ORGANIZATIONS.filter((o) => o.entityType === 'SECTOR_REGULATOR'),
  },
  {
    label: 'Oversight & Compliance Unit (FSA)',
    type: 'OVERSIGHT_UNIT' as FsaEntityType,
    organizations: FSA_ORGANIZATIONS.filter((o) => o.entityType === 'OVERSIGHT_UNIT'),
  },
];

export function getOrganizationDef(input?: string): FsaOrganizationDef | undefined {
  if (!input || !input.trim()) return FSA_ORGANIZATIONS[0];
  const clean = input.trim();
  const lower = clean.toLowerCase();

  const exact = FSA_ORGANIZATIONS.find(
    (o) => o.code.toLowerCase() === lower || o.name.toLowerCase() === lower,
  );
  if (exact) return exact;

  const hasWord = (word: string) => new RegExp(`\\b${word}\\b`, 'i').test(clean);

  if (hasWord('fintech') || hasWord('ftc') || lower.includes('financial technology') || lower.includes('general secretariat')) {
    return FSA_ORGANIZATIONS.find((o) => o.code === 'FTC');
  }
  if (hasWord('gad') || lower.includes('general affair')) {
    return FSA_ORGANIZATIONS.find((o) => o.code === 'GAD');
  }
  if (hasWord('pd') || lower.includes('policy dept') || lower.includes('policy department')) {
    return FSA_ORGANIZATIONS.find((o) => o.code === 'PD');
  }
  if (hasWord('tlad') || lower.includes('technical and legal') || lower.includes('legal affair')) {
    return FSA_ORGANIZATIONS.find((o) => o.code === 'TLAD');
  }
  if (hasWord('irc') || lower.includes('insurance')) {
    return FSA_ORGANIZATIONS.find((o) => o.code === 'IRC');
  }
  if (hasWord('serc') || lower.includes('securities') || lower.includes('exchange')) {
    return FSA_ORGANIZATIONS.find((o) => o.code === 'SERC');
  }
  if (hasWord('ssr') || lower.includes('social security')) {
    return FSA_ORGANIZATIONS.find((o) => o.code === 'SSR');
  }
  if (hasWord('tr') || lower.includes('trust regulator') || hasWord('trust')) {
    return FSA_ORGANIZATIONS.find((o) => o.code === 'TR');
  }
  if (hasWord('acar') || lower.includes('accounting') || lower.includes('auditing')) {
    return FSA_ORGANIZATIONS.find((o) => o.code === 'ACAR');
  }
  if (hasWord('rpr') || lower.includes('real estate') || lower.includes('pawnshop')) {
    return FSA_ORGANIZATIONS.find((o) => o.code === 'RPR');
  }
  if (hasWord('iau') || lower.includes('internal audit')) {
    return FSA_ORGANIZATIONS.find((o) => o.code === 'IAU');
  }

  return undefined;
}

export function getOrganizationCode(input?: string): string {
  const def = getOrganizationDef(input);
  if (def) return def.code;
  if (!input || !input.trim()) return 'FTC';
  return input.trim().slice(0, 4).toUpperCase();
}

export function getOrganizationFullName(input?: string): string {
  const def = getOrganizationDef(input);
  if (def) return def.name;
  return input?.trim() || FSA_ORGANIZATIONS[0].name;
}

export function getOrganizationEntityType(input?: string): string {
  const def = getOrganizationDef(input);
  return def?.entityTypeLabel || 'Subordinate Entity';
}
