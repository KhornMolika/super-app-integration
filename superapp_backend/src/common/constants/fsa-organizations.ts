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
    parentAuthority: 'Non-Bank Financial Services Authority (FSA)',
    parentMinistry: 'Ministry of Economy and Finance (MEF)',
  },
  {
    name: 'General Affairs Dept. (GAD)',
    code: 'GAD',
    domain: 'gad.fsa.gov.kh',
    description: 'Oversees Administrative, Finance, and Information Technology Management Divisions under the General Secretariat of the FSA.',
    contactEmail: 'general.affairs@fsa.gov.kh',
    entityType: 'ADMINISTRATIVE',
    entityTypeLabel: 'Administrative & Policy Body',
    parentAuthority: 'Non-Bank Financial Services Authority (FSA)',
    parentMinistry: 'Ministry of Economy and Finance (MEF)',
  },
  {
    name: 'Policy Dept. (PD)',
    code: 'PD',
    domain: 'policy.fsa.gov.kh',
    description: 'Formulates policies across Financial Policy, Financial Stability, and Macroeconomic Statistics Divisions under the General Secretariat of the FSA.',
    contactEmail: 'policy@fsa.gov.kh',
    entityType: 'ADMINISTRATIVE',
    entityTypeLabel: 'Administrative & Policy Body',
    parentAuthority: 'Non-Bank Financial Services Authority (FSA)',
    parentMinistry: 'Ministry of Economy and Finance (MEF)',
  },
  {
    name: 'Technical and Legal Affairs Dept. (TLAD)',
    code: 'TLAD',
    domain: 'tlad.fsa.gov.kh',
    description: 'Handles Legal Affairs, Financial Intelligence, and Partnership Divisions under the General Secretariat of the FSA.',
    contactEmail: 'legal@fsa.gov.kh',
    entityType: 'ADMINISTRATIVE',
    entityTypeLabel: 'Administrative & Policy Body',
    parentAuthority: 'Non-Bank Financial Services Authority (FSA)',
    parentMinistry: 'Ministry of Economy and Finance (MEF)',
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
    parentAuthority: 'Non-Bank Financial Services Authority (FSA)',
    parentMinistry: 'Ministry of Economy and Finance (MEF)',
  },
  {
    name: 'Securities and Exchange Regulator of Cambodia (SERC)',
    code: 'SERC',
    domain: 'serc.gov.kh',
    description: 'Regulates securities, public offerings, derivatives, and capital markets in Cambodia.',
    contactEmail: 'info@serc.gov.kh',
    entityType: 'SECTOR_REGULATOR',
    entityTypeLabel: 'Sector-Specific Regulator',
    parentAuthority: 'Non-Bank Financial Services Authority (FSA)',
    parentMinistry: 'Ministry of Economy and Finance (MEF)',
  },
  {
    name: 'Social Security Regulator (SSR)',
    code: 'SSR',
    domain: 'ssr.gov.kh',
    description: 'Regulates and oversees pension funds, social health insurance, and occupational risk schemes.',
    contactEmail: 'info@ssr.gov.kh',
    entityType: 'SECTOR_REGULATOR',
    entityTypeLabel: 'Sector-Specific Regulator',
    parentAuthority: 'Non-Bank Financial Services Authority (FSA)',
    parentMinistry: 'Ministry of Economy and Finance (MEF)',
  },
  {
    name: 'Trust Regulator (TR)',
    code: 'TR',
    domain: 'trustregulator.gov.kh',
    description: 'Regulates, inspects, and develops trust operations, commercial trusts, and public/private trust entities.',
    contactEmail: 'info@trustregulator.gov.kh',
    entityType: 'SECTOR_REGULATOR',
    entityTypeLabel: 'Sector-Specific Regulator',
    parentAuthority: 'Non-Bank Financial Services Authority (FSA)',
    parentMinistry: 'Ministry of Economy and Finance (MEF)',
  },
  {
    name: 'Accounting and Auditing Regulator (ACAR)',
    code: 'ACAR',
    domain: 'acar.gov.kh',
    description: 'Regulates accounting professions, statutory audits, and financial reporting standards across Cambodia.',
    contactEmail: 'info@acar.gov.kh',
    entityType: 'SECTOR_REGULATOR',
    entityTypeLabel: 'Sector-Specific Regulator',
    parentAuthority: 'Non-Bank Financial Services Authority (FSA)',
    parentMinistry: 'Ministry of Economy and Finance (MEF)',
  },
  {
    name: 'Real Estate Business and Pawnshop Regulator (RPR)',
    code: 'RPR',
    domain: 'rpr.gov.kh',
    description: 'Regulates real estate development businesses, evaluation services, and pawnshop operations.',
    contactEmail: 'info@rpr.gov.kh',
    entityType: 'SECTOR_REGULATOR',
    entityTypeLabel: 'Sector-Specific Regulator',
    parentAuthority: 'Non-Bank Financial Services Authority (FSA)',
    parentMinistry: 'Ministry of Economy and Finance (MEF)',
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
    parentAuthority: 'Non-Bank Financial Services Authority (FSA)',
    parentMinistry: 'Ministry of Economy and Finance (MEF)',
  },
];

