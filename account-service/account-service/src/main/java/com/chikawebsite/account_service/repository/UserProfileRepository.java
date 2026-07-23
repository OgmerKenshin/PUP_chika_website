package com.chikawebsite.account_service.repository;

import com.chikawebsite.account_service.model.User;
import com.chikawebsite.account_service.model.UserProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserProfileRepository extends JpaRepository<UserProfile, Long> {
    Optional<UserProfile> findByUser(User user);
}
