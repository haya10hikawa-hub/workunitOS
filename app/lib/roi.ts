import { WorkUnit } from "@/types/workunit";

export function calcROI(wu: WorkUnit): number {
 if (wu.effort <= 0) return 0;
 return (wu.impact * wu.urgency * wu.actorWeight) / wu.effort;
}