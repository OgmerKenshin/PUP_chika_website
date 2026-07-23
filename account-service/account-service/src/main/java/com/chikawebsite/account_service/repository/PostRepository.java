package com.chikawebsite.account_service.repository;

import com.chikawebsite.account_service.model.Post;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PostRepository extends JpaRepository<Post, Long> {

    // Fetch the author in the same query so mapping the feed doesn't
    // trigger one extra SELECT per post.
    @EntityGraph(attributePaths = "author")
    List<Post> findAllByOrderByCreatedAtDesc();

    @EntityGraph(attributePaths = "author")
    Optional<Post> findWithAuthorById(Long id);
}
