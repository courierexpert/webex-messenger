# Webex Messenger Backend - Frontend Developer Guide

## Overview

This document explains how the Webex SMS Messenger system works on the backend. Our messenger allows real-time SMS communication with customers through the Webex Interact API, similar to WhatsApp Web or Facebook Messenger.

## Architecture Overview

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Frontend  │ ◄─────► │   Laravel    │ ◄─────► │   Webex     │
│   (Vue 2)   │  REST/  │   Backend    │  HTTP   │  Interact   │
│             │  WebSoc │              │         │     API     │
└─────────────┘         └──────────────┘         └─────────────┘
                               │
                               │
                        ┌──────▼──────┐
                        │   Database  │
                        │   (MySQL)   │
                        └─────────────┘
```

## Key Concepts

### 1. Conversations
A `Conversation` represents an SMS thread with a specific phone number. Each conversation:
- Has a unique customer phone number
- Tracks the last message timestamp
- Maintains an unread count
- Contains multiple messages

**Database Table:** `webex_sms_conversations`

### 2. Messages
A `Message` is a single SMS in either direction (inbound or outbound). Each message:
- Belongs to a conversation
- Has a direction (`inbound` or `outbound`)
- Has a status (`queued`, `delivered`, `failed`, `inbound`)
- Contains the message body and metadata

**Database Table:** `webex_sms_messages`

### 3. Real-time Broadcasting
The system uses Laravel Broadcasting to push real-time updates to the frontend via WebSockets. Two main events:
- `MessageReceived` - When a new message is created or updated
- `ConversationUpdated` - When conversation metadata changes

## Database Schema

### webex_sms_conversations
```sql
id                  BIGINT (Primary Key)
phone_number        VARCHAR - Customer phone number (e.g., +447415072633)
inbound_number      VARCHAR - Your Webex number (e.g., +447860009097)
last_message_at     TIMESTAMP - When the last message occurred
last_direction      VARCHAR - 'inbound' or 'outbound'
unread_count        INT - Number of unread messages
created_at          TIMESTAMP
updated_at          TIMESTAMP

UNIQUE INDEX: (phone_number, inbound_number)
INDEX: last_message_at
```

### webex_sms_messages
```sql
id                          BIGINT (Primary Key)
sms_conversation_id         BIGINT (Foreign Key → webex_sms_conversations)
direction                   VARCHAR - 'inbound' or 'outbound'
status                      VARCHAR - 'queued', 'delivered', 'failed', 'inbound'
body                        TEXT - Message content
from                        VARCHAR - Sender phone number
to                          VARCHAR - Recipient phone number
provider                    VARCHAR - 'webex_interact'
provider_event_id           VARCHAR - Webex event ID (evt_...)
provider_transaction_id     VARCHAR - Webex transaction ID (tid_...)
provider_correlation_id     VARCHAR - Custom tracking ID
provider_campaign_id        VARCHAR - Webex campaign ID
provider_campaign_name      VARCHAR - Webex campaign name
raw_payload                 JSON - Full webhook payload from Webex
occurred_at                 TIMESTAMP - When the message actually occurred
created_at                  TIMESTAMP
updated_at                  TIMESTAMP

