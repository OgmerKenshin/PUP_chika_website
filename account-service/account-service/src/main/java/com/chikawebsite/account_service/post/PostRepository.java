package com.chikawebsite.account_service.post;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PostRepository extends JpaRepository<Post, Long> {

    @EntityGraph(attributePaths = "author")
    List<Post> findAllByOrderByCreatedAtDesc();

    @EntityGraph(attributePaths = "author")
    Optional<Post> findWithAuthorById(Long id);
}
