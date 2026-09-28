import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

/** The signed-in user's LifeHub profile (from the Users table). */
export type Profile = {
  pk: string;
  email?: string;
  role?: "ADMIN" | "USER";
  permissions?: Partial<Record<string, boolean>>;
};

export const profileKeys = {
  me: ["profile", "me"] as const,
};

export function useProfile() {
  return useQuery({
    queryKey: profileKeys.me,
    queryFn: () => api.get<Profile>("/admin/users?me=true"),
  });
}

export const isAdmin = (profile: Profile | undefined): boolean =>
  profile?.role === "ADMIN";
