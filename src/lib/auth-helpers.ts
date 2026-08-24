import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function getSession() {
  try {
    const h = await headers();
    const session = await auth.api.getSession({ headers: h });
    return session;
  } catch {
    return null;
  }
}
