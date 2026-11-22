
import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-8 shadow-xl shadow-indigo-100/50">
        <Link
          href="/"
          className="text-2xl font-extrabold tracking-tight text-[#5145CD]"
        >
            ANSYNC<span className="text-[#A78BFA]">.</span>        </Link>

        <div className="mt-10">
          <h1 className="text-3xl font-bold text-[#172033]">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Sign in to manage your bookings and team.
          </p>
        </div>

        <form className="mt-8 space-y-5">
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
              required
              autoComplete="email"
              placeholder="you@company.com"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-[#5145CD] focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div>
            <div className="mb-2 flex justify-between gap-2">
              <label
                htmlFor="password"
                className="text-sm font-medium text-slate-700"
              >
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-[#5145CD] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              name="password"
              required
              minLength={8}
              autoComplete="current-password"
              placeholder="Enter your password"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-[#5145CD] focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <button
            type="button"
            className="w-full rounded-xl bg-[#5145CD] px-5 py-3 font-semibold text-white transition hover:bg-[#4338B5]"
          >
            Sign in
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-500">
          New to ANSYNC?{" "}
          <Link
            href="/register"
            className="font-semibold text-[#5145CD] hover:underline"
          >
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
