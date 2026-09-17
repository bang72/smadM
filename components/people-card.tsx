import Link from "next/link";
import type { Profile } from "@/lib/database.types";
import { Avatar } from "./app-shell";
import FollowButton from "./follow-button";

export default function PeopleCard({ profile, following }: { profile: Profile; following: boolean }) {
  return <article className="people-card"><Link href={`/u/${profile.username}`}><Avatar profile={profile} /></Link><div><Link href={`/u/${profile.username}`}><strong>{profile.display_name}</strong></Link><span>@{profile.username}</span>{profile.bio && <p>{profile.bio}</p>}</div><FollowButton profileId={profile.id} initial={following} /></article>;
}
