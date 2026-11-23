import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { garminRedirectUri, readGarminReturn } from "./lib/garminReturn";
import { useFinishGarminConnect } from "./queries";

/**
 * When Garmin sends the browser back with ?code=…&state=…, finishes
 * connecting once and cleans the URL. Returns an error to show, if any.
 */
export function useGarminReturn() {
  const location = useLocation();
  const navigate = useNavigate();
  const finish = useFinishGarminConnect();
  const [returned] = useState(() => readGarminReturn(location.search));
  const started = useRef(false);

  useEffect(() => {
    if (!returned || started.current) return;
    started.current = true;
    navigate("/run", { replace: true });
    if (returned.kind === "code") {
      finish.mutate({
        code: returned.code,
        state: returned.state,
        redirectUri: garminRedirectUri(window.location.origin),
      });
    }
  }, [returned, finish, navigate]);

  return {
    finishing:
      returned?.kind === "code" && !finish.isSuccess && !finish.isError,
    error:
      returned?.kind === "error"
        ? returned.message
        : finish.error
          ? finish.error.message
          : undefined,
  };
}
