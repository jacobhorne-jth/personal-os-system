import { CaptureWorkbench } from "@/components/capture/capture-workbench";
import { Card, Page, PageHeader } from "@/components/ui/primitives";

export default function CapturePage() {
  return (
    <Page>
      <PageHeader
        title="Capture"
        description="Type, speak, paste, or upload. It's turned into proposed tasks, events, and notes you approve in the Inbox."
      />
      <Card className="overflow-hidden">
        <CaptureWorkbench />
      </Card>
    </Page>
  );
}
