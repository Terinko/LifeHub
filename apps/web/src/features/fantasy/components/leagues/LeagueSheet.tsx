import { useState } from "react";
import type { LinkedLeague } from "@lifehub/shared";
import { Lock } from "lucide-react";
import { leagueDetail, leagueTitle } from "../../lib/leagues";
import { useUnlinkLeague, useUpdateLeague } from "../../queries";
import { Sheet } from "../chrome/Sheet";
import { cookiesOrNothing, emptyCookies } from "../../lib/cookies";
import { CookieFields } from "./CookieFields";
import form from "./form.module.css";
import styles from "./LeagueSheet.module.css";

type Props = { league: LinkedLeague; onClose: () => void };

/** Rename, update ESPN cookies, or unlink (with a second tap to confirm). */
export function LeagueSheet({ league, onClose }: Props) {
  const [nickname, setNickname] = useState(league.nickname ?? "");
  const [cookies, setCookies] = useState(emptyCookies);
  const [confirming, setConfirming] = useState(false);
  const update = useUpdateLeague();
  const unlink = useUnlinkLeague();

  const newCookies = cookiesOrNothing(cookies);
  const renamed = nickname.trim() !== (league.nickname ?? "");

  const save = () =>
    update.mutate(
      {
        sk: league.sk,
        input: {
          nickname: renamed ? nickname.trim() || null : undefined,
          espnCookies: newCookies,
        },
      },
      { onSuccess: onClose },
    );

  const onUnlink = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    unlink.unlink(league.sk);
    onClose();
  };

  return (
    <Sheet title={leagueTitle(league)} onClose={onClose}>
      <p className={form.help}>{leagueDetail(league)}</p>
      <label className={form.field}>
        <span className={form.label}>Nickname</span>
        <input
          className={form.input}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder={league.leagueName ?? "League name"}
        />
      </label>

      {league.platform === "ESPN" && (
        <details className={form.disclosure}>
          <summary>
            <Lock size={16} aria-hidden />
            {league.hasCookies
              ? "Replace private league cookies"
              : "Add private league cookies"}
          </summary>
          <div className={form.form}>
            <CookieFields value={cookies} onChange={setCookies} />
          </div>
        </details>
      )}

      {update.isError && (
        <div className={form.error}>{update.error.message}</div>
      )}

      <button
        type="button"
        className={form.primary}
        onClick={save}
        disabled={(!renamed && !newCookies) || update.isPending}
      >
        {update.isPending ? "Saving…" : "Save"}
      </button>
      <button type="button" className={styles.unlink} onClick={onUnlink}>
        {confirming ? "Tap again to unlink" : "Unlink league"}
      </button>
    </Sheet>
  );
}
