import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Document tool crashed", error, info.componentStack);
  }

  override render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="surface-card mx-auto my-16 max-w-lg p-8 text-center">
        <AlertTriangle className="mx-auto size-10 text-destructive" aria-hidden="true" />
        <h2 className="mt-4 text-lg font-semibold">Something interrupted processing</h2>
        <p className="mt-2 text-sm text-muted-foreground">{this.state.error.message}</p>
        <Button className="mt-6" onClick={() => this.setState({ error: null })}>
          Reset the workspace
        </Button>
      </div>
    );
  }
}
