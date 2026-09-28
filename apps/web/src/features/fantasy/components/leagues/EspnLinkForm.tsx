import { useId, useState } from "react";
import { Lock } from "lucide-react";
import { parseEspnTeamLink } from "../../lib/espnLink";
import { useLinkLeague } from "../../queries";
import { cookiesOrNothing, emptyCookies } from "../../lib/cookies";
import { CookieFields } from "./CookieFields";
import form from "./form.module.css";

/** Paste your ESPN team page link; the ids come out of it. */
export function EspnLinkForm({ onLinked }: { onLinked: () => void }) {
  const [teamLink, setTeamLink] = useState("");
  const [nickname, setNickname] = useState("");
  const [cookies, setCookies] = useState(emptyCookies);
  const link = useLinkLeague();
  const linkId = useId();

  const ids = parseEspnTeamLink(teamLink);
  const showLinkHint = teamLink.trim() !== "" && !ids;

  return (
    <form
      className={form.form}
      onSubmit={(e) => {
        e.preventDefault();
        if (!ids) return;
        link.mutate(
          {
            platform: "ESPN",
            leagueId: ids.leagueId,
            espnTeamId: ids.teamId,
            nickname: nickname.trim() || null,
            espnCookies: cookiesOrNothing(cookies),
          },
          { onSuccess: onLinked },
        );
      }}
    >
      <div className={form.field}>
        <label className={form.label} htmlFor={linkId}>
          Your team page link
        </label>
        <input
          id={linkId}
          className={form.input}
          value={teamLink}
          onChange={(e) => setTeamLink(e.target.value)}
          placeholder="fantasy.espn.com/football/team?leagueId=…"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          aria-describedby={`${linkId}-help`}
        />
        <span id={`${linkId}-help`} className={form.help} aria-live="polite">
          {ids
            ? `League ${ids.leagueId}, team ${ids.teamId}.`
            : showLinkHint
              ? "That doesn't look like a team page. Open My Team on ESPN and copy the link from the address bar."
              : "Open My Team on ESPN and copy the link from the address bar."}
        </span>
      </div>

      <label className={form.field}>
        <span className={form.label}>Nickname (optional)</span>
        <input
          className={form.input}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Uses the league's name if blank"
        />
      </label>

      <details className={form.disclosure}>
        <summary>
          <Lock size={16} aria-hidden /> Private league?
        </summary>
        <div className={form.form}>
          <CookieFields value={cookies} onChange={setCookies} />
        </div>
      </details>

      {link.isError && <div className={form.error}>{link.error.message}</div>}

      <button
        type="submit"
        className={form.primary}
        disabled={!ids || link.isPending}
      >
        {link.isPending ? "Checking with ESPN…" : "Link league"}
      </button>
    </form>
  );
}
