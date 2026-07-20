package com.chikawebsite.account_service.exception;

/** Thrown when an authenticated user attempts an action they don't own. */
public class ForbiddenOperationException extends RuntimeException {
    public ForbiddenOperationException(String message) {
        super(message);
    }
}
