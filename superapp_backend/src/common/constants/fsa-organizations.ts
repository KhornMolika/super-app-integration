import { OrganizationStatus } from '../../organizations/entities/organization.entity';

export interface FsaOrganizationDef {
  name: string;
  code: string;
  parentAuthority?: string | null;
  description?: string;
  status: OrganizationStatus;
  parentId?: string | null;
}

/** Official sector regulator codes under the Non-Bank Financial Services Authority (FSA). */
export const SECTOR_REGULATOR_CODES = [
  'IRC',
  'SERC',
  'SSR',
  'TR',
  'ACAR',
  'RPR',
] as const;

export type SectorRegulatorCode = (typeof SECTOR_REGULATOR_CODES)[number];

/**
 * Canonical FSA Organizations based on official Organization entity attributes
 * in branch molika (seeded by access-control/seeder.service.ts).
 */
export const FSA_ORGANIZATIONS: FsaOrganizationDef[] = [
  // Central Root Authority
  {
    name: 'Non-Bank Financial Services Authority',
    code: 'FSA',
    parentAuthority: null,
    description:
      'Non-Bank Financial Services Authority of Cambodia (Central Governing Authority)',
    status: OrganizationStatus.ACTIVE,
  },
  // Administrative & Policy Bodies (General Secretariat of FSA)
  {
    name: 'Financial Technology Center',
    code: 'FTC',
    parentAuthority: 'Non-Bank Financial Services Authority',
    description: 'Financial Technology Center of FSA',
    status: OrganizationStatus.ACTIVE,
  },
  {
    name: 'General Affairs Department',
    code: 'GAD',
    parentAuthority: 'Non-Bank Financial Services Authority',
    description: 'General Affairs Department of FSA',
    status: OrganizationStatus.ACTIVE,
  },
  {
    name: 'Policy Department',
    code: 'PD',
    parentAuthority: 'Non-Bank Financial Services Authority',
    description: 'Policy Department of FSA',
    status: OrganizationStatus.ACTIVE,
  },
  {
    name: 'Technical and Legal Affairs Department',
    code: 'TLAD',
    parentAuthority: 'Non-Bank Financial Services Authority',
    description: 'Technical and Legal Affairs Department of FSA',
    status: OrganizationStatus.ACTIVE,
  },
  // Oversight & Compliance Unit
  {
    name: 'Internal Audit Unit',
    code: 'IAU',
    parentAuthority: 'Non-Bank Financial Services Authority',
    description: 'Internal Audit Unit of FSA',
    status: OrganizationStatus.ACTIVE,
  },
  // Sector-Specific Regulators
  {
    name: 'Securities and Exchange Regulator of Cambodia',
    code: 'SERC',
    parentAuthority: 'Non-Bank Financial Services Authority',
    description: 'Securities and Exchange Regulator of Cambodia',
    status: OrganizationStatus.ACTIVE,
  },
  {
    name: 'Social Security Regulator',
    code: 'SSR',
    parentAuthority: 'Non-Bank Financial Services Authority',
    description: 'Social Security Regulator of Cambodia',
    status: OrganizationStatus.ACTIVE,
  },
  {
    name: 'Trust Regulator',
    code: 'TR',
    parentAuthority: 'Non-Bank Financial Services Authority',
    description: 'Trust Regulator of Cambodia',
    status: OrganizationStatus.ACTIVE,
  },
  {
    name: 'Accounting and Auditing Regulator',
    code: 'ACAR',
    parentAuthority: 'Non-Bank Financial Services Authority',
    description: 'Accounting and Auditing Regulator of Cambodia',
    status: OrganizationStatus.ACTIVE,
  },
  {
    name: 'Insurance Regulator of Cambodia',
    code: 'IRC',
    parentAuthority: 'Non-Bank Financial Services Authority',
    description: 'Insurance Regulator of Cambodia',
    status: OrganizationStatus.ACTIVE,
  },
  {
    name: 'Real Estate Business and Pawnshop Regulator',
    code: 'RPR',
    parentAuthority: 'Non-Bank Financial Services Authority',
    description: 'Real Estate Business and Pawnshop Regulator of Cambodia',
    status: OrganizationStatus.ACTIVE,
  },
];

