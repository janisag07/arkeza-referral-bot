const Database = require('better-sqlite3');
const path = require('path');

class ReferralDatabase {
  constructor(dbPath = './referrals.db') {
    this.db = new Database(dbPath);
    this.initTables();
  }

  initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY,
        username TEXT,
        first_name TEXT,
        joined_at INTEGER NOT NULL,
        referred_by INTEGER,
        is_verified INTEGER DEFAULT 0,
        message_count INTEGER DEFAULT 0,
        is_suspicious INTEGER DEFAULT 0,
        account_created_at INTEGER,
        confirmed_at INTEGER,
        verified_at INTEGER,
        FOREIGN KEY (referred_by) REFERENCES users(user_id)
      );

      CREATE TABLE IF NOT EXISTS referral_stats (
        user_id INTEGER PRIMARY KEY,
        total_referrals INTEGER DEFAULT 0,
        verified_referrals INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(user_id)
      );

      CREATE TABLE IF NOT EXISTS join_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        referrer_id INTEGER,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(user_id)
      );

      -- M4: cache of users linked to an Arkeza account via /link-user
      CREATE TABLE IF NOT EXISTS linked_users (
        telegram_id INTEGER PRIMARY KEY,
        arkeza_username TEXT,
        linked_at INTEGER NOT NULL,
        last_synced_at INTEGER
      );

      -- Campaign cycle window: manually rotated by admins via "/admin cycle".
      -- The 'current' row (id=1) holds the open cycle's start timestamp.
      -- Past cycles are archived rows with started_at < current.
      CREATE TABLE IF NOT EXISTS campaign_cycles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        started_at INTEGER NOT NULL,
        started_by INTEGER,
        label TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_referred_by ON users(referred_by);
      CREATE INDEX IF NOT EXISTS idx_verified ON users(is_verified);
      CREATE INDEX IF NOT EXISTS idx_suspicious ON users(is_suspicious);
      CREATE INDEX IF NOT EXISTS idx_join_timestamp ON join_events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_linked_at ON linked_users(linked_at);
    `);

    // ---- Schema migration for existing DBs ----
    // `ALTER TABLE ADD COLUMN` is idempotent when guarded by PRAGMA check.
    this.migrateAddColumnIfMissing('users', 'confirmed_at', 'INTEGER');
    this.migrateAddColumnIfMissing('users', 'verified_at', 'INTEGER');
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_verified_at ON users(verified_at);
      CREATE INDEX IF NOT EXISTS idx_confirmed_at ON users(confirmed_at);
    `);
  }

  /**
   * Idempotently add a column to a table. No-op if it already exists.
   */
  migrateAddColumnIfMissing(table, column, type) {
    const cols = this.db.prepare(`PRAGMA table_info(${table})`).all();
    if (!cols.some((c) => c.name === column)) {
      this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
      console.log(`[db] migration: added ${table}.${column}`);
    }
  }

  // ---- M4: Linked-user cache ----

  /**
   * Record (or refresh) the link between a Telegram ID and an Arkeza account.
   * Used after a successful /link-user call.
   */
  upsertLinkedUser(telegramId, arkezaUsername) {
    const now = Math.floor(Date.now() / 1000);
    this.db.prepare(`
      INSERT INTO linked_users (telegram_id, arkeza_username, linked_at, last_synced_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(telegram_id) DO UPDATE SET
        arkeza_username = excluded.arkeza_username,
        last_synced_at = excluded.last_synced_at
    `).run(telegramId, arkezaUsername || null, now, now);
  }

  getLinkedUser(telegramId) {
    return this.db.prepare('SELECT * FROM linked_users WHERE telegram_id = ?').get(telegramId);
  }

  /**
   * Reverse lookup: find the Telegram ID that received public milestone events
   * for a given Arkeza username (used as a fallback when an inbound webhook
   * does not include telegramId).
   */
  getLinkedTelegramIdByUsername(arkezaUsername) {
    if (!arkezaUsername) return null;
    const row = this.db.prepare(
      'SELECT telegram_id FROM linked_users WHERE arkeza_username = ? LIMIT 1'
    ).get(arkezaUsername);
    return row?.telegram_id || null;
  }

  addUser(userId, username, firstName, referredBy = null, accountCreatedAt = null) {
    const now = Math.floor(Date.now() / 1000);
    
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO users (user_id, username, first_name, joined_at, referred_by, account_created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(userId, username, firstName, now, referredBy, accountCreatedAt);
    
    if (result.changes > 0 && referredBy) {
      this.db.prepare(`
        INSERT INTO join_events (user_id, referrer_id, timestamp)
        VALUES (?, ?, ?)
      `).run(userId, referredBy, now);

      this.db.prepare(`
        INSERT INTO referral_stats (user_id, total_referrals)
        VALUES (?, 1)
        ON CONFLICT(user_id) DO UPDATE SET total_referrals = total_referrals + 1
      `).run(referredBy);
    }
    
    return result.changes > 0;
  }

  getUser(userId) {
    return this.db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);
  }

  /**
   * Handle a group message from a user according to Patrick's flow:
   *
   *   1. First message ever → move user to Pending (set confirmed_at)
   *      This message does NOT count toward verification yet.
   *   2. Messages sent WITHIN the 24h waiting window → ignored.
   *   3. Messages sent AFTER the 24h mark → increment message_count.
   *   4. message_count >= 3 after the 24h mark → Verified (set verified_at).
   *
   * Returns a state string for logging: 'unregistered' | 'ignored'
   *   | 'confirmed' (first-msg, moved to Pending)
   *   | 'counting' (post-delay message, counted)
   *   | 'verified' (just got verified by this message)
   *   | 'already_verified'
   */
  handleGroupMessage(userId) {
    const user = this.getUser(userId);
    if (!user) return 'unregistered';
    if (user.is_verified) return 'already_verified';

    const now = Math.floor(Date.now() / 1000);
    const minMessages = parseInt(process.env.MIN_MESSAGES_FOR_VERIFICATION || 3, 10);
    const minHours = parseInt(process.env.MIN_HOURS_FOR_VERIFICATION || 24, 10);

    // First message ever → Pending
    if (!user.confirmed_at) {
      this.db
        .prepare('UPDATE users SET confirmed_at = ? WHERE user_id = ?')
        .run(now, userId);
      return 'confirmed';
    }

    // Still in the 24h waiting window → message ignored for verification
    const hoursSinceConfirmed = (now - user.confirmed_at) / 3600;
    if (hoursSinceConfirmed < minHours) return 'ignored';

    // Post-delay message: count it
    this.db
      .prepare('UPDATE users SET message_count = message_count + 1 WHERE user_id = ?')
      .run(userId);
    const updated = this.getUser(userId);

    if (updated.message_count >= minMessages) {
      this.verifyUser(userId);
      return 'verified';
    }
    return 'counting';
  }

  verifyUser(userId) {
    const user = this.getUser(userId);
    if (!user || user.is_verified) return false;

    const now = Math.floor(Date.now() / 1000);

    // Defence-in-depth safeguard (Janis's Apr 06 fix): even if a caller bypasses
    // handleGroupMessage, verifyUser independently enforces the 24h + 3 messages rule.
    const minMessages = parseInt(process.env.MIN_MESSAGES_FOR_VERIFICATION || 3, 10);
    const minHours = parseInt(process.env.MIN_HOURS_FOR_VERIFICATION || 24, 10);
    if (!user.confirmed_at) return false;
    const hoursSinceConfirmed = (now - user.confirmed_at) / 3600;
    if (hoursSinceConfirmed < minHours) return false;
    if (user.message_count < minMessages) return false;

    this.db
      .prepare('UPDATE users SET is_verified = 1, verified_at = ? WHERE user_id = ?')
      .run(now, userId);

    if (user.referred_by) {
      this.db.prepare(`
        INSERT INTO referral_stats (user_id, verified_referrals)
        VALUES (?, 1)
        ON CONFLICT(user_id) DO UPDATE SET verified_referrals = verified_referrals + 1
      `).run(user.referred_by);
    }

    return true;
  }

  /**
   * Backwards-compatible shim: older callers may still call incrementMessageCount.
   * Delegates to the new handleGroupMessage flow.
   */
  incrementMessageCount(userId) {
    const state = this.handleGroupMessage(userId);
    return state !== 'unregistered' && state !== 'ignored';
  }

  markSuspicious(userId) {
    return this.db.prepare('UPDATE users SET is_suspicious = 1 WHERE user_id = ?').run(userId).changes > 0;
  }

  removeUser(userId) {
    const user = this.getUser(userId);
    if (!user) return false;

    if (user.referred_by && user.is_verified) {
      this.db.prepare(`
        UPDATE referral_stats 
        SET verified_referrals = verified_referrals - 1 
        WHERE user_id = ?
      `).run(user.referred_by);
    }

    if (user.referred_by) {
      this.db.prepare(`
        UPDATE referral_stats 
        SET total_referrals = total_referrals - 1 
        WHERE user_id = ?
      `).run(user.referred_by);
    }

    this.db.prepare('DELETE FROM join_events WHERE user_id = ? OR referrer_id = ?').run(userId, userId);
    this.db.prepare('DELETE FROM referral_stats WHERE user_id = ?').run(userId);
    this.db.prepare('UPDATE users SET referred_by = NULL WHERE referred_by = ?').run(userId);
    this.db.prepare('DELETE FROM users WHERE user_id = ?').run(userId);

    return true;
  }

  getLeaderboard(limit = 10) {
    return this.db.prepare(`
      SELECT
        u.user_id,
        u.username,
        u.first_name,
        COALESCE(rs.verified_referrals, 0) as verified_referrals,
        COALESCE(rs.total_referrals, 0) as total_referrals
      FROM users u
      LEFT JOIN referral_stats rs ON u.user_id = rs.user_id
      WHERE COALESCE(rs.verified_referrals, 0) > 0
      ORDER BY verified_referrals DESC, total_referrals DESC
      LIMIT ?
    `).all(limit);
  }

  // ---- Campaign cycles (admin-controlled via /admin cycle) ----

  /**
   * Return the start timestamp (unix) of the currently active cycle.
   * Creates a first cycle on the fly if none exists yet (bot first run).
   */
  getCurrentCycleStart() {
    const row = this.db
      .prepare('SELECT started_at FROM campaign_cycles ORDER BY started_at DESC LIMIT 1')
      .get();
    if (row) return row.started_at;
    // No cycle exists yet — create an initial one from "now".
    return this.startNewCycle(null, 'initial');
  }

  /**
   * Begin a new cycle: inserts a new row with started_at = now.
   * All future leaderboard queries filter verified_at >= that timestamp.
   *
   * @param {number|null} adminUserId  Who triggered the rotation (for audit)
   * @param {string|null} label        Optional human-readable label
   * @returns the new started_at unix timestamp
   */
  startNewCycle(adminUserId = null, label = null) {
    const now = Math.floor(Date.now() / 1000);
    this.db
      .prepare('INSERT INTO campaign_cycles (started_at, started_by, label) VALUES (?, ?, ?)')
      .run(now, adminUserId, label);
    return now;
  }

  /**
   * Past cycles (newest first), for history / admin display.
   */
  listCycles(limit = 10) {
    return this.db
      .prepare('SELECT * FROM campaign_cycles ORDER BY started_at DESC LIMIT ?')
      .all(limit);
  }

  /**
   * Cycle leaderboard — only counts referrals verified AT OR AFTER cycleStart.
   * Patrick's campaign rotates on explicit admin command; this query groups
   * verified users (verified_at >= cycleStart) by their referrer.
   */
  getCycleLeaderboard(cycleStartUnix, limit = 10) {
    return this.db.prepare(`
      SELECT
        r.user_id,
        r.username,
        r.first_name,
        COUNT(*) as verified_referrals
      FROM users v
      JOIN users r ON v.referred_by = r.user_id
      WHERE v.is_verified = 1
        AND v.verified_at IS NOT NULL
        AND v.verified_at >= ?
      GROUP BY r.user_id, r.username, r.first_name
      ORDER BY verified_referrals DESC, r.joined_at ASC
      LIMIT ?
    `).all(cycleStartUnix, limit);
  }

  /**
   * Personal stats for the current cycle: how many referrals did `userId`
   * get verified since cycleStart?
   */
  getCycleReferralCount(userId, cycleStartUnix) {
    const row = this.db
      .prepare(`
        SELECT COUNT(*) as count FROM users
        WHERE referred_by = ?
          AND is_verified = 1
          AND verified_at IS NOT NULL
          AND verified_at >= ?
      `)
      .get(userId, cycleStartUnix);
    return row?.count || 0;
  }

  getReferralStats(userId) {
    const stats = this.db.prepare(`
      SELECT 
        COALESCE(total_referrals, 0) as total_referrals,
        COALESCE(verified_referrals, 0) as verified_referrals
      FROM referral_stats
      WHERE user_id = ?
    `).get(userId);

    return stats || { total_referrals: 0, verified_referrals: 0 };
  }

  getRecentJoins(referrerId, hoursAgo) {
    const timestamp = Math.floor(Date.now() / 1000) - (hoursAgo * 3600);
    return this.db.prepare(`
      SELECT COUNT(*) as count
      FROM join_events
      WHERE referrer_id = ? AND timestamp > ?
    `).get(referrerId, timestamp);
  }

  getSuspiciousUsers() {
    return this.db.prepare(`
      SELECT 
        u.user_id,
        u.username,
        u.first_name,
        u.joined_at,
        u.referred_by,
        u.message_count,
        u.account_created_at
      FROM users u
      WHERE u.is_suspicious = 1
      ORDER BY u.joined_at DESC
    `).all();
  }

  getTotalStats() {
    const total = this.db.prepare('SELECT COUNT(*) as count FROM users').get();
    const verified = this.db.prepare('SELECT COUNT(*) as count FROM users WHERE is_verified = 1').get();
    const suspicious = this.db.prepare('SELECT COUNT(*) as count FROM users WHERE is_suspicious = 1').get();
    const totalReferrals = this.db.prepare('SELECT SUM(total_referrals) as sum FROM referral_stats').get();

    return {
      totalUsers: total.count,
      verifiedUsers: verified.count,
      suspiciousUsers: suspicious.count,
      totalReferrals: totalReferrals.sum || 0
    };
  }

  exportToCSV() {
    const users = this.db.prepare(`
      SELECT 
        u.user_id,
        u.username,
        u.first_name,
        u.joined_at,
        u.referred_by,
        u.is_verified,
        u.message_count,
        u.is_suspicious,
        COALESCE(rs.total_referrals, 0) as total_referrals,
        COALESCE(rs.verified_referrals, 0) as verified_referrals
      FROM users u
      LEFT JOIN referral_stats rs ON u.user_id = rs.user_id
      ORDER BY u.joined_at DESC
    `).all();

    let csv = 'user_id,username,first_name,joined_at,referred_by,is_verified,message_count,is_suspicious,total_referrals,verified_referrals\n';
    
    users.forEach(user => {
      csv += `${user.user_id},${user.username || ''},${user.first_name || ''},${user.joined_at},${user.referred_by || ''},${user.is_verified},${user.message_count},${user.is_suspicious},${user.total_referrals},${user.verified_referrals}\n`;
    });

    return csv;
  }

  close() {
    this.db.close();
  }
}

module.exports = ReferralDatabase;
