package com.chikawebsite.account_service.service;

import com.chikawebsite.account_service.exception.InvalidCredentialsException;
import com.chikawebsite.account_service.model.User;
import com.chikawebsite.account_service.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

/** Resolves the {@link User} backing the bearer-token authentication. */
@Service
public class CurrentUserService {

    private final UserRepository userRepository;

    public CurrentUserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User require(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new InvalidCredentialsException("Authentication required");
        }
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new InvalidCredentialsException("Authenticated user not found"));
    }
}
