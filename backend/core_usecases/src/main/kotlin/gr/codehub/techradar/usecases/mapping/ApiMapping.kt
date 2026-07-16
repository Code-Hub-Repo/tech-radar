package gr.codehub.techradar.usecases.mapping

import gr.codehub.techradar.api.EntryResponse
import gr.codehub.techradar.api.HistoryResponse
import gr.codehub.techradar.api.ProposalResponse
import gr.codehub.techradar.db.model.HistoryRow
import gr.codehub.techradar.db.model.Proposal
import gr.codehub.techradar.usecases.model.EntryWithMovement

fun EntryWithMovement.toEntryResponse(): EntryResponse = EntryResponse(
    id = entry.id,
    name = entry.name,
    quadrant = entry.quadrant,
    ring = entry.ring,
    description = entry.description,
    isNew = entry.isNew,
    movement = movement,
    createdAt = entry.createdAt,
    updatedAt = entry.updatedAt,
)

fun HistoryRow.toHistoryResponse(): HistoryResponse = HistoryResponse(
    id = id,
    entryId = entryId,
    name = name,
    quadrant = quadrant,
    ring = ring,
    description = description,
    isNew = isNew,
    changeType = changeType,
    changedAt = changedAt,
)

fun Proposal.toProposalResponse(): ProposalResponse = ProposalResponse(
    id = id,
    name = name,
    quadrant = quadrant,
    ring = ring,
    description = description,
    submitterName = submitterName,
    status = status,
    entryId = entryId,
    createdAt = createdAt,
    reviewedAt = reviewedAt,
)
