import { ResumeWorkbench } from "@/features/resume/resume-workbench";
import { resumeService } from "@/server/services/resume-service";

export const dynamic = "force-dynamic";

export default function ResumePage() {
  const workspace = resumeService.getWorkspace();

  return <ResumeWorkbench workspace={workspace} />;
}
