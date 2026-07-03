import { NextResponse } from "next/server";
import { logSubscription } from "@/lib/subscription-logs";

type SubscribePayload = {
  name?: string;
  email?: string;
};

// Basic email regex validator
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as SubscribePayload;
    const name = payload.name?.trim();
    const email = payload.email?.trim();

    if (!name) {
      return NextResponse.json({ error: "Please enter your name" }, { status: 400 });
    }

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
    }

    const entry = await logSubscription(name, email);

    return NextResponse.json({ ok: true, subscription: entry });
  } catch (error) {
    console.error("Error handling subscribe request:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
