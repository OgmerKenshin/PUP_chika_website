package com.chikawebsite.account_service.admin;

public record AdminUserResponse(
    Long id,
    String name,
    String email,
    String role,
    String bio,
    String profilePictureUrl,
    String location
) {}