INDEXES: conversation_id, direction, status, occurred_at, transaction_id, correlation_id, event_id
```

## Message Flow

### Outbound Messages (You → Customer)

```
Frontend                  Backend                   Webex API              Webhook
   │                         │                          │                      │
   │─1. POST /conversations/ │                          │                      │
   │   {phone}/send          │                          │                      │
   │──────────────────────►  │                          │                      │
   │                         │                          │                      │
   │                         │─2. POST /v1/sms/         │                      │
   │                         │────────────────────────► │                      │
   │                         │                          │                      │
   │                         │ ◄3. 200 OK {tx_id}────── │                      │
   │                         │                          │                      │
   │                         │─4. Create SmsMessage─┐   │                      │
   │                         │   status: 'queued'   │   │                      │
   │ ◄5. 200 OK──────────────│                      │   │                      │
   │                         │                      │   │                      │
   │ ◄6. WebSocket──────────│◄─Broadcast MessageReceived│                      │
   │   'message.received'    │                      │   │                      │
   │                         │                      │   │                      │
   │                         │                      └───┼──►Database           │
   │                         │                          │                      │
   │                         │ ◄─────────────────────────────7. POST /webhook  │
   │                         │                          │   {status:delivered} │
   │                         │                          │                      │
   │                         │─8. Update SmsMessage──┐  │                      │
   │                         │   status: 'delivered' │  │                      │
   │                         │                       │  │                      │
   │ ◄9. WebSocket──────────│◄─Broadcast MessageReceived                       │
   │   'message.received'    │                       │  │                      │
   │   (status update)       │                       └──┼──►Database           │
   │                         │                          │                      │
```

**Steps:**
1. Frontend sends message via API
2. Backend calls Webex API to send SMS
3. Webex returns transaction_id
4. Backend creates message record with status `queued`
5. Frontend receives API success response
6. WebSocket event broadcasts the new message
7. Webex webhook arrives with delivery status
8. Backend updates message status to `delivered`
9. WebSocket event broadcasts the status update

### Inbound Messages (Customer → You)

```
Customer             Webex API              Backend                 Frontend
   │                     │                      │                       │
   │─1. Sends SMS────►   │                      │                       │
   │                     │                      │                       │
   │                     │─2. POST /webhook──► │                       │
   │                     │   {inbound msg}      │                       │
   │                     │                      │                       │
   │                     │                      │─3. Find/Create────┐   │
   │                     │                      │   Conversation    │   │
   │                     │                      │                   │   │
   │                     │                      │─4. Create─────────┤   │
   │                     │                      │   SmsMessage      │   │
   │                     │                      │   direction:      │   │
   │                     │                      │   'inbound'       │   │
   │                     │                      │                   │   │
   │                     │                      │─5. Increment──────┤   │
   │                     │                      │   unread_count    │   │
   │                     │                      │                   │   │
   │                     │ ◄6. 200 OK───────────│                   │   │
   │                     │                      │                   └───┼──►Database
   │                     │                      │                       │
   │                     │                      │─7. Broadcast──────────┼──►WebSocket
   │                     │                      │   MessageReceived     │   'message.received'
   │                     │                      │                       │
   │                     │                      │─8. Broadcast──────────┼──►WebSocket
   │                     │                      │   ConversationUpdated │   'conversation.updated'
   │                     │                      │                       │
