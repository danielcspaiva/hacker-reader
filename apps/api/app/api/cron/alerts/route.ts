import { handleAlertsCron } from "@/lib/alerts-cron";
import { getStore } from "@/lib/store";

// One run stops starting new batches after ~50s; Vercel Pro allows up to 60s.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handleAlertsCron(req, { store: getStore() });
}