export function resolveOrganizationDetails(input?: string): {
  name: string;
  code: string;
  parentAuthority?: string | null;
  description?: string;
  status?: OrganizationStatus;
} {
  const defaultOrg =
    FSA_ORGANIZATIONS.find((o) => o.code === 'FTC') || FSA_ORGANIZATIONS[0];

  if (!input || !input.trim()) {
    return {
      name: defaultOrg.name,
      code: defaultOrg.code,
      parentAuthority: defaultOrg.parentAuthority,
      description: defaultOrg.description,
      status: defaultOrg.status,
    };
  }

  const clean = input.trim();
  const lower = clean.toLowerCase();

  // 1. Exact match by code
  const exactByCode = FSA_ORGANIZATIONS.find(
    (o) => o.code.toLowerCase() === lower,
  );
  if (exactByCode) {
    return {
      name: exactByCode.name,
      code: exactByCode.code,
      parentAuthority: exactByCode.parentAuthority,
      description: exactByCode.description,
      status: exactByCode.status,
    };
  }

  // 2. Exact match by name
  const exactByName = FSA_ORGANIZATIONS.find(
    (o) => o.name.toLowerCase() === lower,
  );
  if (exactByName) {
    return {
      name: exactByName.name,
      code: exactByName.code,
      parentAuthority: exactByName.parentAuthority,
      description: exactByName.description,
      status: exactByName.status,
    };
  }

  // 3. Match combinations like "Insurance Regulator of Cambodia (IRC)"
  const parenMatch = FSA_ORGANIZATIONS.find(
    (o) =>
      lower === `${o.name.toLowerCase()} (${o.code.toLowerCase()})` ||
      lower.startsWith(o.name.toLowerCase()) ||
      lower.includes(`(${o.code.toLowerCase()})`),
  );
  if (parenMatch) {
    return {
      name: parenMatch.name,
      code: parenMatch.code,
      parentAuthority: parenMatch.parentAuthority,
      description: parenMatch.description,
      status: parenMatch.status,
    };
  }

  const hasWord = (word: string) =>
    new RegExp(`\\b${word}\\b`, 'i').test(clean);

  if (
    hasWord('fintech') ||
    hasWord('ftc') ||
    lower.includes('financial technology') ||
    lower.includes('general secretariat')
  ) {
    const org = FSA_ORGANIZATIONS.find((o) => o.code === 'FTC')!;
    return {
      name: org.name,
      code: org.code,
      parentAuthority: org.parentAuthority,
      description: org.description,
      status: org.status,
    };
  }
  if (hasWord('gad') || lower.includes('general affair')) {
    const org = FSA_ORGANIZATIONS.find((o) => o.code === 'GAD')!;
    return {
      name: org.name,
      code: org.code,
      parentAuthority: org.parentAuthority,
      description: org.description,
      status: org.status,
    };
  }
  if (
    hasWord('pd') ||
    lower.includes('policy dept') ||
    lower.includes('policy department')
  ) {
    const org = FSA_ORGANIZATIONS.find((o) => o.code === 'PD')!;
    return {
      name: org.name,
      code: org.code,
      parentAuthority: org.parentAuthority,
      description: org.description,
      status: org.status,
    };
  }
  if (
    hasWord('tlad') ||
    lower.includes('technical and legal') ||
    lower.includes('legal affair')
  ) {
    const org = FSA_ORGANIZATIONS.find((o) => o.code === 'TLAD')!;
    return {
      name: org.name,
      code: org.code,
      parentAuthority: org.parentAuthority,
      description: org.description,
      status: org.status,
    };
  }
  if (hasWord('irc') || lower.includes('insurance')) {
    const org = FSA_ORGANIZATIONS.find((o) => o.code === 'IRC')!;
    return {
      name: org.name,
      code: org.code,
      parentAuthority: org.parentAuthority,
      description: org.description,
      status: org.status,
    };
  }
  if (
    hasWord('serc') ||
    lower.includes('securities') ||
    lower.includes('exchange')
  ) {
    const org = FSA_ORGANIZATIONS.find((o) => o.code === 'SERC')!;
    return {
      name: org.name,
      code: org.code,
      parentAuthority: org.parentAuthority,
      description: org.description,
      status: org.status,
    };
  }
  if (hasWord('ssr') || lower.includes('social security')) {
    const org = FSA_ORGANIZATIONS.find((o) => o.code === 'SSR')!;
    return {
      name: org.name,
      code: org.code,
      parentAuthority: org.parentAuthority,
      description: org.description,
      status: org.status,
    };
  }
  if (hasWord('tr') || lower.includes('trust regulator') || hasWord('trust')) {
    const org = FSA_ORGANIZATIONS.find((o) => o.code === 'TR')!;
    return {
      name: org.name,
      code: org.code,
      parentAuthority: org.parentAuthority,
      description: org.description,
      status: org.status,
    };
  }
  if (
    hasWord('acar') ||
    lower.includes('accounting') ||
    lower.includes('auditing')
  ) {
    const org = FSA_ORGANIZATIONS.find((o) => o.code === 'ACAR')!;
    return {
      name: org.name,
      code: org.code,
      parentAuthority: org.parentAuthority,
      description: org.description,
      status: org.status,
    };
  }
  if (
    hasWord('rpr') ||
    lower.includes('real estate') ||
    lower.includes('pawnshop')
  ) {
    const org = FSA_ORGANIZATIONS.find((o) => o.code === 'RPR')!;
    return {
      name: org.name,
      code: org.code,
      parentAuthority: org.parentAuthority,
      description: org.description,
      status: org.status,
    };
  }
  if (hasWord('iau') || lower.includes('internal audit')) {
    const org = FSA_ORGANIZATIONS.find((o) => o.code === 'IAU')!;
    return {
      name: org.name,
      code: org.code,
      parentAuthority: org.parentAuthority,
      description: org.description,
      status: org.status,
    };
  }
  if (
    hasWord('fsa') ||
    lower.includes('non-bank') ||
    lower.includes('financial services authority')
  ) {
    const org = FSA_ORGANIZATIONS.find((o) => o.code === 'FSA')!;
    return {
      name: org.name,
      code: org.code,
      parentAuthority: org.parentAuthority,
      description: org.description,
      status: org.status,
    };
  }

  return {
    name: clean,
    code: clean.slice(0, 4).toUpperCase(),
    parentAuthority: 'Non-Bank Financial Services Authority',
    status: OrganizationStatus.ACTIVE,
  };
}
