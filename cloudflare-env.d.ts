declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    DATABASE_URL?: string;
    DIRECT_DATABASE_URL?: string;
  }
}
