import { useState } from "react";
import type { RunGarminStatus } from "@lifehub/shared";
import { useConnectGarmin, useDisconnectGarmin } from "../queries";
import card from "./card.module.css";
import styles from "./GarminPanel.module.css";

/** Connect or disconnect Garmin, and say why the runs are examples. */
export function GarminPanel({ status }: { status: RunGarminStatus }) {
  const connect = useConnectGarmin();
  const disconnect = useDisconnectGarmin();
  const [confirming, setConfirming] = useState(false);
  const failure = connect.error?.message ?? disconnect.error?.message;

  if (status === "connected") {
    return (
      <footer className={styles.footer}>
        <span>Runs and VO₂ max come from your Garmin Personal API key.</span>
        <button
          className={styles.link}
          disabled={disconnect.isPending}
          onClick={() =>
            confirming ? disconnect.mutate() : setConfirming(true)
          }
        >
          {confirming
            ? "Disconnect and delete my copied runs"
            : "Disconnect Garmin"}
        </button>
        {failure && <span className={styles.error}>{failure}</span>}
      </footer>
    );
  }

  return (
    <section className={`${card.card} ${styles.banner}`}>
      <div className={styles.text}>
        <h2 className={card.title}>These are example runs</h2>
        <p className={card.note}>
          {status === "available"
            ? "Your Garmin key is set up. Connect it to see your own runs; the first load copies about two years of history."
            : "Garmin isn't connected for your account, so the page shows made-up runs."}
        </p>
        {failure && <p className={styles.error}>{failure}</p>}
      </div>
      {status === "available" && (
        <button
          className={styles.connect}
          disabled={connect.isPending}
          onClick={() => connect.mutate()}
        >
          {connect.isPending ? "Copying your runs…" : "Connect Garmin"}
        </button>
      )}
    </section>
  );
}
