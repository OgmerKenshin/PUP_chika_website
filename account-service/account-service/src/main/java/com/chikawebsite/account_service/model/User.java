package com.chikawebsite.account_service.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "users") // 'user' is a reserved keyword in some SQL dialects, 'users' is safer
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; // This is your Unique ID

    @Column(nullable = false)
    private String name;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String password; // Stored as a BCrypt hash, never plaintext

    @Column(nullable = false)
    @Builder.Default
    private String role = "ROLE_USER";
}
