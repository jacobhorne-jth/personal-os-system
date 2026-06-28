import { Layers3 } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-md rounded-lg border border-line bg-panel p-5 shadow-glow">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-lg bg-ink text-paper">
            <Layers3 className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-ink">Jacob OS</h1>
            <p className="text-sm text-muted">Calendar-first personal command center</p>
          </div>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
