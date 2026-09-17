export type MediaType = "image" | "video" | "audio";
export type PostKind = "note" | "moment" | "sound" | "question";
export type AccountRole = "user" | "admin";
export type AccountStatus = "active" | "suspended" | "banned";

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  website: string | null;
  location: string | null;
  role: AccountRole;
  account_status: AccountStatus;
  warning_count: number;
  private_account: boolean;
  discoverable: boolean;
  hide_counts: boolean;
  allow_messages: "everyone" | "following" | "none";
  notification_preferences: Record<string, boolean>;
  deletion_requested_at: string | null;
  last_seen_at: string | null;
  created_at: string;
};

export type MediaItem = {
  id: string; post_id: string; url: string; storage_path: string;
  media_type: MediaType; width: number | null; height: number | null; position: number;
  alt_text: string; file_size: number | null;
};

export type Post = {
  id: string; author_id: string; body: string; kind: PostKind;
  status: "active" | "hidden" | "removed"; created_at: string; updated_at: string;
  visibility: "public" | "followers" | "circle" | "private";
  allow_comments: boolean; content_warning: string | null; edited_at: string | null; circle_id: string | null;
  profiles: Profile; media: MediaItem[]; likes: { user_id: string }[];
  bookmarks: { user_id: string }[]; comments: { count: number }[];
};

export type Story = {
  id: string; user_id: string; caption: string; media_url: string; storage_path: string;
  media_type: MediaType; accent: string; audience?: "public" | "followers" | "close_friends"; created_at: string; expires_at: string; profiles: Profile; story_views?: { count: number }[];
};

export type Comment = {
  id: string; body: string; created_at: string; parent_id: string | null; status: "active" | "hidden" | "removed";
  profiles: Pick<Profile, "id" | "username" | "display_name" | "avatar_url">;
};

export type Conversation = {
  id: string; updated_at: string;
  conversation_members: { profile_id: string; profiles: Profile }[];
  messages: { id: string; body: string; created_at: string; sender_id: string }[];
};
