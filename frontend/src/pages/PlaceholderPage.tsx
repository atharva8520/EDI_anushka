import { Link } from "react-router-dom";
import { ArrowLeft, Clock } from "lucide-react";
import { Card } from "../components/States";
import { Button } from "../components/Button";
import { Logo } from "../components/Logo";

export function PlaceholderPage({ title, description }: { title: string; description?: string }) {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="border-b border-line bg-white/80 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link to="/app">
            <Logo />
          </Link>
          <Link to="/app">
            <Button variant="secondary" className="text-xs">
              <ArrowLeft className="h-4 w-4" />
              Back to App
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-20 text-center">
        <Card className="p-10">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Clock className="h-7 w-7" />
          </div>
          <span className="mt-4 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Coming in Next Module
          </span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight md:text-3xl">{title}</h1>
          <p className="mt-2 text-sm text-mute">
            {description || "This section is reserved for the upcoming module implementation."}
          </p>
          <div className="mt-8">
            <Link to="/app">
              <Button variant="primary">Return to App Dashboard</Button>
            </Link>
          </div>
        </Card>
      </main>
    </div>
  );
}
