import { thriftLookupSchema, thriftSaleSchema } from "@lifehub/shared";
import type { z } from "zod";
import type { Route } from "../shared/createHandler";
import { badRequest, json } from "../shared/http";
import { lookup as runLookup, recordSale } from "./service";

function parse<T extends z.ZodType>(schema: T, body: unknown): z.output<T> {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw badRequest(
      result.error.issues[0]?.message ?? "That doesn't look right.",
    );
  }
  return result.data;
}

/** POST /thrift/lookup: current eBay listings and the calibration for an item. */
export const lookup: Route = async ({ userId, body }) =>
  json(200, await runLookup(userId, parse(thriftLookupSchema, body)));

/** POST /thrift/sales: what Terapeak showed, to calibrate future estimates. */
export const sales: Route = async ({ userId, body }) => {
  await recordSale(userId, parse(thriftSaleSchema, body));
  return json(201, { saved: true });
};
