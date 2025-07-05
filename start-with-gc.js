#!/usr/bin/env node

// Enable garbage collection and set memory limits
process.env.NODE_OPTIONS = '--max-old-space-size=4096 --expose-gc';

// Start the application
require('./dist/index.js');
