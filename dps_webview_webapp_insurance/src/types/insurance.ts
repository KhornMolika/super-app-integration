export type AssetCategory = "gadget" | "renters" | "mobility" | "travel";

export interface PlanTier {
  name: string;
  subtitle: string;
  monthlyPrice: number;
  yearlyPrice: number;
  description: string;
  popular: boolean;
  features: string[];
  tag: string;
  cta: string;
}

export interface QuoteEstimate {
  category: AssetCategory;
  coverageAmount: number;
  deductible: number;
  monthlyPrice: number;
  billingCycle: "monthly" | "yearly";
}
