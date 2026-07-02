import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Users,
  Activity,
  MessageSquare,
  Image as ImageIcon,
  Pencil,
  ShieldAlert,
  LogIn,
  Search,
  Ban,
  Check,
  BarChart3,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import {
  isAdmin,
  getOverview,
  getDailySeries,
  getModelUsage,
  listUsers,
  setSuspended,
  recentLogins,
  recentErrors,
} from "@/lib/admin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

function Stat({
  icon: Icon,
  label,
  value,
  accent = "violet",
}: {
  icon: any;
  label: string;
  value: number | string;
  accent?: string;
}) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <div className={`rounded-xl p-2 bg-${accent}-500/15 text-${accent}-400`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-2xl font-semibold tracking-tight">{value ?? 0}</div>
        </div>
      </div>
    </div>
  );
}

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const isAdminFn = useServerFn(isAdmin);
  const overviewFn = useServerFn(getOverview);
  const seriesFn = useServerFn(getDailySeries);
  const modelsFn = useServerFn(getModelUsage);
  const listUsersFn = useServerFn(listUsers);
  const setSuspendedFn = useServerFn(setSuspended);
  const loginsFn = useServerFn(recentLogins);
  const errorsFn = useServerFn(recentErrors);

  const adminQ = useQuery({ queryKey: ["admin", "check"], queryFn: () => isAdminFn() });

  useEffect(() => {
    if (adminQ.data && !adminQ.data.isAdmin) navigate({ to: "/" });
  }, [adminQ.data, navigate]);

  const enabled = !!adminQ.data?.isAdmin;
  const [days, setDays] = useState<number>(30);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const overviewQ = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => overviewFn(),
    enabled,
  });
  const seriesQ = useQuery({
    queryKey: ["admin", "series", days],
    queryFn: () => seriesFn({ data: { days } }),
    enabled,
  });
  const modelsQ = useQuery({
    queryKey: ["admin", "models", days],
    queryFn: () => modelsFn({ data: { days } }),
    enabled,
  });
  const usersQ = useQuery({
    queryKey: ["admin", "users", q],
    queryFn: () => listUsersFn({ data: { search: q || undefined } }),
    enabled,
  });
  const loginsQ = useQuery({
    queryKey: ["admin", "logins"],
    queryFn: () => loginsFn(),
    enabled,
  });
  const errorsQ = useQuery({
    queryKey: ["admin", "errors"],
    queryFn: () => errorsFn(),
    enabled,
  });

  const suspendM = useMutation({
    mutationFn: (v: { userId: string; suspended: boolean }) => setSuspendedFn({ data: v }),
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const chartData = useMemo(
    () =>
      (seriesQ.data ?? []).map((d) => ({
        ...d,
        day: new Date(d.day).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      })),
    [seriesQ.data],
  );

  if (adminQ.isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Checking access…</div>;
  }
  if (adminQ.data && !adminQ.data.isAdmin) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center">
        <ShieldAlert className="h-10 w-10 text-red-400" />
        <div className="text-lg font-semibold">Admin access required</div>
        <p className="text-sm text-muted-foreground">
          Only the designated admin account can view this page.
        </p>
      </div>
    );
  }

  const o = overviewQ.data ?? ({} as Record<string, number>);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 pb-24 md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">Analytics, users & system health</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`rounded-full border border-white/10 px-3 py-1.5 transition ${
                days === d ? "bg-white/10 text-foreground" : "text-muted-foreground"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icon={Users} label="Total users" value={o.total_users ?? 0} accent="violet" />
        <Stat icon={Activity} label="DAU" value={o.dau ?? 0} accent="indigo" />
        <Stat icon={Users} label="New today" value={o.new_users_today ?? 0} accent="emerald" />
        <Stat icon={LogIn} label="Logins today" value={o.logins_today ?? 0} accent="sky" />
        <Stat icon={MessageSquare} label="Chats today" value={o.chats_today ?? 0} accent="fuchsia" />
        <Stat icon={ImageIcon} label="Images today" value={o.image_gen_today ?? 0} accent="amber" />
        <Stat icon={Pencil} label="Edits today" value={o.image_edit_today ?? 0} accent="rose" />
        <Stat icon={ShieldAlert} label="Errors today" value={o.errors_today ?? 0} accent="red" />
      </section>

      <section className="glass rounded-2xl p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
          <BarChart3 className="h-4 w-4" /> Activity — last {days} days
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gChats" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gLogins" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="day" stroke="rgba(255,255,255,0.4)" fontSize={11} />
              <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "rgba(15,15,25,0.9)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Area type="monotone" dataKey="users" stroke="#22c55e" fill="url(#gUsers)" />
              <Area type="monotone" dataKey="logins" stroke="#38bdf8" fill="url(#gLogins)" />
              <Area type="monotone" dataKey="chats" stroke="#8b5cf6" fill="url(#gChats)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="glass rounded-2xl p-4">
          <div className="mb-3 text-sm font-medium">API usage by kind ({days}d)</div>
          <div className="h-56 w-full">
            <ResponsiveContainer>
              <BarChart data={modelsQ.data ?? []}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="kind" stroke="rgba(255,255,255,0.4)" fontSize={11} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(15,15,25,0.9)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                  }}
                />
                <Bar dataKey="total" fill="#a78bfa" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-2xl p-4">
          <div className="mb-3 flex items-center justify-between text-sm font-medium">
            <span>Recent errors</span>
            <span className="text-xs text-muted-foreground">{errorsQ.data?.length ?? 0}</span>
          </div>
          <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
            {(errorsQ.data ?? []).length === 0 && (
              <div className="text-xs text-muted-foreground">No errors logged.</div>
            )}
            {(errorsQ.data ?? []).map((e) => (
              <div key={e.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{e.source}</span>
                  <span>{new Date(e.created_at).toLocaleString()}</span>
                </div>
                <div className="mt-0.5 line-clamp-2 text-xs">{e.message}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="glass rounded-2xl p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-medium">Users</div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search email or name"
              className="w-64 rounded-lg border border-white/10 bg-white/[0.03] py-1.5 pl-8 pr-3 text-sm outline-none focus:ring-1 focus:ring-violet-500/50"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="p-2">Email</th>
                <th className="p-2">Name</th>
                <th className="p-2">Joined</th>
                <th className="p-2">Last sign-in</th>
                <th className="p-2">Status</th>
                <th className="p-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(usersQ.data ?? []).map((u) => (
                <tr key={u.id} className="border-t border-white/5">
                  <td className="p-2">
                    {u.email}
                    {u.is_admin && (
                      <span className="ml-2 rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[10px] text-violet-300">
                        admin
                      </span>
                    )}
                  </td>
                  <td className="p-2 text-muted-foreground">{u.display_name ?? "—"}</td>
                  <td className="p-2 text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-2 text-muted-foreground">
                    {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : "—"}
                  </td>
                  <td className="p-2">
                    {u.suspended ? (
                      <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs text-red-300">
                        Suspended
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="p-2 text-right">
                    {u.is_admin ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <button
                        onClick={() =>
                          suspendM.mutate({ userId: u.id, suspended: !u.suspended })
                        }
                        className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-xs hover:bg-white/5"
                      >
                        {u.suspended ? (
                          <>
                            <Check className="h-3 w-3" /> Reactivate
                          </>
                        ) : (
                          <>
                            <Ban className="h-3 w-3" /> Suspend
                          </>
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {(usersQ.data ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-xs text-muted-foreground">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="glass rounded-2xl p-4">
        <div className="mb-3 text-sm font-medium">Login history (latest 100)</div>
        <div className="max-h-72 overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="p-2">Email</th>
                <th className="p-2">Event</th>
                <th className="p-2">When</th>
                <th className="p-2">User agent</th>
              </tr>
            </thead>
            <tbody>
              {(loginsQ.data ?? []).map((l) => (
                <tr key={l.id} className="border-t border-white/5">
                  <td className="p-2">{l.email}</td>
                  <td className="p-2 text-muted-foreground">{l.event}</td>
                  <td className="p-2 text-muted-foreground">
                    {new Date(l.created_at).toLocaleString()}
                  </td>
                  <td className="p-2 truncate text-xs text-muted-foreground">
                    {l.user_agent ?? "—"}
                  </td>
                </tr>
              ))}
              {(loginsQ.data ?? []).length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-xs text-muted-foreground">
                    No login events yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
