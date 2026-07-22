package com.chikawebsite.account_service.profile;

import com.chikawebsite.account_service.common.CurrentUserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserProfileController {

    private final ProfileService profileService;
    private final CurrentUserService currentUserService;

    public UserProfileController(ProfileService profileService, CurrentUserService currentUserService) {
        this.profileService = profileService;
        this.currentUserService = currentUserService;
    }

    @GetMapping("/profile")
    public ResponseEntity<ProfileResponse> getProfile(Authentication authentication) {
        return ResponseEntity.ok(profileService.getOrCreate(currentUserService.require(authentication)));
    }

    @PutMapping("/profile")
    public ResponseEntity<ProfileResponse> updateProfile(Authentication authentication,
                                                         @Valid @RequestBody ProfileUpdateRequest request) {
        return ResponseEntity.ok(profileService.update(currentUserService.require(authentication), request));
    }
}
