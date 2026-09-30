import { useNavigate } from "react-router-dom";
import { InviteCard } from "./components/InviteCard";
import { UserRoster } from "./components/UserRoster";
import styles from "./AdminPage.module.css";

export function AdminPage() {
  const navigate = useNavigate();
  return (
    <div className="view">
      <header className="ios-nav-bar">
        <button onClick={() => navigate("/")} className="ios-back-btn">
          ‹ Hub
        </button>
        <h2>System Admin</h2>
        <div className={styles.navSpacer}></div>
      </header>

      <div className={styles.content}>
        <InviteCard />
        <UserRoster />
      </div>
    </div>
  );
}
