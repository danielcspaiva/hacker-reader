import { createContext, use, useState, type ReactNode } from "react";

import type { Category } from "@/components/category-filter";

type FeedCategoryContextValue = {
  category: Category;
  setCategory: (category: Category) => void;
};

const FeedCategoryContext = createContext<FeedCategoryContextValue | null>(
  null
);

export function FeedCategoryProvider({ children }: { children: ReactNode }) {
  const [category, setCategory] = useState<Category>("top");

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
