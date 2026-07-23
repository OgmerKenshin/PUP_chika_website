package com.chikawebsite.account_service.exception;

/**
 * Thrown when login credentials do not match any stored user.
 */
public class InvalidCredentialsException extends RuntimeException {
    public InvalidCredentialsException(String message) {
        super(message);
    }
}
