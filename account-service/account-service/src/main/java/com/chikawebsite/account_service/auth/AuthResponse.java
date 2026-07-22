package com.chikawebsite.account_service.auth;

public record AuthResponse(
        String message,
        String token,
        Long userId,
        String name,
        String email
) {
}