```

**Steps:**
1. Customer sends SMS to your Webex number
2. Webex webhook delivers message to backend
3. Backend finds or creates conversation
4. Backend creates message record with direction `inbound`
5. Backend increments conversation's unread_count
6. Backend responds 200 OK to Webex
7. WebSocket broadcasts MessageReceived event
8. WebSocket broadcasts ConversationUpdated event

## API Endpoints

Base URL: `/api/webex`

### Conversations & Messenger

#### GET `/conversations/contacts`
Get all contacts merged with conversation data (for the contacts list)

**Query Parameters:**
- `query` (optional): Search by phone number
- `page` (optional): Page number (default: 1)
- `per_page` (optional): Items per page (default: 50)

**Response:**
```json
{
  "success": true,
  "data": {
    "contacts": [
      {
        "id": "CON_...",
        "first_name": "John",
        "last_name": "Doe",
        "full_name": "John Doe",
        "phone_number": "+447415072633",
        "email": "john@example.com",
        "opt_in_status": "opted_in",
        "tags": ["driver"],
        "has_conversation": true,
        "conversation_id": 4,
        "last_message_at": "2025-11-20T12:09:59Z",
        "last_direction": "outbound",
        "unread_count": 2,
        "last_message_preview": "Hi Chris! Testing instant message..."
      }
    ],
    "pagination": {
      "total_count": 100,
      "page": 1,
      "per_page": 50,
      "has_more": true
    }
  }
}
```

#### GET `/conversations/{phoneNumber}`
Get conversation history for a specific phone number

**Path Parameters:**
- `phoneNumber`: Customer phone number (e.g., +447415072633)

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `per_page` (optional): Items per page (default: 50)

**Response:**
```json
{
  "success": true,
  "data": {
    "conversation": {
      "id": 4,
      "phone_number": "+447415072633",
      "inbound_number": "+447860009097",
      "last_message_at": "2025-11-20T12:09:59Z",
      "last_direction": "outbound",
      "unread_count": 0
    },
    "messages": [
      {
        "id": 8,
        "direction": "outbound",
        "status": "delivered",
        "body": "Hi Chris! Testing instant message creation.",
        "from": "+447860009097",
        "to": "+447415072633",
        "occurred_at": "2025-11-20T12:09:59Z",
        "created_at": "2025-11-20T12:09:57Z"
      },
      {
        "id": 7,
        "direction": "inbound",
        "status": "inbound",
        "body": "Hello, I need help with my delivery",
        "from": "+447415072633",
        "to": "+447860009097",
        "occurred_at": "2025-11-20T11:30:00Z",
        "created_at": "2025-11-20T11:30:00Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "per_page": 50,
      "total": 2,
      "last_page": 1,
      "has_more": false
    }
  }
}
```

**Note:** Messages are ordered by `occurred_at DESC` (most recent first)

#### POST `/conversations/{phoneNumber}/send`
Send a message to a conversation

**Path Parameters:**
- `phoneNumber`: Customer phone number

**Request Body:**
```json
{
  "message": "Hello! How can I help you?",
  "correlation_id": "optional-tracking-id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "conversation_id": 4,
    "request_id": "req_...",
    "phone_number": "+447415072633"
  }
}
```

#### POST `/conversations/{phoneNumber}/read`
Mark all messages in a conversation as read (resets unread_count to 0)

**Path Parameters:**
- `phoneNumber`: Customer phone number

**Response:**
```json
{
  "success": true,
  "message": "Conversation marked as read",
  "data": {
    "conversation_id": 4,
    "phone_number": "+447415072633",
    "unread_count": 0
  }
}
```

### SMS Direct API

#### POST `/sms/send`
Send SMS to one or more recipients (bypasses conversations)

**Request Body:**
```json
{
  "from": "+447860009097",
  "to": [
    {
      "phone": ["+447415072633"],
      "correlation_id": "optional-id"
    }
  ],
  "message_body": "Hello from Webex!"
}
```

### Contacts API

#### POST `/contacts`
Create a new contact in Webex

#### GET `/contacts/{contactId}`
Get contact details

#### PUT/PATCH `/contacts/{contactId}`
Update contact

#### DELETE `/contacts/{contactId}`
Delete contact

## WebSocket Events

The backend broadcasts real-time events via Laravel Broadcasting. Frontend should listen on these channels:

### Private Channels

#### `private-conversation.{conversationId}`
Subscribe to updates for a specific conversation

**Events:**
- `message.received` - New message or message status update
- `conversation.updated` - Conversation metadata changed

#### `private-webex.admin`
Subscribe to all messenger activity (admin view)

**Events:**
- `message.received` - All messages across all conversations
- `conversation.updated` - All conversation updates

### Event Payloads

#### `message.received`
```javascript
{
  message: {
    id: 8,
    direction: "outbound",
    status: "delivered",
    body: "Hi Chris! Testing instant message creation.",
    from: "+447860009097",
    to: "+447415072633",
    occurred_at: "2025-11-20T12:09:59Z",
    created_at: "2025-11-20T12:09:57Z"
  },
  conversation: {
    id: 4,
    phone_number: "+447415072633",
    inbound_number: "+447860009097",
    last_message_at: "2025-11-20T12:09:59Z",
    last_direction: "outbound",
    unread_count: 0
  }
}
```

#### `conversation.updated`
```javascript
{
  conversation: {
    id: 4,
    phone_number: "+447415072633",
    inbound_number: "+447860009097",
    last_message_at: "2025-11-20T12:09:59Z",
    last_direction: "outbound",
    unread_count: 2
  }
}
```

## Frontend Integration Guide (Vue 2)

### 1. Setting Up WebSocket Connection

```javascript
// In your main.js or app initialization
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

