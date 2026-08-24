import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";

export async function getSession() {
  try {
    const h = await headers();
    const auth = getAuth();
    const session = await (auth as unknown as { api: { getSession: (a: unknown) => Promise<unknown> } }).api.getSession({ headers: h });
    return session;
  } catch {
    return null;
  }
}
