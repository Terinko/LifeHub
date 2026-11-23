import { Encoder, Profile } from "@garmin/fitsdk";
import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import {
  bestEfforts,
  heartRateDrift,
  samplesFromFit,
  setsFromFit,
  setsFromJson,
  type Sample,
} from "./detail";
import { decodeActivityFile, decodeFit } from "./fit";

const start = new Date("2026-11-23T17:00:00Z");
const mesgNum = (name: string) => Profile.MesgNum[name] ?? -1;
type Encodable = Parameters<Encoder["writeMesg"]>[0];

/** A small strength FIT file, as a watch would record one. */
function strengthFit() {
  const enc = new Encoder();
  enc.writeMesg(<Encodable>(<unknown>{
    mesgNum: mesgNum("FILE_ID"),
    type: "activity",
    manufacturer: "garmin",
    product: 1,
    timeCreated: start,
    serialNumber: 1,
  }));
  const set = (
    setType: "active" | "rest",
    category: string,
    subtype: number,
    reps: number,
    weight: number,
  ) =>
    enc.writeMesg(<Encodable>(<unknown>{
      mesgNum: mesgNum("SET"),
      timestamp: start,
      setType,
      category: [category],
      categorySubtype: [subtype],
      repetitions: reps,
      weight,
    }));
  set("active", "curl", 19, 10, 27.2); // EZ-bar preacher curl
  set("rest", "unknown", 0, 0, 0);
  set("active", "curl", 16, 12, 15.9); // Dumbbell hammer curl
  set("active", "benchPress", 1, 6, 93);
  return enc.close();
}

describe("strength sets", () => {
  it("reads working sets from a FIT file, naming the tracked lifts", () => {
    const fit = decodeFit(strengthFit());
    expect(setsFromFit(fit.setMesgs ?? [])).toEqual([
      { exercise: "Preacher curl", muscle: "biceps", reps: 10, weightKg: 27.2 },
      { exercise: "Hammer curl", muscle: "biceps", reps: 12, weightKg: 15.9 },
      { exercise: "Bench press", muscle: "chest", reps: 6, weightKg: 93 },
    ]);
  });

  it("unzips the archive Garmin sends", () => {
    const zipped = zipSync({ "123_ACTIVITY.fit": strengthFit() });
    expect(decodeActivityFile(zipped).setMesgs).toHaveLength(4);
  });

  it("reads working sets from the activity JSON, where weight is in grams", () => {
    expect(
      setsFromJson([
        {
          setType: "ACTIVE",
          repetitionCount: 6,
          weight: 18143.7,
          exercises: [{ category: "PULL_UP", name: "WEIGHTED_PULL_UP" }],
        },
        { setType: "REST", repetitionCount: null, weight: null },
        {
          setType: "ACTIVE",
          repetitionCount: 8,
          weight: 83914.6,
          exercises: [{ category: "ROW", name: "BENT_OVER_ROW_WITH_BARBELL" }],
        },
        {
          setType: "ACTIVE",
          repetitionCount: 12,
          weight: null,
          exercises: [{ category: "TRICEPS_EXTENSION", name: null }],
        },
      ]),
    ).toEqual([
      { exercise: "Weighted pull-up", muscle: "back", reps: 6, weightKg: 18.1 },
      { exercise: "Row", muscle: "back", reps: 8, weightKg: 83.9 },
      { exercise: "Triceps extension", muscle: "triceps", reps: 12 },
    ]);
  });
});

/** A steady run: one sample a second at `pace` m/s, heart rate rising by `rise` over the run. */
function steady(seconds: number, pace: number, hr: number, rise = 0) {
  return Array.from({ length: seconds + 1 }, (_, t): Sample => ({
    t,
    d: t * pace,
    hr: hr + (rise * t) / seconds,
  }));
}

describe("run detail", () => {
  it("finds the fastest mile inside a longer run", () => {
    // 10 minutes easy, a 6:00 mile, then 10 minutes easy.
    const samples: Sample[] = [];
    let d = 0;
    for (let t = 0; t <= 1560; t++) {
      samples.push({ t, d });
      d += t >= 600 && t < 960 ? 1609.344 / 360 : 2.8;
    }
    const efforts = bestEfforts(samples);
    expect(efforts.mile).toBeGreaterThanOrEqual(359);
    expect(efforts.mile).toBeLessThanOrEqual(361);
    expect(efforts.k10).toBeUndefined();
  });

  it("measures heart-rate drift on a steady run", () => {
    expect(heartRateDrift(steady(3600, 3, 140))).toBe(0);
    const drift = heartRateDrift(steady(3600, 3, 140, 14)) ?? 0;
    expect(drift).toBeGreaterThan(4);
    expect(drift).toBeLessThan(6);
    expect(heartRateDrift(steady(900, 3, 140, 14))).toBeUndefined();
  });

  it("turns FIT records into samples from the start", () => {
    const samples = samplesFromFit([
      { timestamp: start, distance: 0, heartRate: 120 },
      { timestamp: new Date(start.getTime() + 5000), distance: 15 },
    ]);
    expect(samples).toEqual([
      { t: 0, d: 0, hr: 120 },
      { t: 5, d: 15 },
    ]);
  });
});
