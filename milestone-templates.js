/**
 * Arkeza Milestone Announcement Templates
 *
 * Per Patrick's "arkeza milestone spec.docx":
 *   - Every milestone fires BOTH a public post (channel) AND a private DM
 *   - Public = 3-line format: achievement / social pressure / CTA
 *   - Private DM = personal congratulation (only if telegramId available)
 *   - Each milestone fires ONCE per user (dedup via milestone_log table)
 *   - [username] placeholder replaced at render time
 */

const XP = {
  10000:   { emoji: '🔥', line1: '🔥 [username] just hit 10,000 XP',           line2: 'the grind has started. are you keeping up?' },
  50000:   { emoji: '⚡', line1: '⚡ [username] is at 50,000 XP',              line2: 'early days are separating the grinders from the spectators' },
  100000:  { emoji: '💪', line1: '💪 [username] just crossed 100,000 XP',      line2: '6 figures on the board. the leaderboard is watching' },
  500000:  { emoji: '🚀', line1: '🚀 [username] is at 500,000 XP',            line2: 'half a million. this one is serious' },
  1000000: { emoji: '💥', line1: '💥 1,000,000 XP',                            line2: '[username] is built different. the grind is real' },
  5000000: { emoji: '👑', line1: '👑 [username] just hit 5,000,000 XP',        line2: 'top tier. who is even close?' },
  10000000:{ emoji: '🏆', line1: '🏆 10,000,000 XP',                           line2: '[username] is in a league of their own. legend status' },
};

const MISSIONS = {
  1:  { emoji: '🎯', line1: '🎯 [username] just completed their first mission', line2: 'the journey starts here. don\'t get left behind' },
  5:  { emoji: '⚡', line1: '⚡ [username] has completed 5 missions',           line2: 'they are not playing around. are you?' },
  10: { emoji: '🔥', line1: '🔥 [username] is on 10 missions completed',       line2: 'double digits. the grind is real' },
  20: { emoji: '💪', line1: '💪 [username] just hit 20 missions',              line2: 'this is what consistent looks like' },
  50: { emoji: '👑', line1: '👑 [username] has completed 50 missions',         line2: 'untouchable. who is even close?' },
};

const STREAKS = {
  1:  { emoji: '🔥', line1: '🔥 [username] just completed their first streak', line2: 'consistency unlocked. the grind begins' },
  3:  { emoji: '⚡', line1: '⚡ [username] is on their 3rd streak',            line2: 'not a fluke. this one keeps showing up' },
  5:  { emoji: '💪', line1: '💪 [username] just hit their 5th streak',         line2: 'discipline is separating the real ones from the rest' },
  10: { emoji: '👑', line1: '👑 [username] has completed 10 streaks',          line2: 'legendary consistency. the leaderboard knows this name' },
};

const CTA = '👉 open the app';

const TYPE_MAP = {
  xp: XP,
  tasks: MISSIONS,
  streak: STREAKS,
};

/**
 * Look up the template for a given milestone type + value.
 *
 * @param {string} type   'xp' | 'tasks' | 'streak'
 * @param {number} value  The newValue from the webhook payload
 * @returns {{ emoji, line1, line2 } | null}  null if no template matches
 */
function getTemplate(type, value) {
  const table = TYPE_MAP[type];
  if (!table) return null;
  return table[value] || null;
}

/**
 * Render a public announcement from a template + username.
 * Returns the 3-line string ready to send.
 */
function renderPublic(template, username) {
  const l1 = template.line1.replace(/\[username\]/g, username);
  const l2 = template.line2.replace(/\[username\]/g, username);
  return `${l1}\n${l2}\n${CTA}`;
}

/**
 * Render a private DM from a template + username.
 */
function renderPrivate(template, username) {
  const achievement = template.line1.replace(/\[username\]/g, username);
  return `🎉 Congratulations ${username}!\n\n${achievement}\n\nKeep going — your grind is paying off!`;
}

module.exports = {
  getTemplate,
  renderPublic,
  renderPrivate,
  CTA,
  _tables: { XP, MISSIONS, STREAKS },
};
