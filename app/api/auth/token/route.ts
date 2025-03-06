// app/api/auth/token/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.code || !body.code_verifier) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    console.log(
      "=_______________=>>",
      `${process.env.NEXT_PUBLIC_OAUTH_URL}/api/oauth/token`
    );
    // Exchange the code for tokens
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_OAUTH_URL}/api/oauth/token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: body.code,
          code_verifier: body.code_verifier,
          client_id: process.env.NEXT_PUBLIC_CLIENT_ID,
          redirect_uri: process.env.NEXT_PUBLIC_REDIRECT_URI,
        }),
      }
    );

    if (!response.ok) {
      console.log(
        "@@@@@@@@@@",
        response,
        JSON.stringify({
          code: body.code,
          code_verifier: body.code_verifier,
          client_id: process.env.NEXT_PUBLIC_CLIENT_ID,
          redirect_uri: process.env.NEXT_PUBLIC_REDIRECT_URI,
        })
      );
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || "Failed to exchange code for token" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Token exchange error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
