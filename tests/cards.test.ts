import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { cards, getCardById, getIssuers, getTags } from "../lib/cards";
import type { CreditCard } from "../lib/types";

const cardsDir = path.join(process.cwd(), "data", "cards");

function readCardFiles() {
  // Cards are stored one JSON object per file under data/cards/<issuer>/<card-id>.json.
  return fs
    .readdirSync(cardsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((issuerDir) =>
      fs
        .readdirSync(path.join(cardsDir, issuerDir.name))
        .filter((name) => name.endsWith(".json"))
        .map((name) => ({
          issuer: issuerDir.name,
          card: JSON.parse(fs.readFileSync(path.join(cardsDir, issuerDir.name, name), "utf8")) as CreditCard
        }))
    );
}

describe("card data files", () => {
  it("loads every per-card file into the app-level card list", () => {
    const cardFiles = readCardFiles();
    const issuerFolders = [...new Set(cardFiles.map((entry) => entry.issuer))].sort();

    expect(issuerFolders).toEqual([
      "american-express",
      "au-small-finance",
      "axis",
      "bank-of-baroda",
      "city-union-bank",
      "csb-bank",
      "equitas-small-finance",
      "federal-bank",
      "hdfc",
      "hsbc",
      "icici",
      "idfc",
      "indusind-bank",
      "kotak-mahindra",
      "onecard-partners",
      "rbl-bank",
      "sbi",
      "sbm-bank",
      "standard-chartered",
      "yes-bank"
    ]);
    expect(cards).toHaveLength(cardFiles.length);
    expect(cards.length).toBeGreaterThan(100);
  });

  it("keeps card IDs unique across all issuer files", () => {
    const ids = cards.map((card) => card.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps cards globally sorted by popularity score", () => {
    for (let index = 1; index < cards.length; index += 1) {
      expect(cards[index - 1].popularityScore).toBeGreaterThanOrEqual(cards[index].popularityScore);
    }
  });

  it("has required searchable metadata on every card", () => {
    for (const card of cards) {
      expect(card.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(card.issuer).toBeTruthy();
      expect(card.name).toBeTruthy();
      expect(card.network.length).toBeGreaterThan(0);
      expect(card.tags.length).toBeGreaterThan(0);
      expect(card.rewards.length).toBeGreaterThan(0);
      expect(card.popularityScore).toBeGreaterThanOrEqual(0);
      expect(card.popularityScore).toBeLessThanOrEqual(100);
      expect(new URL(card.sourceUrl).protocol).toBe("https:");
      expect(new URL(card.applyUrl).protocol).toBe("https:");
    }
  });
});

describe("card lookup helpers", () => {
  it("finds cards by ID", () => {
    expect(getCardById("sbi-cashback")?.name).toBe("SBI Cashback Credit Card");
    expect(getCardById("missing-card")).toBeUndefined();
  });

  it("returns sorted issuer and tag lists", () => {
    const issuers = getIssuers();
    const tags = getTags();

    expect(issuers).toContain("HDFC Bank");
    expect(issuers).toContain("ICICI Bank");
    expect(issuers).toContain("Federal Bank");
    expect(issuers).toContain("IndusInd Bank");
    expect(issuers).toContain("Equitas Small Finance Bank");
    expect(issuers).toContain("American Express");
    expect(issuers).toContain("Kotak Mahindra Bank");
    expect(issuers).toContain("OneCard Partner Banks");
    expect(issuers).toContain("RBL Bank");
    expect(issuers).toContain("Standard Chartered");
    expect(issuers).toContain("YES Bank");
    expect(issuers).toEqual([...issuers].sort());
    expect(tags).toContain("cashback");
    expect(tags).toContain("lounge");
    expect(tags).toEqual([...tags].sort());
  });
});

describe("travel card calculator partner data", () => {
  it("keeps Burgundy transfer-partner valuations aligned to the current verified set", () => {
    const burgundy = getCardById("axis-magnus-burgundy");

    expect(burgundy).toBeTruthy();
    expect(burgundy?.redemption?.transferPartnerValuations?.map((partner) => partner.partner)).toEqual(["Club ITC"]);
    expect(burgundy?.redemption?.airlinePartners?.some((partner) => partner.airline === "Qatar Airways")).toBe(false);
    expect(burgundy?.redemption?.hotelPartners?.some((partner) => partner.programme === "Marriott Bonvoy")).toBe(false);
  });
});
