import { supabase } from "@/lib/supabaseClient";

export interface TimeEntry {
    id: string;
    user_id: string;
    project_id: string | null;
    task_id: string | null;
    started_at: string;
    ended_at: string | null;
    duration_seconds: number | null;
    created_at: string;
}

export async function addTimeEntry(entry: {
    project_id?: string | null;
    task_id?: string | null;
    started_at: string;
    ended_at: string;
    duration_seconds: number;
}) {
    if (!entry.duration_seconds || entry.duration_seconds <= 0) return null;

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) throw new Error("Usuário não autenticado.");

    const { data, error } = await supabase
        .from("time_entries")
        .insert([
            {
                user_id: user.id,
                project_id: entry.project_id ?? null,
                task_id: entry.task_id ?? null,
                started_at: entry.started_at,
                ended_at: entry.ended_at,
                duration_seconds: Math.round(entry.duration_seconds),
            },
        ])
        .select()
        .single();

    if (error) throw error;
    return data as TimeEntry;
}
