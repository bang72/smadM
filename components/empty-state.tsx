import { Aperture } from "lucide-react";

export default function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="empty-state"><span><Aperture size={25} /></span><h2>{title}</h2><p>{text}</p></div>;
}
