import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import { ComponentType, JSX } from "react";

export function withAuth<P extends JSX.IntrinsicAttributes>(
  Wrapped: ComponentType<P>
) {
  const ProtectedRoute = (props: P) => {
    const router = useRouter();

    useEffect(() => {
      async function checkSession() {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          router.push("/login");
        }
      }
      checkSession();
    }, [router]);

    return <Wrapped {...props} />;
  };

  ProtectedRoute.displayName = `withAuth(${Wrapped.displayName || Wrapped.name || "Component"})`;

  return ProtectedRoute;
}