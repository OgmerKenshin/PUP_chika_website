package com.chikawebsite.account_service.dto;

public record ProfileResponse(
        Long userId,
        String name,
        String email,
        String bio,
        String profilePictureUrl,
        String location
) {
}
