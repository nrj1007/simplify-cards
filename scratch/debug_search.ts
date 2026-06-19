import { parseQueryIntent } from "../lib/query-intent";
import { getCardById, cards } from "../lib/card-index";
import { scoreCards } from "../lib/recommend";

function normalizeForMatch(value = "") {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeIssuer(issuer: string) {
  return normalizeForMatch(issuer);
}

function shouldRestrictToIssuer(intent: any, query?: string) {
  if (intent.issuers.length !== 1) return false;

  const normalizedQuery = normalizeForMatch(query);
  if (!normalizedQuery) return false;
  if (normalizedQuery.includes(" vs ") || normalizedQuery.includes(" compare ")) return false;

  return true;
}

async function main() {
  const query = "HSBC taj";
  const input = { query };
  
  const intent = parseQueryIntent(input);
  console.log("Parsed Intent:", JSON.stringify(intent, null, 2));

  const card = getCardById("hsbc-taj");
  if (!card) {
    console.error("hsbc-taj card not found!");
    return;
  }

  const restrictToIssuer = shouldRestrictToIssuer(intent, input.query);
  console.log("restrictToIssuer:", restrictToIssuer);
  if (restrictToIssuer) {
    console.log("card.issuer:", card.issuer, "-> normalized:", normalizeIssuer(card.issuer));
    console.log("intent.issuers[0]:", intent.issuers[0], "-> normalized:", normalizeIssuer(intent.issuers[0]));
    console.log("Issuer match:", normalizeIssuer(card.issuer) === normalizeIssuer(intent.issuers[0]));
  }
}

main().catch(console.error);
