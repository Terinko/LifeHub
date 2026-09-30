import { createHandler } from "../shared/createHandler";
import { changelogSeen } from "./routes/me";
import { invite, list, remove, update } from "./routes/users";

// Open to every signed-in user because the Hub reads your own profile
// (?me=true) and dismisses "What's New" here; every other route re-checks
// the admin role itself. Profiles are read from this Lambda's TABLE_NAME.
export const handler = createHandler({
  name: "Admin",
  access: "user",
  // Bodies are read after the admin check, as the routes always did.
  jsonBody: false,
  routes: {
    "GET /admin/users": list,
    "POST /admin/users": invite,
    "PUT /admin/users": update,
    "DELETE /admin/users": remove,
    "POST /admin/changelog-seen": changelogSeen,
  },
});
