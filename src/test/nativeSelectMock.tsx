/** Vervangt Radix Select door een native <select> (Radix-popovers zijn in jsdom niet betrouwbaar te bedienen). */
import React from "react";

type Props = { children?: React.ReactNode };

const collect = (node: React.ReactNode, type: unknown, out: React.ReactElement[] = []) => {
  React.Children.forEach(node, (child) => {
    if (!React.isValidElement(child)) return;
    const el = child as React.ReactElement<Props>;
    if (el.type === type) out.push(el);
    else collect(el.props.children, type, out);
  });
  return out;
};

export const SelectItem = ({ children }: Props & { value: string }) => <>{children}</>;
export const SelectTrigger = ({ children }: Props & { className?: string }) => <>{children}</>;
export const SelectValue = () => null;
export const SelectContent = ({ children }: Props & { className?: string }) => <>{children}</>;
export const Select = ({
  value,
  onValueChange,
  children,
}: Props & { value: string; onValueChange: (v: string) => void }) => {
  const trigger = collect(children, SelectTrigger)[0] as unknown as React.ReactElement<Record<string, string>> | undefined;
  const items = collect(children, SelectItem) as unknown as React.ReactElement<{ value: string; children: React.ReactNode }>[];
  return (
    <select aria-label={trigger?.props["aria-label"]} value={value} onChange={(e) => onValueChange(e.target.value)}>
      {items.map((i) => (
        <option key={i.props.value} value={i.props.value}>
          {i.props.children}
        </option>
      ))}
    </select>
  );
};
