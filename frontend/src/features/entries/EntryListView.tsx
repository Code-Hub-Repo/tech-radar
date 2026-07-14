import type { Entry, FilterState } from '../../api/types'
import { quadrantLabel, ringLabel } from '../../api/types'
import { Skeleton } from '../../components/Skeleton'
import type { EntryQuadrantGroup } from '../../lib/entryOrder'
import { groupedEntries } from '../../lib/entryOrder'
import { matchedIds } from '../../lib/filtering'
import { EntryListRow } from './EntryListRow'

interface EntryListViewProps {
  entries: Entry[]
  filterState: FilterState
  /** Threaded to each EntryListRow's isSelected — one URL-sourced id, shared with the radar. */
  selectedEntryId: number | null
  isLoading: boolean
  /** Threaded to each EntryListRow's onSelect. */
  onEntrySelect: (id: number) => void
}

const SKELETON_ROW_COUNT = 6

// Numbers/groups are always computed from the FULL entries set first (matching the radar's own
// full-set blip numbering, RADR-06), then filtered down for rendering -- so a visible row's
// number never shifts as filters change, only which rows are visible does. Ring/quadrant
// groups left empty by filtering are dropped, same as groupedEntries' own zero-entry rule.
function filterGroupsToMatched(groups: EntryQuadrantGroup[], matched: Set<number>): EntryQuadrantGroup[] {
  return groups
    .map((quadrantGroup) => ({
      ...quadrantGroup,
      rings: quadrantGroup.rings
        .map((ringGroup) => ({
          ...ringGroup,
          entries: ringGroup.entries.filter(({ entry }) => matched.has(entry.id)),
        }))
        .filter((ringGroup) => ringGroup.entries.length > 0),
    }))
    .filter((quadrantGroup) => quadrantGroup.rings.length > 0)
}

// Grouped rows (quadrant -> ring -> entries) — the always-present, non-visual twin of the
// radar (EXPL-05). Renders skeleton rows while isLoading; HomePage resolves error/empty/
// filtered-to-zero before this component is ever mounted for those states (State Matrix
// precedence) -- rows are filtered to the matched set here (list filters, radar dims).
export function EntryListView({ entries, filterState, selectedEntryId, isLoading, onEntrySelect }: EntryListViewProps) {
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

  const matched = matchedIds(entries, filterState)
  const quadrantGroups = filterGroupsToMatched(groupedEntries(entries), matched)

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
                  <EntryListRow
                    key={entry.id}
                    entry={entry}
                    number={number}
                    isSelected={entry.id === selectedEntryId}
                    onSelect={onEntrySelect}
                  />
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}