window.Echo = new Echo({
    broadcaster: 'pusher',
    key: process.env.VUE_APP_PUSHER_KEY,
    cluster: process.env.VUE_APP_PUSHER_CLUSTER,
    forceTLS: true,
    authEndpoint: '/broadcasting/auth',
    auth: {
        headers: {
            Authorization: `Bearer ${token}`
        }
    }
});

// Make Echo available in all components
Vue.prototype.$echo = window.Echo;
```

### 2. Listening to Conversation Events

```javascript
// In your conversation component
export default {
  data() {
    return {
      conversationId: null,
      messages: [],
      conversation: null
    };
  },

  mounted() {
    this.subscribeToConversation();
  },

  beforeDestroy() {
    this.unsubscribeFromConversation();
  },

  methods: {
    subscribeToConversation() {
      if (!this.conversationId) return;

      this.$echo.private(`conversation.${this.conversationId}`)
        .listen('.message.received', (event) => {
          console.log('New message:', event.message);

          // Check if message already exists (update) or is new
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
          this.conversation = event.conversation;
        })
        .listen('.conversation.updated', (event) => {
          console.log('Conversation updated:', event.conversation);
          this.conversation = event.conversation;
        });
    },

    unsubscribeFromConversation() {
      if (this.conversationId) {
        this.$echo.leave(`conversation.${this.conversationId}`);
      }
    }
  },

  watch: {
    conversationId(newId, oldId) {
      if (oldId) {
        this.$echo.leave(`conversation.${oldId}`);
      }
      if (newId) {
        this.subscribeToConversation();
      }
    }
  }
};
```

### 3. Listening to All Admin Events

```javascript
// In your messenger widget / inbox component
export default {
  data() {
    return {
      contacts: [],
      activeConversationId: null
    };
  },

  mounted() {
    this.subscribeToAdmin();
  },

  beforeDestroy() {
    this.$echo.leave('webex.admin');
  },

  methods: {
    subscribeToAdmin() {
      this.$echo.private('webex.admin')
        .listen('.message.received', (event) => {
          // Update the contact in the list
          this.updateContactInList(event.conversation);

          // Show notification if not active conversation
          if (this.activeConversationId !== event.conversation.id) {
            this.showNotification(event.message);
          }
        })
        .listen('.conversation.updated', (event) => {
          this.updateContactInList(event.conversation);
        });
    },

    updateContactInList(conversation) {
      const index = this.contacts.findIndex(
        c => c.conversation_id === conversation.id
      );

      if (index !== -1) {
        // Update existing contact
        this.$set(this.contacts, index, {
          ...this.contacts[index],
          last_message_at: conversation.last_message_at,
          last_direction: conversation.last_direction,
          unread_count: conversation.unread_count
        });

        // Re-sort the list (most recent first)
        this.contacts.sort((a, b) => {
          return new Date(b.last_message_at) - new Date(a.last_message_at);
        });
      }
    },

    showNotification(message) {
      // Implement your notification logic
      this.$notify({
        title: 'New Message',
        message: message.body.substring(0, 50),
        type: 'info'
      });
    }
  }
};
```

### 4. Loading Conversations List

```javascript
export default {
  data() {
    return {
      contacts: [],
      pagination: {},
      loading: false,
      searchQuery: ''
    };
  },

  mounted() {
    this.loadContacts();
  },

  methods: {
    async loadContacts(page = 1) {
      this.loading = true;

      try {
        const response = await this.$http.get('/api/webex/conversations/contacts', {
          params: {
            page,
            per_page: 50,
            query: this.searchQuery
          },
          headers: {
            'Authorization': `Bearer ${this.token}`
          }
        });

        if (response.data.success) {
          this.contacts = response.data.data.contacts;
          this.pagination = response.data.data.pagination;
        }
      } catch (error) {
        console.error('Failed to load contacts:', error);
        this.$notify({
          title: 'Error',
          message: 'Failed to load conversations',
          type: 'error'
        });
      } finally {
        this.loading = false;
      }
    },

    loadMore() {
      if (this.pagination.has_more) {
        this.loadContacts(this.pagination.page + 1);
      }
    }
  },

  watch: {
    searchQuery: {
      handler() {
        // Debounce search
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
          this.loadContacts(1);
        }, 300);
      }
    }
  }
};
```

### 5. Loading Conversation Messages

```javascript
export default {
  props: {
    phoneNumber: {
      type: String,
      required: true
    }
  },

  data() {
    return {
      conversation: null,
      messages: [],
      pagination: {},
      loading: false
    };
  },

  mounted() {
    this.loadConversation();
  },

  methods: {
    async loadConversation(page = 1) {
      this.loading = true;

      try {
        const response = await this.$http.get(
          `/api/webex/conversations/${encodeURIComponent(this.phoneNumber)}`,
          {
            params: { page, per_page: 50 },
            headers: { 'Authorization': `Bearer ${this.token}` }
          }
        );

        if (response.data.success) {
          this.conversation = response.data.data.conversation;

          if (page === 1) {
            // First page - replace messages
            this.messages = response.data.data.messages;
          } else {
            // Subsequent pages - append (remember: DESC order)
            this.messages.push(...response.data.data.messages);
          }

          this.pagination = response.data.data.pagination;

          // Subscribe to real-time updates
          if (page === 1) {
            this.subscribeToConversation();
          }

          // Mark as read
          this.markAsRead();
        }
      } catch (error) {
        console.error('Failed to load conversation:', error);
        this.$notify({
          title: 'Error',
          message: 'Failed to load conversation',
          type: 'error'
        });
      } finally {
        this.loading = false;
      }
    },

    loadMoreMessages() {
      if (this.pagination.has_more) {
        this.loadConversation(this.pagination.current_page + 1);
      }
    },

    subscribeToConversation() {
      if (!this.conversation?.id) return;

      this.$echo.private(`conversation.${this.conversation.id}`)
        .listen('.message.received', (event) => {
          const existingIndex = this.messages.findIndex(
            m => m.id === event.message.id
          );

          if (existingIndex !== -1) {
            this.$set(this.messages, existingIndex, event.message);
          } else {
            this.messages.unshift(event.message);
          }
        });
    },

    async markAsRead() {
      try {
        await this.$http.post(
          `/api/webex/conversations/${encodeURIComponent(this.phoneNumber)}/read`,
          {},
          { headers: { 'Authorization': `Bearer ${this.token}` } }
        );
      } catch (error) {
        console.error('Failed to mark as read:', error);
      }
    }
  },

  beforeDestroy() {
    if (this.conversation?.id) {
      this.$echo.leave(`conversation.${this.conversation.id}`);
    }
  }
};
```

### 6. Sending a Message

```javascript
export default {
  data() {
    return {
      messageText: '',
      sending: false
    };
  },

  methods: {
    async sendMessage() {
      if (!this.messageText.trim() || this.sending) return;

      this.sending = true;
      const messageBody = this.messageText.trim();
      this.messageText = ''; // Clear input immediately

      try {
        const response = await this.$http.post(
          `/api/webex/conversations/${encodeURIComponent(this.phoneNumber)}/send`,
          {
            message: messageBody,
            correlation_id: `msg-${Date.now()}`
          },
          {
            headers: { 'Authorization': `Bearer ${this.token}` }
          }
        );

        if (response.data.success) {
          // Message created with status 'queued'
          // WebSocket will broadcast it automatically
          // No need to manually add to messages array
        } else {
          this.$notify({
            title: 'Error',
            message: response.data.message || 'Failed to send message',
            type: 'error'
          });
          // Restore message text on error
          this.messageText = messageBody;
        }
      } catch (error) {
        console.error('Failed to send message:', error);
        this.$notify({
          title: 'Error',
          message: 'Failed to send message',
          type: 'error'
        });
        this.messageText = messageBody;
      } finally {
        this.sending = false;
      }
    }
  }
};
```

### 7. Component Structure Example

```
MessengerWidget.vue (Main container - minimizable)
├── ConversationList.vue (Left sidebar)
│   └── ConversationItem.vue (Individual conversation)
└── MessageThread.vue (Right side)
    ├── MessageList.vue
    │   └── MessageBubble.vue (Individual message)
    └── MessageInput.vue (Send box)
