import { ListSlot, Segmented } from "@/components/ui";
import { COMMON_DIGEST_HOURS, formatDigestHour } from "@/lib/pro/digest";

/** Without a native picker: a segmented choice of common hours. */
export function DigestHourPicker({
  hour,
  onChange,
  disabled = false,
}: {
  hour: number;
  onChange: (hour: number) => void;
  disabled?: boolean;
}) {
  // A saved hour outside the common ones stays selectable.
  const hours = COMMON_DIGEST_HOURS.includes(hour)
    ? COMMON_DIGEST_HOURS
    : [...COMMON_DIGEST_HOURS, hour].sort((a, b) => a - b);
  return (
    <ListSlot padding={12}>
      <Segmented
        options={hours.map((value) => ({
          value: String(value),
          label: formatDigestHour(value),
        }))}
        value={String(hour)}
        onChange={(next) => {
          if (!disabled) onChange(Number(next));
        }}
      />
    </ListSlot>
  );
}
