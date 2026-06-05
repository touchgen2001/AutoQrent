type LimitConfig = {
  limit: number
  windowMs: number
}

type SecurityLimits = {
  contact: LimitConfig
  vehicleEvents: LimitConfig
  authLogin: LimitConfig
  vehicleImageUploads: {
    maxFilesPerRequest: number
    dailyLimit: number
    totalActiveLimit: number
    dailyWindowHours: number
  }
  slowApiThresholdMs: number
  loginFailureSpikeWindowMs: number
  loginFailureSpikeThreshold: number
}

function parseEnvInt(input: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(input || '', 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(Math.max(parsed, min), max)
}

export function getSecurityLimits(): SecurityLimits {
  return {
    contact: {
      limit: parseEnvInt(process.env.RATE_LIMIT_CONTACT_LIMIT, 6, 1, 1000),
      windowMs: parseEnvInt(process.env.RATE_LIMIT_CONTACT_WINDOW_MS, 10 * 60 * 1000, 10_000, 24 * 60 * 60 * 1000),
    },
    vehicleEvents: {
      limit: parseEnvInt(process.env.RATE_LIMIT_VEHICLE_EVENTS_LIMIT, 40, 1, 5000),
      windowMs: parseEnvInt(
        process.env.RATE_LIMIT_VEHICLE_EVENTS_WINDOW_MS,
        5 * 60 * 1000,
        10_000,
        24 * 60 * 60 * 1000,
      ),
    },
    authLogin: {
      limit: parseEnvInt(process.env.RATE_LIMIT_AUTH_LOGIN_LIMIT, 10, 1, 500),
      windowMs: parseEnvInt(process.env.RATE_LIMIT_AUTH_LOGIN_WINDOW_MS, 10 * 60 * 1000, 10_000, 24 * 60 * 60 * 1000),
    },
    vehicleImageUploads: {
      maxFilesPerRequest: parseEnvInt(process.env.VEHICLE_IMAGE_MAX_FILES_PER_REQUEST, 10, 1, 30),
      dailyLimit: parseEnvInt(process.env.VEHICLE_IMAGE_DAILY_UPLOAD_LIMIT, 120, 1, 5000),
      totalActiveLimit: parseEnvInt(process.env.VEHICLE_IMAGE_TOTAL_ACTIVE_LIMIT, 1000, 1, 20_000),
      dailyWindowHours: parseEnvInt(process.env.VEHICLE_IMAGE_DAILY_WINDOW_HOURS, 24, 1, 168),
    },
    slowApiThresholdMs: parseEnvInt(process.env.API_SLOW_THRESHOLD_MS, 1800, 200, 120_000),
    loginFailureSpikeWindowMs: parseEnvInt(process.env.LOGIN_FAIL_SPIKE_WINDOW_MS, 5 * 60 * 1000, 60_000, 24 * 60 * 60 * 1000),
    loginFailureSpikeThreshold: parseEnvInt(process.env.LOGIN_FAIL_SPIKE_THRESHOLD, 25, 1, 10_000),
  }
}
