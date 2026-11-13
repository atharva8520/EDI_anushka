import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "../components/Logo";
import { Button } from "../components/Button";
import { Input } from "../components/Field";
import { Card, ErrorState } from "../components/States";
import { useAuth } from "../context/AuthContext";
import { apiError } from "../api/client";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email.trim(), password, rememberMe);
      navigate("/app", { replace: true });
    } catch (err) {
      setError(apiError(err, "Invalid email or password. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 py-12 text-ink">
      <Link to="/" className="mb-8">
        <Logo />
      </Link>

      <Card className="w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight">Sign in to HackNova</h1>
          <p className="mt-1.5 text-sm text-mute">
            Enter your student or admin credentials to continue
          </p>
        </div>

        {error ? (
          <div className="mb-5">
            <ErrorState message={error} onRetry={() => setError(null)} />
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email address"
            type="email"
            required
            autoComplete="email"
            placeholder="you@hacknova.dev"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            label="Password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 cursor-pointer select-none text-mute">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-line text-primary focus:ring-primary"
              />
              <span>Remember me</span>
            </label>
          </div>

          <Button type="submit" loading={loading} className="w-full mt-2">
            Sign In
          </Button>
        </form>

        <div className="mt-6 border-t border-line pt-5 text-center text-sm text-mute">
          Don't have an account?{" "}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            Register as a student
          </Link>
        </div>
      </Card>
    </div>
  );
}
