import { Navigate, Link } from "react-router-dom";
import { ShieldCheck, ArrowLeft, Clock } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/States";
import { Button } from "../components/Button";
import { Badge } from "../components/Badge";

export function AdminComingSoonPage() {
  const { role } = useAuth();

  if (role !== "admin") {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="flex-1 p-6 md:p-10">
      <div className="mx-auto max-w-2xl text-center py-12">
        <Card className="p-8 md:p-12 shadow-lift">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
            <ShieldCheck className="h-8 w-8" />
          </div>

          <div className="mt-5 flex items-center justify-center gap-2">
            <Badge tone="warning">ADMIN PRIVILEGED</Badge>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              <Clock className="h-3.5 w-3.5" /> Coming Soon
            </span>
          </div>

          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink md:text-3xl">
            Admin Management Console
          </h1>
          <p className="mt-2 text-sm text-mute leading-relaxed max-w-md mx-auto">
            Official organizer tools for publishing hackathons, creating problem statements,
            evaluating squads, and supervising submissions are under active development.
          </p>

          <div className="mt-8 flex justify-center gap-3">
            <Link to="/app">
              <Button variant="secondary" className="text-xs gap-1.5">
                <ArrowLeft className="h-4 w-4" />
                Return to Dashboard
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
