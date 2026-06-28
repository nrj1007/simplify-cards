import { NextResponse } from "next/server";
import { answerQuestion } from "@/lib/ask-ai";
import type { RecommendationInput } from "@/lib/types";

export async function POST(request: Request) {
  const input = (await request.json()) as RecommendationInput;
  return NextResponse.json(await answerQuestion(input));
}
