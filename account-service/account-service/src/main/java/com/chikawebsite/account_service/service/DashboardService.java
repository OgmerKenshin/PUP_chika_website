package com.chikawebsite.account_service.service;

import com.chikawebsite.account_service.dto.DashboardSummaryResponse;
import com.chikawebsite.account_service.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/**
 * Produces the dashboard summary. {@code totalUsers} is aggregated live from the
 * H2-backed repository; the other counters are representative/mocked metrics.
 */
@Service
public class DashboardService {

    private final UserRepository userRepository;

    public DashboardService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public DashboardSummaryResponse getSummary(String requestedBy) {
        long totalUsers = userRepository.count();

        // Representative derived/mocked metrics for the dashboard widgets.
        long newUsersToday = Math.min(totalUsers, 3);
        long activeSessions = Math.max(1, totalUsers / 2);

        return new DashboardSummaryResponse(
                totalUsers,
                newUsersToday,
                activeSessions,
                requestedBy,
                Instant.now()
        );
    }
}
