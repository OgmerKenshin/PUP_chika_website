package com.chikawebsite.account_service.service;

import com.chikawebsite.account_service.dto.AuthResponse;
import com.chikawebsite.account_service.dto.LoginRequest;
import com.chikawebsite.account_service.dto.SignupRequest;
import com.chikawebsite.account_service.exception.EmailAlreadyExistsException;
import com.chikawebsite.account_service.exception.InvalidCredentialsException;
import com.chikawebsite.account_service.model.User;
import com.chikawebsite.account_service.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Core authentication logic: registration with hashed passwords and
 * credential-verified login that issues a bearer token.
 */
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokenService;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       TokenService tokenService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenService = tokenService;
    }

    @Transactional
    public AuthResponse signup(SignupRequest request) {
        String email = request.email().trim().toLowerCase();

        if (userRepository.existsByEmail(email)) {
            throw new EmailAlreadyExistsException("An account with email '" + email + "' already exists");
        }

        User user = User.builder()
                .name(request.name().trim())
                .email(email)
                .password(passwordEncoder.encode(request.password()))
                .role("ROLE_USER")
                .build();

        User saved = userRepository.save(user);

        // Issue a token right away so the client is logged in after signup.
        String token = tokenService.generateToken(saved.getEmail());

        return new AuthResponse(
                "Signup successful",
                token,
                saved.getId(),
                saved.getName(),
                saved.getEmail(),
                saved.getRole() != null ? saved.getRole() : "ROLE_USER"
        );
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String email = request.email().trim().toLowerCase();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new InvalidCredentialsException("Invalid email or password"));

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new InvalidCredentialsException("Invalid email or password");
        }

        String token = tokenService.generateToken(user.getEmail());

        return new AuthResponse(
                "Login successful",
                token,
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole() != null ? user.getRole() : "ROLE_USER"
        );
    }
}
