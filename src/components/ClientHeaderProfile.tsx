import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import { ChevronUp, ChevronDown, SlidersHorizontal } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import ThemeModal from "@/components/ThemeModal";

type ClientHeaderProfileProps = {
  user?: any;
};

export default function ClientHeaderProfile({ user }: ClientHeaderProfileProps) {
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [currentUser, setCurrentUser] = useState<any>(user ?? null);

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

  const avatarSrc = currentUser?.user_metadata?.avatar_url || null;
  const displayName = currentUser?.user_metadata?.nome || currentUser?.email?.split("@")[0] || null;

  return (
    <>
    <ThemeModal open={themeOpen} onClose={() => setThemeOpen(false)} />
    <div className="relative" ref={profileRef}>
      <button
        type="button"
        onClick={() => setProfileOpen((v) => !v)}
        className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-primary-700 transition-colors"
      >
        <UserAvatar src={avatarSrc} name={displayName} size={35} className="border border-primary-600" />
        {profileOpen ? (
          <ChevronUp size={18} className="text-primary-100" />
        ) : (
          <ChevronDown size={18} className="text-primary-100" />
        )}
      </button>

      {profileOpen && (
        <div className="absolute right-0 mt-3 w-56 bg-primary-800 border border-primary-600 rounded-2xl shadow-xl p-4 flex flex-col gap-3 z-50">
          <div className="border-b border-primary-700 pb-3 mb-1">
            <p className="text-[13px] text-gray-300 font-medium truncate">
              {currentUser?.user_metadata?.nome || currentUser?.email?.split("@")[0] || "Cliente"}
            </p>
            <p className="text-[12px] text-gray-500 truncate">{currentUser?.email}</p>
          </div>

          <button
            className="flex items-center gap-3 text-gray-200 hover:text-primary-100 transition-colors"
            onClick={() => { setProfileOpen(false); setThemeOpen(true); }}
          >
            <SlidersHorizontal size={18} className="text-primary-200" />
            <span className="text-[14px]">Personalizar tema</span>
          </button>

          <button
            className="flex items-center gap-3 text-red-400 hover:text-red-300 transition-colors pt-1 border-t border-primary-700 mt-1"
            onClick={async () => {
              setProfileOpen(false);
              await supabase.auth.signOut();
              router.push("/");
            }}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span className="text-[14px]">Sair da plataforma</span>
          </button>
        </div>
      )}
    </div>
    </>
  );
}
