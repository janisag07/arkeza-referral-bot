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

      CREATE INDEX IF NOT EXISTS idx_referred_by ON users(referred_by);
      CREATE INDEX IF NOT EXISTS idx_verified ON users(is_verified);
      CREATE INDEX IF NOT EXISTS idx_suspicious ON users(is_suspicious);
      CREATE INDEX IF NOT EXISTS idx_join_timestamp ON join_events(timestamp);
    `);
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

  incrementMessageCount(userId) {
    const result = this.db.prepare(`
      UPDATE users SET message_count = message_count + 1 WHERE user_id = ?
    `).run(userId);
    
    const user = this.getUser(userId);
    const minMessages = parseInt(process.env.MIN_MESSAGES_FOR_VERIFICATION || 3);
    const minHours = parseInt(process.env.MIN_HOURS_FOR_VERIFICATION || 24);
    const now = Math.floor(Date.now() / 1000);
    const hoursSinceJoin = (now - user.joined_at) / 3600;
    
    // Only verify if: enough messages AND 24h has passed since joining
    if (user && 
        user.message_count >= minMessages && 
        hoursSinceJoin >= minHours && 
        !user.is_verified) {
      this.verifyUser(userId);
    }
    
    return result.changes > 0;
  }

  verifyUser(userId) {
    const user = this.getUser(userId);
    if (!user || user.is_verified) return false;

    this.db.prepare('UPDATE users SET is_verified = 1 WHERE user_id = ?').run(userId);

    if (user.referred_by) {
      this.db.prepare(`
        INSERT INTO referral_stats (user_id, verified_referrals)
        VALUES (?, 1)
        ON CONFLICT(user_id) DO UPDATE SET verified_referrals = verified_referrals + 1
      `).run(user.referred_by);
    }

    return true;
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
