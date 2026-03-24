import { NextResponse } from "next/server";

// Hardcoded credentials — intentionally vulnerable
const VALID_USERNAME = "admin";
const VALID_PASSWORD = "password123";

// Simple token generator
function generateSessionToken() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `sess_${timestamp}_${random}`;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    if (username !== VALID_USERNAME || password !== VALID_PASSWORD) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const sessionToken = generateSessionToken();

    // ============================================================
    // INTENTIONALLY VULNERABLE:
    // - No HttpOnly flag → cookie accessible via document.cookie (XSS)
    // - No Secure flag → cookie sent over plain HTTP (sniffable)
    // - No SameSite flag → cookie sent on cross-site requests (CSRF)
    // ============================================================
    const response = NextResponse.json({
      message: "Login successful",
      user: username,
      session: sessionToken, // Also exposed in response body!
    });

    response.headers.set(
      "Set-Cookie",
      `session_token=${sessionToken}; Path=/; Max-Age=3600`
    );

    return response;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
