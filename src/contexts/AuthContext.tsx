import { createContext, useContext, useEffect, useState } from 'react';
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
            setUser((prev) => {
                const next = sess?.user ?? null;
                if (prev && next && prev.id === next.id && prev.updated_at === next.updated_at) {
                    return prev;
                }
                return next;
            });

            if (_event === 'SIGNED_IN' && router.pathname === '/login') {
                const hasRedirectParam = typeof router.query.redirect === 'string';
                if (!hasRedirectParam && sess) {
                    const { data: userRow } = await supabase.from("users").select("role").eq("id", sess.user.id).maybeSingle();
                    router.replace(userRow?.role === 'cliente' ? '/portal/dashboard' : '/dashboard');
                }
            }
            if (_event === 'SIGNED_IN' && router.pathname === '/signup') {
                router.replace('/onboarding');
            }
            if (_event === 'SIGNED_OUT') {
                if (router.pathname.startsWith('/portal')) {
                    router.replace('/portal/login');
                } else if (router.pathname !== '/login') {
                    router.replace('/login');
                }
            }
            if (_event === 'PASSWORD_RECOVERY') {
                router.replace('/reset-password');
            }
        });

        return () => {
            mounted = false;
            sub?.subscription.unsubscribe();
        };
    }, []);

    return (
        <AuthContext.Provider value={{ user, session, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);