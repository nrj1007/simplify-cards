"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const feedback_logs_1 = require("@/lib/feedback-logs");
async function POST(request) {
    var _a, _b, _c, _d, _e;
    let returnTo = "/ask";
    function buildAskRedirectUrl(baseUrl, input, query) {
        var _a;
        const redirectUrl = new URL("/ask", baseUrl);
        redirectUrl.searchParams.set("query", ((_a = input.query) === null || _a === void 0 ? void 0 : _a.trim()) || query);
        if (typeof input.maxAnnualFee === "number" && !Number.isNaN(input.maxAnnualFee)) {
            redirectUrl.searchParams.set("maxAnnualFee", String(input.maxAnnualFee));
        }
        return redirectUrl;
    }
    try {
        const formData = await request.formData();
        const query = String((_a = formData.get("query")) !== null && _a !== void 0 ? _a : "").trim();
        const summary = String((_b = formData.get("summary")) !== null && _b !== void 0 ? _b : "").trim();
        const feedbackValue = String((_c = formData.get("feedback")) !== null && _c !== void 0 ? _c : "").trim();
        returnTo = String((_d = formData.get("returnTo")) !== null && _d !== void 0 ? _d : "/ask").trim() || "/ask";
        const inputRaw = String((_e = formData.get("input")) !== null && _e !== void 0 ? _e : "").trim();
        const cardIds = formData
            .getAll("cardId")
            .map((value) => String(value).trim())
            .filter(Boolean);
        if (!query || !summary || (feedbackValue !== "up" && feedbackValue !== "down")) {
            return server_1.NextResponse.redirect(new URL("/ask", request.url), { status: 303 });
        }
        let input = { query };
        if (inputRaw) {
            try {
                input = JSON.parse(inputRaw);
            }
            catch (_f) {
                input = { query };
            }
        }
        await (0, feedback_logs_1.logAskFeedback)({
            query,
            submittedAt: new Date().toISOString(),
            feedback: feedbackValue,
            summary,
            cardIds,
            input
        });
        const redirectUrl = buildAskRedirectUrl(request.url, input, query);
        redirectUrl.searchParams.set("feedbackSaved", feedbackValue);
        redirectUrl.hash = "answer";
        return server_1.NextResponse.redirect(redirectUrl, { status: 303 });
    }
    catch (_g) {
        const redirectUrl = new URL(returnTo, request.url);
        redirectUrl.searchParams.set("feedbackError", "1");
        redirectUrl.hash = "answer";
        return server_1.NextResponse.redirect(redirectUrl, { status: 303 });
    }
}
