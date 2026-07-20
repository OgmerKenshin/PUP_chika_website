package com.chikawebsite.account_service.controller;

import com.chikawebsite.account_service.dto.*;
import com.chikawebsite.account_service.service.CurrentUserService;
import com.chikawebsite.account_service.service.PostService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/posts")
public class PostController {

    private final PostService postService;
    private final CurrentUserService currentUserService;

    public PostController(PostService postService, CurrentUserService currentUserService) {
        this.postService = postService;
        this.currentUserService = currentUserService;
    }

    @PostMapping
    public ResponseEntity<PostResponse> create(Authentication authentication,
                                               @Valid @RequestBody PostCreateRequest request) {
        PostResponse response = postService.create(currentUserService.require(authentication), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<PostResponse>> listAll() {
        return ResponseEntity.ok(postService.listAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<PostResponse> get(@PathVariable Long id) {
        return ResponseEntity.ok(postService.get(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(Authentication authentication, @PathVariable Long id) {
        postService.delete(currentUserService.require(authentication), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/vote")
    public ResponseEntity<VoteResponse> vote(Authentication authentication,
                                             @PathVariable Long id,
                                             @Valid @RequestBody VoteRequest request) {
        VoteResponse response = postService.vote(
                currentUserService.require(authentication), id, request.type());
        return ResponseEntity.ok(response);
    }
}
