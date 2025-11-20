/**
 * Webex Messenger API Service
 *
 * Provides HTTP client for Webex messenger endpoints.
 * All endpoints follow the structure defined in CLAUDE.md
 */

import axios from 'axios';

class WebexMessengerAPI {
  constructor(baseURL = '/api/webex', token = null) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    // Add request interceptor for auth token
    this.client.interceptors.request.use(
      (config) => {
        const authToken = token || this.getToken();
        if (authToken) {
          config.headers.Authorization = `Bearer ${authToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          // Server responded with error status
          console.error('API Error:', error.response.data);
          return Promise.reject(error.response.data);
        } else if (error.request) {
          // Request made but no response
          console.error('Network Error:', error.request);
          return Promise.reject({
            success: false,
            message: 'Unable to connect to server'
          });
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Set authentication token
   */
  setToken(token) {
    this.token = token;
  }

  /**
   * Get stored token (override this method to integrate with your auth system)
   */
  getToken() {
    return this.token || localStorage.getItem('auth_token');
  }

  // ==================== Conversations API ====================

  /**
   * Get all contacts merged with conversation data
   * @param {object} params - Query parameters
   * @param {string} params.query - Search by phone number
   * @param {number} params.page - Page number (default: 1)
   * @param {number} params.per_page - Items per page (default: 50)
   */
  async getContacts(params = {}) {
    const response = await this.client.get('/conversations/contacts', { params });
    return response.data;
  }

  /**
   * Get conversation history for a specific phone number
   * @param {string} phoneNumber - Customer phone number (E.164 format)
   * @param {object} params - Query parameters
   * @param {number} params.page - Page number
   * @param {number} params.per_page - Items per page
   */
  async getConversation(phoneNumber, params = {}) {
    const encodedPhone = encodeURIComponent(phoneNumber);
    const response = await this.client.get(`/conversations/${encodedPhone}`, { params });
    return response.data;
  }

  /**
   * Send a message to a conversation
   * @param {string} phoneNumber - Customer phone number
   * @param {string} message - Message body
   * @param {string} correlationId - Optional tracking ID
   */
  async sendMessage(phoneNumber, message, correlationId = null) {
    const encodedPhone = encodeURIComponent(phoneNumber);
    const response = await this.client.post(`/conversations/${encodedPhone}/send`, {
      message,
      correlation_id: correlationId || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    });
    return response.data;
  }

  /**
   * Mark all messages in a conversation as read
   * @param {string} phoneNumber - Customer phone number
   */
  async markAsRead(phoneNumber) {
    const encodedPhone = encodeURIComponent(phoneNumber);
    const response = await this.client.post(`/conversations/${encodedPhone}/read`);
    return response.data;
  }

  // ==================== SMS Direct API ====================

  /**
   * Send SMS directly (bypasses conversations)
   * @param {object} data - SMS data
   * @param {string} data.from - Sender phone number
   * @param {array} data.to - Array of recipient objects
   * @param {string} data.message_body - Message content
   */
  async sendSMS(data) {
    const response = await this.client.post('/sms/send', data);
    return response.data;
  }

  // ==================== Contacts API ====================

  /**
   * Create a new contact
   */
  async createContact(contactData) {
    const response = await this.client.post('/contacts', contactData);
    return response.data;
  }

  /**
   * Get contact details
   */
  async getContact(contactId) {
    const response = await this.client.get(`/contacts/${contactId}`);
    return response.data;
  }

  /**
   * Update contact
   */
  async updateContact(contactId, contactData) {
    const response = await this.client.patch(`/contacts/${contactId}`, contactData);
    return response.data;
  }

  /**
   * Delete contact
   */
  async deleteContact(contactId) {
    const response = await this.client.delete(`/contacts/${contactId}`);
    return response.data;
  }
}

// Create singleton instance
const api = new WebexMessengerAPI();

export default api;
export { WebexMessengerAPI };
