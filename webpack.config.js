module.exports = {
  // ... other webpack configurations
  node: {
    // Increase the memory limit for webpack
    // This is equivalent to setting NODE_OPTIONS="--max-old-space-size=4096"
    // but directly in webpack configuration
    "max_old_space_size": 4096
  }
};