```

### 8. Minimizable Widget Example

```vue
<template>
  <div class="messenger-widget" :class="{ 'minimized': isMinimized }">
    <!-- Minimized state - floating button -->
    <div v-if="isMinimized" class="messenger-button" @click="toggleMinimize">
      <i class="fa fa-comment"></i>
      <span v-if="totalUnread > 0" class="badge">{{ totalUnread }}</span>
    </div>

    <!-- Expanded state - full messenger -->
    <div v-else class="messenger-container">
      <div class="messenger-header">
        <h3>Messages</h3>
        <button @click="toggleMinimize" class="btn-minimize">
          <i class="fa fa-minus"></i>
        </button>
      </div>

      <div class="messenger-body">
        <ConversationList
          :contacts="contacts"
          :active-conversation="activeConversation"
          @select="selectConversation"
        />

        <MessageThread
          v-if="activeConversation"
          :phone-number="activeConversation.phone_number"
          @back="activeConversation = null"
        />
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      isMinimized: true,
      contacts: [],
      activeConversation: null,
      totalUnread: 0
    };
  },

  computed: {
    totalUnread() {
      return this.contacts.reduce((sum, c) => sum + (c.unread_count || 0), 0);
    }
  },

  methods: {
    toggleMinimize() {
      this.isMinimized = !this.isMinimized;
    },

    selectConversation(contact) {
      this.activeConversation = contact;
    }
  }
};
</script>

