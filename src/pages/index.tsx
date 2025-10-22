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

      // Se estiver logado → vai para a dashboard
      if (session) {
        router.replace("/dashboard");
      } else {
        // Se não estiver logado → vai para o login
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