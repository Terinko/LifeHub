import { useMutation } from "@tanstack/react-query";
import { setPermanentPassword, signInWithPassword } from "./api";

export const useSignIn = () => useMutation({ mutationFn: signInWithPassword });

export const useSetPermanentPassword = () =>
  useMutation({ mutationFn: setPermanentPassword });
