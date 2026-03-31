import { styles } from "@/styles/layoutStyles"

interface DetailFieldProps {
  label: string
  value: string
}

export default function DetailField({ label, value }: DetailFieldProps) {
  return (
    <div style={styles.detailField}>
      <div style={styles.detailFieldLabel}>{label}</div>
      <div style={styles.detailFieldValue}>{value}</div>
    </div>
  )
}
