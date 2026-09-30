import { signOut } from "aws-amplify/auth";
import { useProfile } from "../../shared/hooks/useProfile";
import { EmptyState } from "./components/EmptyState";
import { TileGrid } from "./components/TileGrid";
import { WhatsNewDialog } from "./components/WhatsNewDialog";
import { hubTiles } from "./lib/tiles";
import { useDismissChangelog } from "./queries";
import styles from "./HubPage.module.css";

async function handleSignOut() {
  try {
    await signOut();
    window.location.href = "/login";
  } catch (error) {
    console.error("Error signing out: ", error);
  }
}

export function HubPage() {
  const profile = useProfile();
  const dismissChangelog = useDismissChangelog();

  if (profile.isPending) {
    return (
      <div className={`view ${styles.page}`}>
        <div className={styles.header}>
          <h1 className={styles.title}>Loading...</h1>
        </div>
      </div>
    );
  }

  // A failed profile load shows the same "no access" state as no permissions.
  const tiles = hubTiles(profile.data);
  const changelog = profile.data?.unseenChangelog ?? [];

  return (
    <div className={`view ${styles.page}`}>
      <div className={styles.header}>
        <h1 className={styles.title}>LifeHub</h1>
        <button onClick={handleSignOut} className={styles.signOut}>
          Sign Out
        </button>
      </div>

      <div className={styles.content}>
        {tiles.length > 0 ? <TileGrid tiles={tiles} /> : <EmptyState />}
      </div>

      {changelog.length > 0 && (
        <WhatsNewDialog
          entries={changelog}
          onDone={() => dismissChangelog.mutate()}
        />
      )}
    </div>
  );
}
