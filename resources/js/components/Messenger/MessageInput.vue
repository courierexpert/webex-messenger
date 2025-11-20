<template>
  <div class="message-input">
    <form @submit.prevent="handleSend" class="input-form">
      <textarea
        ref="textarea"
        v-model="messageText"
        :placeholder="placeholder"
        :disabled="disabled || sending"
        class="message-textarea"
        rows="1"
        @keydown.enter.exact.prevent="handleSend"
        @input="adjustHeight"
      ></textarea>

      <button
        type="submit"
        :disabled="!canSend"
        class="send-button"
        :class="{ 'sending': sending }"
      >
        <span v-if="!sending">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
          </svg>
        </span>
        <span v-else>
          <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </span>
      </button>
    </form>
  </div>
</template>

<script>
export default {
  name: 'MessageInput',

  props: {
    placeholder: {
      type: String,
      default: 'Type a message...'
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },

  data() {
    return {
      messageText: '',
      sending: false
    };
  },

  computed: {
    canSend() {
      return this.messageText.trim().length > 0 && !this.sending && !this.disabled;
    }
  },

  mounted() {
    this.adjustHeight();
  },

  methods: {
    async handleSend() {
      if (!this.canSend) return;

      const message = this.messageText.trim();
      this.messageText = '';
      this.sending = true;

      // Reset textarea height
      this.$nextTick(() => {
        this.adjustHeight();
      });

      try {
        this.$emit('send', message);
      } catch (error) {
        console.error('Error sending message:', error);
        // Restore message on error
        this.messageText = message;
        this.$emit('error', error);
      } finally {
        this.sending = false;
      }
    },

    adjustHeight() {
      const textarea = this.$refs.textarea;
      if (!textarea) return;

      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';

      // Set new height based on scrollHeight (max 150px)
      const newHeight = Math.min(textarea.scrollHeight, 150);
      textarea.style.height = newHeight + 'px';
    },

    focus() {
      this.$refs.textarea?.focus();
    }
  }
};
</script>

<style scoped>
.message-input {
  @apply border-t border-gray-200 bg-white p-4;
}

.input-form {
  @apply flex items-end gap-2;
}

.message-textarea {
  @apply flex-1 resize-none rounded-lg border border-gray-300;
  @apply px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent;
  @apply disabled:bg-gray-100 disabled:cursor-not-allowed;
  min-height: 40px;
  max-height: 150px;
}

.send-button {
  @apply bg-primary-500 text-white rounded-lg p-2;
  @apply hover:bg-primary-600 transition-colors;
  @apply disabled:bg-gray-300 disabled:cursor-not-allowed;
  @apply flex items-center justify-center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
}

.send-button.sending {
  @apply bg-primary-400;
}
</style>
