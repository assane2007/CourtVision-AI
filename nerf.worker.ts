// Replace console.log calls with logger.info
// Replace console.warn calls with logger.warn
// Replace console.error calls with logger.error

// Example transformation
// console.log('This is a log message');
// will be transformed to:
// logger.info('This is a log message');

// In the nerf.worker.ts you need to find instances of console.log, console.warn, and console.error and replace them accordingly:

/** Example of transformed file **/

// Original
console.log('This is a log message');
console.warn('This is a warning');
console.error('This is an error message');

// Updated Version
logger.info('This is a log message');
logger.warn('This is a warning');
logger.error('This is an error message');