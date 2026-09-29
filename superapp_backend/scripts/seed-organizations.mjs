import pg from 'pg';
const { Client } = pg;

const FSA_ORGANIZATIONS = [
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

async function run() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USERNAME || 'admin',
    password: process.env.DB_PASSWORD || 'admin123',
    database: process.env.DB_DATABASE || 'dps_db',
  });

  await client.connect();

  // Remove legacy duplicates if any
  await client.query(`DELETE FROM organizations WHERE name IN ('General Secretariat of FSA', 'Insurance Authority')`);

  for (const org of FSA_ORGANIZATIONS) {
    const metadata = {
      shortCode: org.code,
      acronym: org.code,
      entityType: org.entityType,
      entityTypeLabel: org.entityTypeLabel,
      parentAuthority: org.parentAuthority,
      parentMinistry: org.parentMinistry,
    };

    const existing = await client.query(
      `SELECT id FROM organizations WHERE code = $1 OR name = $2 OR domain = $3 LIMIT 1`,
      [org.code, org.name, org.domain]
    );

    if (existing.rows.length > 0) {
      await client.query(
        `UPDATE organizations
         SET name = $1, code = $2, domain = $3, description = $4, status = 'ACTIVE', "contactEmail" = $5, metadata = $6, "updatedAt" = NOW()
         WHERE id = $7`,
        [org.name, org.code, org.domain, org.description, org.contactEmail, JSON.stringify(metadata), existing.rows[0].id]
      );
    } else {
      await client.query(
        `INSERT INTO organizations (name, code, domain, description, status, "contactEmail", metadata, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, 'ACTIVE', $5, $6, NOW(), NOW())`,
        [org.name, org.code, org.domain, org.description, org.contactEmail, JSON.stringify(metadata)]
      );
    }
  }

  const allRes = await client.query(`SELECT id, code, name, domain, status, metadata->>'entityType' as entity_type FROM organizations ORDER BY metadata->>'entityType' ASC, code ASC`);
  console.log(`\n========================================================`);
  console.log(`Successfully Seeded ${allRes.rows.length} Organizations in Database`);
  console.log(`========================================================`);
  console.table(allRes.rows);

  await client.end();
}

run().catch((err) => {
  console.error('Seed script error:', err);
  process.exit(1);
});
