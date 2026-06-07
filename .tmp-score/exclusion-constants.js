"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SPEND_CATEGORY_EXCLUSION_CODE_MAP = exports.EXCLUSION_CODES = void 0;
exports.EXCLUSION_CODES = [
    "fuel",
    "rent",
    "insurance",
    "education",
    "gold",
    "jewellery",
    "utilities",
    "telecom",
    "wallet_load",
    "government",
    "tax",
    "real_estate",
    "property_management",
    "cash_advance",
    "balance_transfer",
    "outstanding_balance_payment",
    "emi",
    "fees_and_charges",
    "gaming",
    "disputed_transactions",
    "priority_pass_spend",
    "cash_withdrawal"
];
exports.SPEND_CATEGORY_EXCLUSION_CODE_MAP = {
    fuel: ["fuel"],
    utilities: ["utilities", "telecom"],
    rent: ["rent"],
    insurance: ["insurance"],
    education: ["education"],
    gold: ["gold", "jewellery"]
};
