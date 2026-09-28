import type { EspnCookies } from "@lifehub/shared";
import form from "./form.module.css";

type Props = { value: EspnCookies; onChange: (value: EspnCookies) => void };

/** espn_s2 and SWID, needed only for private ESPN leagues. */
export function CookieFields({ value, onChange }: Props) {
  return (
    <>
      <label className={form.field}>
        <span className={form.label}>espn_s2</span>
        <input
          className={form.input}
          type="password"
          autoComplete="off"
          value={value.espn_s2}
          onChange={(e) => onChange({ ...value, espn_s2: e.target.value })}
        />
      </label>
      <label className={form.field}>
        <span className={form.label}>SWID</span>
        <input
          className={form.input}
          type="password"
          autoComplete="off"
          placeholder="{XXXXXXXX-XXXX-…}"
          value={value.swid}
          onChange={(e) => onChange({ ...value, swid: e.target.value })}
        />
      </label>
      <p className={form.help}>
        On a computer, sign in at espn.com, open the browser's developer tools,
        and copy these two cookies from Application › Cookies. They're stored
        encrypted, only used to read your league, and never shown again.
      </p>
    </>
  );
}
