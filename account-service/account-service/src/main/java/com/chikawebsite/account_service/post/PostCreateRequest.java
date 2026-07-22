package com.chikawebsite.account_service.post;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PostCreateRequest(
        @NotBlank(message = "title is required")
        @Size(max = 255, message = "title must be at most 255 characters")
        String title,

        @NotBlank(message = "content is required")
        @Size(max = 10000, message = "content must be at most 10000 characters")
        String content
) {
}
