package com.chikawebsite.account_service.dto;

import java.time.Instant;

/**
 * Aggregated metrics for GET /api/dashboard/summary.
 * {@code totalUsers} is aggregated live from H2; the remaining fields are
 * representative dashboard metrics.
 */
public record DashboardSummaryResponse(
        long totalUsers,
        long newUsersToday,
        long activeSessions,
        String requestedBy,
        Instant generatedAt
) {
}
