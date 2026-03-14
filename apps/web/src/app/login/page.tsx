import { AuthStatus } from "@/components/auth-status";
import { SectionShell } from "@/components/section-shell";
import { getSessionSnapshot } from "@/lib/session";

export default async function LoginPage() {
  const snapshot = await getSessionSnapshot();

  return (
    <main>
      <SectionShell
        eyebrow="Auth"
        title="Supabase auth is ready to connect"
        description="This first step wires server-side session detection. The next step will add the actual email and Google sign-in flows."
      >
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[28px] border border-dune bg-shell p-6">
            <h3 className="font-display text-3xl text-cocoa">What to configure</h3>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-cocoa/80">
              <li>Create a Supabase project and apply the SQL schema.</li>
              <li>Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.</li>
              <li>Enable Google under Supabase Auth providers.</li>
              <li>Set the callback URL to `/auth/callback`.</li>
            </ol>
          </div>
          <AuthStatus user={snapshot.user} source={snapshot.source} />
        </div>
      </SectionShell>
    </main>
  );
}
