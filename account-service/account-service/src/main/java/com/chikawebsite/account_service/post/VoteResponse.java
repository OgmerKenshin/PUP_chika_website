package com.chikawebsite.account_service.post;

public record VoteResponse(
        Long postId,
        int voteCount,
        String currentUserVote
) {
}
