<template>
  <div
    class="conversation-item"
    :class="{ 'active': isActive }"
    @click="$emit('select', contact)"
  >
    <div class="conversation-avatar">
      <div class="avatar-circle">
        {{ initials }}
      </div>
      <span v-if="contact.unread_count > 0" class="unread-badge">
        {{ unreadDisplay }}
      </span>
    </div>

    <div class="conversation-content">
      <div class="conversation-header">
        <h4 class="conversation-name">{{ displayName }}</h4>
        <span class="conversation-time">{{ formattedTime }}</span>
      </div>

      <div class="conversation-preview">
        <p class="preview-text">
          <span v-if="contact.last_direction === 'outbound'" class="outbound-indicator">
            You:
          </span>
          {{ previewText }}
        </p>
      </div>
    </div>
  </div>
</template>

<script>
import { formatDistanceToNow } from 'date-fns';

export default {
  name: 'ConversationItem',

  props: {
    contact: {
      type: Object,
      required: true
    },
    isActive: {
      type: Boolean,
      default: false
    }
  },

  computed: {
    displayName() {
      if (this.contact.full_name && this.contact.full_name.trim()) {
        return this.contact.full_name;
      }
      return this.contact.phone_number || 'Unknown';
    },

    initials() {
      if (this.contact.full_name) {
        const parts = this.contact.full_name.trim().split(' ');
        if (parts.length >= 2) {
          return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return parts[0][0].toUpperCase();
      }
      return this.contact.phone_number ? this.contact.phone_number[0] : '?';
    },

    formattedTime() {
      if (!this.contact.last_message_at) return '';

      try {
        return formatDistanceToNow(new Date(this.contact.last_message_at), {
          addSuffix: true
        });
      } catch (e) {
        return '';
      }
    },

    previewText() {
      if (this.contact.last_message_preview) {
        return this.contact.last_message_preview.length > 50
          ? this.contact.last_message_preview.substring(0, 50) + '...'
          : this.contact.last_message_preview;
      }
      return 'No messages yet';
    },

    unreadDisplay() {
      return this.contact.unread_count > 99 ? '99+' : this.contact.unread_count;
    }
  }
};
</script>

<style scoped>
.conversation-item {
  @apply flex items-start p-3 cursor-pointer transition-colors;
  @apply hover:bg-gray-50 border-b border-gray-100;
}

.conversation-item.active {
  @apply bg-blue-50 hover:bg-blue-50;
}

.conversation-avatar {
  @apply relative mr-3 flex-shrink-0;
}

.avatar-circle {
  @apply w-12 h-12 rounded-full bg-primary-500 text-white;
  @apply flex items-center justify-center font-semibold text-sm;
}

.unread-badge {
  @apply absolute -top-1 -right-1 bg-red-500 text-white;
  @apply text-xs font-bold rounded-full min-w-[20px] h-5 px-1;
  @apply flex items-center justify-center;
}

.conversation-content {
  @apply flex-1 min-w-0;
}

.conversation-header {
  @apply flex justify-between items-baseline mb-1;
}

.conversation-name {
  @apply font-semibold text-gray-900 text-sm truncate mr-2;
}

.conversation-time {
  @apply text-xs text-gray-500 flex-shrink-0;
}

.conversation-preview {
  @apply text-sm text-gray-600;
}

.preview-text {
  @apply truncate;
}

.outbound-indicator {
  @apply text-gray-500 mr-1;
}

.conversation-item.active .conversation-name {
  @apply text-primary-700;
}
</style>