<style scoped>
.messenger-widget {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9999;
}

.messenger-widget.minimized {
  width: 60px;
  height: 60px;
}

.messenger-button {
  @apply w-14 h-14 bg-blue-600 rounded-full shadow-lg cursor-pointer;
  @apply flex items-center justify-center text-white text-xl;
  @apply hover:bg-blue-700 transition-colors;
  position: relative;
}

.messenger-button .badge {
  @apply absolute -top-1 -right-1 bg-red-500 text-white;
  @apply text-xs font-bold rounded-full w-5 h-5;
  @apply flex items-center justify-center;
}

.messenger-container {
  @apply bg-white rounded-lg shadow-2xl;
  width: 400px;
  height: 600px;
  display: flex;
  flex-direction: column;
}

.messenger-header {
  @apply bg-blue-600 text-white px-4 py-3 flex justify-between items-center;
  @apply rounded-t-lg;
}

.messenger-body {
  @apply flex-1 flex overflow-hidden;
}

/* Mobile responsive using JavaScript viewport detection */
@media (max-width: 768px) {
  .messenger-widget:not(.minimized) {
    /* Use JavaScript to set these dynamically */
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    width: 100% !important;
    height: 100% !important;
  }

  .messenger-container {
    width: 100% !important;
    height: 100% !important;
    border-radius: 0 !important;
  }
}
</style>
```

### 9. Mobile Viewport Handling (JavaScript)

```javascript
// In your MessengerWidget component
export default {
  data() {
    return {
      isMobile: false
    };
  },

  mounted() {
    this.checkMobile();
    window.addEventListener('resize', this.checkMobile);
  },

  beforeDestroy() {
    window.removeEventListener('resize', this.checkMobile);
  },

  methods: {
    checkMobile() {
      // Use JavaScript to detect viewport size
      this.isMobile = window.innerWidth <= 768;

      // Apply dynamic styles for mobile
      if (!this.isMinimized && this.isMobile) {
        const widget = this.$el;
        widget.style.position = 'fixed';
        widget.style.top = '0';
        widget.style.left = '0';
        widget.style.right = '0';
        widget.style.bottom = '0';
        widget.style.width = '100%';
        widget.style.height = '100%';
      }
    }
  }
};
```

## Message Status Flow

Understanding message statuses is crucial for UI feedback:

### Outbound Message Lifecycle
1. **`queued`** - Message created, sent to Webex, waiting for delivery
   - Show: Loading spinner or clock icon
2. **`delivered`** - Webex confirmed delivery to carrier
   - Show: Double checkmark ✓✓
3. **`failed`** - Delivery failed (invalid number, carrier rejection, etc.)
   - Show: Error icon ⚠️

### Inbound Messages
- Always have status **`inbound`**
- No status indicator needed

## Important Notes for Frontend

### 1. Model Events Auto-Dispatch
The `SmsMessage` model automatically dispatches `MessageReceived` event on **both** `created` and `updated`. This means:
- When you send a message, you'll receive a WebSocket event immediately (status: `queued`)
- When the webhook updates the status, you'll receive another WebSocket event (status: `delivered`)

**UI Implication:** Update the same message in your state, don't add a duplicate. Use message `id` as the key.

### 2. Message Ordering
- API returns messages in **DESC** order (newest first)
- Use `occurred_at` for sorting, not `created_at`
- `occurred_at` reflects when the message actually happened
- `created_at` reflects when our backend recorded it

### 3. Idempotency
- Webhooks may arrive multiple times
- Backend handles deduplication via `provider_event_id`
- Frontend should handle duplicate WebSocket events gracefully (use message `id` as key in v-for)

### 4. Unread Count
- Only incremented for **inbound** messages
- Reset to 0 when conversation is marked as read
- Updated automatically via `ConversationUpdated` event

### 5. Conversation Creation
- Conversations are created automatically when:
  - First inbound message from a phone number arrives
  - You send a message to a phone number (via `/conversations/{phone}/send`)
- No need to manually create conversations

### 6. Phone Number Format
- Always stored and used in E.164 format: `+447415072633`
- URL encode when passing as path parameter: `encodeURIComponent(phoneNumber)`

### 7. WebSocket Cleanup
Always unsubscribe from channels in `beforeDestroy`:
```javascript
beforeDestroy() {
  if (this.conversationId) {
    this.$echo.leave(`conversation.${this.conversationId}`);
  }
  this.$echo.leave('webex.admin');
}
```

## Error Handling

All API endpoints follow a consistent error format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "message",
      "message": "The message field is required",
      "code": 10006
    }
  ]
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `207` - Partial Success (some messages sent, some failed)
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `422` - Validation Error
- `500` - Server Error
- `503` - Service Unavailable (Webex API down)

### Frontend Error Handling Example

```javascript
async sendMessage() {
  try {
    const response = await this.$http.post(/* ... */);

    if (response.data.success) {
      // Success
    } else {
      // API returned success: false
      this.handleError(response.data);
    }
  } catch (error) {
    // Network error or HTTP error status
    if (error.response) {
      // Server responded with error status
      this.handleError(error.response.data);
    } else {
      // Network error
      this.$notify({
        title: 'Network Error',
        message: 'Unable to connect to server',
        type: 'error'
      });
    }
  }
}

