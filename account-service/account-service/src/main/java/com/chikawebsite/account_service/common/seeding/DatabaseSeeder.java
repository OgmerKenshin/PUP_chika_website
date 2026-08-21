package com.chikawebsite.account_service.common.seeding;

import com.chikawebsite.account_service.common.User;
import com.chikawebsite.account_service.common.UserRepository;
import com.chikawebsite.account_service.profile.UserProfile;
import com.chikawebsite.account_service.profile.UserProfileRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DatabaseSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final PasswordEncoder passwordEncoder;

    public DatabaseSeeder(UserRepository userRepository,
                          UserProfileRepository userProfileRepository,
                          PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.userProfileRepository = userProfileRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        seedUser("System Administrator", "admin@iskolar.pup.edu.ph", "admin123", "ROLE_ADMIN");
        seedUser("admin", "admin@example.com", "admin123", "ROLE_ADMIN");
        seedUser("Adrian", "adrian@example.com", "password123", "ROLE_USER");
        seedUser("Kenshin", "kenshin@example.com", "password123", "ROLE_USER");
    }

    private void seedUser(String name, String email, String password, String role) {
        if (!userRepository.existsByEmail(email)) {
            User user = User.builder()
                    .name(name)
                    .email(email)
                    .password(passwordEncoder.encode(password))
                    .role(role)
                    .build();
            User savedUser = userRepository.save(user);

            // Create a matching profile so they are immediately visible on the dashboard and feed
            UserProfile profile = UserProfile.builder()
                    .user(savedUser)
                    .bio("Hello, my name is " + name + "! Welcome to my profile.")
                    .location("PUP Sta. Mesa")
                    .profilePictureUrl("")
                    .build();
            userProfileRepository.save(profile);

            System.out.println("DatabaseSeeder: Seeded " + role + " account - " + name + " (" + email + ")");
        }
    }
}
