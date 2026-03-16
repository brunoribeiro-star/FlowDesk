import ProjectTimeDonut, { TimeByProject } from "./ProjectTimeDonut";
import FinanceDonut from "./FinanceDonut";
import ProjectStatusDonut, { ProjectForStatus } from "./ProjectStatusDonut";
import type { OverviewData } from "./OverviewCards";

interface Props {
  overviewData: OverviewData;
  timeByProject: TimeByProject[];
  totalHoras: number;
  projects: ProjectForStatus[];
  slot: "time" | "finance" | "status";
}

export default function DistributionSection({
  overviewData,
  timeByProject,
  totalHoras,
  projects,
  slot,
}: Props) {
  if (slot === "time") {
    return <ProjectTimeDonut data={timeByProject} totalHoras={totalHoras} />;
  }
  if (slot === "finance") {
    return <FinanceDonut data={overviewData} />;
  }
  return <ProjectStatusDonut projects={projects} />;
}
