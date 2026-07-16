package gr.codehub.techradar.db.mapping

import gr.codehub.techradar.constants.ChangeType
import gr.codehub.techradar.constants.ProposalStatus
import gr.codehub.techradar.constants.Quadrant
import gr.codehub.techradar.constants.Ring
import gr.codehub.techradar.db.EntriesTable
import gr.codehub.techradar.db.EntryHistoryTable
import gr.codehub.techradar.db.ProposalsTable
import gr.codehub.techradar.db.model.Entry
import gr.codehub.techradar.db.model.HistoryRow
import gr.codehub.techradar.db.model.Proposal
import kotlin.time.toKotlinInstant
import org.jetbrains.exposed.v1.core.ResultRow

internal fun ResultRow.toEntry(): Entry = Entry(
    id = this[EntriesTable.id],
    name = this[EntriesTable.name],
    quadrant = Quadrant.fromApiName(this[EntriesTable.quadrant]),
    ring = Ring.fromApiName(this[EntriesTable.ring]),
    description = this[EntriesTable.description],
    isNew = this[EntriesTable.isNew],
    createdAt = this[EntriesTable.createdAt].toInstant().toKotlinInstant(),
    updatedAt = this[EntriesTable.updatedAt].toInstant().toKotlinInstant(),
)

internal fun ResultRow.toHistoryRow(): HistoryRow = HistoryRow(
    id = this[EntryHistoryTable.id],
    entryId = this[EntryHistoryTable.entryId],
    name = this[EntryHistoryTable.name],
    quadrant = Quadrant.fromApiName(this[EntryHistoryTable.quadrant]),
    ring = Ring.fromApiName(this[EntryHistoryTable.ring]),
    description = this[EntryHistoryTable.description],
    isNew = this[EntryHistoryTable.isNew],
    changeType = ChangeType.valueOf(this[EntryHistoryTable.changeType]),
    changedAt = this[EntryHistoryTable.changedAt].toInstant().toKotlinInstant(),
)

internal fun ResultRow.toProposal(): Proposal = Proposal(
    id = this[ProposalsTable.id],
    name = this[ProposalsTable.name],
    quadrant = Quadrant.fromApiName(this[ProposalsTable.quadrant]),
    ring = Ring.fromApiName(this[ProposalsTable.ring]),
    description = this[ProposalsTable.description],
    submitterName = this[ProposalsTable.submitterName],
    status = ProposalStatus.fromApiName(this[ProposalsTable.status]),
    entryId = this[ProposalsTable.entryId],
    createdAt = this[ProposalsTable.createdAt].toInstant().toKotlinInstant(),
    reviewedAt = this[ProposalsTable.reviewedAt]?.toInstant()?.toKotlinInstant(),
)
