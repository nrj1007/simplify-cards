"use client";

import { useRef } from "react";
import Link from "next/link";
import type { Route } from "next";
import type { CreditCard } from "@/lib/types";

export type CardsCarouselItem = {
  card: CreditCard;
  tone: "plum" | "gold" | "blue" | "ruby" | "green" | "slate";
  summary: string;
  rateLabel: string;
  typeLabel: string;
};

type Props = {
  title: string;
  description: string;
  items: CardsCarouselItem[];
};

export default function CardsCarousel({ title, description, items }: Props) {
  const carouselRef = useRef<HTMLDivElement>(null);

  function scroll(direction: "left" | "right") {
    const carousel = carouselRef.current;
    if (!carousel) return;
    const step = Math.max(260, Math.floor(carousel.clientWidth * 0.82));
    carousel.scrollBy({ left: direction === "left" ? -step : step, behavior: "smooth" });
  }

  return (
    <section aria-labelledby={title.toLowerCase().replaceAll(" ", "-")} className="cards-row">
      <div className="cards-row-head">
        <div>
          <h2 id={title.toLowerCase().replaceAll(" ", "-")}>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      <div className="cards-carousel-wrap">
        <button
          aria-label={`Scroll ${title} left`}
          className="cards-row-arrow cards-row-arrow-left"
          type="button"
          onClick={() => scroll("left")}
        />
        <div className="cards-carousel" ref={carouselRef} tabIndex={0}>
          {items.map((item) => (
            <Link
              aria-label={`View ${item.card.name}`}
              className="cards-tile"
              href={`/cards/${item.card.id}` as Route}
              key={item.card.id}
            >
              <div className={`cards-tile-art cards-tile-art-${item.tone}`}>
                <div className="cards-chip-row">
                  <span className="cards-card-type">{item.typeLabel}</span>
                </div>
                <div className="cards-art-title-stack">
                  <span className="cards-issuer">{item.card.issuer}</span>
                  <strong>{item.card.name}</strong>
                </div>
                <span aria-hidden="true" className="cards-tile-shine" />
              </div>
              <div className="cards-tile-copy">
                <div className="cards-tile-meta">
                  <span>Rs {item.card.annualFee.toLocaleString("en-IN")} fee</span>
                  <span>{item.rateLabel}</span>
                </div>
                <p>{item.summary}</p>
              </div>
              <span className="cards-details-link">Click for more details →</span>
              <span className="cards-landing-action">Apply now</span>
            </Link>
          ))}
        </div>
        <button
          aria-label={`Scroll ${title} right`}
          className="cards-row-arrow cards-row-arrow-right"
          type="button"
          onClick={() => scroll("right")}
        />
      </div>
    </section>
  );
}
