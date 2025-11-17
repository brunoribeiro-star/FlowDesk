import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import { Lock, ChevronLeft } from "lucide-react";

export default function ResetPassword() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
  }, []);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirm) {
      alert("As senhas não coincidem. Verifique e tente novamente.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      alert("Erro ao redefinir senha. Tente novamente.");
      console.error(error);
    } else {
      alert("Senha redefinida com sucesso!");
      router.push("/login");
    }
  }

  if (!ready) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-primary-900 text-gray-300">
        Validando link de redefinição...
      </main>
    );
  }

  return (
    <main className="flex min-h-screen bg-primary-900 text-gray-100 font-sans overflow-hidden">
      <section className="w-[40%] flex flex-col justify-center px-8 lg:px-16 py-6">
        <button
          onClick={() => router.push("/login")}
          className="flex items-center gap-2 border border-primary-700 rounded-lg px-4 py-3 w-fit mb-8 text-gray-300 hover:text-primary-400 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-[16px]">Voltar</span>
        </button>

        <div className="mb-8">
          <h1 className="text-[48px] font-semibold text-gray-100 leading-[110%]">
            Criar Nova Senha
          </h1>
          <p className="text-[20px] text-gray-300 leading-[150%] mt-3">
            Crie uma nova senha para sua conta do FlowDesk.
          </p>
        </div>

        <form onSubmit={handleReset} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-[16px] text-gray-200">Nova Senha</label>
            <div className="relative flex items-center">
              <Lock className="absolute left-4 text-gray-400 w-5 h-5" />
              <input
                type="password"
                required
                placeholder="Digite sua nova senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-[58px] rounded-lg bg-primary-900 border border-primary-700 pl-12 pr-6 text-gray-100 placeholder-gray-400 focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[16px] text-gray-200">Confirmar Senha</label>
            <div className="relative flex items-center">
              <Lock className="absolute left-4 text-gray-400 w-5 h-5" />
              <input
                type="password"
                required
                placeholder="Digite a senha novamente"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full h-[58px] rounded-lg bg-primary-900 border border-primary-700 pl-12 pr-6 text-gray-100 placeholder-gray-400 focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-primary-500 hover:bg-primary-300 text-primary-900 font-semibold text-[20px] py-4 rounded-lg mt-4 transition-colors disabled:opacity-50"
          >
            {loading ? "Redefinindo..." : "Redefinir Senha"}
          </button>
        </form>
      </section>

      <section className="w-[60%] h-screen relative hidden md:block">
        <Image
          src="/login-illustration.webp"
          alt="FlowDesk Illustration"
          fill
          className="object-cover"
          priority
        />
      </section>
    </main>
  );
}