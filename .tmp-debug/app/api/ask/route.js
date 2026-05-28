"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const ask_ai_1 = require("@/lib/ask-ai");
async function POST(request) {
    const input = (await request.json());
    return server_1.NextResponse.json(await (0, ask_ai_1.answerQuestion)(input));
}
