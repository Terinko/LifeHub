import type { MouseEvent } from "react";
import type { ToolPermission, ToolPermissions } from "@lifehub/shared";
import { PERMISSION_OPTIONS } from "../lib/permissions";
import { TogglePill } from "./TogglePill";

type Props = {
  permissions: ToolPermissions | undefined;
  onToggle: (tool: ToolPermission, e: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
};

/** One pill per tool, lit when the permission is on. */
export function PermissionPills({ permissions, onToggle, className }: Props) {
  return (
    <div className={className}>
      {PERMISSION_OPTIONS.map(({ key, label, icon }) => (
        <TogglePill
          key={key}
          label={label}
          icon={icon}
          isActive={!!permissions?.[key]}
          onClick={(e) => onToggle(key, e)}
        />
      ))}
    </div>
  );
}
