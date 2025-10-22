import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Se não estiver logado → redireciona pro login
      if (!session) {
        router.replace("/login");
      } else {
        setLoading(false);
      }
    }

    checkUser();

    // Listener pra detectar logout em tempo real
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/login");
    });

    return () => subscription.unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-primary-900 text-gray-300">
        <p>Verificando acesso...</p>
      </div>
    );
  }

  return <>{children}</>;
}
