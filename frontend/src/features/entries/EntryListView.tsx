import type { Entry, FilterState } from '../../api/types'
import { quadrantLabel, ringLabel } from '../../api/types'
import { Skeleton } from '../../components/Skeleton'
import { groupedEntries } from '../../lib/entryOrder'
import { EntryListRow } from './EntryListRow'

interface EntryListViewProps {
  entries: Entry[]
  /** Accepted but inert until filtering is wired (02-06). */
  filterState: FilterState
  /** Accepted but inert until selection is wired (02-05). */
  selectedEntryId: number | null
  isLoading: boolean
  /** Accepted but inert until selection is wired (02-05). */
  onEntrySelect: (id: number) => void
}

const SKELETON_ROW_COUNT = 6

// Grouped rows (quadrant -> ring -> entries) — the always-present, non-visual twin of the
// radar (EXPL-05). Renders skeleton rows while isLoading; HomePage resolves error/empty
// before this component is ever mounted for those states (State Matrix precedence).
export function EntryListView({ entries, isLoading }: EntryListViewProps) {
  if (isLoading) {
    return (
      <div id="list-view" className="flex flex-col gap-2">
        {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
          <div
            key={index}
            className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-b-0"
          >
            <Skeleton shape="rect" width={24} height={14} />
            <Skeleton shape="rect" width="60%" height={16} />
            <Skeleton shape="rect" width={64} height={24} />
          </div>
        ))}
      </div>
    )
  }

  const quadrantGroups = groupedEntries(entries)

  return (
    <div id="list-view" className="flex flex-col gap-8">
      {quadrantGroups.map((quadrantGroup) => (
        <section key={quadrantGroup.quadrant} className="flex flex-col gap-4">
          <h2 className="font-mono text-[14px] font-semibold uppercase leading-[1.4] tracking-wide text-muted">
            {quadrantLabel[quadrantGroup.quadrant]}
          </h2>
          {quadrantGroup.rings.map((ringGroup) => (
            <div key={ringGroup.ring} className="flex flex-col gap-2">
              <h3 className="font-mono text-[14px] leading-[1.4] text-muted">
                {ringLabel[ringGroup.ring]}
              </h3>
              <ul className="flex flex-col rounded-lg border border-border bg-surface">
                {ringGroup.entries.map(({ entry, number }) => (
                  <EntryListRow key={entry.id} entry={entry} number={number} />
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}
