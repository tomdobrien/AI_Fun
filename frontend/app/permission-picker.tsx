"use client";

import type { PermissionOption } from "@/lib/types";

export default function PermissionPicker({ options, value, onChange, disabled = false }: {
  options: PermissionOption[]; value: string[]; onChange: (value: string[]) => void; disabled?: boolean;
}) {
  return <fieldset className="permission-picker" disabled={disabled}>
    <legend>Permissions</legend>
    {options.map((option) => <label key={option.key}>
      <input type="checkbox" checked={value.includes(option.key)} onChange={(event) => onChange(
        event.target.checked ? [...value, option.key] : value.filter((key) => key !== option.key))} />{option.label}
    </label>)}
    {options.length === 0 && <p className="field-hint">No permissions are available.</p>}
  </fieldset>;
}
