import { randomUUID } from "node:crypto";
import type {
  Application,
  SaveApplicationData,
  UpdateStatusInput,
  UpdateStatusResult,
} from "@lifehub/shared";
import * as repo from "./repository";

/** Builds the stored item for a create (no sk) or a full replace (sk). */
export function buildApplication(
  userId: string,
  input: SaveApplicationData,
  now: string,
  newId: () => string = randomUUID,
): Application {
  return {
    pk: repo.partitionKey(userId),
    sk: input.sk || newId(),
    company: input.company,
    position: input.position,
    location: input.location,
    status: input.status,
    dateApplied: input.dateApplied || now.slice(0, 10),
    url: input.url,
    source: input.source,
    salaryRange: input.salaryRange,
    contact: input.contact,
    notes: input.notes,
    createdAt: input.createdAt || now,
    updatedAt: now,
  };
}

export async function saveApplication(
  userId: string,
  input: SaveApplicationData,
): Promise<Application> {
  const item = buildApplication(userId, input, new Date().toISOString());
  await repo.putApplication(item);
  return item;
}

export async function updateStatus(
  userId: string,
  { sk, status }: UpdateStatusInput,
): Promise<UpdateStatusResult> {
  const updatedAt = new Date().toISOString();
  await repo.setApplicationStatus(userId, sk, status, updatedAt);
  return { success: true, sk, status, updatedAt };
}

export const listApplications = repo.listApplications;
export const deleteApplication = repo.deleteApplication;
