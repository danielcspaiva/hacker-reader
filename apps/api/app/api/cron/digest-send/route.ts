import { handleDigestSendCron } from "@/lib/digest/send";
import { getStore } from "@/lib/store";

// A run stops starting new batches after ~50s; Vercel Pro allows up to 60s.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handleDigestSendCron(req, { store: getStore() });
}