export function resolveOrganizationDetails(input?: string): {
  name: string;
  code: string;
} {
  if (!input || !input.trim()) {
    return {
      name: FSA_ORGANIZATIONS[0].name,
      code: FSA_ORGANIZATIONS[0].code,
    };
  }

  const clean = input.trim();
  const lower = clean.toLowerCase();

  // Exact match by code
  const exactByCode = FSA_ORGANIZATIONS.find(
    (o) => o.code.toLowerCase() === lower,
  );
  if (exactByCode) {
    return { name: exactByCode.name, code: exactByCode.code };
  }

  // Exact match by name
  const exactByName = FSA_ORGANIZATIONS.find(
    (o) => o.name.toLowerCase() === lower,
  );
  if (exactByName) {
    return { name: exactByName.name, code: exactByName.code };
  }

  const hasWord = (word: string) => new RegExp(`\\b${word}\\b`, 'i').test(clean);

  if (hasWord('fintech') || hasWord('ftc') || lower.includes('financial technology') || lower.includes('general secretariat')) {
    const org = FSA_ORGANIZATIONS.find((o) => o.code === 'FTC') || FSA_ORGANIZATIONS[0];
    return { name: org.name, code: org.code };
  }
  if (hasWord('gad') || lower.includes('general affair')) {
    const org = FSA_ORGANIZATIONS.find((o) => o.code === 'GAD') || FSA_ORGANIZATIONS[0];
    return { name: org.name, code: org.code };
  }
  if (hasWord('pd') || lower.includes('policy dept') || lower.includes('policy department')) {
    const org = FSA_ORGANIZATIONS.find((o) => o.code === 'PD') || FSA_ORGANIZATIONS[0];
    return { name: org.name, code: org.code };
  }
  if (hasWord('tlad') || lower.includes('technical and legal') || lower.includes('legal affair')) {
    const org = FSA_ORGANIZATIONS.find((o) => o.code === 'TLAD') || FSA_ORGANIZATIONS[0];
    return { name: org.name, code: org.code };
  }
  if (hasWord('irc') || lower.includes('insurance')) {
    const org = FSA_ORGANIZATIONS.find((o) => o.code === 'IRC') || FSA_ORGANIZATIONS[0];
    return { name: org.name, code: org.code };
  }
  if (hasWord('serc') || lower.includes('securities') || lower.includes('exchange')) {
    const org = FSA_ORGANIZATIONS.find((o) => o.code === 'SERC') || FSA_ORGANIZATIONS[0];
    return { name: org.name, code: org.code };
  }
  if (hasWord('ssr') || lower.includes('social security')) {
    const org = FSA_ORGANIZATIONS.find((o) => o.code === 'SSR') || FSA_ORGANIZATIONS[0];
    return { name: org.name, code: org.code };
  }
  if (hasWord('tr') || lower.includes('trust regulator') || hasWord('trust')) {
    const org = FSA_ORGANIZATIONS.find((o) => o.code === 'TR') || FSA_ORGANIZATIONS[0];
    return { name: org.name, code: org.code };
  }
  if (hasWord('acar') || lower.includes('accounting') || lower.includes('auditing')) {
    const org = FSA_ORGANIZATIONS.find((o) => o.code === 'ACAR') || FSA_ORGANIZATIONS[0];
    return { name: org.name, code: org.code };
  }
  if (hasWord('rpr') || lower.includes('real estate') || lower.includes('pawnshop')) {
    const org = FSA_ORGANIZATIONS.find((o) => o.code === 'RPR') || FSA_ORGANIZATIONS[0];
    return { name: org.name, code: org.code };
  }
  if (hasWord('iau') || lower.includes('internal audit')) {
    const org = FSA_ORGANIZATIONS.find((o) => o.code === 'IAU') || FSA_ORGANIZATIONS[0];
    return { name: org.name, code: org.code };
  }

  return {
    name: clean,
    code: clean.slice(0, 4).toUpperCase(),
  };
}
