
"use client";

import { useState } from "react";
import Link from "next/link";

export default function OnboardingPage() {
  const [organizationName, setOrganizationName] = useState("");
  const [slug, setSlug] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function handleNameChange(value: string) {
    setOrganizationName(value);

    setSlug(
      value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
    );
  }

  async function handleCreateWorkspace(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (isLoading || success) return;

    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/tenants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: organizationName.trim(),
          slug: slug.trim().toLowerCase(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.message || "Unable to create workspace."
        );
        return;
      }

      setSuccess("Workspace created successfully!");
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
      <div className="w-full max-w-lg rounded-3xl border border-slate-100 bg-white p-8 shadow-xl shadow-indigo-100/50">
        <Link
          href="/"
          className="text-2xl font-extrabold text-[#5145CD]"
        >
          ANSYNC
          <span className="text-[#A78BFA]">.</span>
        </Link>

        <div className="mt-8">
          <p className="text-sm font-semibold text-[#5145CD]">
            STEP 01 / ORGANIZATION SETUP
          </p>

          <h1 className="mt-3 text-3xl font-bold text-[#172033]">
            Set up your workspace
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            Create a dedicated workspace for your organization
            and manage bookings with your team.
          </p>
        </div>

        <form
          className="mt-8 space-y-6"
          onSubmit={handleCreateWorkspace}
        >
          {/* Organization Name */}
          <div>
            <label
              htmlFor="organization"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Organization name
            </label>

            <input
              id="organization"
              name="organization"
              type="text"
              required
              minLength={2}
              maxLength={100}
              value={organizationName}
              onChange={(event) =>
                handleNameChange(event.target.value)
              }
              disabled={isLoading || Boolean(success)}
              placeholder="e.g. Creative Studio"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-[#5145CD] focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50"
            />
          </div>

          {/* Workspace URL */}
          <div>
            <label
              htmlFor="slug"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Workspace URL
            </label>

            <div className="flex overflow-hidden rounded-xl border border-slate-200 focus-within:border-[#5145CD] focus-within:ring-2 focus-within:ring-indigo-100">
              <input
                id="slug"
                name="slug"
                type="text"
                required
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                title="Use lowercase letters, numbers and hyphens."
                value={slug}
                onChange={(event) =>
                  setSlug(event.target.value.toLowerCase())
                }
                disabled={isLoading || Boolean(success)}
                placeholder="creative-studio"
                className="min-w-0 flex-1 px-4 py-3 text-slate-900 outline-none disabled:bg-slate-50"
              />

              <span className="flex items-center bg-slate-50 px-3 text-xs text-slate-500">
                .ansync.app
              </span>
            </div>

            <p className="mt-2 text-xs text-slate-400">
              This is a preview of your future workspace address.
            </p>
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

          {/* Success Message */}
          {success && (
            <p
              role="status"
              className="rounded-xl border border-green-100 bg-green-50 p-3 text-sm text-green-700"
            >
              {success}
            </p>
          )}

          {/* Create Workspace Button */}
          <button
            type="submit"
            disabled={isLoading || Boolean(success)}
            className="w-full rounded-xl bg-[#5145CD] px-5 py-3 font-semibold text-white transition hover:bg-[#4338B5] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading
              ? "Creating workspace..."
              : success
                ? "Workspace created!"
                : "Create workspace"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Your organization data will be kept separate from
          other workspaces.
        </p>
      </div>
    </main>
  );
}