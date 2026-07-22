package com.chikawebsite.account_service.profile;

import com.chikawebsite.account_service.common.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProfileService {

    private final UserProfileRepository profileRepository;

    public ProfileService(UserProfileRepository profileRepository) {
        this.profileRepository = profileRepository;
    }

    @Transactional(readOnly = true)
    public ProfileResponse getOrCreate(User user) {
        UserProfile profile = profileRepository.findByUser(user)
                .orElseGet(() -> UserProfile.builder().user(user).build());
        return toResponse(user, profile);
    }

    @Transactional
    public ProfileResponse update(User user, ProfileUpdateRequest request) {
        UserProfile profile = resolve(user);
        if (request.bio() != null) {
            profile.setBio(request.bio());
        }
        if (request.location() != null) {
            profile.setLocation(request.location());
        }
        if (request.profilePictureUrl() != null) {
            profile.setProfilePictureUrl(request.profilePictureUrl());
        }
        return toResponse(user, profileRepository.save(profile));
    }

    private UserProfile resolve(User user) {
        return profileRepository.findByUser(user)
                .orElseGet(() -> profileRepository.save(
                        UserProfile.builder().user(user).build()));
    }

    private ProfileResponse toResponse(User user, UserProfile profile) {
        return new ProfileResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                profile.getBio(),
                profile.getProfilePictureUrl(),
                profile.getLocation());
    }
}
