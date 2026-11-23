import {
  Decoder,
  Profile,
  Stream,
  type FitMessages,
  type RecordMesg,
  type SetMesg,
} from "@garmin/fitsdk";
import { unzipSync } from "fflate";
import { garminBytes } from "./http";

export type { RecordMesg, SetMesg };

/** Garmin's original file for an activity (it arrives zipped), decoded. */
export async function activityFit(
  bearer: string,
  activityId: string,
): Promise<FitMessages> {
  const bytes = await garminBytes(
    `/download-service/files/activity/${activityId}`,
    bearer,
  );
  return decodeActivityFile(bytes);
}

/** Decodes Garmin's download: a zip holding the .fit file, or the file itself. */
export const decodeActivityFile = (bytes: Uint8Array) =>
  decodeFit(unzipIfZipped(bytes));

function unzipIfZipped(bytes: Uint8Array): Uint8Array {
  // "PK": a zip archive holding the .fit file.
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) return bytes;
  const files = unzipSync(bytes);
  const name =
    Object.keys(files).find((n) => n.toLowerCase().endsWith(".fit")) ??
    Object.keys(files)[0];
  const fit = name ? files[name] : undefined;
  if (!fit) throw new Error("Garmin sent an empty archive");
  return fit;
}

export function decodeFit(bytes: Uint8Array): FitMessages {
  return new Decoder(Stream.fromByteArray(bytes)).read().messages;
}

/** FIT stores an exercise's name as a number within its category. */
export function fitExerciseName(
  category: string,
  subtype: number | undefined,
): string | undefined {
  if (subtype === undefined) return undefined;
  const types = (
    Profile as unknown as {
      types: Record<string, Record<number, string> | undefined>;
    }
  ).types;
  return types[`${category}ExerciseName`]?.[subtype];
}
