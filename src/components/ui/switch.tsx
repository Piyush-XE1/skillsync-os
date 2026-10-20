import { Toggle } from "@/components/common/Toggle";

/** Compatibility adapter for the shared Folio Circuit toggle. */
export function Switch({
  checked,
  onCheckedChange,
  disabled = false,
  className,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  "aria-label": string;
}) {
  return (
    <Toggle
      on={checked}
      onChange={onCheckedChange}
      disabled={disabled}
      className={className}
      label={ariaLabel}
    />
  );
}
