import { NextRequest, NextResponse } from "next/server";


export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_OAUTH_URL}/api/oauth/credits`,
      {
        headers: {
          Authorization: authHeader || "",
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error fetching credits:", error);
    return NextResponse.json(
      { error: "Failed to fetch credits" },
      { status: 500 }
    );
  }
}
