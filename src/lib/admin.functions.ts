import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("forbidden");
}

export const isAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { isAdmin: !!data };
  });

export const getOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase.rpc("admin_overview");
    if (error) throw new Error(error.message);
    return data as Record<string, number>;
  });

export const getDailySeries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { days?: number }) => ({ days: d?.days ?? 30 }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase.rpc("admin_daily_series", {
      _days: data.days,
    });
    if (error) throw new Error(error.message);
    return (rows ?? []) as Array<{
      day: string;
      users: number;
      logins: number;
      chats: number;
      image_gen: number;
      image_edit: number;
    }>;
  });

export const getModelUsage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { days?: number }) => ({ days: d?.days ?? 30 }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase.rpc("admin_model_usage", {
      _days: data.days,
    });
    if (error) throw new Error(error.message);
    return (rows ?? []) as Array<{ kind: string; total: number }>;
  });

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { search?: string }) => ({ search: d?.search ?? null }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase.rpc("admin_list_users", {
      _search: data.search,
      _limit: 200,
    });
    if (error) throw new Error(error.message);
    return (rows ?? []) as Array<{
      id: string;
      email: string;
      display_name: string | null;
      created_at: string;
      last_sign_in_at: string | null;
      suspended: boolean;
      is_admin: boolean;
    }>;
  });

export const setSuspended = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; suspended: boolean }) => d)
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.rpc("admin_set_suspended", {
      _user_id: data.userId,
      _suspended: data.suspended,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const recentLogins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase.rpc("admin_recent_logins", { _limit: 100 });
    if (error) throw new Error(error.message);
    return (data ?? []) as Array<{
      id: string;
      user_id: string;
      email: string;
      event: string;
      user_agent: string | null;
      created_at: string;
    }>;
  });

export const recentErrors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase.rpc("admin_recent_errors", { _limit: 100 });
    if (error) throw new Error(error.message);
    return (data ?? []) as Array<{
      id: string;
      user_id: string | null;
      source: string;
      message: string;
      created_at: string;
    }>;
  });

export const logLoginEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { event?: string; userAgent?: string }) => d ?? {})
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("login_events").insert({
      user_id: context.userId,
      event: data.event ?? "login",
      user_agent: data.userAgent ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
