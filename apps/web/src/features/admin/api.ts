import type {
  DeleteUserInput,
  InviteUserInput,
  UserProfile,
} from "@lifehub/shared";
import { api } from "../../shared/api/client";

export const listUsers = () => api.get<UserProfile[]>("/admin/users");

/** Creates the Cognito account (it emails a temporary password) and profile. */
export const inviteUser = (input: InviteUserInput) =>
  api.post<UserProfile>("/admin/users", input);

/** Saves a user's permissions (the server ignores every other field). */
export const updateUser = (user: UserProfile) =>
  api.put<{ message: string }>("/admin/users", user);

export const deleteUser = (input: DeleteUserInput) =>
  api.delete<{ message: string }>("/admin/users", input);
