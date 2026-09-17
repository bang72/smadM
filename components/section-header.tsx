export default function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return <header className="section-header"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div></header>;
}
