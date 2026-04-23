module.exports = {
  apps: [
    {
      name: "hrag",
      // If litestream is available, we use it to wrap the node process.
      // Otherwise, we fallback to node directly.
      // Note: In production, litestream SHOULD be available for replication.
      script: "bash",
      args: "-c \"if command -v litestream >/dev/null 2>&1; then litestream replicate -exec 'node build/index.js'; else node build/index.js; fi\"",
      env: {
        NODE_ENV: "production"
      },
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: "logs/err.log",
      out_file: "logs/out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss"
    }
  ]
};
