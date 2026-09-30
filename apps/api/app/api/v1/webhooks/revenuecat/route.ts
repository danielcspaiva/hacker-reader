import { getStore } from "@/lib/store";
import { handleRevenueCatWebhook } from "@/lib/webhook";

export async function POST(req: Request) {
  return handleRevenueCatWebhook(req, { store: getStore() });
}
