const controlCharacters = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function normalizePlainText(value: string, maximumLength: number) {
  return value.replace(controlCharacters, "").trim().slice(0, maximumLength);
}

export function normalizeEmail(value: string) {
  return normalizePlainText(value, 254).toLowerCase();
}

export function safeAuthError(error: { code?: string; message?: string; status?: number } | null) {
  if (error?.status === 429 || error?.code?.includes("rate_limit") || error?.message?.toLowerCase().includes("rate limit")) {
    return "Too many sign-in attempts. Wait at least 60 seconds before requesting another secure link.";
  }
  if (error?.code === "over_email_send_rate_limit") {
    return "The email service limit has been reached. Try again later or use Google sign-in.";
  }
  if (error?.code === "validation_failed") {
    return "This sign-in method is not configured. Contact your BuildProof administrator.";
  }
  return "We could not complete sign-in securely. Check your details and try again.";
}
