import { Component, type ErrorInfo, type ReactNode } from "react";
import { Notice } from "./Notice";
import styles from "./TabBoundary.module.css";

type Props = { children: ReactNode };
type State = { failed: boolean };

/**
 * Keeps one tab's crash inside that tab: the header and tab bar stay, and
 * the tab shows a note with a retry instead of a blank page.
 */
export class TabBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Hockey tab crashed", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className={styles.failed}>
        <Notice tone="error">
          Something on this screen didn't load right.
        </Notice>
        <button
          type="button"
          className={styles.retry}
          onClick={() => this.setState({ failed: false })}
        >
          Try again
        </button>
      </div>
    );
  }
}
