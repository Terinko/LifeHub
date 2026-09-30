import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import type { UserProfile } from "@lifehub/shared";
import { deleteUser, inviteUser, listUsers, updateUser } from "./api";

export const adminKeys = {
  users: ["admin", "users"] as const,
};

export const useUsers = () =>
  useQuery({ queryKey: adminKeys.users, queryFn: listUsers });

/** Changes the list on screen before the server answers. */
async function changeUsers(
  qc: QueryClient,
  update: (users: UserProfile[]) => UserProfile[],
) {
  await qc.cancelQueries({ queryKey: adminKeys.users });
  qc.setQueryData<UserProfile[]>(adminKeys.users, (users = []) =>
    update(users),
  );
}

const reload = (qc: QueryClient) =>
  qc.invalidateQueries({ queryKey: adminKeys.users });

export function useInviteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: inviteUser,
    onSuccess: () => reload(qc),
  });
}

/** Toggling a permission shows instantly; a failed save reloads the list. */
export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateUser,
    onMutate: (updated) =>
      changeUsers(qc, (users) =>
        users.map((u) => (u.pk === updated.pk ? updated : u)),
      ),
    onError: (error) => {
      console.error(error);
      void reload(qc);
    },
  });
}

/** Removes the user from the list right away; a failure brings them back. */
export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (user: UserProfile) =>
      deleteUser({ pk: user.pk, email: user.email }),
    onMutate: (user) =>
      changeUsers(qc, (users) => users.filter((u) => u.pk !== user.pk)),
    onError: (error) => {
      console.error(error);
      void reload(qc);
    },
  });
}
