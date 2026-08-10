package com.chikawebsite.account_service.profile;

import jakarta.validation.constraints.Size;

public record ProfileUpdateRequest(
        @Size(max = 500, message = "bio must be at most 500 characters")
        String bio,

        @Size(max = 255, message = "profilePictureUrl must be at most 255 characters")
        String profilePictureUrl,

        @Size(max = 255, message = "location must be at most 255 characters")
        String location
) {
}
