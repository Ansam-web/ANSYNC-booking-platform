
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim()) return;

    setSubmitted(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-8 shadow-xl shadow-indigo-100/50">
        <Link
          href="/"
          className="text-2xl font-extrabold tracking-tight text-[#5145CD]"
        >
          ANSYNC<span className="text-[#A78BFA]">.</span>
        </Link>

        <div className="mt-10">
          <h1 className="text-3xl font-bold text-[#172033]">
            Reset your password
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            Enter your email address to start the password
            recovery process.
          </p>
        </div>

        {submitted ? (
          <div className="mt-8 space-y-5">
            <div
              role="status"
              className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm leading-6 text-indigo-800"
            >
              Your email has been recorded in this demo.
              Email delivery and password recovery are not
              connected yet.
            </div>

            <Link
              href="/login"
              className="block rounded-xl bg-[#5145CD] px-5 py-3 text-center font-semibold text-white hover:bg-[#4338B5]"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Email address
              </label>

              <input
                id="email"
                type="email"
                name="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                placeholder="you@company.com"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-[#5145CD] focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-[#5145CD] px-5 py-3 font-semibold text-white transition hover:bg-[#4338B5]"
            >
              Continue
            </button>

            <p className="text-center text-sm">
              <Link
                href="/login"
                className="font-semibold text-[#5145CD] hover:underline"
              >
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}