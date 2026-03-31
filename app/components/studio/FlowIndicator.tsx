import { workflowSteps } from "@/lib/constants"
import { styles } from "@/styles/layoutStyles"
import { colors } from "@/styles/theme"

interface FlowIndicatorProps {
  activeIndex?: number
}

export default function FlowIndicator({
  activeIndex = 2,
}: FlowIndicatorProps) {
  return (
    <div style={styles.flowIndicator}>
      <div style={styles.flowIndicatorTitle}>WORKFLOW</div>
      {workflowSteps.map((step, index) => (
        <div key={step} style={styles.flowIndicatorStep}>
          <span
            style={{
              ...styles.flowDot,
              background: index <= activeIndex ? colors.accent : "#333",
            }}
          />
          <span style={styles.flowStepLabel}>{step}</span>
          {index < workflowSteps.length - 1 ? (
            <span style={styles.flowConnector}>│</span>
          ) : null}
        </div>
      ))}
    </div>
  )
}
