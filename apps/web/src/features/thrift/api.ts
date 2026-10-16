import type {
  ThriftLookup,
  ThriftLookupInput,
  ThriftSaleInput,
} from "@lifehub/shared";
import { api } from "../../shared/api/client";

export const lookup = (input: ThriftLookupInput) =>
  api.post<ThriftLookup>("/thrift/lookup", input);

export const saveSale = (input: ThriftSaleInput) =>
  api.post<{ saved: true }>("/thrift/sales", input);
