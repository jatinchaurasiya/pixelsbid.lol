import { getAuth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export async function GET(req: Request) {
  const auth = getAuth();
  const { GET: handler } = toNextJsHandler(auth as unknown as Parameters<typeof toNextJsHandler>[0]);
  return handler(req);
}
export async function POST(req: Request) {
  const auth = getAuth();
  const { POST: handler } = toNextJsHandler(auth as unknown as Parameters<typeof toNextJsHandler>[0]);
  return handler(req);
}
