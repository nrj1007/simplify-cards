import { NextResponse } from "next/server";
import { cards } from "@/lib/cards";

export function GET() {
  return NextResponse.json({ cards });
}
