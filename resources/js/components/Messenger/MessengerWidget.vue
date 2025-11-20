<template>
  <div class="messenger-widget" :class="widgetClasses">
    <!-- Minimized state - floating button -->
    <transition name="fade">
      <div v-if="isMinimized" class="messenger-button" @click="toggleMinimize">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
        </svg>
        <span v-if="totalUnread > 0" class="unread-badge">
          {{ totalUnreadDisplay }}
        </span>
      </div>
    </transition>

    <!-- Expanded state - full messenger -->
    <transition name="slide-up">
      <div v-if="!isMinimized" class="messenger-container" :style="containerStyle">
        <!-- Header -->
        <div class="messenger-header">
          <h3 class="header-title">Messages</h3>
          <div class="header-actions">
            <button @click="toggleMinimize" class="btn-action" title="Minimize">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Body -->
        <div class="messenger-body">
          <!-- Conversation List (Left sidebar) -->
          <ConversationList
            v-show="!isMobile || !activeConversation"
            :contacts="contacts"
            :active-conversation="activeConversation"
            :loading="loadingContacts"
            :loading-more="loadingMoreContacts"
            :has-more="contactsPagination.has_more"
            @select="selectConversation"
            @search="handleSearch"
            @load-more="loadMoreContacts"
          />

          <!-- Message Thread (Right side) -->
          <MessageThread
            v-if="activeConversation"
            v-show="!isMobile || activeConversation"
            :phone-number="activeConversation.phone_number"
            :contact="activeConversation"
            :show-back-button="isMobile"
            @back="activeConversation = null"
            @message-sent="handleMessageSent"
            @error="showNotification"
          />

          <!-- Empty state (no conversation selected) -->
          <div
            v-else-if="!isMobile"
            class="empty-conversation"
          >
            <svg class="w-20 h-20 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
            <h3 class="text-xl font-semibold text-gray-700 mb-2">Your Messages</h3>
            <p class="text-gray-500">Select a conversation to start messaging</p>
          </div>
        </div>

        <!-- Notifications -->
        <transition-group name="notification" tag="div" class="notifications">
          <div
            v-for="notification in notifications"
            :key="notification.id"
            class="notification"
            :class="`notification-${notification.type}`"
          >
            <div class="notification-content">
              <p class="notification-title">{{ notification.title }}</p>
              <p class="notification-message">{{ notification.message }}</p>
            </div>
            <button @click="removeNotification(notification.id)" class="notification-close">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </transition-group>
      </div>
    </transition>
  </div>
</template>

<script>
import ConversationList from './ConversationList.vue';
import MessageThread from './MessageThread.vue';
import api from '../../services/api';
import { initializeEcho, disconnectEcho } from '../../services/echo';

export default {
  name: 'MessengerWidget',

  components: {
    ConversationList,
    MessageThread
  },

  props: {
    token: {
      type: String,
      required: true
    },
    pusherConfig: {
      type: Object,
      default: () => ({})
    },
    minimized: {
      type: Boolean,
      default: true
    }
  },

  data() {
    return {
      isMinimized: this.minimized,
      isMobile: false,
      contacts: [],
      activeConversation: null,
      loadingContacts: false,
      loadingMoreContacts: false,
      searchQuery: '',
      contactsPagination: {
        total_count: 0,
        page: 1,
        per_page: 50,
        has_more: false
      },
      notifications: [],
      notificationId: 0,
      echo: null
    };
  },

  computed: {
    totalUnread() {
      return this.contacts.reduce((sum, c) => sum + (c.unread_count || 0), 0);
    },

    totalUnreadDisplay() {
      return this.totalUnread > 99 ? '99+' : this.totalUnread;
    },

    widgetClasses() {
      return {
        'minimized': this.isMinimized,
        'mobile': this.isMobile
      };
    },

    containerStyle() {
      // Dynamic styles for mobile fullscreen
      if (this.isMobile && !this.isMinimized) {
        return {
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          width: '100%',
          height: '100%',
          borderRadius: '0'
        };
      }
      return {};
    }
  },

  mounted() {
    // Set auth token
    api.setToken(this.token);

    // Initialize Echo
    this.echo = initializeEcho(this.token, this.pusherConfig);

    // Check if mobile
    this.checkMobile();
    window.addEventListener('resize', this.checkMobile);

    // Load initial data
    this.loadContacts();

    // Subscribe to admin channel for all updates
    this.subscribeToAdmin();
  },

  beforeDestroy() {
    window.removeEventListener('resize', this.checkMobile);
    this.unsubscribeFromAdmin();
    disconnectEcho();
  },

  methods: {
    toggleMinimize() {
      this.isMinimized = !this.isMinimized;
      this.$emit('toggle', this.isMinimized);
    },

    checkMobile() {
      this.isMobile = window.innerWidth <= 768;
    },

    async loadContacts(page = 1) {
      if (page === 1) {
        this.loadingContacts = true;
      } else {
        this.loadingMoreContacts = true;
      }

      try {
        const response = await api.getContacts({
          page,
          per_page: 50,
          query: this.searchQuery
        });

        if (response.success) {
          if (page === 1) {
            this.contacts = response.data.contacts || [];
          } else {
            this.contacts.push(...(response.data.contacts || []));
          }

          this.contactsPagination = response.data.pagination;
        }
      } catch (error) {
        console.error('Failed to load contacts:', error);
        this.showNotification({
          title: 'Error',
          message: error.message || 'Failed to load conversations',
          type: 'error'
        });
      } finally {
        this.loadingContacts = false;
        this.loadingMoreContacts = false;
      }
    },

    loadMoreContacts() {
      if (this.contactsPagination.has_more && !this.loadingMoreContacts) {
        this.loadContacts(this.contactsPagination.page + 1);
      }
    },

    handleSearch(query) {
      this.searchQuery = query;
      this.loadContacts(1);
    },

    selectConversation(contact) {
      this.activeConversation = contact;
    },

    handleMessageSent(data) {
      // Message will be updated via WebSocket
      console.log('Message sent:', data);
    },

    subscribeToAdmin() {
      if (!this.echo) return;

      this.echo.private('webex.admin')
        .listen('.message.received', (event) => {
          console.log('Admin: Message received', event);

          // Update the contact in the list
          this.updateContactInList(event.conversation);

          // Show notification if not active conversation
          if (this.activeConversation?.id !== event.conversation.id &&
              event.message.direction === 'inbound') {
            this.showNotification({
              title: 'New Message',
              message: event.message.body.substring(0, 50),
              type: 'info'
            });
          }
        })
        .listen('.conversation.updated', (event) => {
          console.log('Admin: Conversation updated', event);
          this.updateContactInList(event.conversation);
        });
    },

    unsubscribeFromAdmin() {
      if (this.echo) {
        this.echo.leave('webex.admin');
      }
    },

    updateContactInList(conversation) {
      const index = this.contacts.findIndex(
        c => c.conversation_id === conversation.id || c.phone_number === conversation.phone_number
      );

      if (index !== -1) {
        // Update existing contact
        this.$set(this.contacts, index, {
          ...this.contacts[index],
          conversation_id: conversation.id,
          has_conversation: true,
          last_message_at: conversation.last_message_at,
          last_direction: conversation.last_direction,
          unread_count: conversation.unread_count,
          last_message_preview: conversation.last_message_preview || this.contacts[index].last_message_preview
        });

        // Re-sort the list (most recent first)
        this.contacts.sort((a, b) => {
          if (!a.last_message_at && !b.last_message_at) return 0;
          if (!a.last_message_at) return 1;
          if (!b.last_message_at) return -1;
          return new Date(b.last_message_at) - new Date(a.last_message_at);
        });
      }

      // Update active conversation if it matches
      if (this.activeConversation?.phone_number === conversation.phone_number) {
        this.activeConversation = {
          ...this.activeConversation,
          ...this.contacts[index]
        };
      }
    },

    showNotification({ title, message, type = 'info' }) {
      const id = ++this.notificationId;
      const notification = { id, title, message, type };

      this.notifications.push(notification);

      // Auto remove after 5 seconds
      setTimeout(() => {
        this.removeNotification(id);
      }, 5000);
    },

    removeNotification(id) {
      const index = this.notifications.findIndex(n => n.id === id);
      if (index !== -1) {
        this.notifications.splice(index, 1);
      }
    }
  }
};
</script>

