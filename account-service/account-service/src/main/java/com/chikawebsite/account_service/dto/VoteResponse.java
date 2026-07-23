package com.chikawebsite.account_service.dto;

/** {@code currentUserVote} is null when the user has no active vote (toggled off). */
public record VoteResponse(
        Long postId,
        int voteCount,
        String currentUserVote
) {
}
