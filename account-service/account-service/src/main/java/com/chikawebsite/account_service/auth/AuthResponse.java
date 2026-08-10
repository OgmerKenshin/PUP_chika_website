package com.chikawebsite.account_service.auth;

public record AuthResponse(
        String message,
        String token,
        Long userId,
        String name,
        String email,
        String role
) {
        public AuthResponse(String message, String token, Long userId, String name, String email) {
                this(message, token, userId, name, email, "USER");
        }
}
