package com.chikawebsite.account_service.dto;

import java.time.Instant;

public record PostResponse(
        Long id,
        String title,
        String content,
        Long authorId,
        String authorName,
        int voteCount,
        Instant createdAt
) {
}
