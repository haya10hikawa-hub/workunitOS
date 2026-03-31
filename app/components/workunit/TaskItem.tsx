import { styles } from "@/styles/layoutStyles"
import type { Task } from "@/types/workunit"

interface TaskItemProps {
  task: Task
  onToggle: (id: string) => void
}

export default function TaskItem({ task, onToggle }: TaskItemProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(task.id)}
      style={styles.taskItem}
    >
      <span style={styles.taskCheck}>{task.done ? "☑" : "☐"}</span>
      <span>{task.label}</span>
    </button>
  )
}
