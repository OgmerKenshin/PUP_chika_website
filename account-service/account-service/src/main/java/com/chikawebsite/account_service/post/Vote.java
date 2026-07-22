package com.chikawebsite.account_service.post;

import com.chikawebsite.account_service.common.User;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "votes", uniqueConstraints = @UniqueConstraint(
        name = "uq_vote_user_post", columnNames = {"user_id", "post_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Vote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VoteType type;
}
