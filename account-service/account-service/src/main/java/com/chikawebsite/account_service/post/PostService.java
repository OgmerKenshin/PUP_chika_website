package com.chikawebsite.account_service.post;

import com.chikawebsite.account_service.common.User;
import com.chikawebsite.account_service.common.exception.ForbiddenOperationException;
import com.chikawebsite.account_service.common.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class PostService {

    private final PostRepository postRepository;
    private final VoteRepository voteRepository;
    private final com.chikawebsite.account_service.profile.UserProfileRepository userProfileRepository;

    public PostService(PostRepository postRepository,
                       VoteRepository voteRepository,
                       com.chikawebsite.account_service.profile.UserProfileRepository userProfileRepository) {
        this.postRepository = postRepository;
        this.voteRepository = voteRepository;
        this.userProfileRepository = userProfileRepository;
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

    @Transactional
    public void delete(User user, Long postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post " + postId + " not found"));
        if (!post.getAuthor().getId().equals(user.getId()) && !"ADMIN".equalsIgnoreCase(user.getRole())) {
            throw new ForbiddenOperationException("Only the author or an admin can delete this post");
        }
        voteRepository.deleteByPostId(postId);
        postRepository.delete(post);
    }

    @Transactional
    public VoteResponse vote(User user, Long postId, VoteType type) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post " + postId + " not found"));

        Optional<Vote> existing = voteRepository.findByUserIdAndPostId(user.getId(), post.getId());
        VoteType current;
        if (existing.isPresent()) {
            Vote vote = existing.get();
            if (vote.getType() == type) {
                voteRepository.delete(vote);
                current = null;
            } else {
                vote.setType(type);
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
        String pfpUrl = userProfileRepository.findByUser(post.getAuthor())
                .map(com.chikawebsite.account_service.profile.UserProfile::getProfilePictureUrl)
                .orElse(null);

        return new PostResponse(
                post.getId(),
                post.getTitle(),
                post.getContent(),
                post.getAuthor().getId(),
                post.getAuthor().getName(),
                pfpUrl,
                post.getVoteCount(),
                post.getCreatedAt());
    }
}
