export function getAuthErrorMessage(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "Incorrect email or password. Please try again.";
  }
  if (normalized.includes("user already registered")) {
    return "An account with this email already exists. Try logging in instead.";
  }
  if (normalized.includes("password should be at least")) {
    return "Password must be at least 6 characters.";
  }
  if (normalized.includes("unable to validate email")) {
    return "Please enter a valid email address.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Please confirm your email before logging in.";
  }

  return message;
}
