import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import { ChevronLeft } from "lucide-react";

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (error) {
      alert("Erro ao enviar o e-mail. Tente novamente.");
      console.error(error.message);
    } else {
      setSent(true);
    }
  }

  return (
    <main className="flex min-h-screen bg-primary-900 text-gray-100 font-sans overflow-hidden">
      {/* === FORM SECTION (40%) === */}
      <section className="w-[40%] flex flex-col justify-center px-8 lg:px-16 py-6">
        {/* Botão Voltar */}
        <button
          onClick={() => router.push("/login")}
          className="flex items-center gap-2 border border-primary-700 rounded-lg px-4 py-3 w-fit mb-8 text-gray-300 hover:text-primary-400 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-[16px]">Voltar</span>
        </button>

        {/* Textos */}
        <div className="mb-8">
          <h1 className="text-[48px] font-semibold text-gray-100 leading-[110%]">
            Recuperar senha
          </h1>
          <p className="text-[20px] text-gray-300 leading-[150%] mt-3">
            Digite o e-mail do seu cadastro para enviarmos um link de
            recuperação para redefinir sua senha.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-[16px] text-gray-200">E-mail</label>
            <input
              type="email"
              required
              placeholder="Insira seu E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-[58px] rounded-lg bg-primary-900 border border-primary-700 px-6 text-gray-100 placeholder-gray-400 focus:outline-none focus:border-primary-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-primary-500 hover:bg-primary-300 text-primary-900 font-semibold text-[20px] py-4 rounded-lg mt-4 transition-colors disabled:opacity-50"
          >
            {sent
              ? "Link enviado!"
              : loading
              ? "Enviando..."
              : "Enviar link"}
          </button>
        </form>
      </section>

      {/* === IMAGE SECTION (60%) === */}
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