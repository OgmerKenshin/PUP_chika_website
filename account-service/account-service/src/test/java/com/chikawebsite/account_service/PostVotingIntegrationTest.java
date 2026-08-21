package com.chikawebsite.account_service;

import com.chikawebsite.account_service.auth.AuthResponse;
import com.chikawebsite.account_service.auth.LoginRequest;
import com.chikawebsite.account_service.auth.SignupRequest;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class PostVotingIntegrationTest {

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

    // ---------- PROFILE ----------

    @Test
    void profile_getThenUpdate_reflectsChanges() throws Exception {
        String token = registerAndLogin("Ada", "ada@example.com", "secret123");

        mockMvc.perform(get("/api/users/profile").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("ada@example.com"))
                .andExpect(jsonPath("$.bio").doesNotExist());

        mockMvc.perform(put("/api/users/profile")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bio\":\"Countess of computing\",\"location\":\"London\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bio").value("Countess of computing"))
                .andExpect(jsonPath("$.location").value("London"));
    }

    // ---------- POST CREATION ----------

    @Test
    void createPost_linksToAuthenticatedUser() throws Exception {
        String token = registerAndLogin("Grace", "grace@example.com", "secret123");

        long postId = createPost(token, "Hello", "First post");

        mockMvc.perform(get("/api/posts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value((int) postId))
                .andExpect(jsonPath("$[0].authorName").value("Grace"))
                .andExpect(jsonPath("$[0].voteCount").value(0));
    }

    @Test
    void createPost_withoutToken_returns401() throws Exception {
        mockMvc.perform(post("/api/posts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new PostCreateRequest("Nope", "no auth"))))
                .andExpect(status().isUnauthorized());
    }

    // ---------- VOTING ----------

    @Test
    void upvote_thenSwitchToDownvote_thenToggleOff() throws Exception {
        String token = registerAndLogin("Voter", "voter@example.com", "secret123");
        long postId = createPost(token, "Vote me", "content");

        // Upvote -> +1
        vote(token, postId, "UPVOTE")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.voteCount").value(1))
                .andExpect(jsonPath("$.currentUserVote").value("UPVOTE"));

        // Switch to downvote -> -1
        vote(token, postId, "DOWNVOTE")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.voteCount").value(-1))
                .andExpect(jsonPath("$.currentUserVote").value("DOWNVOTE"));

        // Same way again -> toggle off -> 0
        vote(token, postId, "DOWNVOTE")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.voteCount").value(0))
                .andExpect(jsonPath("$.currentUserVote").doesNotExist());

        // Only one vote row ever existed, now removed
        org.assertj.core.api.Assertions.assertThat(voteRepository.count()).isZero();
    }

    @Test
    void upvoteToggleOff_returnsToZero() throws Exception {
        String token = registerAndLogin("Solo", "solo@example.com", "secret123");
        long postId = createPost(token, "Toggle", "content");

        vote(token, postId, "UPVOTE").andExpect(jsonPath("$.voteCount").value(1));
        org.assertj.core.api.Assertions.assertThat(voteRepository.count())
                .as("vote row committed and visible to test thread after first vote")
                .isEqualTo(1);
        vote(token, postId, "UPVOTE")
                .andExpect(jsonPath("$.voteCount").value(0))
                .andExpect(jsonPath("$.currentUserVote").doesNotExist());
    }

    @Test
    void multipleUsersUpvote_scoreAccumulates() throws Exception {
        String author = registerAndLogin("Author", "author@example.com", "secret123");
        long postId = createPost(author, "Popular", "content");

        String voter2 = registerAndLogin("Bob", "bob@example.com", "secret123");

        vote(author, postId, "UPVOTE").andExpect(jsonPath("$.voteCount").value(1));
        vote(voter2, postId, "UPVOTE").andExpect(jsonPath("$.voteCount").value(2));
    }

    @Test
    void vote_withoutToken_returns401() throws Exception {
        String token = registerAndLogin("Owner", "owner@example.com", "secret123");
        long postId = createPost(token, "Guarded", "content");

        mockMvc.perform(post("/api/posts/" + postId + "/vote")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"UPVOTE\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void vote_onMissingPost_returns404() throws Exception {
        String token = registerAndLogin("Ghost", "ghost@example.com", "secret123");

        mockMvc.perform(post("/api/posts/999999/vote")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"UPVOTE\"}"))
                .andExpect(status().isNotFound());
    }

    // ---------- helpers ----------

    private org.springframework.test.web.servlet.ResultActions vote(String token, long postId, String type)
            throws Exception {
        return mockMvc.perform(post("/api/posts/" + postId + "/vote")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"type\":\"" + type + "\"}"));
    }

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
