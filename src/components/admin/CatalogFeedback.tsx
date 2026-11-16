import type { useCatalogMutation } from "./use-catalog-mutation";
export function CatalogFeedback({ mutation }: { mutation: ReturnType<typeof useCatalogMutation> }) {
  const feedback = mutation.feedback;
  return feedback ? (
    <p
      role={feedback.error ? "alert" : "status"}
      className={feedback.error ? "text-destructive" : "text-success"}
    >
      {feedback.message}
    </p>
  ) : null;
}
