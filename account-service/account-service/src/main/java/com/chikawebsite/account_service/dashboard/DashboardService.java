package com.chikawebsite.account_service.dashboard;

import com.chikawebsite.account_service.common.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class DashboardService {

    private final UserRepository userRepository;

    public DashboardService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public DashboardSummaryResponse getSummary(String requestedBy) {
        long totalUsers = userRepository.count();

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
