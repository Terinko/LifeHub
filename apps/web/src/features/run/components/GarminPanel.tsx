import { useState } from "react";
import type { RunGarminStatus } from "@lifehub/shared";
import {
  useConnectGarmin,
  useDisconnectGarmin,
  useGarminCheck,
} from "../queries";
import card from "./card.module.css";
import styles from "./GarminPanel.module.css";

/** Connect or disconnect Garmin, check what it sends, and say why data is made up. */
export function GarminPanel({ status }: { status: RunGarminStatus }) {
  const connect = useConnectGarmin();
  const disconnect = useDisconnectGarmin();
  const check = useGarminCheck();
  const [confirming, setConfirming] = useState(false);
  const failure = connect.error?.message ?? disconnect.error?.message;

  if (status === "connected") {
    return (
      <footer className={styles.footer}>
        <span>
          Runs, lifts, VO₂ max and HRV come from your Garmin Personal API key.
        </span>
        <button
          className={styles.link}
          disabled={check.isPending}
          onClick={() => check.mutate()}
        >
          {check.isPending ? "Checking Garmin…" : "Check what Garmin sends"}
        </button>
        <button
          className={styles.link}
          disabled={disconnect.isPending}
          onClick={() =>
            confirming ? disconnect.mutate() : setConfirming(true)
          }
        >
          {confirming
            ? "Disconnect and delete my copied data"
            : "Disconnect Garmin"}
        </button>
        {failure && <span className={styles.error}>{failure}</span>}
        {check.error && (
          <span className={styles.error}>{check.error.message}</span>
        )}
        {check.data && (
          <ul className={styles.check}>
            {check.data.lines.map((line) => (
              <li key={line.label} data-ok={line.ok}>
                <b>{line.label}</b>
                <span>{line.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </footer>
    );
  }

  return (
    <section className={`${card.card} ${styles.banner}`}>
      <div className={styles.text}>
        <h2 className={card.title}>This is example training</h2>
        <p className={card.note}>
          {status === "available"
            ? "Your Garmin key is set up. Connect it to see your own runs and lifts; the first load copies about two years of history."
            : "Garmin isn't connected for your account, so the page shows made-up runs and lifts."}
        </p>
        {failure && <p className={styles.error}>{failure}</p>}
      </div>
      {status === "available" && (
        <button
          className={styles.connect}
          disabled={connect.isPending}
          onClick={() => connect.mutate()}
        >
          {connect.isPending ? "Copying your training…" : "Connect Garmin"}
        </button>
      )}
    </section>
  );
}
