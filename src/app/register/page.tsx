
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isLoading) return;

    setError("");
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);

    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.message || "Registration failed. Please try again."
        );
        return;
      }

      router.push("/onboarding");
    } catch {
      setError(
        "Unable to connect to the server. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-8 shadow-xl shadow-indigo-100/50">
        <Link
          href="/"
          className="text-2xl font-extrabold tracking-tight text-[#5145CD]"
        >
          ANSYNC
          <span className="text-[#A78BFA]">.</span>
        </Link>

        <div className="mt-8">
          <h1 className="text-3xl font-bold text-[#172033]">
            Create your account
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Start managing your bookings with ANSYNC.
          </p>
        </div>

        <form
          className="mt-8 space-y-5"
          onSubmit={handleRegister}
        >
          {/* Full Name */}
          <div>
            <label
              htmlFor="name"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Full name
            </label>

            <input
              id="name"
              name="name"
              type="text"
              required
              minLength={2}
              maxLength={100}
              autoComplete="name"
              placeholder="Enter your full name"
              disabled={isLoading}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-[#5145CD] focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
            />
          </div>

          {/* Email Address */}
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Email address
            </label>

            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@company.com"
              disabled={isLoading}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-[#5145CD] focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Password
            </label>

            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                disabled={isLoading}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-20 text-slate-900 outline-none transition focus:border-[#5145CD] focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
                className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-[#5145CD] disabled:opacity-60"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600"
            >
              {error}
            </p>
          )}

          {/* Create Account Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-[#5145CD] px-5 py-3 font-semibold text-white transition hover:bg-[#4338B5] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-[#5145CD] hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
