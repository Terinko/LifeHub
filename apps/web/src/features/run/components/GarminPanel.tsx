import { useState } from "react";
import type { RunGarminStatus } from "@lifehub/shared";
import { garminRedirectUri } from "../lib/garminReturn";
import { useDisconnectGarmin, useStartGarminConnect } from "../queries";
import card from "./card.module.css";
import styles from "./GarminPanel.module.css";

type Props = {
  status: RunGarminStatus;
  error: string | undefined;
};

/** Connect or disconnect Garmin, and say why the runs are examples. */
export function GarminPanel({ status, error }: Props) {
  const connect = useStartGarminConnect();
  const disconnect = useDisconnectGarmin();
  const [confirming, setConfirming] = useState(false);
  const failure = error ?? connect.error?.message ?? disconnect.error?.message;

  if (status === "connected") {
    return (
      <footer className={styles.footer}>
        <span>Runs and VO₂ max come from Garmin Connect.</span>
        <button
          className={styles.link}
          disabled={disconnect.isPending}
          onClick={() =>
            confirming ? disconnect.mutate() : setConfirming(true)
          }
        >
          {confirming
            ? "Disconnect and delete my Garmin runs"
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
          {status === "unavailable"
            ? "Garmin isn't set up for LifeHub yet, so the page shows made-up runs."
            : "Connect your Garmin account to see your own runs. New runs appear a few minutes after your watch syncs."}
        </p>
        {failure && <p className={styles.error}>{failure}</p>}
      </div>
      {status === "not-connected" && (
        <button
          className={styles.connect}
          disabled={connect.isPending}
          onClick={() =>
            connect.mutate(garminRedirectUri(window.location.origin))
          }
        >
          {connect.isPending ? "Opening Garmin…" : "Connect Garmin"}
        </button>
      )}
    </section>
  );
}
