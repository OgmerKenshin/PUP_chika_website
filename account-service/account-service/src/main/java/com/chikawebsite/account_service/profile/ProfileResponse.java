package com.chikawebsite.account_service.profile;

public record ProfileResponse(
        Long userId,
        String name,
        String email,
        String bio,
        String profilePictureUrl,
        String location
) {
}
