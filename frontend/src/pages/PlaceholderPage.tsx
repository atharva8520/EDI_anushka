import { Link } from "react-router-dom";
import { Clock } from "lucide-react";
import { Card } from "../components/States";
import { Button } from "../components/Button";

export function PlaceholderPage({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex-1 p-6 md:p-10">
      <div className="mx-auto max-w-2xl text-center py-12">
        <Card className="p-8 md:p-12 shadow-card">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Clock className="h-7 w-7" />
          </div>
          <span className="mt-4 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Coming in Next Module
          </span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight md:text-3xl text-ink">{title}</h1>
          <p className="mt-2 text-sm text-mute leading-relaxed max-w-md mx-auto">
            {description || "This section is reserved for the upcoming module implementation."}
          </p>
          <div className="mt-8">
            <Link to="/app">
              <Button variant="secondary" className="text-xs">Return to Dashboard</Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
