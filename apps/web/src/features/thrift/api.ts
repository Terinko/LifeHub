import type { ThriftLookup, ThriftLookupInput } from "@lifehub/shared";
import { api } from "../../shared/api/client";

export const lookup = (input: ThriftLookupInput) =>
  api.post<ThriftLookup>("/thrift/lookup", input);
