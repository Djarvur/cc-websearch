"use strict";

// src/lib/logger.ts
var currentLevel = process.env.LOG_LEVEL || "info";
var LEVEL_ORDER = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};
function log(level, message) {
  if (LEVEL_ORDER[level] >= LEVEL_ORDER[currentLevel]) {
    process.stderr.write(`[${level}] ${message}
`);
  }
}
var logger = {
  debug: (msg) => log("debug", msg),
  info: (msg) => log("info", msg),
  warn: (msg) => log("warn", msg),
  error: (msg) => log("error", msg)
};

// src/webfetch.ts
logger.info("WebFetch stub invoked");
process.stdout.write("WebFetch is not yet implemented. This feature will be added in a future update.\n");
process.exit(0);
