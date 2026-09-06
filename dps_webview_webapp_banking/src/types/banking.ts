export interface BankAccount {
  id: string;
  accountNumber: string;
  accountType: "Savings" | "Checking" | "Fixed Deposit";
  balance: number;
  currency: string;
}

export interface BankCard {
  id: string;
  cardNumber: string;
  cardHolder: string;
  cardType: "Visa" | "Mastercard" | "DPS Virtual";
  expiry: string;
  isVirtual: boolean;
}

export interface TransactionSummary {
  id: string;
  title: string;
  amount: number;
  type: "credit" | "debit";
  timestamp: string;
  category: string;
}
