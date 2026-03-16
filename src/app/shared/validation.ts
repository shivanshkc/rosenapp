const USERNAME_PATTERN = /^[a-zA-Z0-9_-]+$/;
const MIN_LENGTH = 3;
const MAX_LENGTH = 100;

export function isValidUsername(value: string): boolean {
  return value.length >= MIN_LENGTH && value.length <= MAX_LENGTH && USERNAME_PATTERN.test(value);
}

export function isValidPassword(value: string): boolean {
  return value.length >= MIN_LENGTH && value.length <= MAX_LENGTH;
}
