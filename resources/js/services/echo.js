/**
 * Echo WebSocket Configuration for Webex Messenger
 *
 * This configures Laravel Echo with Pusher for real-time messaging.
 * See CLAUDE.md for implementation details.
 */

import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

/**
 * Initialize Echo with authentication
 * @param {string} token - Bearer token for authentication
 * @param {object} config - Pusher configuration
 * @returns {Echo} Configured Echo instance
 */
export function initializeEcho(token, config = {}) {
  const defaultConfig = {
    broadcaster: 'pusher',
    key: config.key || process.env.VUE_APP_PUSHER_KEY,
    cluster: config.cluster || process.env.VUE_APP_PUSHER_CLUSTER || 'eu',
    forceTLS: true,
    authEndpoint: config.authEndpoint || '/broadcasting/auth',
    auth: {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
      }
    },
    enabledTransports: ['ws', 'wss']
  };

  const echo = new Echo(defaultConfig);

  // Make Echo available globally
  window.Echo = echo;

  return echo;
}

/**
 * Disconnect Echo
 */
export function disconnectEcho() {
  if (window.Echo) {
    window.Echo.disconnect();
    window.Echo = null;
  }
}

export default {
  initializeEcho,
  disconnectEcho
};
