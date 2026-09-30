/** True for the error DynamoDB throws when a ConditionExpression fails. */
export const isConditionalCheckFailed = (error: unknown) =>
  (error as { name?: unknown } | null)?.name ===
  "ConditionalCheckFailedException";
