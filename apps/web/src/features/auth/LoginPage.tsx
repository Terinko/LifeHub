import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { NewPasswordForm } from "./components/NewPasswordForm";
import { SignInForm } from "./components/SignInForm";
import styles from "./LoginPage.module.css";

type Props = {
  /** Called once Cognito says the user is signed in. */
  onSignedIn: () => void;
};

export function LoginPage({ onSignedIn }: Props) {
  const navigate = useNavigate();
  // Cognito asks invited users to replace their temporary password.
  const [needsNewPassword, setNeedsNewPassword] = useState(false);

  const enterHub = () => {
    onSignedIn();
    navigate("/");
  };

  return (
    <div className="view">
      <header className="ios-nav-bar">
        <h2>LifeHub Login</h2>
      </header>
      <div className={styles.content}>
        {needsNewPassword ? (
          <NewPasswordForm onSignedIn={enterHub} />
        ) : (
          <SignInForm
            onSignedIn={enterHub}
            onNewPasswordRequired={() => setNeedsNewPassword(true)}
          />
        )}
      </div>
    </div>
  );
}
