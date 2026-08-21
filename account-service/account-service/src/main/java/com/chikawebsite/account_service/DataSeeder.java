package com.chikawebsite.account_service;

import com.chikawebsite.account_service.model.User;
import com.chikawebsite.account_service.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        String adminEmail = "admin@iskolar.pup.edu.ph";
        userRepository.findByEmail(adminEmail).ifPresentOrElse(
                user -> {
                    if (!"ROLE_ADMIN".equals(user.getRole())) {
                        user.setRole("ROLE_ADMIN");
                        userRepository.save(user);
                    }
                },
                () -> {
                    User admin = User.builder()
                            .name("System Administrator")
                            .email(adminEmail)
                            .password(passwordEncoder.encode("admin123"))
                            .role("ROLE_ADMIN")
                            .build();
                    userRepository.save(admin);
                }
        );
    }
}