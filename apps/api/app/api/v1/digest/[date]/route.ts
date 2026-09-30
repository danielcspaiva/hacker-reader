import { handleDigest } from "@/lib/digest/handler";
import { getStore } from "@/lib/store";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date } = await params;
  return handleDigest(req, date, { store: getStore() });
}
