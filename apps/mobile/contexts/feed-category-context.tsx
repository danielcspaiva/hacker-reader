import { createContext, use, useState, type ReactNode } from "react";

import type { StoryCategory } from "@/lib/hn";

type FeedCategoryContextValue = {
  category: StoryCategory;
  setCategory: (category: StoryCategory) => void;
};

const FeedCategoryContext = createContext<FeedCategoryContextValue | null>(
  null
);

export function FeedCategoryProvider({ children }: { children: ReactNode }) {
  const [category, setCategory] = useState<StoryCategory>("top");

  return (
    <FeedCategoryContext value={{ category, setCategory }}>
      {children}
    </FeedCategoryContext>
  );
}

export function useFeedCategory(): FeedCategoryContextValue {
  const value = use(FeedCategoryContext);
  if (!value) {
    throw new Error("useFeedCategory must be used within FeedCategoryProvider");
  }
  return value;
}
