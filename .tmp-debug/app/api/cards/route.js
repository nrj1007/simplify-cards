"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const cards_1 = require("@/lib/cards");
function GET() {
    return server_1.NextResponse.json({ cards: cards_1.cards });
}
