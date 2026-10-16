import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { thriftEstimate, thriftQuery, thriftVerdict } from "@lifehub/shared";
import { ChevronLeft } from "lucide-react";
import { lookup } from "./api";
import { ConfirmScreen, type ItemForm } from "./components/ConfirmScreen";
import { EvidenceScreen } from "./components/EvidenceScreen";
import { HowScreen } from "./components/HowScreen";
import { Checking, LookupError } from "./components/Status";
import { ResultScreen } from "./components/ResultScreen";
import { StartScreen } from "./components/StartScreen";
import { matchBrands } from "./lib/brands";
import { readTag } from "./lib/ocr";
import { useRoomBackground } from "./useRoomBackground";
import { useThriftAccess } from "./useThriftAccess";
import styles from "./thrift.module.css";

type Screen =
  | "start"
  | "reading"
  | "unreadable"
  | "confirm"
  | "result"
  | "evidence"
  | "how";

const BACK: Partial<Record<Screen, Screen>> = {
  reading: "start",
  unreadable: "start",
  confirm: "start",
  result: "confirm",
  evidence: "result",
  how: "result",
};

const EMPTY: ItemForm = { brand: "", itemType: null, detail: "" };

export function ThriftPage() {
  useThriftAccess();
  useRoomBackground();
  const navigate = useNavigate();

  const [screen, setScreen] = useState<Screen>("start");
  const [photoUrl, setPhotoUrl] = useState<string>();
  const [tagText, setTagText] = useState("");
  const [candidates, setCandidates] = useState<string[]>([]);
  const [form, setForm] = useState<ItemForm>(EMPTY);
  const [brandFromTag, setBrandFromTag] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [excluded, setExcluded] = useState<ReadonlySet<string>>(new Set());

  const run = useMutation({
    mutationFn: lookup,
    onSuccess: (data) =>
      setExcluded(
        new Set(data.listings.filter((l) => l.suspect).map((l) => l.id)),
      ),
  });

  useEffect(
    () => () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    },
    [photoUrl],
  );

  const estimate = useMemo(
    () =>
      run.data
        ? thriftEstimate(run.data.listings, excluded, run.data.calibration)
        : undefined,
    [run.data, excluded],
  );
  const tagNumber = Number.parseFloat(tagInput);
  const tag = Number.isFinite(tagNumber) && tagNumber > 0 ? tagNumber : null;
  const verdict = estimate ? thriftVerdict(tag, estimate) : null;

  const readPhoto = async (file: File) => {
    setPhotoUrl(URL.createObjectURL(file));
    setScreen("reading");
    try {
      const text = await readTag(file);
      const found = matchBrands(text);
      setTagText(text);
      setCandidates(found);
      const [first] = found;
      if (!first) {
        setScreen("unreadable");
        return;
      }
      setForm({ ...EMPTY, brand: first });
      setBrandFromTag(true);
      setScreen("confirm");
    } catch (error) {
      console.error("Reading the tag failed:", error);
      setTagText("");
      setScreen("unreadable");
    }
  };

  const typeInstead = () => {
    setCandidates([]);
    setTagText("");
    setPhotoUrl(undefined);
    setBrandFromTag(false);
    setForm(EMPTY);
    setScreen("confirm");
  };

  const runLookup = () => {
    if (!form.itemType) return;
    // A brand that was read off the tag and then retyped counts as typed.
    setBrandFromTag((fromTag) => fromTag && candidates.includes(form.brand));
    run.mutate({
      brand: form.brand,
      itemType: form.itemType,
      detail: form.detail,
    });
    setScreen("result");
  };

  const next = () => {
    run.reset();
    setForm(EMPTY);
    setTagInput("");
    setTagText("");
    setCandidates([]);
    setPhotoUrl(undefined);
    setScreen("start");
  };

  const toggle = (id: string) =>
    setExcluded((prev) => {
      const out = new Set(prev);
      if (out.has(id)) out.delete(id);
      else out.add(id);
      return out;
    });

  const back = () => {
    const to = BACK[screen];
    if (to) setScreen(to);
    else navigate("/");
  };

  return (
    <div className={styles.page}>
      <header className={styles.bar}>
        <button
          type="button"
          className={styles.round}
          onClick={back}
          aria-label={screen === "start" ? "Back to hub" : "Back"}
        >
          <ChevronLeft size={24} strokeWidth={2.2} aria-hidden />
        </button>
        <h1 className={styles.barTitle}>Thrift</h1>
        <span />
      </header>

      <main className={styles.content}>
        {screen === "start" && (
          <StartScreen onPhoto={readPhoto} onType={typeInstead} />
        )}

        {screen === "reading" && (
          <Checking
            photoUrl={photoUrl}
            steps={["Reading the tag on your phone", "Finding the brand"]}
          />
        )}

        {screen === "unreadable" && (
          <>
            {photoUrl && <img className={styles.photo} src={photoUrl} alt="" />}
            <div className={`${styles.verdict} ${styles.unsure}`}>
              <div className={styles.word}>Couldn't read a brand</div>
              <div>
                Try again with the tag flat, filling the frame, and no glare.
                Inside collar and pocket labels often read better than hang
                tags.
              </div>
            </div>
            <label className={styles.main}>
              Retake the tag photo
              <input
                className={styles.hidden}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void readPhoto(file);
                }}
              />
            </label>
            <button
              type="button"
              className={styles.quiet}
              onClick={typeInstead}
            >
              Type the brand instead
            </button>
          </>
        )}

        {screen === "confirm" && (
          <ConfirmScreen
            form={form}
            onChange={setForm}
            candidates={candidates}
            tagText={tagText}
            photoUrl={photoUrl}
            onSubmit={runLookup}
          />
        )}

        {screen === "result" && run.isPending && (
          <Checking
            photoUrl={photoUrl}
            steps={[
              "Brand and item confirmed",
              "Finding eBay listings and live auctions",
            ]}
          />
        )}

        {screen === "result" && run.isError && form.itemType && (
          <LookupError
            error={run.error}
            query={thriftQuery({ ...form, itemType: form.itemType })}
            onRetry={runLookup}
            onEdit={() => setScreen("confirm")}
          />
        )}

        {screen === "result" && run.data && estimate && form.itemType && (
          <ResultScreen
            data={run.data}
            brand={form.brand}
            itemType={form.itemType}
            detail={form.detail}
            brandFromTag={brandFromTag}
            estimate={estimate}
            verdict={verdict}
            tag={tag}
            tagInput={tagInput}
            onTagInput={setTagInput}
            onEdit={() => setScreen("confirm")}
            onEvidence={() => setScreen("evidence")}
            onHow={() => setScreen("how")}
            onNext={next}
          />
        )}

        {screen === "evidence" && run.data && estimate && (
          <EvidenceScreen
            data={run.data}
            estimate={estimate}
            verdict={verdict}
            excluded={excluded}
            onToggle={toggle}
            onBack={() => setScreen("result")}
          />
        )}

        {screen === "how" && <HowScreen onBack={() => setScreen("result")} />}
      </main>
    </div>
  );
}
