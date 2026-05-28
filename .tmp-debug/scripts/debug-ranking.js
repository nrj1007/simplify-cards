"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const recommend_1 = require("../lib/recommend");
const focusIds = new Set([
    "kotak-cashback-plus",
    "hsbc-travelone",
    "axis-atlas",
    "hdfc-regalia-gold",
    "reliance-sbi-prime"
]);
const scores = (0, recommend_1.scoreCards)({ query: "top cards under 5000" });
const top = scores.slice(0, 12).map((item, index) => ({
    rank: index + 1,
    id: item.card.id,
    name: item.card.name,
    fitScore: Math.round(item.fitScore * 100) / 100,
    estimatedAnnualRewards: Math.round(item.estimatedAnnualRewards * 100) / 100,
    estimatedMilestoneValue: Math.round(item.estimatedMilestoneValue * 100) / 100,
    estimatedAnnualFee: Math.round(item.estimatedAnnualFee * 100) / 100,
    estimatedNetValue: Math.round(item.estimatedNetValue * 100) / 100,
    adjustment: Math.round((item.fitScore - item.estimatedNetValue) * 100) / 100,
    reasons: item.reasons.slice(0, 8)
}));
const focus = scores
    .filter((item) => focusIds.has(item.card.id))
    .map((item, index) => ({
    rank: scores.findIndex((score) => score.card.id === item.card.id) + 1,
    id: item.card.id,
    name: item.card.name,
    fitScore: Math.round(item.fitScore * 100) / 100,
    estimatedAnnualRewards: Math.round(item.estimatedAnnualRewards * 100) / 100,
    estimatedMilestoneValue: Math.round(item.estimatedMilestoneValue * 100) / 100,
    estimatedAnnualFee: Math.round(item.estimatedAnnualFee * 100) / 100,
    estimatedNetValue: Math.round(item.estimatedNetValue * 100) / 100,
    adjustment: Math.round((item.fitScore - item.estimatedNetValue) * 100) / 100,
    rewardBreakdown: item.rewardBreakdown
}));
console.log(JSON.stringify({ top, focus }, null, 2));
