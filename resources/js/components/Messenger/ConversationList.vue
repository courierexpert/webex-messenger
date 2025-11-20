<template>
  <div class="conversation-list">
    <!-- Search bar -->
    <div class="search-bar">
      <div class="search-input-wrapper">
        <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search conversations..."
          class="search-input"
        />
        <button
          v-if="searchQuery"
          @click="searchQuery = ''"
          class="clear-search"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Conversations list -->
    <div class="conversations-container" ref="conversationContainer" @scroll="handleScroll">
      <div v-if="loading && contacts.length === 0" class="loading-state">
        <svg class="animate-spin h-8 w-8 text-primary-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="text-gray-500 mt-2">Loading conversations...</p>
      </div>

      <div v-else-if="contacts.length === 0" class="empty-state">
        <svg class="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"/>
        </svg>
        <p class="text-gray-500">No conversations yet</p>
        <p class="text-gray-400 text-sm mt-1">Start chatting with your contacts!</p>
      </div>

      <div v-else>
        <ConversationItem
          v-for="contact in sortedContacts"
          :key="contact.id || contact.phone_number"
          :contact="contact"
          :is-active="isActiveConversation(contact)"
          @select="handleSelect"
        />

        <!-- Load more indicator -->
        <div v-if="loadingMore" class="loading-more">
          <svg class="animate-spin h-5 w-5 text-primary-500" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import ConversationItem from './ConversationItem.vue';

export default {
  name: 'ConversationList',

  components: {
    ConversationItem
  },

  props: {
    contacts: {
      type: Array,
      default: () => []
    },
    activeConversation: {
      type: Object,
      default: null
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
      searchQuery: '',
      searchTimeout: null
    };
  },

  computed: {
    sortedContacts() {
      // Filter by search query
      let filtered = this.contacts;

      if (this.searchQuery.trim()) {
        const query = this.searchQuery.toLowerCase();
        filtered = filtered.filter(contact => {
          const name = (contact.full_name || '').toLowerCase();
          const phone = (contact.phone_number || '').toLowerCase();
          return name.includes(query) || phone.includes(query);
        });
      }

      // Sort by last message time (most recent first)
      return filtered.sort((a, b) => {
        if (!a.last_message_at && !b.last_message_at) return 0;
        if (!a.last_message_at) return 1;
        if (!b.last_message_at) return -1;

        return new Date(b.last_message_at) - new Date(a.last_message_at);
      });
    }
  },

  watch: {
    searchQuery() {
      // Debounce search
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        this.$emit('search', this.searchQuery);
      }, 300);
    }
  },

  methods: {
    handleSelect(contact) {
      this.$emit('select', contact);
    },

    isActiveConversation(contact) {
      if (!this.activeConversation) return false;
      return contact.phone_number === this.activeConversation.phone_number;
    },

    handleScroll(event) {
      const element = event.target;
      const scrollBottom = element.scrollHeight - element.scrollTop - element.clientHeight;

      // Load more when near bottom
      if (scrollBottom < 50 && !this.loadingMore && this.hasMore) {
        this.$emit('load-more');
      }
    }
  }
};
</script>

<style scoped>
.conversation-list {
  @apply flex flex-col h-full bg-white border-r border-gray-200;
  width: 100%;
  max-width: 350px;
}

.search-bar {
  @apply p-3 border-b border-gray-200 bg-white;
}

.search-input-wrapper {
  @apply relative;
}

.search-icon {
  @apply absolute left-3 top-1/2 transform -translate-y-1/2;
  @apply w-5 h-5 text-gray-400;
  pointer-events: none;
}

.search-input {
  @apply w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg;
  @apply focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent;
}

.clear-search {
  @apply absolute right-3 top-1/2 transform -translate-y-1/2;
  @apply text-gray-400 hover:text-gray-600;
}

.conversations-container {
  @apply flex-1 overflow-y-auto;
}

.loading-state,
.empty-state {
  @apply flex flex-col items-center justify-center h-full p-6 text-center;
}

.loading-more {
  @apply flex items-center justify-center py-4;
}

/* Custom scrollbar */
.conversations-container::-webkit-scrollbar {
  width: 6px;
}

.conversations-container::-webkit-scrollbar-track {
  @apply bg-gray-50;
}

.conversations-container::-webkit-scrollbar-thumb {
  @apply bg-gray-300 rounded-full;
}

.conversations-container::-webkit-scrollbar-thumb:hover {
  @apply bg-gray-400;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .conversation-list {
    max-width: 100%;
  }
}
</style>
