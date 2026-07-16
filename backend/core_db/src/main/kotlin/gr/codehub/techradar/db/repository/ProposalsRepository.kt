package gr.codehub.techradar.db.repository

import gr.codehub.techradar.constants.ProposalStatus
import gr.codehub.techradar.db.ProposalsTable
import gr.codehub.techradar.db.mapping.toProposal
import gr.codehub.techradar.db.model.NewProposal
import gr.codehub.techradar.db.model.Proposal
import java.time.OffsetDateTime
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.jetbrains.exposed.v1.core.SortOrder
import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.jdbc.Database
import org.jetbrains.exposed.v1.jdbc.insert
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.suspendTransaction
import org.jetbrains.exposed.v1.jdbc.update

class ProposalsRepository(
    private val database: Database,
) {
    suspend fun create(newProposal: NewProposal): Proposal = withContext(Dispatchers.IO) {
        suspendTransaction(db = database) {
            val id = ProposalsTable.insert {
                it[name] = newProposal.name
                it[quadrant] = newProposal.quadrant.apiName
                it[ring] = newProposal.ring.apiName
                it[description] = newProposal.description
                it[submitterName] = newProposal.submitterName
                it[status] = ProposalStatus.PENDING.apiName
            } get ProposalsTable.id

            ProposalsTable.selectAll()
                .where { ProposalsTable.id eq id }
                .single()
                .toProposal()
        }
    }

    // status == null -> unfiltered (CONTEXT.md: "no status param -> all"), always newest-first.
    suspend fun findAll(status: ProposalStatus?): List<Proposal> = withContext(Dispatchers.IO) {
        suspendTransaction(db = database) {
            val query = if (status != null) {
                ProposalsTable.selectAll().where { ProposalsTable.status eq status.apiName }
            } else {
                ProposalsTable.selectAll()
            }
            query.orderBy(ProposalsTable.createdAt, SortOrder.DESC)
                .map { it.toProposal() }
        }
    }

    suspend fun findById(id: Int): Proposal? = withContext(Dispatchers.IO) {
        suspendTransaction(db = database) {
            ProposalsTable.selectAll()
                .where { ProposalsTable.id eq id }
                .singleOrNull()
                ?.toProposal()
        }
    }

    // Conditional UPDATE on status = PENDING — the double-review guard lives in the WHERE clause
    // itself, not just an earlier read-then-check in the UseCase. Returns null when 0 rows matched
    // (already reviewed between the UseCase's own findById check and this call), same "null means
    // caller maps to an error" convention as EntriesRepository.update.
    suspend fun markApproved(id: Int, entryId: Int): Proposal? = withContext(Dispatchers.IO) {
        suspendTransaction(db = database) {
            val updatedRows = ProposalsTable.update({
                (ProposalsTable.id eq id) and (ProposalsTable.status eq ProposalStatus.PENDING.apiName)
            }) {
                it[status] = ProposalStatus.APPROVED.apiName
                it[ProposalsTable.entryId] = entryId
                it[reviewedAt] = OffsetDateTime.now()
            }

            if (updatedRows == 0) {
                return@suspendTransaction null
            }

            ProposalsTable.selectAll()
                .where { ProposalsTable.id eq id }
                .single()
                .toProposal()
        }
    }

    suspend fun markRejected(id: Int): Proposal? = withContext(Dispatchers.IO) {
        suspendTransaction(db = database) {
            val updatedRows = ProposalsTable.update({
                (ProposalsTable.id eq id) and (ProposalsTable.status eq ProposalStatus.PENDING.apiName)
            }) {
                it[status] = ProposalStatus.REJECTED.apiName
                it[reviewedAt] = OffsetDateTime.now()
            }

            if (updatedRows == 0) {
                return@suspendTransaction null
            }

            ProposalsTable.selectAll()
                .where { ProposalsTable.id eq id }
                .single()
                .toProposal()
        }
    }
}
