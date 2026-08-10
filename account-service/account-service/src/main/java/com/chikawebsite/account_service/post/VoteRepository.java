package com.chikawebsite.account_service.post;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface VoteRepository extends JpaRepository<Vote, Long> {
    Optional<Vote> findByUserIdAndPostId(Long userId, Long postId);

    long countByPostIdAndType(Long postId, VoteType type);

    void deleteByPostId(Long postId);

    void deleteByUserId(Long userId);
}
