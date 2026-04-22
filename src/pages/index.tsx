import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";

export default function HomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        const { data: userRow } = await supabase.from("users").select("role").eq("id", session.user.id).maybeSingle();
        router.replace(userRow?.role === "cliente" ? "/portal/dashboard" : "/dashboard");
      } else {
        router.replace("/login");
      }
    }

    checkSession();
  }, [router]);

  return (
    <div className="h-screen flex items-center justify-center bg-primary-900 text-gray-300">
      <p>Carregando...</p>
    </div>
  );
}