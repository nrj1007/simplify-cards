"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from "react";
import {
  applyMatterChip,
  applySpendChip,
  type AskMatterChip,
  type AskSpendChip
} from "@/lib/ask-query-composer";

type QueryInputElement = HTMLInputElement | HTMLTextAreaElement;

type AskQueryComposerValue = {
  draftQuery: string;
  draftMaxAnnualFee?: number;
  setDraftQuery: (query: string) => void;
  replaceDraftQuery: (query: string) => void;
  applyMatter: (chip: AskMatterChip) => void;
  applySpend: (chip: AskSpendChip) => void;
};

const AskQueryComposerContext = createContext<AskQueryComposerValue | null>(null);

export function AskQueryComposerProvider({
  initialQuery,
  initialMaxAnnualFee,
  children
}: {
  initialQuery: string;
  initialMaxAnnualFee?: number;
  children: ReactNode;
}) {
  const [draftQuery, setDraftQuery] = useState(initialQuery);
  const [draftMaxAnnualFee, setDraftMaxAnnualFee] = useState(initialMaxAnnualFee);

  const focusInput = useCallback(() => {
    window.requestAnimationFrame(() => {
      const input = document.querySelector<QueryInputElement>("[data-ask-query-input]");
      input?.scrollIntoView({ behavior: "smooth", block: "center" });
      input?.focus({ preventScroll: true });
    });
  }, []);

  const replaceDraftQuery = useCallback(
    (query: string) => {
      setDraftQuery(query);
      setDraftMaxAnnualFee(undefined);
      focusInput();
    },
    [focusInput]
  );

  const applyMatter = useCallback(
    (chip: AskMatterChip) => {
      setDraftQuery((current) => applyMatterChip(current, chip));
      if (chip === "Low annual fee") {
        setDraftMaxAnnualFee((current) => Math.min(current ?? 1000, 1000));
      }
      focusInput();
    },
    [focusInput]
  );

  const applySpend = useCallback(
    (chip: AskSpendChip) => {
      setDraftQuery((current) => applySpendChip(current, chip));
      focusInput();
    },
    [focusInput]
  );

  const value = useMemo(
    () => ({ draftQuery, draftMaxAnnualFee, setDraftQuery, replaceDraftQuery, applyMatter, applySpend }),
    [applyMatter, applySpend, draftMaxAnnualFee, draftQuery, replaceDraftQuery]
  );

  return <AskQueryComposerContext.Provider value={value}>{children}</AskQueryComposerContext.Provider>;
}

export function useAskQueryComposer() {
  const context = useContext(AskQueryComposerContext);
  if (!context) throw new Error("useAskQueryComposer must be used inside AskQueryComposerProvider");
  return context;
}

export function AskQueryExamples({ examples }: { examples: readonly string[] }) {
  const { replaceDraftQuery } = useAskQueryComposer();

  return examples.map((example) => (
    <button
      className="query-chip"
      key={example}
      onClick={() => replaceDraftQuery(example)}
      type="button"
    >
      {example}
    </button>
  ));
}
