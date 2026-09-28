import {
  DeleteCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { Application, ApplicationStatus } from "@lifehub/shared";
import { db } from "../shared/db";
import { requireEnv } from "../shared/env";

// Every DynamoDB call for the Applications tool lives here.

const table = () => requireEnv("TABLE_NAME");

export const partitionKey = (userId: string) => `USER#${userId}#APPLICATION`;

export async function listApplications(userId: string): Promise<Application[]> {
  const res = await db.send(
    new QueryCommand({
      TableName: table(),
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: { ":pk": partitionKey(userId) },
      ConsistentRead: true,
    }),
  );
  return (res.Items ?? []) as Application[];
}

export async function putApplication(item: Application): Promise<void> {
  await db.send(new PutCommand({ TableName: table(), Item: item }));
}

export async function setApplicationStatus(
  userId: string,
  sk: string,
  status: ApplicationStatus,
  updatedAt: string,
): Promise<void> {
  await db.send(
    new UpdateCommand({
      TableName: table(),
      Key: { pk: partitionKey(userId), sk },
      UpdateExpression: "SET #status = :status, updatedAt = :now",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: { ":status": status, ":now": updatedAt },
    }),
  );
}

export async function deleteApplication(
  userId: string,
  sk: string,
): Promise<void> {
  await db.send(
    new DeleteCommand({
      TableName: table(),
      Key: { pk: partitionKey(userId), sk },
    }),
  );
}
