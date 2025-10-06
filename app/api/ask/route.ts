// src/app/api/ask/route.ts
import { NextRequest, NextResponse } from 'next/server';

// This is your backend-for-frontend API route.
// It receives the request from the frontend and forwards it to the Sanic API.

export async function POST(request: NextRequest) {
  try {
    // 1. Get the body from the incoming request from your frontend
    const body = await request.json();
    const userQuery = body.query;

    if (!userQuery) {
      return NextResponse.json(
        { error: "Query field is missing." },
        { status: 400 }
      );
    }

    // 2. Forward the request to your actual Sanic API
    // The server can do this without any CORS issues.
    const apiResponse = await fetch(`${process.env.SANIC_API_URL}/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: userQuery }),
    });

    if (!apiResponse.ok) {
      // If the Sanic API returned an error, forward that error
      const errorData = await apiResponse.json();
      return NextResponse.json(
        { error: errorData.error || "Failed to connect to the bot service." },
        { status: apiResponse.status }
      );
    }

    // 3. Get the data from the Sanic API's response
    const data = await apiResponse.json();

    // 4. Send the data back to your frontend
    return NextResponse.json(data);

  } catch (error) {
    console.error("API Route Error:", error);
    return NextResponse.json(
      { error: "An internal server error occurred." },
      { status: 500 }
    );
  }
}