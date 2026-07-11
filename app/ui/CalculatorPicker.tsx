"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useNavigationProgress } from "./NavigationProgress";

type CardOption = { id: string; name: string; issuer: string };

type Props = {
  cards: CardOption[];
  selectedCardId?: string;
  variant?: "default" | "calculator";
};

export default function CalculatorPicker({ cards, selectedCardId, variant = "default" }: Props) {
  const router = useRouter();
  const { startNavigation } = useNavigationProgress();
  const selectedCard = cards.find((card) => card.id === selectedCardId);
  const [issuer, setIssuer] = useState(selectedCard?.issuer ?? "");
  const [cardId, setCardId] = useState(selectedCardId ?? "");
  const isCalculator = variant === "calculator";

  const issuers = [...new Set(cards.map((card) => card.issuer))].sort((a, b) => a.localeCompare(b));
  const issuerCards = cards
    .filter((card) => card.issuer === issuer)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className={isCalculator ? "calc-picker calculator-card-picker" : "calc-picker"}>
      <div className="field">
        <label htmlFor="calc-bank">{isCalculator ? "Issuer" : "Bank"}</label>
        <select
          id="calc-bank"
          value={issuer}
          onChange={(event) => {
            setIssuer(event.target.value);
            setCardId("");
          }}
        >
          <option value="">{isCalculator ? "Select an issuer" : "Select a bank"}</option>
          {issuers.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="calc-card">Credit card</label>
        <select
          id="calc-card"
          value={cardId}
          disabled={!issuer}
          onChange={(event) => {
            const nextId = event.target.value;
            setCardId(nextId);
            if (nextId) {
              startNavigation();
              router.push(`/calculator?card=${encodeURIComponent(nextId)}` as Route);
            }
          }}
        >
          <option value="">
            {issuer ? "Select a card" : isCalculator ? "Select an issuer first" : "Select a bank first"}
          </option>
          {issuerCards.map((card) => (
            <option key={card.id} value={card.id}>
              {card.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
