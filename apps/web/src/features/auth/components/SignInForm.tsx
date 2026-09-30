import { useState, type FormEvent } from "react";
import { errorText } from "../lib/signIn";
import { useSignIn } from "../queries";
import { ErrorBanner } from "./ErrorBanner";
import styles from "./form.module.css";

type Props = {
  onSignedIn: () => void;
  onNewPasswordRequired: () => void;
};

/** Email and password. */
export function SignInForm({ onSignedIn, onNewPasswordRequired }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const signIn = useSignIn();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    signIn.mutate(
      { email, password },
      {
        onSuccess: (outcome) =>
          outcome === "signedIn" ? onSignedIn() : onNewPasswordRequired(),
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {signIn.isError && (
        <ErrorBanner>
          {errorText(
            signIn.error,
            "Failed to sign in. Please check your credentials.",
          )}
        </ErrorBanner>
      )}

      <input
        className={styles.input}
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        className={styles.input}
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <button
        type="submit"
        className={styles.submit}
        disabled={signIn.isPending}
      >
        {signIn.isPending ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}
