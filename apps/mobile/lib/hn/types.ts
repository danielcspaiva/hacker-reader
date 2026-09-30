export interface HNItem {
  id: number;
  deleted?: boolean;
  type?: "job" | "story" | "comment" | "poll" | "pollopt";
  by?: string;
  time?: number;
  text?: string;
  dead?: boolean;
  parent?: number;
  poll?: number;
  kids?: number[];
  url?: string;
  score?: number;
  title?: string;
  parts?: number[];
  descendants?: number;
}

export interface HNUser {
  id: string;
  created: number;
  karma: number;
  about?: string;
  submitted?: number[];
}

export interface AlgoliaComment {
  id: number;
  created_at: string;
  created_at_i: number;
  author: string | null;
  text: string | null;
  points: number | null;
  parent_id: number | null;
  story_id: number;
  children: AlgoliaComment[];
  type: "comment" | "story" | "job" | "poll" | "pollopt";
  url: string | null;
  title: string | null;
  options?: unknown[];
}

export interface AlgoliaStory {
  id: number;
  created_at: string;
  created_at_i: number;
  author: string;
  title: string;
  url: string | null;
  text: string | null;
  points: number;
  parent_id: number | null;
  story_id: number | null;
  children: AlgoliaComment[];
  type: "story" | "job" | "poll" | "comment";
  options?: unknown[];
}

export interface AlgoliaSearchHit {
  objectID: string;
  title: string | null;
  url: string | null;
  author: string | null;
  points: number | null;
  num_comments: number | null;
  created_at_i: number;
  story_text?: string | null;
  /** Comment hits only. */
  comment_text?: string | null;
  story_id?: number | null;
  story_title?: string | null;
  parent_id?: number | null;
}

export interface AlgoliaSearchResponse {
  hits: AlgoliaSearchHit[];
  page: number;
  nbPages: number;
  hitsPerPage: number;
}

export interface Comment {
  id: number;
  by: string;
  time: number;
  text?: string;
  deleted?: boolean;
  dead?: boolean;
  children: Comment[];
}

export interface StoryWithComments {
  id: number;
  title: string;
  url?: string;
  text?: string;
  by: string;
  time: number;
  score: number;
  descendants?: number;
  comments: Comment[];
}
