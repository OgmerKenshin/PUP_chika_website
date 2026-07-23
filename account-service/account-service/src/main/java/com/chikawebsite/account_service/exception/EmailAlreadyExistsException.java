package com.chikawebsite.account_service.exception;

/**
 * Thrown when a signup is attempted with an email that already exists.
 */
public class EmailAlreadyExistsException extends RuntimeException {
    public EmailAlreadyExistsException(String message) {
        super(message);
    }
}
