import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/Logo";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="px-6 py-4 border-b border-border">
        <Link href="/"><Wordmark size={24} /></Link>
      </div>
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="text-mono text-xs text-muted-foreground">404</div>
          <h1 className="text-2xl font-semibold tracking-tight mt-2">We couldn't find that page.</h1>
          <p className="text-sm text-muted-foreground mt-2">
            The link may be broken, or the resource may have been moved.
          </p>
          <Link href="/">
            <Button variant="outline" className="mt-5" data-testid="button-not-found-home">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back to home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
