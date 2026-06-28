import { CaptureWorkbench } from "@/components/capture/capture-workbench";
import { Panel } from "@/components/ui/panel";

export default function CapturePage() {
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <header className="rounded-xl border border-line bg-panel p-5 shadow-glow backdrop-blur-xl">
        <p className="text-sm text-muted">Universal capture</p>
        <h1 className="mt-1 text-3xl font-semibold text-ink">Capture now, decide later</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          Type, speak, upload, paste, or log time. The parser turns raw input into proposed changes for review.
        </p>
      </header>
      <Panel>
        <CaptureWorkbench />
      </Panel>
    </div>
  );
}
