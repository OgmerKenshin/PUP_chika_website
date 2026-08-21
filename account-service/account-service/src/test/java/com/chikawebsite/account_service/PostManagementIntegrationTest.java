package com.chikawebsite.account_service;

import com.chikawebsite.account_service.auth.AuthResponse;
import com.chikawebsite.account_service.auth.LoginRequest;
import com.chikawebsite.account_service.auth.SignupRequest;
import com.chikawebsite.account_service.common.User;
import com.chikawebsite.account_service.common.UserRepository;
import com.chikawebsite.account_service.post.PostCreateRequest;
import com.chikawebsite.account_service.post.PostRepository;
import com.chikawebsite.account_service.post.PostResponse;
import com.chikawebsite.account_service.post.VoteRepository;
import com.chikawebsite.account_service.profile.UserProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Covers the post-management and session endpoints added on top of the original
 * feed/vote API: single-post read, author-only delete (with vote cleanup),
 * logout invalidation, signup auto-login, and structured 400 bodies.
 */
@SpringBootTest
@AutoConfigureMockMvc
class PostManagementIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private UserProfileRepository userProfileRepository;
    @Autowired private PostRepository postRepository;
    @Autowired private VoteRepository voteRepository;

    @BeforeEach
    void clean() {
        // Delete in FK-safe order: votes/posts/profiles reference users.
        voteRepository.deleteAll();
        postRepository.deleteAll();
        userProfileRepository.deleteAll();
        userRepository.deleteAll();
    }

    // ---------- SINGLE POST READ ----------

    @Test
    void getSinglePost_isPublicAndReturnsPost() throws Exception {
        String token = registerAndLogin("Ada", "ada@example.com", "secret123");
        long postId = createPost(token, "Hello", "First post");

        mockMvc.perform(get("/api/posts/" + postId)) // no auth header on purpose
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Hello"))
                .andExpect(jsonPath("$.authorName").value("Ada"));
    }

    @Test
    void getSinglePost_missing_returns404() throws Exception {
        mockMvc.perform(get("/api/posts/999999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void getSinglePost_nonNumericId_returns400WithBody() throws Exception {
        mockMvc.perform(get("/api/posts/abc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    // ---------- DELETE POST ----------

    @Test
    void deletePost_byAuthor_removesPostAndVotes() throws Exception {
        String author = registerAndLogin("Ada", "ada@example.com", "secret123");
        String voter = registerAndLogin("Grace", "grace@example.com", "secret123");
        long postId = createPost(author, "Doomed", "Will be deleted");

        mockMvc.perform(post("/api/posts/" + postId + "/vote")
                        .header("Authorization", "Bearer " + voter)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"UPVOTE\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/api/posts/" + postId)
                        .header("Authorization", "Bearer " + author))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/posts/" + postId))
                .andExpect(status().isNotFound());
        assertEquals(0, voteRepository.count());
    }

    @Test
    void deletePost_byNonAuthor_returns403AndKeepsPost() throws Exception {
        String author = registerAndLogin("Ada", "ada@example.com", "secret123");
        String other = registerAndLogin("Grace", "grace@example.com", "secret123");
        long postId = createPost(author, "Mine", "Hands off");

        mockMvc.perform(delete("/api/posts/" + postId)
                        .header("Authorization", "Bearer " + other))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/posts/" + postId))
                .andExpect(status().isOk());
    }

    @Test
    void deletePost_byAdmin_removesPost() throws Exception {
        String author = registerAndLogin("Ada", "ada@example.com", "secret123");
        String adminToken = registerAndLogin("Admin User", "admin@example.com", "secret123");
        
        // Grant admin role
        User adminUser = userRepository.findByEmail("admin@example.com").orElseThrow();
        adminUser.setRole("ROLE_ADMIN");
        userRepository.save(adminUser);

        long postId = createPost(author, "Flagged", "Needs removal");

        mockMvc.perform(delete("/api/posts/" + postId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/posts/" + postId))
                .andExpect(status().isNotFound());
    }

    @Test
    void deletePost_withoutToken_returns401() throws Exception {
        String author = registerAndLogin("Ada", "ada@example.com", "secret123");
        long postId = createPost(author, "Mine", "Hands off");

        mockMvc.perform(delete("/api/posts/" + postId))
                .andExpect(status().isUnauthorized());
    }

    // ---------- UPDATE POST ----------

    @Test
    void updatePost_byAuthor_succeeds() throws Exception {
        String author = registerAndLogin("Ada", "ada@example.com", "secret123");
        long postId = createPost(author, "Original Title", "Original Content");

        mockMvc.perform(put("/api/posts/" + postId)
                        .header("Authorization", "Bearer " + author)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new PostCreateRequest("Updated Title", "Updated Content"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Updated Title"))
                .andExpect(jsonPath("$.content").value("Updated Content"));
    }

    @Test
    void updatePost_byNonAuthor_returns403() throws Exception {
        String author = registerAndLogin("Ada", "ada@example.com", "secret123");
        String other = registerAndLogin("Grace", "grace@example.com", "secret123");
        long postId = createPost(author, "Original Title", "Original Content");

        mockMvc.perform(put("/api/posts/" + postId)
                        .header("Authorization", "Bearer " + other)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new PostCreateRequest("Hacked Title", "Hacked Content"))))
                .andExpect(status().isForbidden());
    }

    // ---------- SESSION LIFECYCLE ----------

    @Test
    void signup_issuesUsableToken() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new SignupRequest("Ada", "ada@example.com", "secret123"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andReturn();
        AuthResponse response = 
                objectMapper.readValue(result.getResponse().getContentAsString(), AuthResponse.class);
        String token = response.token();

        mockMvc.perform(get("/api/dashboard/summary")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    void logout_invalidatesToken() throws Exception {
        String token = registerAndLogin("Ada", "ada@example.com", "secret123");

        mockMvc.perform(post("/api/auth/logout")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/dashboard/summary")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    // ---------- STRUCTURED 400s ----------

    @Test
    void invalidVoteEnum_returns400WithStructuredBody() throws Exception {
        String token = registerAndLogin("Ada", "ada@example.com", "secret123");
        long postId = createPost(token, "Hello", "Vote here");

        mockMvc.perform(post("/api/posts/" + postId + "/vote")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"SIDEWAYS\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    void oversizedProfileFields_return400NotServerError() throws Exception {
        String token = registerAndLogin("Ada", "ada@example.com", "secret123");
        String longValue = "x".repeat(300);

        mockMvc.perform(put("/api/users/profile")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"location\":\"" + longValue + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.location").isNotEmpty());
    }

    @Test
    void profileGet_doesNotPersistARow() throws Exception {
        String token = registerAndLogin("Ada", "ada@example.com", "secret123");

        mockMvc.perform(get("/api/users/profile")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        assertEquals(0, userProfileRepository.count());
    }

    // ---------- helpers ----------

    private long createPost(String token, String title, String content) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/posts")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new PostCreateRequest(title, content))))
                .andExpect(status().isCreated())
                .andReturn();
        PostResponse postResponse = 
                objectMapper.readValue(result.getResponse().getContentAsString(), PostResponse.class);
        return postResponse.id();
    }

    private String registerAndLogin(String name, String email, String password) throws Exception {
        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new SignupRequest(name, email, password))))
                .andExpect(status().isCreated());

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new LoginRequest(email, password))))
                .andExpect(status().isOk())
                .andReturn();
        AuthResponse authResponse = 
                objectMapper.readValue(result.getResponse().getContentAsString(), AuthResponse.class);
        return authResponse.token();
    }

    private String json(Object value) {
        return objectMapper.writeValueAsString(value);
    }
}
