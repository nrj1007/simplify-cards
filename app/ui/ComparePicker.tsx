"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Option = {
  id: string;
  issuer: string;
  name: string;
};

export default function ComparePicker({
  cards,
  initialFirst = "",
  initialSecond = ""
}: {
  cards: Option[];
  initialFirst?: string;
  initialSecond?: string;
}) {
  const router = useRouter();
  const [first, setFirst] = useState(initialFirst);
  const [second, setSecond] = useState(initialSecond);

  function navigate(a: string, b: string) {
    if (a && b) router.push(`/compare?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`);
  }

  return (
    <form className="panel card compare-form" onSubmit={(event) => event.preventDefault()}>
      <div className="filters">
        <div className="field">
          <label htmlFor="a">Choose a card</label>
          <select
            id="a"
            name="a"
            value={first}
            onChange={(event) => {
              const value = event.target.value;
              setFirst(value);
              navigate(value, second);
            }}
          >
            <option value="">None selected</option>
            {cards.map((card) => <option value={card.id} key={card.id}>{card.issuer} — {card.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="b">Compare with</label>
          <select
            id="b"
            name="b"
            value={second}
            onChange={(event) => {
              const value = event.target.value;
              setSecond(value);
              navigate(first, value);
            }}
          >
            <option value="">None selected</option>
            {cards.map((card) => <option value={card.id} key={card.id}>{card.issuer} — {card.name}</option>)}
          </select>
        </div>
      </div>
    </form>
  );
}
