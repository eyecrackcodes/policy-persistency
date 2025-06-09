// Simple logging utility to control console output
class Logger {
  static isDevelopment = process.env.NODE_ENV === 'development';
  
  static info(message, ...args) {
    if (this.isDevelopment) {
      console.log(message, ...args);
    }
  }
  
  static warn(message, ...args) {
    if (this.isDevelopment) {
      console.warn(message, ...args);
    }
  }
  
  static error(message, ...args) {
    // Always log errors
    console.error(message, ...args);
  }
  
  static debug(message, ...args) {
    if (this.isDevelopment) {
      console.debug(message, ...args);
    }
  }
  
  // Special method for success messages
  static success(message, ...args) {
    if (this.isDevelopment) {
      console.log(`✅ ${message}`, ...args);
    }
  }
  
  // Special method for loading messages
  static loading(message, ...args) {
    if (this.isDevelopment) {
      console.log(`🔄 ${message}`, ...args);
    }
  }
  
  // Special method for warnings that should always show in production
  static prodWarn(message, ...args) {
    console.warn(message, ...args);
  }
}

export default Logger; 