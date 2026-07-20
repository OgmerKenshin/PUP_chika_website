package com.chikawebsite.account_service.service;

import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * Very small in-memory bearer-token store. Issues an opaque token on login and
 * resolves it back to the owning user's email. This is a mock session mechanism
 * suitable for local development / testing (tokens are lost on restart).
 */
@Service
public class TokenService {

    private final ConcurrentMap<String, String> tokenToEmail = new ConcurrentHashMap<>();

    public String generateToken(String email) {
        String token = UUID.randomUUID().toString().replace("-", "");
        tokenToEmail.put(token, email);
        return token;
    }

    public Optional<String> resolveEmail(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        return Optional.ofNullable(tokenToEmail.get(token));
    }

    public void invalidate(String token) {
        tokenToEmail.remove(token);
    }
}
