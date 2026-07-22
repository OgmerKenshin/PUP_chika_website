package com.chikawebsite.account_service.post;

import jakarta.validation.constraints.NotNull;

public record VoteRequest(
        @NotNull(message = "type is required and must be UPVOTE or DOWNVOTE")
        VoteType type
) {
}
