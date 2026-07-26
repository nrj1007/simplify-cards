export function withoutSentenceEndingFullStop(value: string) {
  return value.replace(/\.(?=\s*$)/u, "");
}

const DISPLAY_CASE_OVERRIDES: Record<string, string> = {
  amex: "Amex",
  bpcl: "BPCL",
  dcc: "DCC",
  edge: "EDGE",
  emi: "EMI",
  gyftr: "Gyftr",
  hdfc: "HDFC",
  hpcl: "HPCL",
  irctc: "IRCTC",
  ishop: "iShop",
  mmt: "MMT",
  rp: "RP",
  rupay: "RuPay",
  sbi: "SBI",
  smartbuy: "SmartBuy",
  upi: "UPI"
};

export function properCaseLabel(value: string) {
  return value
    .split(/(\s+|\/|-)/)
    .map((part) => {
      if (!part.trim() || part === "/" || part === "-") return part;
      const override = DISPLAY_CASE_OVERRIDES[part.toLowerCase()];
      return override ?? `${part.charAt(0).toUpperCase()}${part.slice(1)}`;
    })
    .join("");
}
