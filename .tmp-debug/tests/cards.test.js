"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const vitest_1 = require("vitest");
const cards_1 = require("../lib/cards");
const cardsDir = node_path_1.default.join(process.cwd(), "data", "cards");
function readIssuerFiles() {
    return node_fs_1.default
        .readdirSync(cardsDir)
        .filter((file) => file.endsWith(".json"))
        .sort()
        .map((file) => ({
        file,
        cards: JSON.parse(node_fs_1.default.readFileSync(node_path_1.default.join(cardsDir, file), "utf8"))
    }));
}
(0, vitest_1.describe)("card data files", () => {
    (0, vitest_1.it)("loads all issuer files into the app-level card list", () => {
        const issuerFiles = readIssuerFiles();
        const fileCardCount = issuerFiles.reduce((total, issuerFile) => total + issuerFile.cards.length, 0);
        (0, vitest_1.expect)(issuerFiles.map((issuerFile) => issuerFile.file)).toEqual([
            "american-express.json",
            "au-small-finance.json",
            "axis.json",
            "bank-of-baroda.json",
            "equitas-small-finance.json",
            "federal-bank.json",
            "hdfc.json",
            "hsbc.json",
            "icici.json",
            "idfc.json",
            "indusind-bank.json",
            "kotak-mahindra.json",
            "onecard-partners.json",
            "rbl-bank.json",
            "sbi.json",
            "standard-chartered.json",
            "yes-bank.json"
        ]);
        (0, vitest_1.expect)(cards_1.cards).toHaveLength(fileCardCount);
        (0, vitest_1.expect)(cards_1.cards.length).toBeGreaterThan(100);
    });
    (0, vitest_1.it)("keeps card IDs unique across all issuer files", () => {
        const ids = cards_1.cards.map((card) => card.id);
        (0, vitest_1.expect)(new Set(ids).size).toBe(ids.length);
    });
    (0, vitest_1.it)("keeps cards globally sorted by popularity score", () => {
        for (let index = 1; index < cards_1.cards.length; index += 1) {
            (0, vitest_1.expect)(cards_1.cards[index - 1].popularityScore).toBeGreaterThanOrEqual(cards_1.cards[index].popularityScore);
        }
    });
    (0, vitest_1.it)("has required searchable metadata on every card", () => {
        for (const card of cards_1.cards) {
            (0, vitest_1.expect)(card.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
            (0, vitest_1.expect)(card.issuer).toBeTruthy();
            (0, vitest_1.expect)(card.name).toBeTruthy();
            (0, vitest_1.expect)(card.network.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(card.tags.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(card.rewards.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(card.popularityScore).toBeGreaterThanOrEqual(0);
            (0, vitest_1.expect)(card.popularityScore).toBeLessThanOrEqual(100);
            (0, vitest_1.expect)(new URL(card.sourceUrl).protocol).toBe("https:");
            (0, vitest_1.expect)(new URL(card.applyUrl).protocol).toBe("https:");
        }
    });
});
(0, vitest_1.describe)("card lookup helpers", () => {
    (0, vitest_1.it)("finds cards by ID", () => {
        var _a;
        (0, vitest_1.expect)((_a = (0, cards_1.getCardById)("sbi-cashback")) === null || _a === void 0 ? void 0 : _a.name).toBe("SBI Cashback Credit Card");
        (0, vitest_1.expect)((0, cards_1.getCardById)("missing-card")).toBeUndefined();
    });
    (0, vitest_1.it)("returns sorted issuer and tag lists", () => {
        const issuers = (0, cards_1.getIssuers)();
        const tags = (0, cards_1.getTags)();
        (0, vitest_1.expect)(issuers).toContain("HDFC Bank");
        (0, vitest_1.expect)(issuers).toContain("ICICI Bank");
        (0, vitest_1.expect)(issuers).toContain("Federal Bank");
        (0, vitest_1.expect)(issuers).toContain("IndusInd Bank");
        (0, vitest_1.expect)(issuers).toContain("Equitas Small Finance Bank");
        (0, vitest_1.expect)(issuers).toContain("American Express");
        (0, vitest_1.expect)(issuers).toContain("Kotak Mahindra Bank");
        (0, vitest_1.expect)(issuers).toContain("OneCard Partner Banks");
        (0, vitest_1.expect)(issuers).toContain("RBL Bank");
        (0, vitest_1.expect)(issuers).toContain("Standard Chartered");
        (0, vitest_1.expect)(issuers).toContain("YES Bank");
        (0, vitest_1.expect)(issuers).toEqual([...issuers].sort());
        (0, vitest_1.expect)(tags).toContain("cashback");
        (0, vitest_1.expect)(tags).toContain("lounge");
        (0, vitest_1.expect)(tags).toEqual([...tags].sort());
    });
});
