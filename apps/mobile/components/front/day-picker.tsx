import { ListRow } from "@/components/ui";
import { formatDayLabel } from "@/lib/format/day";

/** Non-iOS fallback: shows the day; the header buttons step through days. */
export function DayPicker({
  day,
}: {
  day: string;
  onChange: (day: string) => void;
}) {
  return <ListRow title="Day (UTC)" value={formatDayLabel(day)} />;
}
