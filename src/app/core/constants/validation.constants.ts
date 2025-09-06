export const VALIDATION_MESSAGES = {
  // Common validation messages
  REQUIRED: 'This field is required',
  INVALID_FORMAT: 'Invalid format',
  MIN_LENGTH: 'Minimum length is {0}',
  MAX_LENGTH: 'Maximum length is {0}',
  INVALID_EMAIL: 'Invalid email format',
  INVALID_PHONE: 'Phone number must be 10-15 digits',

  // Login specific messages
  LOGIN: {
    EMAIL_REQUIRED: 'Email is required',
    EMAIL_INVALID: 'Invalid email format',
    PHONE_REQUIRED: 'Phone number is required',
    PHONE_INVALID:
      'Phone number must contain only digits and be between 10-15 characters',
    PASSWORD_REQUIRED: 'Password is required',
    PASSWORD_EMPTY: 'Password cannot be empty',
    EITHER_EMAIL_OR_PHONE: 'Either email or phone number is required',
    NOT_BOTH_EMAIL_PHONE:
      'Please provide either email or phone number, not both',
  },

  // Registration specific messages
  REGISTRATION: {
    MIN_LENGTH_USER_NAME: 'User name must be at least 3 characters',
    PROFILE_PICTURE_TYPE: 'Profile picture must be a valid URL',
    INVALID_PHONE: 'Phone number must be 10-15 digits',
    PHONE_REQUIRED: 'Phone number is required',
    EMAIL_REQUIRED: 'Email is required',
    EMAIL_INVALID: 'Email must be a valid email address',
    FIRST_NAME_REQUIRED: 'First name is required',
    LAST_NAME_REQUIRED: 'Last name is required',
    PASSWORD_MIN: 'Password must be at least 6 characters',
    USER_TYPE_REQUIRED: 'User type must be selected',
  },
} as const;
