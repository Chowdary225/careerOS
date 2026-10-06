import { useRef, type ReactNode } from "react";
export function Tabs({
  id,
  label,
  options,
  value,
  onChange,
}: {
  id: string;
  label: string;
  options: { value: string; label: ReactNode }[];
  value: string;
  onChange: (value: string) => void;
}) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {options.map((option, index) => (
        <button
          key={option.value}
          ref={(el) => {
            buttons.current[index] = el;
          }}
          id={`${id}-tab-${index}`}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          aria-controls={`${id}-panel`}
          tabIndex={value === option.value ? 0 : -1}
          onClick={() => onChange(option.value)}
          onKeyDown={(e) => {
            let next = index;
            if (e.key === "ArrowRight") next = (index + 1) % options.length;
            else if (e.key === "ArrowLeft")
              next = (index - 1 + options.length) % options.length;
            else if (e.key === "Home") next = 0;
            else if (e.key === "End") next = options.length - 1;
            else return;
            e.preventDefault();
            onChange(options[next].value);
            buttons.current[next]?.focus();
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
