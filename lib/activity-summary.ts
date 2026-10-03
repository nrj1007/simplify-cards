import { readActivityEventBatches } from "./activity-db";
import { addEventToDailySummary, buildDailySummaryFromEvents, type AnalyticsDailySummary } from "./analytics-summary";

export async function readActivityDailySummaries(dateKeys: string[]) {
  const summaries = new Map<string, AnalyticsDailySummary>();
  for await (const events of readActivityEventBatches(dateKeys)) {
    for (const event of events) {
      const date = event.received_at.slice(0, 10);
      const summary = summaries.get(date) ?? buildDailySummaryFromEvents(date, []);
      summaries.set(date, addEventToDailySummary(summary, event));
    }
  }
  return [...summaries.values()];
}
