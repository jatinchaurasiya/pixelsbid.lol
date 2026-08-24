import { createRemoteJWKSet, jwtVerify } from "jose";

// Neon Auth (powered by Stack Auth) JWKS
const JWKS_URL = process.env.NEON_JWKS_URL || "https://ep-noisy-sunset-ay4d2mrm.neonauth.c-5.us-east-2.aws.neon.tech/neondb/auth/.well-known/jwks.json";
const AUTH_URL = process.env.NEON_AUTH_URL || "https://ep-noisy-sunset-ay4d2mrm.neonauth.c-5.us-east-2.aws.neon.tech/neondb/auth";

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS() {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(JWKS_URL));
  }
  return jwks;
}

export type NeonUser = {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
  role?: string;
  exp: number;
  iat: number;
};

export async function verifyNeonToken(token: string): Promise<NeonUser | null> {
  try {
    const { payload } = await jwtVerify(token, getJWKS(), {
      // Neon Auth tokens — issuer may be AUTH_URL
    });
    return payload as unknown as NeonUser;
  } catch (e) {
    console.warn("[neon-auth] verify failed", e instanceof Error ? e.message : e);
    return null;
  }
}

export function getNeonAuthUrl() {
  return AUTH_URL;
}

export function getLoginUrl(callbackUrl = "/dashboard") {
  // Neon Auth hosted login — Stack Auth uses /handler/sign-in or /auth/sign-in
  // Try standard Stack Auth path
  return `${AUTH_URL}/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`;
}

export function getJwksUrl() {
  return JWKS_URL;
}
