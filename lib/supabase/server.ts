import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// يُستخدم داخل Server Components / Server Actions / Route Handlers فقط
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // يُستدعى setAll أحيانًا من Server Component، وهذا متوقع ويمكن تجاهله
            // لأن الـ middleware يتكفّل بتحديث الجلسة في هذه الحالة.
          }
        },
      },
    }
  );
}
