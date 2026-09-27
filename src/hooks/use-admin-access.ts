import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { Enums } from "@/integrations/supabase/types";

export type AppRole = Enums<"app_role">;
const staff = new Set<AppRole>(["content_editor", "medical_reviewer", "admin", "super_admin"]);

export function useAdminAccess() {
  const { user, loading: authLoading } = useAuth();
  const q = useQuery({
    queryKey: ["current-user-roles", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<AppRole[]> => {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((r) => r.role);
    },
  });
  const roles = q.data ?? [];
  return {
    user,
    roles,
    isStaff: roles.some((r) => staff.has(r)),
    isAdmin: roles.includes("admin") || roles.includes("super_admin"),
    isSuperAdmin: roles.includes("super_admin"),
    loading: authLoading || (!!user && q.isPending),
    error: q.error,
    refetch: q.refetch,
  };
}
