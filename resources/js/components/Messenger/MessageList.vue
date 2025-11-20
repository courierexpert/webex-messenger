<template>
  <div class="message-list" ref="messageList" @scroll="handleScroll">
    <!-- Loading indicator for pagination -->
    <div v-if="loadingMore" class="loading-more">
      <svg class="animate-spin h-5 w-5 text-primary-500" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span class="ml-2">Loading more messages...</span>
    </div>

    <!-- Messages (rendered in reverse order since API returns DESC) -->
    <div v-if="messages.length > 0" class="messages-container">
      <MessageBubble
        v-for="message in reversedMessages"
        :key="message.id"
        :message="message"
      />
    </div>

    <!-- Empty state -->
    <div v-else-if="!loading" class="empty-state">
      <svg class="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
      </svg>
      <p class="text-gray-500">No messages yet</p>
      <p class="text-gray-400 text-sm mt-1">Start a conversation!</p>
    </div>

    <!-- Initial loading state -->
    <div v-else class="loading-state">
      <svg class="animate-spin h-8 w-8 text-primary-500" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p class="text-gray-500 mt-2">Loading messages...</p>
    </div>
  </div>
</template>

<script>
import MessageBubble from './MessageBubble.vue';

export default {
  name: 'MessageList',

  components: {
    MessageBubble
  },

  props: {
    messages: {
      type: Array,
      default: () => []
    },
    loading: {
      type: Boolean,
      default: false
    },
    loadingMore: {
      type: Boolean,
      default: false
    },
    hasMore: {
      type: Boolean,
      default: false
    }
  },

  data() {
    return {
      shouldScrollToBottom: true,
      previousScrollHeight: 0
    };
  },

  computed: {
    // Reverse messages since API returns DESC but we display bottom-up
    reversedMessages() {
      return [...this.messages].reverse();
    }
  },

  watch: {
    messages: {
      handler(newMessages, oldMessages) {
        // Scroll to bottom on initial load or new message
        if (oldMessages.length === 0 || newMessages.length > oldMessages.length) {
          // Check if new message was added at the start (most recent)
          const isNewMessage = newMessages.length > oldMessages.length &&
            newMessages[0]?.id !== oldMessages[0]?.id;

          if (isNewMessage) {
            this.$nextTick(() => {
              this.scrollToBottom(true);
            });
          }
        }
      },
      deep: false
    }
  },

  mounted() {
    this.scrollToBottom();
  },

  methods: {
    handleScroll(event) {
      const element = event.target;

      // Check if scrolled near top (loading older messages)
      if (element.scrollTop < 100 && !this.loadingMore && this.hasMore) {
        this.previousScrollHeight = element.scrollHeight;
        this.$emit('load-more');
      }
    },

    scrollToBottom(smooth = false) {
      this.$nextTick(() => {
        const container = this.$refs.messageList;
        if (container) {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: smooth ? 'smooth' : 'auto'
          });
        }
      });
    },

    // Called after more messages are loaded to maintain scroll position
    maintainScrollPosition() {
      this.$nextTick(() => {
        const container = this.$refs.messageList;
        if (container) {
          const newScrollHeight = container.scrollHeight;
          const scrollDiff = newScrollHeight - this.previousScrollHeight;
          container.scrollTop = scrollDiff;
        }
      });
    }
  }
};
</script>

<style scoped>
.message-list {
  @apply flex-1 overflow-y-auto p-4 bg-gray-50;
  scroll-behavior: smooth;
}

.messages-container {
  @apply flex flex-col;
}

.loading-more {
  @apply flex items-center justify-center py-3 text-sm text-gray-600;
}

.empty-state {
  @apply flex flex-col items-center justify-center h-full text-center;
}

.loading-state {
  @apply flex flex-col items-center justify-center h-full;
}

/* Custom scrollbar */
.message-list::-webkit-scrollbar {
  width: 6px;
}

.message-list::-webkit-scrollbar-track {
  @apply bg-gray-100;
}

.message-list::-webkit-scrollbar-thumb {
  @apply bg-gray-300 rounded-full;
}

.message-list::-webkit-scrollbar-thumb:hover {
  @apply bg-gray-400;
}
</style>
