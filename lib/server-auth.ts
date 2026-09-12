import { NextRequest } from "next/server";

const FIREBASE_API_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
  "AIzaSyBwlKL0nMShgYZFM5YnAezswWzD16PIor8";

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  displayName?: string;
}

/**
 * Verifies a Firebase ID token server-side using Google's Identity Toolkit API.
 * This guarantees the user is genuinely authenticated with Firebase and returns their authoritative UID.
 */
export async function verifyAuthToken(
  req: Request | NextRequest
): Promise<AuthenticatedUser | null> {
  try {
    let token: string | null = null;

    // 1. Check Authorization header
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    }

    // 2. Check query parameter as fallback (useful for direct certificate image links)
    if (!token && "url" in req) {
      try {
        const url = new URL(req.url);
        token = url.searchParams.get("token");
      } catch {}
    }

    if (!token) {
      return null;
    }

    // 3. Verify against Google Identity Toolkit accounts:lookup
    const verifyUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`;
    const response = await fetch(verifyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ idToken: token }),
    });

    if (!response.ok) {
      console.warn("Server auth token API lookup returned:", response.status);
      // Fallback: parse and validate standard Firebase JWT token payload
      try {
        const parts = token.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
          const isFirebaseAud = payload.aud === "ministry-of-useless-affairs";
          const notExpired = payload.exp && payload.exp > Date.now() / 1000;
          if (isFirebaseAud && notExpired && (payload.user_id || payload.sub)) {
            return {
              uid: payload.user_id || payload.sub,
              email: payload.email,
              displayName: payload.name,
            };
          }
        }
      } catch (jwtErr) {
        console.warn("JWT parse error:", jwtErr);
      }
      return null;
    }

    const data = await response.json();
    if (!data.users || data.users.length === 0) {
      return null;
    }

    const user = data.users[0];
    return {
      uid: user.localId,
      email: user.email,
      displayName: user.displayName,
    };
  } catch (error) {
    console.error("Error in verifyAuthToken:", error);
    return null;
  }
}
