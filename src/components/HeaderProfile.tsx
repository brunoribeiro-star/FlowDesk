import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ChevronUp, ChevronDown, Pencil, SlidersHorizontal, Crown } from "lucide-react";

type HeaderProfileProps = {
  user?: any;
};

export default function HeaderProfile({ user }: HeaderProfileProps) {
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [currentUser, setCurrentUser] = useState<any>(user);

  useEffect(() => {
    if (!currentUser) {
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) setCurrentUser(data.user);
      });
    }
  }, [currentUser]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const avatarSrc = currentUser?.user_metadata?.avatar_url || "/perfil.svg";

  return (
    <div className="relative" ref={profileRef}>
      <button
        type="button"
        onClick={() => setProfileOpen((v) => !v)}
        className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-primary-800 transition-colors"
      >
        <Image
          src={avatarSrc}
          alt="Perfil"
          width={35}
          height={35}
          className="rounded-full object-cover border border-primary-600"
        />

        {profileOpen ? (
          <ChevronUp size={18} className="text-primary-100" />
        ) : (
          <ChevronDown size={18} className="text-primary-100" />
        )}
      </button>

      {profileOpen && (
        <div className="absolute right-0 mt-3 w-56 bg-primary-800 border border-primary-600 rounded-2xl shadow-xl p-4 flex flex-col gap-3 animate-fade-in z-50">
          <button
            className="flex items-center gap-3 text-gray-200 hover:text-primary-100"
            onClick={() => {
              setProfileOpen(false);
              router.push("/dashboard/configuracoes");
            }}
          >
            <Pencil size={20} className="text-primary-200" />
            Editar perfil
          </button>

          <button
            className="flex items-center gap-3 text-gray-200 hover:text-primary-100"
            onClick={() => {
              setProfileOpen(false);
              router.push("/dashboard/tema");
            }}
          >
            <SlidersHorizontal size={20} className="text-primary-200" />
            Personalizar tema
          </button>

          <button
            className="flex items-center gap-3 text-yellow-400 hover:text-yellow-300"
            onClick={() => {
              setProfileOpen(false);
              router.push("/dashboard/configuracoes?tab=assinatura");
            }}
          >
            <Crown size={20} />
            Assinatura
          </button>

          <button
            className="flex items-center gap-3 text-red-400 hover:text-red-300 pt-2"
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/login");
            }}
          >
            <svg
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sair da plataforma
          </button>
        </div>
      )}
    </div>
  );
}