<style scoped>
.messenger-widget {
  @apply fixed bottom-5 right-5 z-[9999];
}

.messenger-widget.minimized {
  @apply w-16 h-16;
}

/* Messenger button (minimized) */
.messenger-button {
  @apply w-14 h-14 bg-primary-600 rounded-full shadow-lg cursor-pointer;
  @apply flex items-center justify-center text-white;
  @apply hover:bg-primary-700 transition-all duration-200;
  @apply relative;
}

.messenger-button:hover {
  transform: scale(1.05);
}

.messenger-button .unread-badge {
  @apply absolute -top-1 -right-1 bg-red-500 text-white;
  @apply text-xs font-bold rounded-full min-w-[20px] h-5 px-1;
  @apply flex items-center justify-center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* Messenger container (expanded) */
.messenger-container {
  @apply bg-white rounded-lg shadow-2xl;
  @apply flex flex-col overflow-hidden;
  width: 800px;
  height: 600px;
}

.messenger-header {
  @apply bg-primary-600 text-white px-4 py-3;
  @apply flex justify-between items-center;
  @apply rounded-t-lg;
}

.header-title {
  @apply text-lg font-semibold;
}

.header-actions {
  @apply flex gap-2;
}

.btn-action {
  @apply text-white hover:bg-primary-700 rounded p-1 transition-colors;
}

.messenger-body {
  @apply flex-1 flex overflow-hidden;
}

.empty-conversation {
  @apply flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50;
}

/* Notifications */
.notifications {
  @apply fixed top-5 right-5 z-[10000] space-y-2;
  pointer-events: none;
}

.notification {
  @apply bg-white rounded-lg shadow-lg p-4 flex items-start gap-3;
  @apply border-l-4;
  pointer-events: auto;
  min-width: 300px;
  max-width: 400px;
}

.notification-info {
  @apply border-blue-500;
}

.notification-error {
  @apply border-red-500;
}

.notification-success {
  @apply border-green-500;
}

.notification-content {
  @apply flex-1;
}

.notification-title {
  @apply font-semibold text-gray-900 mb-1;
}

.notification-message {
  @apply text-sm text-gray-600;
}

.notification-close {
  @apply text-gray-400 hover:text-gray-600 transition-colors;
}

/* Transitions */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter, .fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active, .slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter, .slide-up-leave-to {
  transform: translateY(20px);
  opacity: 0;
}

.notification-enter-active, .notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter, .notification-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .messenger-container {
    width: 100vw !important;
    height: 100vh !important;
    max-width: 100vw !important;
    max-height: 100vh !important;
  }

  .messenger-header {
    @apply rounded-none;
  }

  .notifications {
    @apply top-2 right-2 left-2;
  }

  .notification {
    min-width: auto;
    max-width: 100%;
  }
}

/* Tablet */
@media (min-width: 769px) and (max-width: 1024px) {
  .messenger-container {
    width: 600px;
    height: 500px;
  }
}
</style>
