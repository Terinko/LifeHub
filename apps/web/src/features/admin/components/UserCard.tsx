import type { ToolPermission, UserProfile } from "@lifehub/shared";
import { formatRelative, TOOL_USAGE_FIELDS } from "../lib/activity";
import { PermissionPills } from "./PermissionPills";
import styles from "./UserCard.module.css";

type Props = {
  user: UserProfile;
  onToggle: (tool: ToolPermission) => void;
  onRemove: () => void;
};

/** One user: who they are, when they last used each tool, and their access. */
export function UserCard({ user, onToggle, onRemove }: Props) {
  const isAdmin = user.role === "ADMIN";
  return (
    <div className={styles.card}>
      <div className={styles.top}>
        <div>
          <div className={styles.email}>{user.email}</div>
          <div className={styles.meta}>
            {isAdmin ? "System Administrator" : "Guest User"}
            {" · Last active: "}
            {formatRelative(user.lastActiveAt)}
          </div>
        </div>
        {!isAdmin && (
          <button onClick={onRemove} className={styles.remove}>
            Remove
          </button>
        )}
      </div>

      <div className={styles.usage}>
        {TOOL_USAGE_FIELDS.map(({ key, label }) => (
          <span key={key}>
            {label}: {formatRelative(user[key])}
          </span>
        ))}
      </div>

      {isAdmin ? (
        <div className={styles.unrestricted}>
          Has unrestricted access to all modules.
        </div>
      ) : (
        <PermissionPills
          className={styles.permissions}
          permissions={user.permissions}
          onToggle={onToggle}
        />
      )}
    </div>
  );
}
