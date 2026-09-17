import SectionHeader from "@/components/section-header";
import PrivacySettings from "@/components/privacy-settings";
import { getViewer } from "@/lib/queries";
import { getCloseFriendIds, getConnections } from "@/lib/queries";
import CloseFriends from "@/components/close-friends";
import type { Profile } from "@/lib/database.types";

export default async function SettingsPage(){const {profile}=await getViewer();if(!profile)return null;const [rows,ids]=await Promise.all([getConnections(profile.id,"following"),getCloseFriendIds(profile.id)]);const people=rows.map(row=>(row as unknown as {profiles:Profile}).profiles).filter(Boolean);return <><SectionHeader title="Pengaturan" subtitle="Privasi, ketenangan, dan kendali akunmu."/><div className="settings-stack"><PrivacySettings profile={profile}/><CloseFriends people={people} initial={ids}/></div></>}
