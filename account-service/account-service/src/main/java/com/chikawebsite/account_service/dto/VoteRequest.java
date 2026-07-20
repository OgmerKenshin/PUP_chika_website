package com.chikawebsite.account_service.dto;

import com.chikawebsite.account_service.model.VoteType;
import jakarta.validation.constraints.NotNull;

public record VoteRequest(
        @NotNull(message = "type is required and must be UPVOTE or DOWNVOTE")
        VoteType type
) {
}