handleError(data) {
  const message = data.message || 'An error occurred';
  const errors = data.errors || [];

  // Show main error message
  this.$notify({
    title: 'Error',
    message: message,
    type: 'error'
  });

  // Log detailed errors for debugging
  if (errors.length > 0) {
    console.error('Validation errors:', errors);
  }
}
```

## Testing

### Test SMS Endpoint
Use `/api/webex/sms/test` to validate your integration without sending actual messages.

### Example Test Request
```bash
curl -X POST http://localhost/api/webex/sms/test \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "to": [{"phone": ["+447415072633"]}],
    "message_body": "Test message"
  }'
```

## Performance Optimization

### 1. Lazy Loading Messages
Only load initial 50 messages, then load more on scroll:

```javascript
methods: {
  onScroll(event) {
    const element = event.target;
    // If scrolled near top (loading older messages)
    if (element.scrollTop < 100 && !this.loading && this.pagination.has_more) {
      this.loadMoreMessages();
    }
  }
}
```

### 2. Debounce Search
Prevent excessive API calls during search:

```javascript
watch: {
  searchQuery: {
    handler() {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        this.loadContacts(1);
      }, 300);
    }
  }
}
```

### 3. Virtual Scrolling
For conversations with 1000+ messages, use virtual scrolling library like `vue-virtual-scroller`:

```bash
npm install vue-virtual-scroller
```

```vue
<template>
  <RecycleScroller
    :items="messages"
    :item-size="60"
    key-field="id"
    v-slot="{ item }"
  >
    <MessageBubble :message="item" />
  </RecycleScroller>
