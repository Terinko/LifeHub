import {
  THRIFT_ITEM_TYPES,
  thriftQuery,
  type ThriftItemType,
} from "@lifehub/shared";
import { BRANDS } from "../lib/brands";
import styles from "../thrift.module.css";

export type ItemForm = {
  brand: string;
  itemType: ThriftItemType | null;
  detail: string;
};

type Props = {
  form: ItemForm;
  onChange: (form: ItemForm) => void;
  /** Brands found in the tag text, best first; empty when typed in. */
  candidates: string[];
  tagText: string;
  photoUrl: string | undefined;
  onSubmit: () => void;
};

/** Confirm the brand read off the tag, pick the kind of item, look it up. */
export function ConfirmScreen({
  form,
  onChange,
  candidates,
  tagText,
  photoUrl,
  onSubmit,
}: Props) {
  const ready = form.brand.trim() !== "" && form.itemType !== null;
  const set = (patch: Partial<ItemForm>) => onChange({ ...form, ...patch });

  return (
    <form
      className={styles.content}
      style={{ padding: 0 }}
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) onSubmit();
      }}
    >
      {photoUrl && <img className={styles.photo} src={photoUrl} alt="" />}

      {tagText && (
        <div>
          <span className={styles.label}>Read on your phone</span>
          <div className={styles.read}>{tagText.trim()}</div>
        </div>
      )}

      {candidates.length > 0 && (
        <div>
          <span className={styles.fieldLabel}>
            {candidates.length === 1 ? "Is this the brand?" : "Which brand?"}
          </span>
          <div className={styles.chips}>
            {candidates.map((name) => (
              <button
                key={name}
                type="button"
                className={styles.chip}
                aria-pressed={form.brand === name}
                onClick={() => set({ brand: name })}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className={styles.fieldLabel} htmlFor="thrift-brand">
          {candidates.length ? "Or type the brand" : "Brand"}
        </label>
        <input
          id="thrift-brand"
          className={styles.field}
          list="thrift-brands"
          autoComplete="off"
          autoCapitalize="words"
          value={form.brand}
          onChange={(e) => set({ brand: e.target.value })}
        />
        <datalist id="thrift-brands">
          {BRANDS.map((b) => (
            <option key={b.name} value={b.name} />
          ))}
        </datalist>
      </div>

      <div>
        <span className={styles.fieldLabel}>What kind of item?</span>
        <div className={styles.chips}>
          {THRIFT_ITEM_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              className={styles.chip}
              aria-pressed={form.itemType === t}
              onClick={() => set({ itemType: t })}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={styles.fieldLabel} htmlFor="thrift-detail">
          One detail (optional)
        </label>
        <input
          id="thrift-detail"
          className={styles.field}
          placeholder="Model, fabric or style, like 501 or wool"
          autoComplete="off"
          value={form.detail}
          onChange={(e) => set({ detail: e.target.value })}
        />
      </div>

      {ready && form.itemType && (
        <div>
          <span className={styles.label}>Will search eBay for</span>
          <div className={styles.preview}>
            {thriftQuery({
              brand: form.brand,
              itemType: form.itemType,
              detail: form.detail,
            })}
          </div>
        </div>
      )}

      <button type="submit" className={styles.main} disabled={!ready}>
        Look it up
      </button>
      {!ready && (
        <p className={styles.sec}>
          {form.brand.trim()
            ? "Pick what kind of item it is."
            : "Add the brand to look it up."}
        </p>
      )}
    </form>
  );
}
