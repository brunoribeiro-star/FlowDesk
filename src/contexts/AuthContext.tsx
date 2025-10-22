import { createContext, use, useContext, useEffect, useState } from 'react';
import { Session, User } from "@supabase/supabase-js";
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/router';

type AuthContextType = {
    user: User | null;
    session: Session | null;
    loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }){
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        let mounted = true;

        supabase.auth.getSession().then(({ data }) => {
            if (!mounted) return;
            setSession(data.session ?? null);
            setUser(data.session?.user ?? null);
            setLoading(false);
        });

        const { data: sub } = supabase.auth.onAuthStateChange(async (_event, sess) => {
            setSession(sess ?? null);
            setUser(sess?.user ?? null);
            
            if (_event === 'SIGNED_IN' && router.pathname === '/login') {
                router.replace('/dashboard');
            }
            if (_event === 'SIGNED_OUT') {
                if (router.pathname !== '/login') router.replace('/login');
            }
            if (_event === 'PASSWORD_RECOVERY') {
                router.replace('/reset-password');
            }
        });

        return () => {
            mounted = false;
            sub?.subscription.unsubscribe();
        };
    }, [router]);

    return (
        <AuthContext.Provider value={{ user, session, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);