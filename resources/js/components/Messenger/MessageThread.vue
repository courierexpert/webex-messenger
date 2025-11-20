<template>
  <div class="message-thread">
    <!-- Header -->
    <div class="thread-header">
      <button
        v-if="showBackButton"
        @click="$emit('back')"
        class="back-button"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
      </button>

      <div class="header-info">
        <div class="contact-avatar">
          {{ contactInitials }}
        </div>
        <div class="contact-details">
          <h3 class="contact-name">{{ contactName }}</h3>
          <p class="contact-phone">{{ phoneNumber }}</p>
        </div>
      </div>
    </div>

    <!-- Messages -->
    <MessageList
      :messages="messages"
      :loading="loading"
      :loading-more="loadingMore"
      :has-more="hasMore"
      @load-more="loadMoreMessages"
      ref="messageList"
    />

    <!-- Input -->
    <MessageInput
      @send="handleSendMessage"
      @error="handleError"
      :disabled="sending"
      ref="messageInput"
    />
  </div>
</template>

<script>
import MessageList from './MessageList.vue';
import MessageInput from './MessageInput.vue';
import api from '../../services/api';

export default {
  name: 'MessageThread',

  components: {
    MessageList,
    MessageInput
  },

  props: {
    phoneNumber: {
      type: String,
      required: true
    },
    contact: {
      type: Object,
      default: null
    },
    showBackButton: {
      type: Boolean,
      default: false
    }
  },

  data() {
    return {
      conversation: null,
      messages: [],
      loading: false,
      loadingMore: false,
      sending: false,
      pagination: {
        current_page: 1,
        per_page: 50,
        total: 0,
        last_page: 1,
        has_more: false
      }
    };
  },

  computed: {
    contactName() {
      if (this.contact?.full_name) {
        return this.contact.full_name;
      }
      return this.phoneNumber;
    },

    contactInitials() {
      if (this.contact?.full_name) {
        const parts = this.contact.full_name.trim().split(' ');
        if (parts.length >= 2) {
          return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return parts[0][0].toUpperCase();
      }
      return this.phoneNumber[0] || '?';
    },

    hasMore() {
      return this.pagination.has_more;
    }
  },

  watch: {
    phoneNumber: {
      immediate: true,
      handler(newPhone, oldPhone) {
        if (newPhone !== oldPhone) {
          this.loadConversation();
        }
      }
    }
  },

  mounted() {
    this.subscribeToConversation();
  },

  beforeDestroy() {
    this.unsubscribeFromConversation();
  },

  methods: {
    async loadConversation(page = 1) {
      if (page === 1) {
        this.loading = true;
      } else {
        this.loadingMore = true;
      }

      try {
        const response = await api.getConversation(this.phoneNumber, {
          page,
          per_page: 50
        });

        if (response.success) {
          this.conversation = response.data.conversation;

          if (page === 1) {
            // First page - replace messages
            this.messages = response.data.messages || [];
          } else {
            // Subsequent pages - append (remember: DESC order from API)
            this.messages.push(...(response.data.messages || []));
            // Maintain scroll position after loading more
            this.$nextTick(() => {
              this.$refs.messageList?.maintainScrollPosition();
            });
          }

          this.pagination = response.data.pagination;

          // Subscribe to real-time updates
          if (page === 1) {
            this.subscribeToConversation();
          }

          // Mark as read
          this.markAsRead();
        }
      } catch (error) {
        console.error('Failed to load conversation:', error);
        this.$emit('error', {
          title: 'Error',
          message: error.message || 'Failed to load conversation'
        });
      } finally {
        this.loading = false;
        this.loadingMore = false;
      }
    },

    loadMoreMessages() {
      if (this.hasMore && !this.loadingMore) {
        this.loadConversation(this.pagination.current_page + 1);
      }
    },

    async handleSendMessage(message) {
      this.sending = true;

      try {
        const response = await api.sendMessage(this.phoneNumber, message);

        if (response.success) {
          // Message will be broadcast via WebSocket automatically
          // No need to manually add to messages array
          this.$emit('message-sent', response.data);

          // Focus back on input
          this.$nextTick(() => {
            this.$refs.messageInput?.focus();
          });
        } else {
          throw new Error(response.message || 'Failed to send message');
        }
      } catch (error) {
        console.error('Failed to send message:', error);
        this.$emit('error', {
          title: 'Error',
          message: error.message || 'Failed to send message'
        });
      } finally {
        this.sending = false;
      }
    },

    async markAsRead() {
      if (!this.conversation) return;

      try {
        await api.markAsRead(this.phoneNumber);
        // Unread count will be updated via WebSocket automatically
      } catch (error) {
        console.error('Failed to mark as read:', error);
      }
    },

    subscribeToConversation() {
      if (!this.conversation?.id || !window.Echo) return;

      // Leave previous channel if any
      this.unsubscribeFromConversation();

      window.Echo.private(`conversation.${this.conversation.id}`)
        .listen('.message.received', (event) => {
          console.log('New message received:', event.message);

          const existingIndex = this.messages.findIndex(
            m => m.id === event.message.id
          );

          if (existingIndex !== -1) {
            // Update existing message (status change)
            this.$set(this.messages, existingIndex, event.message);
          } else {
            // Add new message to the start (DESC order)
            this.messages.unshift(event.message);
          }

          // Update conversation metadata
          if (event.conversation) {
            this.conversation = event.conversation;
          }

          // Mark as read if we're actively viewing
          if (document.hasFocus()) {
            this.markAsRead();
          }
        })
        .listen('.conversation.updated', (event) => {
          console.log('Conversation updated:', event.conversation);
          this.conversation = event.conversation;
        });
    },

    unsubscribeFromConversation() {
      if (this.conversation?.id && window.Echo) {
        window.Echo.leave(`conversation.${this.conversation.id}`);
      }
    },

    handleError(error) {
      this.$emit('error', error);
    }
  }
};
</script>

<style scoped>
.message-thread {
  @apply flex flex-col h-full bg-white;
}

.thread-header {
  @apply flex items-center px-4 py-3 border-b border-gray-200 bg-white;
}

.back-button {
  @apply mr-3 p-1 rounded-lg hover:bg-gray-100 transition-colors;
}

.header-info {
  @apply flex items-center flex-1;
}

.contact-avatar {
  @apply w-10 h-10 rounded-full bg-primary-500 text-white;
  @apply flex items-center justify-center font-semibold text-sm mr-3;
}

.contact-details {
  @apply flex-1 min-w-0;
}

.contact-name {
  @apply font-semibold text-gray-900 truncate;
}

.contact-phone {
  @apply text-sm text-gray-500 truncate;
}
</style>
