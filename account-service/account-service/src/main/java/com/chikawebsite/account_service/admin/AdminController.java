package com.chikawebsite.account_service.admin;

import com.chikawebsite.account_service.common.User;
import com.chikawebsite.account_service.common.UserRepository;
import com.chikawebsite.account_service.common.exception.ResourceNotFoundException;
import com.chikawebsite.account_service.post.Post;
import com.chikawebsite.account_service.post.PostRepository;
import com.chikawebsite.account_service.post.VoteRepository;
import com.chikawebsite.account_service.profile.UserProfile;
import com.chikawebsite.account_service.profile.UserProfileRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final PostRepository postRepository;
    private final VoteRepository voteRepository;

    public AdminController(UserRepository userRepository,
                           UserProfileRepository userProfileRepository,
                           PostRepository postRepository,
                           VoteRepository voteRepository) {
        this.userRepository = userRepository;
        this.userProfileRepository = userProfileRepository;
        this.postRepository = postRepository;
        this.voteRepository = voteRepository;
    }

    @GetMapping("/users")
    @Transactional(readOnly = true)
    public ResponseEntity<List<AdminUserResponse>> listUsers() {
        List<User> users = userRepository.findAll();
        List<AdminUserResponse> response = users.stream().map(u -> {
            UserProfile profile = userProfileRepository.findByUser(u).orElse(null);
            return new AdminUserResponse(
                    u.getId(),
                    u.getName(),
                    u.getEmail(),
                    u.getRole(),
                    profile != null ? profile.getBio() : null,
                    profile != null ? profile.getProfilePictureUrl() : null,
                    profile != null ? profile.getLocation() : null
            );
        }).toList();
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/users/{id}")
    @Transactional
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Delete all votes cast by this user
        voteRepository.deleteByUserId(id);

        // Find all posts created by this user and delete their votes and the posts themselves
        List<Post> posts = postRepository.findAll().stream()
                .filter(p -> p.getAuthor().getId().equals(id))
                .toList();

        for (Post post : posts) {
            voteRepository.deleteByPostId(post.getId());
            postRepository.delete(post);
        }

        // Delete user's profile
        userProfileRepository.findByUser(user).ifPresent(userProfileRepository::delete);

        // Delete the user
        userRepository.delete(user);

        return ResponseEntity.noContent().build();
    }
}
