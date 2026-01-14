// Wrapper to catch errors
try {
  console.log('Starting server...');
  require('./dist/server.js');
} catch (error) {
  console.error('❌ Server failed to start:');
  console.error(error);
  process.exit(1);
}
