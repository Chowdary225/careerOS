import {
  useId,
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  type SelectHTMLAttributes,
  type ReactNode,
} from "react";
import { ArrowUpRight, FolderOpen } from "lucide-react";
import { Link } from "react-router-dom";
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}
export function Empty({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <FolderOpen size={32} strokeWidth={1} />
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function RouteButton({
  to,
  children,
  secondary = false,
}: {
  to: string;
  children: ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link className={`button ${secondary ? "secondary" : ""}`} to={to}>
      {children}
      <ArrowUpRight size={16} />
    </Link>
  );
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function Field({
  label,
  children,
  hint,
  error,
  required = false,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  error?: string;
  required?: boolean;
}) {
  const generated = useId();
  type FieldControl =
    | InputHTMLAttributes<HTMLInputElement>
    | TextareaHTMLAttributes<HTMLTextAreaElement>
    | SelectHTMLAttributes<HTMLSelectElement>;
  const isControl = (node: ReactNode): node is ReactElement<FieldControl> =>
    isValidElement<FieldControl>(node) &&
    typeof node.type === "string" &&
    ["input", "textarea", "select"].includes(node.type);
  const child = Children.toArray(children).find(isControl) || null;
  const id = child?.props.id || generated;
  const description =
    [
      hint ? `${id}-hint` : "",
      error ? `${id}-error` : "",
      child?.props["aria-describedby"] || "",
    ]
      .filter(Boolean)
      .join(" ") || undefined;
  let assignedControl = false;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {Children.map(children, (node) =>
        isControl(node) && !assignedControl
          ? (() => {
              assignedControl = true;
              return cloneElement(node, {
                id,
                name: node.props.name || id,
                "aria-describedby": description,
                "aria-invalid": error ? true : undefined,
                "aria-required": required || undefined,
              });
            })()
          : node,
      )}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
      {error && (
        <small className="field-error" id={`${id}-error`}>
          {error}
        </small>
      )}
    </div>
  );
}
export function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
