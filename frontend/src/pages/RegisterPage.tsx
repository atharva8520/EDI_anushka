import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "../components/Logo";
import { Button } from "../components/Button";
import { Input, Select } from "../components/Field";
import { Card, ErrorState } from "../components/States";
import { useAuth } from "../context/AuthContext";
import { apiError } from "../api/client";

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [college, setCollege] = useState("");
  const [branch, setBranch] = useState("");
  const [year, setYear] = useState("TY");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      await register({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        confirm_password: confirmPassword,
        college: college.trim(),
        branch: branch.trim(),
        year,
      });
      navigate("/app", { replace: true });
    } catch (err) {
      setError(apiError(err, "Failed to register. Please check your details."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 py-12 text-ink">
      <Link to="/" className="mb-6">
        <Logo />
      </Link>

      <Card className="w-full max-w-xl p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight">Create Student Account</h1>
          <p className="mt-1.5 text-sm text-mute">
            Join HackNova to discover hackathons, form squads, and build projects
          </p>
        </div>

        {error ? (
          <div className="mb-5">
            <ErrorState message={error} onRetry={() => setError(null)} />
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Full Name"
              required
              placeholder="e.g. Aditi Sharma"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <Input
              label="Email Address"
              type="email"
              required
              placeholder="aditi@example.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="College / University"
              required
              placeholder="e.g. Pune Institute of Computer Technology"
              value={college}
              onChange={(e) => setCollege(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Branch / Major"
                required
                placeholder="e.g. CSE"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
              />
              <Select
                label="Year of Study"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              >
                <option value="FY">FY (First Year)</option>
                <option value="SY">SY (Second Year)</option>
                <option value="TY">TY (Third Year)</option>
                <option value="Final">Final Year</option>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Password"
              type="password"
              required
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Input
              label="Confirm Password"
              type="password"
              required
              autoComplete="new-password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <Button type="submit" loading={loading} className="w-full mt-4">
            Create Account
          </Button>
        </form>

        <div className="mt-6 border-t border-line pt-5 text-center text-sm text-mute">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </div>
      </Card>
    </div>
  );
}
