export interface ValidationResult {
  success: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  path: (string | number)[];
  message: string;
  code: string;
}

export class ValidationErrorException extends Error {
  constructor(
    public errors: ValidationError[],
    message: string = 'Validation failed'
  ) {
    super(message);
    this.name = 'ValidationErrorException';
  }
}
