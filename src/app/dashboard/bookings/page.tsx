
"use client";

import { useEffect, useState, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Toaster, toast } from "sonner";
import {
  CalendarDays,
  CalendarCheck,
  Clock,
  Plus,
  List,
  LayoutDashboard,
  RefreshCw,
  X,
  Pencil,
  Trash2,
  Building2,
} from "lucide-react";

type Workspace = {
  id: number;
  name: string;
  slug: string;
  role: string;
};

type Service = {
  id: number;
  name: string;
  duration: number;
  price: number | string;
};

type Booking = {
  id: number;
  tenantId: number;
  userId: number;
  serviceId: number;
  startTime: string;
  endTime: string;
  status: string;
};

async function apiRequest(
  url: string,
  options?: RequestInit
) {
  const response = await fetch(url, options);

  if (response.status === 401) {
    window.location.replace("/login");
    throw new Error(
      "Your session has expired. Please sign in again."
    );
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
      data?.message ||
      `Request failed (${response.status}).`
    );
  }

  return data;
}

function localDateTime(value: string) {
  const date = new Date(value);
  const local = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  );
  return local.toISOString().slice(0, 16);
}

export default function BookingsPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [tenantId, setTenantId] = useState<number | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<"calendar" | "list">("calendar");

  const [modal, setModal] = useState<
    "create" | "details" | "edit" | null
  >(null);

  const [selected, setSelected] = useState<Booking | null>(null);
  const [serviceId, setServiceId] = useState("");
  const [startTime, setStartTime] = useState("");

  const requestKey = useRef("");
  const requestPayload = useRef("");

  const workspace = workspaces.find(
    (item) => item.id === tenantId
  );

  async function loadWorkspaces() {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/api/my-workspaces");

      setWorkspaces(data.workspaces);

      if (data.workspaces.length > 0) {
        setTenantId(data.workspaces[0].id);
      } else {
        setError("No workspaces found.");
        setLoading(false);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to load workspaces.";

      setError(message);
      toast.error(message);
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadWorkspaces();
  }, []);

  useEffect(() => {
    if (!tenantId) return;

    let active = true;

    setLoading(true);
    setError("");
    setBookings([]);
    setServices([]);

    Promise.all([
      apiRequest(`/api/bookings?tenantId=${tenantId}`),
      apiRequest(`/api/services?tenantId=${tenantId}`),
    ])
      .then(([bookingData, serviceData]) => {
        if (!active) return;

        setBookings(bookingData.bookings);
        setServices(serviceData.services);
      })
      .catch((err) => {
        if (!active) return;

        setError(err.message);
        toast.error(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [tenantId]);

  async function refreshBookings() {
    if (!tenantId) {
      await loadWorkspaces();
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [bookingData, serviceData] = await Promise.all([
        apiRequest(`/api/bookings?tenantId=${tenantId}`),
        apiRequest(`/api/services?tenantId=${tenantId}`),
      ]);

      setBookings(bookingData.bookings);
      setServices(serviceData.services);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to load bookings.";

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  function getServiceName(id: number) {
    return (
      services.find((service) => service.id === id)?.name ||
      `Service #${id}`
    );
  }

  function openCreate(date?: string) {
    setSelected(null);
    setServiceId("");
    setStartTime(date ? localDateTime(date) : "");
    requestKey.current = "";
    requestPayload.current = "";
    setModal("create");
  }

  function openDetails(booking: Booking) {
    setSelected(booking);
    setModal("details");
  }

  function openEdit() {
    if (!selected) return;

    setStartTime(localDateTime(selected.startTime));
    setModal("edit");
  }

  function closeModal() {
    if (saving) return;

    setModal(null);
    setSelected(null);
  }

  async function saveBooking(e: React.FormEvent) {
    e.preventDefault();

    if (!tenantId || saving) return;

    if (modal === "create" && !serviceId) {
      toast.error("Please select a service.");
      return;
    }

    const date = new Date(startTime);

    if (
      !startTime ||
      Number.isNaN(date.getTime()) ||
      date.getTime() <= Date.now()
    ) {
      toast.error("Please select a future date and time.");
      return;
    }

    setSaving(true);

    try {
      if (modal === "create") {
        const payload = JSON.stringify({
          tenantId,
          serviceId: Number(serviceId),
          startTime: date.toISOString(),
        });

        if (requestPayload.current !== payload) {
          requestPayload.current = payload;
          requestKey.current = crypto.randomUUID();
        }

        await apiRequest("/api/bookings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": requestKey.current,
          },
          body: payload,
        });

        toast.success("Booking created successfully!");
      } else if (modal === "edit" && selected) {
        await apiRequest(
          `/api/bookings/${selected.id}?tenantId=${tenantId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              startTime: date.toISOString(),
            }),
          }
        );

        toast.success("Booking updated successfully!");
      }

      setModal(null);
      setSelected(null);
      await refreshBookings();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unable to save booking."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteBooking() {
    if (!selected || !tenantId || saving) return;

    if (!window.confirm("Are you sure you want to delete this booking?")) {
      return;
    }

    setSaving(true);

    try {
      await apiRequest(
        `/api/bookings/${selected.id}?tenantId=${tenantId}`,
        { method: "DELETE" }
      );

      toast.success("Booking deleted successfully!");
      setModal(null);
      setSelected(null);

      await refreshBookings();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unable to delete booking."
      );
    } finally {
      setSaving(false);
    }
  }

  const pending = bookings.filter(
    (booking) => booking.status === "PENDING"
  ).length;

  const confirmed = bookings.filter(
    (booking) => booking.status === "CONFIRMED"
  ).length;

  const events = bookings.map((booking) => ({
    id: String(booking.id),
    title: getServiceName(booking.serviceId),
    start: booking.startTime,
    end: booking.endTime,
    backgroundColor:
      booking.status === "CONFIRMED"
        ? "#059669"
        : booking.status === "CANCELLED"
        ? "#94a3b8"
        : "#5145cd",
    borderColor: "transparent",
  }));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Toaster richColors position="top-right" />

      <div className="flex min-h-screen flex-col lg:flex-row">

        {/* Sidebar */}
        <aside className="w-full min-w-0 border-b border-slate-200 bg-white p-4 lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r lg:p-5">
          <h1 className="mb-7 text-3xl font-black tracking-tight text-[#5145cd]">
            ANSYNC.
          </h1>

          <div className="mb-4 lg:mb-8">
            <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <Building2 size={15} />
              Workspace
            </label>

            <select
              value={tenantId ?? ""}
              disabled={saving || loading || modal !== null}
              onChange={(e) => setTenantId(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-medium outline-none"
            >
              {workspaces.length === 0 && (
                <option value="">No workspaces</option>
              )}

              {workspaces.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>

            <p className="mt-2 text-xs text-slate-400">
              {workspace?.role}
            </p>
          </div>

          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Workspace menu
          </p>

            <nav className="grid grid-cols-2 gap-2 lg:grid-cols-1">            <button
              onClick={() => setView("calendar")}
              className={`flex flex-1 items-center gap-3 rounded-xl p-3 text-sm font-medium ${
                view === "calendar"
                  ? "bg-indigo-50 text-[#5145cd]"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <CalendarDays size={19} />
              Calendar
            </button>

            <button
              onClick={() => setView("list")}
              className={`flex flex-1 items-center gap-3 rounded-xl p-3 text-sm font-medium ${
                view === "list"
                  ? "bg-indigo-50 text-[#5145cd]"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <List size={19} />
              Bookings
            </button>
          </nav>
        </aside>

        {/* Main content */}
        <main className="w-full min-w-0 flex-1 overflow-hidden p-3 sm:p-6 lg:p-8">
          <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="mb-1 text-sm font-medium text-[#5145cd]">
                {workspace?.name || "Workspace"}
              </p>

              <h2 className="text-3xl font-bold tracking-tight">
                Bookings
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Manage your schedule in one place.
              </p>
            </div>

            <button
              disabled={!tenantId || loading || saving || !!error}
              onClick={() => openCreate()}
              className="flex items-center gap-2 rounded-xl bg-[#5145cd] px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Plus size={18} />
              New booking
            </button>
          </header>

          {/* Statistics */}
          <div className="mb-5 grid grid-cols-3 gap-2 sm:mb-7 sm:gap-4">
            {[
              {
                label: "Total bookings",
                value: bookings.length,
                icon: LayoutDashboard,
              },
              {
                label: "Pending",
                value: pending,
                icon: Clock,
              },
              {
                label: "Confirmed",
                value: confirmed,
                icon: CalendarCheck,
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-5"              >
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium text-slate-500 sm:text-sm">
                    {stat.label}
                  </p>

                  <div className="hidden rounded-xl bg-indigo-50 p-2 text-[#5145cd] sm:block">
                    <stat.icon size={20} />
                  </div>
                </div>

                <p className="mt-3 text-3xl font-bold">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Calendar and list */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">

            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-bold">
                Booking schedule
              </h3>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setView("calendar")}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    view === "calendar"
                      ? "bg-[#5145cd] text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  Calendar
                </button>

                <button
                  onClick={() => setView("list")}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    view === "list"
                      ? "bg-[#5145cd] text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  List
                </button>

                <button
                  onClick={refreshBookings}
                  disabled={loading || saving}
                  aria-label="Refresh bookings"
                  className="rounded-lg bg-slate-100 p-2 text-slate-600"
                >
                  <RefreshCw
                    size={18}
                    className={loading ? "animate-spin" : ""}
                  />
                </button>
              </div>
            </div>

            {error ? (
              <div className="rounded-xl bg-red-50 p-5 text-red-700">
                <p>{error}</p>

                <button
                  onClick={refreshBookings}
                  className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm text-white"
                >
                  Try again
                </button>
              </div>
            ) : loading ? (
              <p className="py-16 text-center text-slate-500">
                Loading bookings...
              </p>
            ) : view === "calendar" ? (
              <div className="overflow-x-auto">
                <div className="w-full min-w-0">                  <FullCalendar
                    plugins={[
                      dayGridPlugin,
                      timeGridPlugin,
                      interactionPlugin,
                    ]}
                    initialView="dayGridMonth"
                    headerToolbar={{
                      left: "prev,next today",
                      center: "title",
                      right: "dayGridMonth,timeGridWeek,timeGridDay",
                    }}
                    events={events}
                    height="auto"
                    nowIndicator
                    dayMaxEvents={3}
                    dateClick={(info) => openCreate(info.dateStr)}
                    eventClick={(info) => {
                      const booking = bookings.find(
                        (item) => item.id === Number(info.event.id)
                      );

                      if (booking) openDetails(booking);
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {bookings.length === 0 ? (
                  <p className="py-16 text-center text-slate-500">
                    No bookings yet.
                  </p>
                ) : (
                  <table className="w-full min-w-[600px] text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="p-4">Service</th>
                        <th className="p-4">Start time</th>
                        <th className="p-4">End time</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {bookings.map((booking) => (
                        <tr
                          key={booking.id}
                          className="border-b border-slate-100"
                        >
                          <td className="p-4 font-medium">
                            {getServiceName(booking.serviceId)}
                          </td>

                          <td className="p-4">
                            {new Date(booking.startTime).toLocaleString()}
                          </td>

                          <td className="p-4">
                            {new Date(booking.endTime).toLocaleString()}
                          </td>

                          <td className="p-4">
                            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                              {booking.status}
                            </span>
                          </td>

                          <td className="p-4">
                            <button
                              onClick={() => openDetails(booking)}
                              className="font-semibold text-[#5145cd]"
                            >
                              View details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </section>
        </main>
      </div>

      {/* Booking modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm">

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-modal-title"
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-6 flex items-center justify-between">
              <h3 id="booking-modal-title" className="text-xl font-bold">
                {modal === "create"
                  ? "Create booking"
                  : modal === "edit"
                  ? "Edit booking"
                  : "Booking details"}
              </h3>

              <button
                onClick={closeModal}
                disabled={saving}
                aria-label="Close dialog"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            {modal === "details" && selected ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Service</p>
                  <p className="font-semibold">
                    {getServiceName(selected.serviceId)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Booking ID</p>
                  <p>#{selected.id}</p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Start time</p>
                  <p>{new Date(selected.startTime).toLocaleString()}</p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">End time</p>
                  <p>{new Date(selected.endTime).toLocaleString()}</p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Status</p>
                  <p className="font-medium text-[#5145cd]">
                    {selected.status}
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    disabled={saving || selected.status === "CANCELLED"}
                    onClick={openEdit}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#5145cd] p-3 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    <Pencil size={16} />
                    Edit
                  </button>

                  <button
                    onClick={deleteBooking}
                    disabled={saving}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-600 disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={saveBooking} className="space-y-5">

                {modal === "create" && (
                  <div>
                    <label htmlFor="service" className="mb-2 block text-sm font-medium">
                      Select service
                    </label>

                    <select
                      id="service"
                      required
                      value={serviceId}
                      onChange={(e) => setServiceId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-indigo-500"
                    >
                      <option value="">Choose a service</option>

                      {services.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.name} — {service.duration} min
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label htmlFor="startTime" className="mb-2 block text-sm font-medium">
                    Date and time
                  </label>

                  <input
                    id="startTime"
                    type="datetime-local"
                    required
                    min={localDateTime(new Date().toISOString())}
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-indigo-500"
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    Times are displayed in your local timezone.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-xl bg-[#5145cd] p-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : modal === "create"
                    ? "Create booking"
                    : "Save changes"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        .fc {
          --fc-button-bg-color: #5145cd;
          --fc-button-border-color: #5145cd;
          --fc-button-hover-bg-color: #4338ca;
          --fc-button-hover-border-color: #4338ca;
          --fc-button-active-bg-color: #3730a3;
          --fc-button-active-border-color: #3730a3;
          --fc-today-bg-color: #eef2ff;
          --fc-border-color: #e2e8f0;
          font-size: 13px;
        }

        .fc .fc-toolbar-title {
          font-size: 1.1rem;
          font-weight: 700;
        }

        .fc .fc-button {
          border-radius: 7px;
          font-size: 12px;
        }

        .fc-event {
          cursor: pointer;
          padding: 3px;
          border-radius: 5px;
        }

        @media (max-width: 640px) {
        .fc {
            font-size: 10px;
        }

        .fc .fc-toolbar {
            flex-direction: column;
            align-items: center;
            gap: 10px;
        }

        .fc .fc-toolbar-title {
            font-size: 16px;
        }

        .fc .fc-button {
            font-size: 11px;
            padding: 6px 9px;
        }

        .fc .fc-daygrid-day-number {
            font-size: 11px;
            padding: 3px;
        }

        .fc .fc-col-header-cell-cushion {
            font-size: 10px;
            padding: 4px 0;
        }

        .fc-event {
            font-size: 9px;
            padding: 1px;
        }
        }
      `}</style>
    </div>
  );
}