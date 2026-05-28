"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const feedback_logs_1 = require("@/lib/feedback-logs");
async function POST(request) {
    var _a, _b, _c;
    const payload = (await request.json());
    if (!((_a = payload.query) === null || _a === void 0 ? void 0 : _a.trim()) || !((_b = payload.summary) === null || _b === void 0 ? void 0 : _b.trim()) || !payload.feedback || !Array.isArray(payload.cardIds)) {
        return server_1.NextResponse.json({ error: "Invalid feedback payload" }, { status: 400 });
    }
    await (0, feedback_logs_1.logAskFeedback)({
        query: payload.query.trim(),
        submittedAt: new Date().toISOString(),
        feedback: payload.feedback,
        summary: payload.summary.trim(),
        cardIds: payload.cardIds.filter((value) => typeof value === "string"),
        input: (_c = payload.input) !== null && _c !== void 0 ? _c : { query: payload.query.trim() }
    });
    return server_1.NextResponse.json({ ok: true });
}
