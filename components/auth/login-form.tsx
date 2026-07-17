"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound, Mail } from "lucide-react";
import { createBrowserSupabaseClient, hasSupabaseEnv } from "@/lib/supabase/browser";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!hasSupabaseEnv()) {
      router.push("/home");
      return;
    }

    setLoading(true);
    const supabase = createBrowserSupabaseClient();

    if (password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        setMessage(error.message);
      } else {
        window.location.href = "/home";
      }
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        // Only existing users (added in the Supabase dashboard) can sign in
        shouldCreateUser: false
      }
    });

    setLoading(false);
    setMessage(error ? error.message : "Check your email for the sign-in link.");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block text-sm text-muted" htmlFor="email">
        Email
      </label>
      <div className="flex min-w-0 items-center gap-2 rounded-lg border border-line bg-paper px-3">
        <Mail className="size-4 text-muted" />
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="jacob@example.com"
          className="h-11 min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
        />
      </div>
      <label className="block text-sm text-muted" htmlFor="password">
        Password
      </label>
      <div className="flex gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-line bg-paper px-3">
          <KeyRound className="size-4 text-muted" />
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Leave empty for magic link"
            className="h-11 min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
          />
        </div>
        <button className="grid size-11 shrink-0 place-items-center rounded-lg bg-ink text-paper disabled:opacity-60" disabled={loading}>
          <ArrowRight className="size-4" />
        </button>
      </div>
      <p className="min-h-5 text-xs text-muted">
        {message || (!hasSupabaseEnv() ? "Supabase env is not configured yet, so this opens the local prototype." : "Sign in with your password, or leave it empty to get a magic link.")}
      </p>
    </form>
  );
}
