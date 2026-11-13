import { Link } from "react-router-dom";
import { Button } from "../components/Button";
import { Logo } from "../components/Logo";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 text-center text-ink">
      <Link to="/" className="mb-8">
        <Logo />
      </Link>
      <div className="rounded-card border border-line bg-white p-10 shadow-card max-w-md w-full">
        <span className="text-6xl font-black text-primary">404</span>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Page Not Found</h1>
        <p className="mt-2 text-sm text-mute">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link to="/">
            <Button variant="secondary" className="w-full">Go to Home</Button>
          </Link>
          <Link to="/app">
            <Button variant="primary" className="w-full">Open App</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
