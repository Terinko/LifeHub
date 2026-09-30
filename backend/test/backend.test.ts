import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { BackendStack } from "../lib/backend-stack";

// Synthesizing bundles the TypeScript Lambdas and needs apps/web/dist, so run
// `npm run build` at the repo root first.
const template = Template.fromStack(new BackendStack(new cdk.App(), "Test"));

test("every DynamoDB table survives stack changes and keeps backups", () => {
  const tables = template.findResources("AWS::DynamoDB::Table");
  expect(Object.keys(tables).length).toBe(6);

  for (const [id, table] of Object.entries(tables)) {
    expect({ id, deletion: table.DeletionPolicy }).toEqual({
      id,
      deletion: "Retain",
    });
    expect({ id, replace: table.UpdateReplacePolicy }).toEqual({
      id,
      replace: "Retain",
    });
    expect(table.Properties.DeletionProtectionEnabled).toBe(true);
    expect(
      table.Properties.PointInTimeRecoverySpecification
        .PointInTimeRecoveryEnabled,
    ).toBe(true);
  }
});
