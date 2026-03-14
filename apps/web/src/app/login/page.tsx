import { redirect } from "next/navigation";
import { AuthStatus } from "@/components/auth-status";
import { LoginForm } from "@/components/login-form";
import { SectionShell } from "@/components/section-shell";
import { hasSupabaseConfig } from "@/lib/env";
import { getSafeNextPath } from "@/lib/navigation";
import { getSessionSnapshot } from "@/lib/session";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const snapshot = await getSessionSnapshot();
  const params = await searchParams;
  const nextPath = getSafeNextPath(params.next);

  if (snapshot.user && snapshot.source === "supabase") {
    redirect("/account");
  }

  return (
    <main>
      <SectionShell
        eyebrow="Auth"
        title="Email and Google sign-in"
        description="The page now supports password auth and Google OAuth. After sign-in, the server bootstraps `profiles` and a default `member` role."
      >
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[28px] border border-dune bg-shell p-6">
            <h3 className="font-display text-3xl text-cocoa">What to configure</h3>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-cocoa/80">
              <li>Create a Supabase project and apply the SQL schema.</li>
              <li>Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.</li>
              <li>Enable Google under Supabase Auth providers.</li>
              <li>Set the callback URL to `/auth/callback`.</li>
            </ol>
            <div className="mt-6">
              <LoginForm
                enabled={hasSupabaseConfig()}
                nextPath={nextPath}
              />
            </div>
          </div>
          <div className="grid gap-6">
            <AuthStatus user={snapshot.user} source={snapshot.source} />
            <div className="rounded-[28px] border border-dune bg-shell p-6 text-sm text-cocoa/80">
              <p className="font-semibold text-cocoa">Bootstrap behavior</p>
              <p className="mt-3">
                After authentication, the app calls `/api/auth/bootstrap` to upsert
                `profiles` and seed a default `member` role.
              </p>
            </div>
          </div>
        </div>
      </SectionShell>
    </main>
  );
}
