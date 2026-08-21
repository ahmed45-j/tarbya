"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      return;
    }

    router.push(searchParams.get("next") || "/");
    router.refresh();
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-soft text-3xl">
            🌱
          </div>
          <h1 className="font-display text-2xl font-bold text-ink">التكاليف التربوية</h1>
          <p className="mt-1 text-sm text-ink-soft">سجّل دخولك لمتابعة تقدمك اليوم</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl bg-surface p-6 shadow-sm border border-border">
          <div>
            <label className="mb-1.5 block text-sm font-bold text-ink">البريد الإلكتروني</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="name@example.com"
              dir="ltr"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-bold text-ink">كلمة المرور</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="••••••••"
              dir="ltr"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-flame-soft px-4 py-2.5 text-sm font-medium text-flame">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary py-3.5 text-base font-bold text-white transition active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? "جارٍ الدخول..." : "دخول"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-ink-soft">
          لا تملك حسابًا؟ يقوم المعلم أو المسؤول بإنشاء حسابك.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
