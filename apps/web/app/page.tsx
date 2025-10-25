"use client";

import { useQuery } from "@tanstack/react-query";
import { getTopStories, getItems, type HNItem } from "@hn/shared";
import Link from "next/link";

export default function Home() {
  const { data: stories, isLoading } = useQuery<HNItem[]>({
    queryKey: ["top-stories"],
    queryFn: async () => {
      const ids = await getTopStories(0, 30);
      return getItems(ids);
    },
  });

  return (
    <div className="min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Hacker News</h1>

        {isLoading && <p>Loading stories...</p>}

        {stories && (
          <div className="space-y-4">
            {stories.map((story, index) => (
              <div key={story.id} className="border-b pb-4">
                <div className="flex gap-2">
                  <span className="text-gray-500">{index + 1}.</span>
                  <div>
                    <Link
                      href={story.url || `/story/${story.id}`}
                      className="text-lg hover:underline"
                      target={story.url ? "_blank" : undefined}
                    >
                      {story.title}
                    </Link>
                    {story.url && (
                      <span className="text-sm text-gray-500 ml-2">
                        ({new URL(story.url).hostname})
                      </span>
                    )}
                    <div className="text-sm text-gray-600 mt-1">
                      {story.score} points by {story.by} | {story.descendants || 0} comments
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
