package com.chikawebsite.account_service.service;

import com.chikawebsite.account_service.dto.*;
import com.chikawebsite.account_service.exception.ForbiddenOperationException;
import com.chikawebsite.account_service.exception.ResourceNotFoundException;
import com.chikawebsite.account_service.model.*;
import com.chikawebsite.account_service.repository.PostRepository;
import com.chikawebsite.account_service.repository.VoteRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class PostService {

    private final PostRepository postRepository;
    private final VoteRepository voteRepository;

    public PostService(PostRepository postRepository, VoteRepository voteRepository) {
        this.postRepository = postRepository;
        this.voteRepository = voteRepository;
    }

    @Transactional
    public PostResponse create(User author, PostCreateRequest request) {
        Post post = Post.builder()
                .title(request.title())
                .content(request.content())
                .author(author)
                .voteCount(0)
                .build();
        return toResponse(postRepository.save(post));
    }

    @Transactional(readOnly = true)
    public List<PostResponse> listAll() {
        return postRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public PostResponse get(Long postId) {
        return postRepository.findWithAuthorById(postId)
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Post " + postId + " not found"));
    }

    /** Only the author may delete a post; its votes are removed with it. */
    @Transactional
    public void delete(User user, Long postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post " + postId + " not found"));
        if (!post.getAuthor().getId().equals(user.getId())) {
            throw new ForbiddenOperationException("Only the author can delete this post");
        }
        voteRepository.deleteByPostId(postId);
        postRepository.delete(post);
    }

    /**
     * Toggling rules: no existing vote -> add; same type -> remove (toggle off);
     * opposite type -> switch. The post score is recalculated from live counts.
     */
    @Transactional
    public VoteResponse vote(User user, Long postId, VoteType type) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post " + postId + " not found"));

        Optional<Vote> existing = voteRepository.findByUserIdAndPostId(user.getId(), post.getId());
        VoteType current;
        if (existing.isPresent()) {
            Vote vote = existing.get();
            if (vote.getType() == type) {
                voteRepository.delete(vote);   // same vote again -> toggle off
                current = null;
            } else {
                vote.setType(type);            // opposite vote -> switch
                voteRepository.save(vote);
                current = type;
            }
        } else {
            voteRepository.save(Vote.builder().user(user).post(post).type(type).build());
            current = type;
        }

        voteRepository.flush();
        int score = recalculate(post);
        return new VoteResponse(post.getId(), score, current == null ? null : current.name());
    }

    private int recalculate(Post post) {
        long up = voteRepository.countByPostIdAndType(post.getId(), VoteType.UPVOTE);
        long down = voteRepository.countByPostIdAndType(post.getId(), VoteType.DOWNVOTE);
        int score = (int) (up - down);
        post.setVoteCount(score);
        postRepository.save(post);
        return score;
    }

    private PostResponse toResponse(Post post) {
        return new PostResponse(
                post.getId(),
                post.getTitle(),
                post.getContent(),
                post.getAuthor().getId(),
                post.getAuthor().getName(),
                post.getVoteCount(),
                post.getCreatedAt());
    }
}
