import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="grid min-h-dvh place-items-center bg-paper px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <span className="grid size-9 place-items-center rounded-lg bg-ink text-sm font-bold text-paper">J</span>
          <h1 className="mt-5 text-[22px] font-semibold tracking-[-0.02em] text-ink">Sign in to Jacob OS</h1>
          <p className="mt-1 text-sm text-muted">Your calendar, tasks, and everything else.</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