</template>
```

## File Reference

### Backend Files
- **Service:** `app/Services/Webex/WebexService.php` - Main Webex API integration
- **Webhook Handler:** `app/Services/Webex/Webhooks/WebexSmsWebhookService.php` - Processes incoming webhooks
- **Controller:** `app/Http/Controllers/Api/Webex/WebexController.php` - API endpoints
- **Routes:** `routes/webex/api.php` - API route definitions
- **Models:**
  - `app/Models/Webex/SmsConversation.php` - Conversation model
  - `app/Models/Webex/SmsMessage.php` - Message model
- **Events:**
  - `app/Events/Webex/MessageReceived.php` - Message broadcast event
  - `app/Events/Webex/ConversationUpdated.php` - Conversation broadcast event
- **Migrations:**
  - `database/migrations/2025_11_20_051947_create_sms_conversations_table.php`
  - `database/migrations/2025_11_20_052004_create_sms_messages_table.php`

## Backend Session Summary

### Completed Features
- Fixed duplicate conversation creation
- Implemented immediate message creation (no webhook delay)
- Auto-dispatch events from models
- Created ConversationUpdated event for real-time UI
- Captured transaction_id from Webex API
- Comprehensive testing of all endpoints

### Test Results
All 4 API endpoints working:
1. GET contacts with conversation status
2. GET conversation history
3. POST send message (instant + real-time)
4. POST mark as read

### Ready for Frontend
Backend is production-ready with:
- Real-time broadcasting
- Instant message feedback
- No duplicates
- Proper conversation management

## Next Steps / Future Improvements

Potential enhancements for the messenger:

1. **Typing Indicators** - Show when user is typing
2. **Message Read Receipts** - Track when customer reads messages
3. **File Attachments** - Send images/PDFs via MMS
4. **Message Templates** - Quick reply templates
5. **Auto-Responders** - Automated responses for common queries
6. **Message Search** - Full-text search across all conversations
7. **Message Reactions** - React to messages with emoji
8. **Conversation Assignment** - Assign conversations to team members
9. **Conversation Tags** - Tag conversations (urgent, resolved, etc.)
10. **Analytics Dashboard** - Message volume, response times, etc.

## Support

For questions or issues:
- Backend code: `app/Services/Webex/`
- API routes: `routes/webex/api.php`
- Database: Migrations in `database/migrations/*sms*.php`
- Webex API Docs: https://docs.webexinteract.com/

---

**Last Updated:** 2025-11-20
**Version:** 1.0
**Maintainer:** CourierExpert Backend Team
