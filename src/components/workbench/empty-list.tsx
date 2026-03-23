import { Badge } from "@/components/ui/badge";

type EmptyListProps = {
  title: string;
  description: string;
  bullets: string[];
};

export function EmptyList({ title, description, bullets }: EmptyListProps) {
  return (
    <div className="rounded-xl border border-dashed border-border-strong bg-surface-muted p-5">
      <div className="flex items-center gap-2">
        <Badge>Empty state</Badge>
      </div>
      <h3 className="mt-3 text-base font-semibold text-text-strong">{title}</h3>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
        {description}
      </p>
      <ul className="mt-4 space-y-2 text-sm text-text-strong">
        {bullets.map((bullet) => (
          <li className="flex gap-2" key={bullet}>
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-accent" />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
