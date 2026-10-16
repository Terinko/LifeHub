import { useEffect, type ChangeEvent } from "react";
import { Tag } from "lucide-react";
import { warmUpReader } from "../lib/ocr";
import styles from "../thrift.module.css";

type Props = {
  onPhoto: (file: File) => void;
  onType: () => void;
};

/** Camera first: one big button for the tag, a quiet way to type it instead. */
export function StartScreen({ onPhoto, onType }: Props) {
  useEffect(warmUpReader, []);

  const pick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) onPhoto(file);
  };

  return (
    <>
      <div className={styles.viewfinder}>
        <div>
          <Tag size={56} strokeWidth={1.25} aria-hidden />
          <p>
            Fill the frame with the brand tag
            <br />
            or the inside label.
          </p>
        </div>
      </div>
      <label className={styles.main}>
        Photograph the tag
        <input
          id="thrift-photo"
          className={styles.hidden}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={pick}
        />
      </label>
      <button type="button" className={styles.textBtn} onClick={onType}>
        No tag? Type what it is
      </button>
      <p className={styles.sec}>
        The tag is read on your phone. The photo isn't uploaded or saved.
      </p>
    </>
  );
}
