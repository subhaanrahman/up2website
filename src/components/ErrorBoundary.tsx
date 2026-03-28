import { Component, type ErrorInfo, type ReactNode } from "react";
import { captureClientException } from "@/infrastructure/sentry";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    captureClientException(error, { componentStack: errorInfo.componentStack });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col bg-background">
          <main className="flex flex-1 flex-col items-center justify-center px-6 py-20">
            <p className="mb-4 text-center text-muted-foreground">Something went wrong. Please try again.</p>
            <Button asChild>
              <Link to="/" replace reloadDocument>
                Go to Home
              </Link>
            </Button>
          </main>
        </div>
      );
    }

    return this.props.children;
  }
}
