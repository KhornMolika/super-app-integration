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
  // 1. Administrative & Policy Body
  {
    name: 'General Secretariat (which houses administrative units, including the FinTech Center)',
    code: 'FTC',
    domain: 'fsa.gov.kh',
    description: 'Houses administrative and operational units, including the FinTech Center (FTC) under the Non-Bank Financial Services Authority.',
    contactEmail: 'fintech@fsa.gov.kh',
    entityType: 'ADMINISTRATIVE',
    entityTypeLabel: 'Administrative & Policy Body',
    parentAuthority: 'Non-Bank Financial Services Authority (FSA)',
    parentMinistry: 'Ministry of Economy and Finance (MEF)',
  },
  // 2-7. Sector-Specific Regulators
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
  // 8. Oversight & Compliance Unit
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

  // Fuzzy match keywords
  if (lower.includes('fintech') || lower.includes('general secretariat') || lower.includes('ftc')) {
    return { name: FSA_ORGANIZATIONS[0].name, code: FSA_ORGANIZATIONS[0].code };
  }
  if (lower.includes('insurance') || lower.includes('irc')) {
    return { name: FSA_ORGANIZATIONS[1].name, code: FSA_ORGANIZATIONS[1].code };
  }
  if (lower.includes('securities') || lower.includes('exchange') || lower.includes('serc')) {
    return { name: FSA_ORGANIZATIONS[2].name, code: FSA_ORGANIZATIONS[2].code };
  }
  if (lower.includes('social security') || lower.includes('ssr')) {
    return { name: FSA_ORGANIZATIONS[3].name, code: FSA_ORGANIZATIONS[3].code };
  }
  if (lower.includes('trust') || lower.includes('tr')) {
    return { name: FSA_ORGANIZATIONS[4].name, code: FSA_ORGANIZATIONS[4].code };
  }
  if (lower.includes('accounting') || lower.includes('auditing') || lower.includes('acar')) {
    return { name: FSA_ORGANIZATIONS[5].name, code: FSA_ORGANIZATIONS[5].code };
  }
  if (lower.includes('real estate') || lower.includes('pawnshop') || lower.includes('rpr')) {
    return { name: FSA_ORGANIZATIONS[6].name, code: FSA_ORGANIZATIONS[6].code };
  }
  if (lower.includes('internal audit') || lower.includes('iau')) {
    return { name: FSA_ORGANIZATIONS[7].name, code: FSA_ORGANIZATIONS[7].code };
  }

  return {
    name: clean,
    code: clean.slice(0, 4).toUpperCase(),
  };
}
