package com.chikawebsite.account_service;

import com.chikawebsite.account_service.dto.LoginRequest;
import com.chikawebsite.account_service.dto.SignupRequest;
import com.chikawebsite.account_service.model.User;
import com.chikawebsite.account_service.repository.UserRepository;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * End-to-end integration tests that boot the full application context, hit the
 * real (in-memory H2) database, and exercise every endpoint including failure
 * paths.
 */
@SpringBootTest
@AutoConfigureMockMvc
class AuthAndDashboardIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void clean() {
        userRepository.deleteAll();
    }

    private String json(Object value) throws Exception {
        return objectMapper.writeValueAsString(value);
    }

    // ---------- SIGNUP ----------

    @Test
    void signup_succeeds_andHashesPassword() throws Exception {
        SignupRequest request = new SignupRequest("Ada Lovelace", "ada@example.com", "secret123");

        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.message").value("Signup successful"))
                .andExpect(jsonPath("$.email").value("ada@example.com"))
                .andExpect(jsonPath("$.name").value("Ada Lovelace"))
                .andExpect(jsonPath("$.userId").isNumber());

        User stored = userRepository.findByEmail("ada@example.com").orElseThrow();
        assertThat(stored.getPassword()).isNotEqualTo("secret123");
        assertThat(passwordEncoder.matches("secret123", stored.getPassword())).isTrue();
    }

    @Test
    void signup_duplicateEmail_returns409() throws Exception {
        SignupRequest request = new SignupRequest("Ada", "dupe@example.com", "secret123");

        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(request)))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));

        assertThat(userRepository.count()).isEqualTo(1);
    }

    @Test
    void signup_invalidInput_returns400() throws Exception {
        // blank name, malformed email, too-short password
        SignupRequest request = new SignupRequest("", "not-an-email", "123");

        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.name").exists())
                .andExpect(jsonPath("$.errors.email").exists())
                .andExpect(jsonPath("$.errors.password").exists());

        assertThat(userRepository.count()).isZero();
    }

    // ---------- LOGIN ----------

    @Test
    void login_succeeds_returnsToken() throws Exception {
        signup("Grace Hopper", "grace@example.com", "password1");

        LoginRequest request = new LoginRequest("grace@example.com", "password1");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Login successful"))
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.email").value("grace@example.com"));
    }

    @Test
    void login_wrongPassword_returns401() throws Exception {
        signup("Grace", "grace2@example.com", "password1");

        LoginRequest request = new LoginRequest("grace2@example.com", "wrong-password");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void login_unknownEmail_returns401() throws Exception {
        LoginRequest request = new LoginRequest("nobody@example.com", "password1");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(request)))
                .andExpect(status().isUnauthorized());
    }

    // ---------- DASHBOARD ----------

    @Test
    void dashboard_withoutToken_returns401() throws Exception {
        mockMvc.perform(get("/api/dashboard/summary"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void dashboard_withInvalidToken_returns401() throws Exception {
        mockMvc.perform(get("/api/dashboard/summary")
                        .header("Authorization", "Bearer totally-made-up-token"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void dashboard_withValidToken_returnsAggregatedSummary() throws Exception {
        signup("User One", "u1@example.com", "password1");
        signup("User Two", "u2@example.com", "password1");

        String token = loginAndGetToken("u1@example.com", "password1");

        mockMvc.perform(get("/api/dashboard/summary")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalUsers").value(2))
                .andExpect(jsonPath("$.requestedBy").value("u1@example.com"))
                .andExpect(jsonPath("$.generatedAt").isNotEmpty());
    }

    // ---------- helpers ----------

    private void signup(String name, String email, String password) throws Exception {
        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new SignupRequest(name, email, password))))
                .andExpect(status().isCreated());
    }

    private String loginAndGetToken(String email, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new LoginRequest(email, password))))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
        return body.get("token").asText();
    }
}
