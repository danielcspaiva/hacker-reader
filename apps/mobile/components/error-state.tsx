import { Button, EmptyState } from "@/components/ui";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry: () => void;
}

/** A failed load with a retry, in the place the content would have been. */
export function ErrorState({
  title = "Couldn't load",
  message = "Check your connection and try again.",
  onRetry,
}: ErrorStateProps) {
  return (
    <EmptyState
      icon="error"
      title={title}
      message={message}
      action={
        <Button label="Try again" variant="secondary" onPress={onRetry} />
      }
    />
  );
}
