package com.chikawebsite.account_service.dto;

/**
 * Generic response for auth endpoints. {@code token} is null for signup and
 * populated with a bearer token on successful login.
 */
public record AuthResponse(
        String message,
        String token,
        Long userId,
        String name,
        String email
) {
}
