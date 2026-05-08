import { NextResponse } from "next/server";
import { answerFromCards } from "@/lib/recommend";
import type { RecommendationInput } from "@/lib/types";

export async function POST(request: Request) {
  const input = (await request.json()) as RecommendationInput;
  return NextResponse.json(answerFromCards(input));
}
