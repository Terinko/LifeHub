import type { ToolPermission, UserProfile } from "@lifehub/shared";
import { countActiveThisWeek } from "../lib/activity";
import { togglePermission } from "../lib/permissions";
import { useDeleteUser, useUpdateUser, useUsers } from "../queries";
import { UserCard } from "./UserCard";
import styles from "./UserRoster.module.css";

/** Everyone with an account, with their access and last activity. */
export function UserRoster() {
  const users = useUsers().data ?? [];
  const update = useUpdateUser();
  const remove = useDeleteUser();

  const handleToggle = (user: UserProfile, tool: ToolPermission) =>
    update.mutate({
      ...user,
      permissions: togglePermission(user.permissions, tool),
    });

  const handleRemove = (user: UserProfile) => {
    const ok = window.confirm(
      `Are you sure you want to completely remove ${user.email}? They will lose access immediately.`,
    );
    if (ok)
      remove.mutate(user, { onError: () => alert("Failed to delete user.") });
  };

  return (
    <>
      <h3 className={styles.title}>Active Users</h3>
      <div className={styles.summary}>
        {users.length} user{users.length === 1 ? "" : "s"} ·{" "}
        {countActiveThisWeek(users)} active this week
      </div>
      <div className={styles.list}>
        {users.map((user) => (
          <UserCard
            key={user.pk}
            user={user}
            onToggle={(tool) => handleToggle(user, tool)}
            onRemove={() => handleRemove(user)}
          />
        ))}
      </div>
    </>
  );
}
