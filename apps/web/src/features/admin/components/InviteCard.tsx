import { useState, type FormEvent } from "react";
import { noPermissions, togglePermission } from "../lib/permissions";
import { useInviteUser } from "../queries";
import { PermissionPills } from "./PermissionPills";
import styles from "./InviteCard.module.css";

/** The dark "Send an Invite" card: an email and the tools to grant. */
export function InviteCard() {
  const [email, setEmail] = useState("");
  const [permissions, setPermissions] = useState(noPermissions);
  const invite = useInviteUser();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;
    invite.mutate(
      { email, permissions },
      {
        onSuccess: () => {
          setEmail("");
          setPermissions(noPermissions());
          alert(
            "Invite sent! They will receive a temporary password via email.",
          );
        },
        onError: () => alert("Failed to invite user"),
      },
    );
  };

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>Send an Invite</h3>
      <p className={styles.hint}>Grant access to your Hub.</p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={styles.email}
        />

        {/* The pills are buttons inside the form, so each click cancels the
            submit it would otherwise trigger. */}
        <PermissionPills
          className={styles.pills}
          permissions={permissions}
          onToggle={(tool, e) => {
            e.preventDefault();
            setPermissions((current) => togglePermission(current, tool));
          }}
        />

        <button
          type="submit"
          disabled={invite.isPending}
          className={styles.send}
        >
          {invite.isPending ? "Sending..." : "Send Invite"}
        </button>
      </form>
    </div>
  );
}
