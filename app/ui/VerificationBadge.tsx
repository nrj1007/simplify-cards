import { AlertTriangle, CheckCircle2, ClipboardCheck, SearchCheck } from "lucide-react";
import type { CreditCard } from "@/lib/types";

type VerificationMeta = {
  label: string;
  tone: "good" | "mixed" | "warn";
  description: string;
  Icon: typeof CheckCircle2;
};

const verificationMap: Record<CreditCard["verificationStatus"], VerificationMeta> = {
  "official-direct": {
    label: "Official direct",
    tone: "good",
    description: "Data was checked against the issuer's direct product page or document.",
    Icon: CheckCircle2
  },
  "official-indexed": {
    label: "Official source",
    tone: "mixed",
    description: "Data was checked against official indexed issuer content where direct scraping was limited.",
    Icon: SearchCheck
  },
  "official-catalogue": {
    label: "Official catalogue",
    tone: "mixed",
    description: "Data was checked against an official issuer catalogue or listing page.",
    Icon: ClipboardCheck
  },
  "official-mixed": {
    label: "Official source",
    tone: "mixed",
    description: "Data was checked with official issuer sources plus supporting public references.",
    Icon: ClipboardCheck
  },
  "needs-review": {
    label: "Needs review",
    tone: "warn",
    description: "This entry needs fresh official verification before high-confidence use.",
    Icon: AlertTriangle
  }
};

type Props = {
  status: CreditCard["verificationStatus"];
  lastVerified?: string;
  variant?: "compact" | "full";
};

export function getVerificationMeta(status: CreditCard["verificationStatus"]) {
  return verificationMap[status];
}

export default function VerificationBadge({ status, lastVerified, variant = "compact" }: Props) {
  const meta = verificationMap[status];
  const Icon = meta.Icon;

  if (variant === "full") {
    return (
      <div className={`trust-panel trust-panel-${meta.tone}`}>
        <div className="trust-heading">
          <Icon size={17} />
          <strong>{meta.label}</strong>
        </div>
        <p>{meta.description}</p>
        {lastVerified ? <span>Last verified: {lastVerified}</span> : null}
      </div>
    );
  }

  return (
    <span className={`trust-badge trust-badge-${meta.tone}`} title={meta.description}>
      <Icon size={14} />
      {meta.label}
    </span>
  );
}
