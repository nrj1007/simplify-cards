import { CircleHelp } from "lucide-react";

type Props = {
  items: string[];
  label?: string;
};

export default function LoungeInfo({ items, label = "Lounge access conditions" }: Props) {
  if (!items.length) return null;

  return (
    <details className="info-popover">
      <summary aria-label={label} className="info-popover-trigger" title={label}>
        <CircleHelp size={14} />
      </summary>
      <div className="info-popover-panel">
        <strong>{label}</strong>
        <ul className="info-popover-list">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </details>
  );
}

