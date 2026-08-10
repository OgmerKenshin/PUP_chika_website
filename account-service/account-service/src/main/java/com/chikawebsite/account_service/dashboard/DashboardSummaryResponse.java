package com.chikawebsite.account_service.dashboard;

import java.time.Instant;

public record DashboardSummaryResponse(
        long totalUsers,
        long newUsersToday,
        long activeSessions,
        String requestedBy,
        Instant generatedAt
) {
}
