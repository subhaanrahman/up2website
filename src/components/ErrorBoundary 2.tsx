import { Component, type ErrorInfo, type ReactNode } from "react";
import { captureClientException } from "@/infrastructure/sentry";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";

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
        <div className="min-h-screen bg-background flex flex-col pb-20">
          <main className="flex-1 flex flex-col items-center justify-center px-6 py-20">
            <p className="text-muted-foreground text-center mb-4">
              Something went wrong. Please try again.
            </p>
            <Button asChild>
              <Link to="/" replace reloadDocument>
                Go to Home
              </Link>
            </Button>
          </main>
          <BottomNav />
        </div>
      );
    }

    return this.props.children;
  }
}
