<template>
  <div class="message-bubble" :class="messageClasses">
    <div class="message-content">
      <p class="message-text">{{ message.body }}</p>
      <div class="message-meta">
        <span class="message-time">{{ formattedTime }}</span>
        <span v-if="isOutbound" class="message-status">
          <span v-if="message.status === 'queued'" class="status-icon status-queued" title="Sending">
            ⏱️
          </span>
          <span v-else-if="message.status === 'delivered'" class="status-icon status-delivered" title="Delivered">
            ✓✓
          </span>
          <span v-else-if="message.status === 'failed'" class="status-icon status-failed" title="Failed">
            ⚠️
          </span>
        </span>
      </div>
    </div>
  </div>
</template>

<script>
import { format, isToday, isYesterday } from 'date-fns';

export default {
  name: 'MessageBubble',

  props: {
    message: {
      type: Object,
      required: true
    }
  },

  computed: {
    isOutbound() {
      return this.message.direction === 'outbound';
    },

    messageClasses() {
      return {
        'message-outbound': this.isOutbound,
        'message-inbound': !this.isOutbound,
        [`status-${this.message.status}`]: true
      };
    },

    formattedTime() {
      const messageDate = new Date(this.message.occurred_at || this.message.created_at);

      if (isToday(messageDate)) {
        return format(messageDate, 'HH:mm');
      } else if (isYesterday(messageDate)) {
        return 'Yesterday ' + format(messageDate, 'HH:mm');
      } else {
        return format(messageDate, 'MMM d, HH:mm');
      }
    }
  }
};
</script>

<style scoped>
.message-bubble {
  @apply flex mb-3;
}

.message-bubble.message-outbound {
  @apply justify-end;
}

.message-bubble.message-inbound {
  @apply justify-start;
}

.message-content {
  @apply max-w-[70%] rounded-lg px-4 py-2 shadow-sm;
}

.message-outbound .message-content {
  @apply bg-primary-500 text-white;
}

.message-inbound .message-content {
  @apply bg-gray-100 text-gray-900;
}

.message-text {
  @apply whitespace-pre-wrap break-words mb-1;
}

.message-meta {
  @apply flex items-center justify-end gap-1 text-xs;
}

.message-outbound .message-meta {
  @apply text-blue-100;
}

.message-inbound .message-meta {
  @apply text-gray-500;
}

.message-time {
  @apply font-normal;
}

.status-icon {
  @apply inline-block;
}

.status-queued {
  @apply opacity-70;
}

.status-delivered {
  @apply text-blue-100;
}

.status-failed {
  @apply text-red-300;
}

/* Animations */
.message-bubble.status-queued .message-content {
  @apply opacity-80;
}
</style>
