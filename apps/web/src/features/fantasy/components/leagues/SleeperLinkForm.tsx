import { useId, useState } from "react";
import type { LinkedLeague } from "@lifehub/shared";
import { Search } from "lucide-react";
import { useLinkLeague, useSleeperLeagues } from "../../queries";
import form from "./form.module.css";
import styles from "./SleeperLinkForm.module.css";

/**
 * Type your Sleeper username once and pick from your leagues, instead of
 * hunting for league ids.
 */
export function SleeperLinkForm({ linked }: { linked: LinkedLeague[] }) {
  const [draft, setDraft] = useState("");
  const [username, setUsername] = useState("");
  const search = useSleeperLeagues(username);
  const link = useLinkLeague();
  const [pending, setPending] = useState<string | null>(null);
  const inputId = useId();

  const linkedIds = new Set(
    linked.filter((l) => l.platform === "SLEEPER").map((l) => l.leagueId),
  );

  const onLink = (leagueId: string) => {
    setPending(leagueId);
    link.mutate(
      { platform: "SLEEPER", leagueId, sleeperUsername: username },
      { onSettled: () => setPending(null) },
    );
  };

  return (
    <div className={form.form}>
      <form
        className={styles.search}
        onSubmit={(e) => {
          e.preventDefault();
          setUsername(draft.trim());
        }}
      >
        <label className={form.label} htmlFor={inputId}>
          Your Sleeper username
        </label>
        <div className={styles.row}>
          <input
            id={inputId}
            className={form.input}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="username"
            placeholder="username"
          />
          <button
            type="submit"
            className={form.secondary}
            disabled={!draft.trim()}
          >
            <Search size={16} aria-hidden /> Find leagues
          </button>
        </div>
      </form>

      {search.isFetching && (
        <p className={form.help}>Looking up your leagues…</p>
      )}
      {search.isError && (
        <div className={form.error}>{search.error.message}</div>
      )}
      {link.isError && <div className={form.error}>{link.error.message}</div>}

      {search.data && search.data.leagues.length === 0 && (
        <p className={form.help}>
          {search.data.displayName} has no {search.data.season} leagues on
          Sleeper yet.
        </p>
      )}
      {search.data && search.data.leagues.length > 0 && (
        <ul
          className={styles.list}
          aria-label={`${search.data.season} leagues`}
        >
          {search.data.leagues.map((l) => (
            <li key={l.leagueId} className={styles.league}>
              <div className={styles.text}>
                <span className={styles.name}>{l.name}</span>
                <span className={form.help}>
                  {l.teams} teams · {l.season}
                </span>
              </div>
              {linkedIds.has(l.leagueId) ? (
                <span className={styles.done}>Linked</span>
              ) : (
                <button
                  type="button"
                  className={form.secondary}
                  onClick={() => onLink(l.leagueId)}
                  disabled={pending !== null}
                >
                  {pending === l.leagueId ? "Linking…" : "Link"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
