#!/usr/bin/env node

/**
 * Syncs environment variables from .env.local to ios/.xcode.env.local
 * This ensures Xcode builds have access to necessary env vars (especially SENTRY_AUTH_TOKEN)
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const ENV_LOCAL_PATH = path.join(ROOT_DIR, '.env.local');
const XCODE_ENV_LOCAL_PATH = path.join(ROOT_DIR, 'ios', '.xcode.env.local');

// Check if .env.local exists
if (!fs.existsSync(ENV_LOCAL_PATH)) {
  console.log('⚠️  No .env.local file found. Skipping .xcode.env.local sync.');
  process.exit(0);
}

// Check if ios folder exists
if (!fs.existsSync(path.join(ROOT_DIR, 'ios'))) {
  console.log('⚠️  iOS folder not found. Run prebuild first.');
  process.exit(0);
}

// Read .env.local
const envContent = fs.readFileSync(ENV_LOCAL_PATH, 'utf-8');

// Parse environment variables (simple parser for KEY=VALUE format)
const envVars = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  // Skip comments and empty lines
  if (!trimmed || trimmed.startsWith('#')) return;

  const [key, ...valueParts] = trimmed.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

// Variables that need to be in .xcode.env.local
const REQUIRED_VARS = [
  'SENTRY_AUTH_TOKEN',
  'EXPO_PUBLIC_SENTRY_DSN',
  // Add more variables here if needed in the future
];

// Read existing .xcode.env.local to preserve NODE_BINARY
let existingContent = '';
let nodeBinary = 'export NODE_BINARY=$(command -v node)';

if (fs.existsSync(XCODE_ENV_LOCAL_PATH)) {
  existingContent = fs.readFileSync(XCODE_ENV_LOCAL_PATH, 'utf-8');
  const nodeBinaryMatch = existingContent.match(/export NODE_BINARY=.*/);
  if (nodeBinaryMatch) {
    nodeBinary = nodeBinaryMatch[0];
  }
}

// Build new .xcode.env.local content
const lines = [
  nodeBinary,
  '',
  '# Environment variables synced from .env.local',
  '# Run `pnpm sync-xcode-env` to update these after changing .env.local',
];

REQUIRED_VARS.forEach(varName => {
  if (envVars[varName]) {
    lines.push(`export ${varName}=${envVars[varName]}`);
  }
});

// Write to .xcode.env.local
const newContent = lines.join('\n') + '\n';
fs.writeFileSync(XCODE_ENV_LOCAL_PATH, newContent);

console.log('✅ Synced environment variables to ios/.xcode.env.local');
console.log(`   Variables synced: ${REQUIRED_VARS.filter(v => envVars[v]).join(', ')}`);
