import { useEffect, useMemo, useState } from "react"
import WorkUnitCard from "@/components/workunit/WorkUnitCard"
import WorkUnitDetail from "@/components/workunit/WorkUnitDetail"
import { statusOrder } from "@/lib/constants"
import { calcROI } from "@/lib/roi"
import { styles } from "@/styles/layoutStyles"
import { colors } from "@/styles/theme"
import type { DecisionLog } from "@/types/decision"
import type { AppLanguage } from "@/types/ui"
import type { WorkUnit, WorkUnitStatus } from "@/types/workunit"

type WorkUnitBoardView =
  | "current"
  | "next"
  | "backlog"
  | "roadmap"
  | "review"
  | "mine"

type WorkUnitDisplayMode = "table" | "cards"

interface WorkUnitColumnProps {
  workUnits: WorkUnit[]
  selectedWorkUnitId: string
  onSelectWorkUnit: (id: string) => void
  onToggleTask: (wuId: string, taskId: string) => void
  onUpdateStatus: (wuId: string, status: WorkUnitStatus) => void
  onLogDecision: (log: DecisionLog) => void
  onCreateWorkUnit: (title: string) => void
  linkedDocCountByWorkUnit: Record<string, number>
  language: AppLanguage
}

export default function WorkUnitColumn({
  workUnits,
  selectedWorkUnitId,
  onSelectWorkUnit,
  onToggleTask,
  onUpdateStatus,
  onLogDecision,
  onCreateWorkUnit,
  linkedDocCountByWorkUnit,
  language,
}: WorkUnitColumnProps) {
  const [activeView, setActiveView] = useState<WorkUnitBoardView>("current")
  const [displayMode, setDisplayMode] = useState<WorkUnitDisplayMode>("table")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<WorkUnitStatus | "all">("all")
  const [newItemTitle, setNewItemTitle] = useState("")
  const assigneeAlias = "product"

  const labels =
    language === "ja"
      ? {
          title: "WORKUNIT",
          subtitle: "ROI と実行の統合ボード",
          current: "現行イテレーション",
          next: "次のイテレーション",
          backlog: "優先バックログ",
          roadmap: "ロードマップ",
          review: "レビュー中",
          mine: "自分のアイテム",
          table: "表",
          cards: "カード",
          search: "assignee:@me やキーワードで検索",
          allStatus: "すべて",
          addItem: "追加",
          addPlaceholder: "新しいWorkUnitタイトルを入力",
          colTitle: "タイトル",
          colPriority: "優先度",
          colStatus: "ステータス",
          colDocs: "連携ドキュメント",
          colTasks: "タスク",
          noRows: "条件に一致する WorkUnit がありません。",
          noRowsGuide: "フィルタを緩めるか、新規追加してください。",
          statusNew: "新規",
          statusActive: "進行中",
          statusWaiting: "保留",
          statusDone: "完了",
          statusArchived: "保管",
          priorityHigh: "High",
          priorityMedium: "Medium",
          priorityLow: "Low",
          roi: "ROI",
        }
      : {
          title: "WORKUNIT",
          subtitle: "Merged ROI + Execution board",
          current: "Current iteration",
          next: "Next iteration",
          backlog: "Prioritized backlog",
          roadmap: "Roadmap",
          review: "In review",
          mine: "My items",
          table: "Table",
          cards: "Cards",
          search: "Search by assignee:@me or keyword",
          allStatus: "All status",
          addItem: "Add",
          addPlaceholder: "Type a new WorkUnit title",
          colTitle: "Title",
          colPriority: "Priority",
          colStatus: "Status",
          colDocs: "Linked docs",
          colTasks: "Tasks",
          noRows: "No WorkUnits match these filters.",
          noRowsGuide: "Relax filters or add a new item.",
          statusNew: "New",
          statusActive: "Active",
          statusWaiting: "Waiting",
          statusDone: "Done",
          statusArchived: "Archived",
          priorityHigh: "High",
          priorityMedium: "Medium",
          priorityLow: "Low",
          roi: "ROI",
        }

  const statusLabels: Record<WorkUnitStatus, string> = {
    New: labels.statusNew,
    Active: labels.statusActive,
    Waiting: labels.statusWaiting,
    Done: labels.statusDone,
    Archived: labels.statusArchived,
  }

  const matchesView = (wu: WorkUnit, view: WorkUnitBoardView) => {
    if (view === "current") {
      return wu.status === "Active" || wu.status === "Waiting"
    }

    if (view === "next") {
      return wu.status === "New"
    }

    if (view === "backlog") {
      return wu.status === "New" || wu.status === "Waiting"
    }

    if (view === "roadmap") {
      return wu.status === "Waiting" || wu.status === "Archived"
    }

    if (view === "review") {
      return wu.status === "Done"
    }

    return wu.actors.some((actor) => actor.toLowerCase().includes(assigneeAlias))
  }

  const visibleWorkUnits = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const tokens = query ? query.split(/\s+/).filter(Boolean) : []
    const assigneeToken = tokens.find((token) => token.startsWith("assignee:"))
    const freeTextTokens = tokens.filter((token) => !token.startsWith("assignee:"))

    return workUnits
      .filter((wu) => matchesView(wu, activeView))
      .filter((wu) => statusFilter === "all" || wu.status === statusFilter)
      .filter((wu) => {
        if (!assigneeToken) {
          return true
        }

        const rawValue = assigneeToken.slice("assignee:".length).replace("@", "")
        const target = rawValue === "me" ? assigneeAlias : rawValue
        if (!target) {
          return true
        }

        return wu.actors.some((actor) => actor.toLowerCase().includes(target))
      })
      .filter((wu) => {
        if (freeTextTokens.length === 0) {
          return true
        }

        const searchable = [
          wu.title,
          wu.problem,
          wu.situation,
          wu.deadline,
          ...wu.actors,
          ...wu.sources,
        ]
          .join(" ")
          .toLowerCase()

        return freeTextTokens.every((token) => searchable.includes(token))
      })
      .slice()
      .sort((left, right) => calcROI(right) - calcROI(left) || left.rank - right.rank)
  }, [activeView, searchQuery, statusFilter, workUnits])

  const viewTabs: Array<{ id: WorkUnitBoardView; label: string }> = [
    { id: "current", label: labels.current },
    { id: "next", label: labels.next },
    { id: "backlog", label: labels.backlog },
    { id: "roadmap", label: labels.roadmap },
    { id: "review", label: labels.review },
    { id: "mine", label: labels.mine },
  ]

  const selectedWorkUnit =
    visibleWorkUnits.find((wu) => wu.id === selectedWorkUnitId) ?? undefined
  const maxROI = workUnits.reduce((max, wu) => Math.max(max, calcROI(wu)), 0)

  useEffect(() => {
    if (visibleWorkUnits.length === 0) {
      return
    }

    const selectedVisible = visibleWorkUnits.some((wu) => wu.id === selectedWorkUnitId)
    if (!selectedVisible) {
      onSelectWorkUnit(visibleWorkUnits[0].id)
    }
  }, [onSelectWorkUnit, selectedWorkUnitId, visibleWorkUnits])

  const handleSelectView = (view: WorkUnitBoardView) => {
    setActiveView(view)

    if (view === "mine" && !searchQuery.toLowerCase().includes("assignee:")) {
      setSearchQuery("assignee:@me")
    }
  }

  const handleCreateItem = () => {
    const trimmedTitle = newItemTitle.trim()
    if (!trimmedTitle) {
      return
    }

    onCreateWorkUnit(trimmedTitle)
    setNewItemTitle("")
    setActiveView("backlog")
    setDisplayMode("table")
  }

  const getPriority = (wu: WorkUnit) => {
    const roi = calcROI(wu)
    if (roi >= 18) {
      return { label: labels.priorityHigh, color: "#FF6A6A" }
    }

    if (roi >= 12) {
      return { label: labels.priorityMedium, color: "#FFB454" }
    }

    return { label: labels.priorityLow, color: colors.accent }
  }

  return (
    <section
      style={{ ...styles.column, ...styles.colPriority }}
      className="ai-editor-column ai-editor-column--workunit"
    >
      <div style={styles.colHeader}>
        <span style={styles.colIcon}>▤</span>
        <span style={styles.colTitle}>{labels.title}</span>
        <span style={styles.colSubtitle}>{labels.subtitle}</span>
        <button
          type="button"
          onClick={() =>
            setDisplayMode((prev) => (prev === "table" ? "cards" : "table"))
          }
          style={styles.colHeaderAction}
          title={displayMode === "table" ? labels.cards : labels.table}
        >
          {displayMode === "table" ? labels.cards : labels.table}
        </button>
      </div>

      <div style={styles.wuBoardViews}>
        {viewTabs.map((tab) => {
          const count = workUnits.filter((wu) => matchesView(wu, tab.id)).length
          const active = tab.id === activeView

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleSelectView(tab.id)}
              style={{
                ...styles.wuBoardViewBtn,
                ...(active ? styles.wuBoardViewBtnActive : {}),
              }}
            >
              <span>{tab.label}</span>
              <span style={styles.wuBoardViewCount}>{count}</span>
            </button>
          )
        })}
      </div>

      <div style={styles.wuFilterBar}>
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={labels.search}
          style={styles.wuFilterInput}
        />
      </div>

      <div style={styles.wuStatusFilters}>
        <button
          type="button"
          onClick={() => setStatusFilter("all")}
          style={{
            ...styles.wuStatusChip,
            ...(statusFilter === "all" ? styles.wuStatusChipActive : {}),
          }}
        >
          {labels.allStatus}
        </button>
        {statusOrder.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            style={{
              ...styles.wuStatusChip,
              ...(statusFilter === status ? styles.wuStatusChipActive : {}),
            }}
          >
            {statusLabels[status]}
          </button>
        ))}
      </div>

      {displayMode === "table" ? (
        <div style={styles.wuTableWrap}>
          <table style={styles.wuTable}>
            <thead>
              <tr>
                <th style={{ ...styles.wuTableHeadCell, ...styles.wuTableTitleCol }}>
                  {labels.colTitle}
                </th>
                <th style={styles.wuTableHeadCell}>{labels.colPriority}</th>
                <th style={styles.wuTableHeadCell}>{labels.colStatus}</th>
                <th style={styles.wuTableHeadCell}>{labels.colDocs}</th>
                <th style={styles.wuTableHeadCell}>{labels.colTasks}</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td colSpan={5} style={styles.wuTableAddCell}>
                  <div style={styles.wuTableAddRow}>
                    <span style={styles.wuTableAddPrefix}>＋</span>
                    <input
                      type="text"
                      value={newItemTitle}
                      onChange={(event) => setNewItemTitle(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault()
                          handleCreateItem()
                        }
                      }}
                      placeholder={labels.addPlaceholder}
                      style={styles.wuTableAddInput}
                    />
                    <button
                      type="button"
                      onClick={handleCreateItem}
                      style={styles.wuTableAddBtn}
                    >
                      {labels.addItem}
                    </button>
                  </div>
                </td>
              </tr>

              {visibleWorkUnits.map((wu) => {
                const selected = wu.id === selectedWorkUnitId
                const roi = calcROI(wu)
                const priority = getPriority(wu)
                const taskDone = wu.tasks.filter((task) => task.done).length

                return (
                  <tr
                    key={wu.id}
                    onClick={() => onSelectWorkUnit(wu.id)}
                    style={{
                      ...styles.wuTableRow,
                      ...(selected ? styles.wuTableRowActive : {}),
                    }}
                  >
                    <td style={{ ...styles.wuTableCell, ...styles.wuTableTitleCol }}>
                      <div style={styles.wuTableTitle}>{wu.title}</div>
                      <div style={styles.wuTableSub}>{wu.problem}</div>
                    </td>
                    <td style={styles.wuTableCell}>
                      <span
                        style={{
                          ...styles.wuPriorityPill,
                          color: priority.color,
                          borderColor: priority.color,
                          background: `color-mix(in srgb, ${priority.color} 14%, transparent)`,
                        }}
                      >
                        {priority.label}
                      </span>
                      <div style={styles.wuTableSub}>
                        {labels.roi} {roi.toFixed(1)}
                      </div>
                    </td>
                    <td style={styles.wuTableCell}>{statusLabels[wu.status]}</td>
                    <td style={styles.wuTableCell}>
                      {linkedDocCountByWorkUnit[wu.id] ?? 0}
                    </td>
                    <td style={styles.wuTableCell}>
                      {taskDone}/{wu.tasks.length}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {visibleWorkUnits.length === 0 ? (
            <div style={styles.wuFilterEmpty}>
              <div style={styles.emptyStateTitle}>{labels.noRows}</div>
              <div style={styles.emptyStateBody}>{labels.noRowsGuide}</div>
            </div>
          ) : null}
        </div>
      ) : (
        <div style={styles.wuList}>
          {visibleWorkUnits.map((wu) => (
            <WorkUnitCard
              key={wu.id}
              wu={wu}
              selected={wu.id === selectedWorkUnitId}
              onSelect={onSelectWorkUnit}
            />
          ))}

          {visibleWorkUnits.length === 0 ? (
            <div style={styles.wuFilterEmpty}>
              <div style={styles.emptyStateTitle}>{labels.noRows}</div>
              <div style={styles.emptyStateBody}>{labels.noRowsGuide}</div>
            </div>
          ) : null}
        </div>
      )}

      <WorkUnitDetail
        key={selectedWorkUnit?.id ?? "empty"}
        workUnit={selectedWorkUnit}
        onToggleTask={onToggleTask}
        onUpdateStatus={onUpdateStatus}
        maxROI={maxROI}
        onLogDecision={onLogDecision}
      />
    </section>
  )
}
