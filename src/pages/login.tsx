import { useState, useEffect } from "react";
import Image from "next/image";
import { Mail, Lock, User } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/router";

export default function LoginPage() {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [role, setRole] = useState<"freelancer" | "contratante" | "">("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        router.push("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(`Erro: ${error.message}`);
    } else {
      router.push("/dashboard");
    }

    setLoading(false);
  }

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role },
      },
    });

    if (error) {
      alert(`Erro: ${error.message}`);
    } else {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        router.push("/dashboard");
      } else {
        alert("Conta criada! Verifique seu e-mail antes de entrar.");
      }
    }

    setLoading(false);
  }

  async function handleGoogleAuth() {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      alert(`Erro ao autenticar com Google: ${err.message}`);
    }
  }

  return (
    <main className="flex min-h-screen bg-primary-900 text-gray-100 font-sans overflow-hidden">
      <section className="w-[40%] flex flex-col justify-center px-8 lg:px-16 py-6">
        <div className="flex justify-center w-full mb-6 border-b border-gray-700">
          <div className="grid grid-cols-2 w-full max-w-md mx-auto">
            <button
              onClick={() => setTab("login")}
              className={`w-full py-4 text-[20px] transition-colors border-b-2 ${
                tab === "login"
                  ? "text-primary-500 border-primary-500"
                  : "text-gray-400 border-transparent hover:text-primary-400"
              }`}
            >
              Fazer Login
            </button>
            <button
              onClick={() => setTab("register")}
              className={`w-full py-4 text-[20px] transition-colors border-b-2 ${
                tab === "register"
                  ? "text-primary-500 border-primary-500"
                  : "text-gray-400 border-transparent hover:text-primary-400"
              }`}
            >
              Criar Conta
            </button>
          </div>
        </div>

        {tab === "login" && (
          <>
            <div className="mb-6">
              <h1 className="text-[48px] font-semibold text-gray-100 leading-[110%]">
                Bem-vindo(a) de volta ao FlowDesk
              </h1>
              <p className="text-[20px] text-gray-300 leading-[150%] mt-3">
                Acesse sua conta para continuar gerenciando seus projetos e
                clientes com facilidade.
              </p>
            </div>

            <form onSubmit={handleLogin} className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-[16px] text-gray-200">E-mail</label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-4 text-gray-400 w-5 h-5" />
                  <input
                    type="email"
                    name="email"
                    placeholder="Insira seu E-mail"
                    required
                    className="w-full h-[58px] rounded-lg bg-primary-900 border border-primary-700 pl-12 pr-6 text-gray-100 placeholder-gray-400 focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[16px] text-gray-200">Senha</label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-4 text-gray-400 w-5 h-5" />
                  <input
                    type="password"
                    name="password"
                    placeholder="Insira sua senha"
                    required
                    className="w-full h-[58px] rounded-lg bg-primary-900 border border-primary-700 pl-12 pr-24 text-gray-100 placeholder-gray-400 focus:outline-none focus:border-primary-500"
                  />
                  <button
                    type="button"
                    onClick={() => router.push("/forgot-password")}
                    className="absolute right-4 top-[18px] text-primary-300 text-[16px] hover:text-primary-500 transition-colors"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`bg-primary-500 hover:bg-primary-300 text-primary-900 font-semibold text-[20px] py-4 rounded-lg mt-4 transition-colors ${
                  loading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {loading ? "Entrando..." : "Fazer Login"}
              </button>
            </form>

            <div className="flex items-center gap-4 text-gray-400 text-[14px] mt-6">
              <div className="flex-1 h-[1px] bg-gray-400" />
              ou
              <div className="flex-1 h-[1px] bg-gray-400" />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleGoogleAuth}
                className="flex items-center justify-center gap-2 bg-primary-800 border border-primary-600 rounded-lg py-4 px-6 flex-1 text-gray-300 hover:bg-primary-700 transition"
              >
                <Image src="/google.svg" alt="Google" width={20} height={20} />
                Login com Google
              </button>
            </div>
          </>
        )}

        {tab === "register" && (
          <>
            <div className="mb-6">
              <h1 className="text-[48px] font-semibold text-gray-100 leading-[110%]">
                Crie agora sua conta no FlowDesk
              </h1>
            </div>

            <form onSubmit={handleRegister} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="freelancer"
                      checked={role === "freelancer"}
                      onChange={() => setRole("freelancer")}
                      className="w-4 h-4 text-primary-500 border-gray-500 focus:ring-primary-500 accent-primary-500"
                    />
                    <span
                      className={`text-[16px] transition-colors ${
                        role === "freelancer"
                          ? "text-primary-500"
                          : "text-gray-300"
                      }`}
                    >
                      Sou Freelancer
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="contratante"
                      checked={role === "contratante"}
                      onChange={() => setRole("contratante")}
                      className="w-4 h-4 text-primary-500 border-gray-500 focus:ring-primary-500 accent-primary-500"
                    />
                    <span
                      className={`text-[16px] transition-colors ${
                        role === "contratante"
                          ? "text-primary-500"
                          : "text-gray-300"
                      }`}
                    >
                      Sou Contratante
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[16px] text-gray-200">Nome</label>
                <div className="relative flex items-center">
                  <User className="absolute left-4 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    name="name"
                    placeholder="Insira seu nome completo"
                    required
                    className="w-full h-[58px] rounded-lg bg-primary-900 border border-primary-700 pl-12 pr-6 text-gray-100 placeholder-gray-400 focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[16px] text-gray-200">E-mail</label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-4 text-gray-400 w-5 h-5" />
                  <input
                    type="email"
                    name="email"
                    placeholder="Insira seu E-mail"
                    required
                    className="w-full h-[58px] rounded-lg bg-primary-900 border border-primary-700 pl-12 pr-6 text-gray-100 placeholder-gray-400 focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[16px] text-gray-200">Senha</label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-4 text-gray-400 w-5 h-5" />
                  <input
                    type="password"
                    name="password"
                    placeholder="Crie sua senha"
                    required
                    className="w-full h-[58px] rounded-lg bg-primary-900 border border-primary-700 pl-12 pr-6 text-gray-100 placeholder-gray-400 focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`bg-primary-500 hover:bg-primary-300 text-primary-900 font-semibold text-[20px] py-4 rounded-lg mt-3 transition-colors ${
                  loading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {loading ? "Criando..." : "Criar Conta"}
              </button>
            </form>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleGoogleAuth}
                className="flex items-center justify-center gap-2 bg-primary-800 border border-primary-600 rounded-lg py-4 px-6 flex-1 text-gray-300 hover:bg-primary-700 transition"
              >
                <Image src="/google.svg" alt="Google" width={20} height={20} />
                Criar com Google
              </button>
            </div>
          </>
        )}
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