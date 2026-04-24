/**
 * Validates required environment variables at startup.
 * Exits the process immediately if any critical variable is missing or insecure.
 */
const validateEnv = () => {
  const errors = [];

  const required = ['MONGODB_URI', 'JWT_SECRET'];
  required.forEach((key) => {
    if (!process.env[key]) errors.push(`Missing required env var: ${key}`);
  });

  // Warn if JWT_SECRET looks like the placeholder from .env.example
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.includes('change_this')) {
    errors.push('JWT_SECRET still contains the placeholder value — set a real secret');
  }

  // Warn if secret is too short
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET is too short — use at least 32 characters');
  }

  if (errors.length > 0) {
    console.error('\n⛔  Environment validation failed:');
    errors.forEach((e) => console.error(`   • ${e}`));
    console.error('\nFix the above issues in your .env file and restart.\n');
    process.exit(1);
  }
};

module.exports = validateEnv;
