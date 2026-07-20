package com.chikawebsite.account_service.controller;

import com.chikawebsite.account_service.dto.AuthResponse;
import com.chikawebsite.account_service.dto.LoginRequest;
import com.chikawebsite.account_service.dto.SignupRequest;
import com.chikawebsite.account_service.service.AuthService;
import com.chikawebsite.account_service.service.TokenService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final String BEARER_PREFIX = "Bearer ";

    private final AuthService authService;
    private final TokenService tokenService;

    public AuthController(AuthService authService, TokenService tokenService) {
        this.authService = authService;
        this.tokenService = tokenService;
    }

    @PostMapping("/signup")
    public ResponseEntity<AuthResponse> signup(@Valid @RequestBody SignupRequest request) {
        AuthResponse response = authService.signup(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    /** Invalidates the presented bearer token. Idempotent: unknown tokens are a no-op. */
    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
        if (authorization != null && authorization.startsWith(BEARER_PREFIX)) {
            tokenService.invalidate(authorization.substring(BEARER_PREFIX.length()).trim());
        }
        return ResponseEntity.ok(Map.of("message", "Logged out"));
    }
}
