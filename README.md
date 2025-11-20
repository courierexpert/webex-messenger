# Webex SMS Messenger

A real-time SMS messenger widget for Webex Interact API, built with Vue 2 and Laravel.

## Overview

This project provides a complete messenger solution similar to WhatsApp Web or Facebook Messenger, allowing real-time SMS communication with customers through the Webex Interact API.

### Features

✅ **Real-time Messaging** - WebSocket-powered instant message delivery
✅ **Minimizable Widget** - Unobtrusive floating button that expands to full messenger
✅ **Mobile Responsive** - Adapts from desktop widget to mobile fullscreen
✅ **Message Status** - Visual indicators for queued, delivered, and failed messages
✅ **Unread Badges** - Clear indication of unread message counts
✅ **Search** - Quick search through conversations
✅ **Pagination** - Efficient loading of message history
✅ **Conversation List** - Organized view of all SMS threads
✅ **Notifications** - Toast notifications for new messages

## Quick Start

### Prerequisites

- Node.js 16+
- Laravel 9+ backend
- Pusher account (for WebSocket broadcasting)

### Installation

```bash
# Install dependencies
npm install

# Build for development
npm run dev

# Build for production
npm run build
```

### Basic Usage

```html
<div id="messenger-app"></div>

<script src="/build/assets/app.js" type="module"></script>
<script type="module">
  import { MessengerWidget } from '/build/assets/app.js';
  import Vue from 'vue';

  new Vue({
    el: '#messenger-app',
    components: { MessengerWidget },
    template: `
      <MessengerWidget
        :token="authToken"
        :pusher-config="{ key: 'your-key', cluster: 'eu' }"
      />
    `,
    data() {
      return {
        authToken: 'your-bearer-token'
      };
    }
  });
</script>
```

## Documentation

- **[CLAUDE.md](./CLAUDE.md)** - Complete backend/frontend developer guide
- **[INTEGRATION.md](./INTEGRATION.md)** - Detailed integration instructions
- **[Demo](./resources/views/messenger-demo.html)** - Working example

## Project Structure

```
webex-messenger/
├── resources/
│   ├── js/
│   │   ├── components/
│   │   │   └── Messenger/          # Vue components
│   │   ├── services/
│   │   │   ├── api.js              # HTTP API client
│   │   │   └── echo.js             # WebSocket config
│   │   └── app.js                  # Entry point
│   ├── css/
│   │   └── app.css                 # Tailwind CSS
│   └── views/
│       └── messenger-demo.html     # Demo page
├── package.json                    # Dependencies
├── vite.config.js                  # Build config
├── tailwind.config.js              # Tailwind config
├── CLAUDE.md                       # Developer guide
├── INTEGRATION.md                  # Integration guide
└── README.md                       # This file
```

## Components

### Core Components

- **MessengerWidget** - Main minimizable widget container
- **ConversationList** - Sidebar with conversation list and search
- **MessageThread** - Message view with header and input
- **MessageList** - Scrollable message history
- **MessageBubble** - Individual message with status
- **MessageInput** - Text input with send button

### Services

- **API Service** - Axios-based HTTP client for Webex endpoints
- **Echo Service** - Laravel Echo WebSocket configuration

## API Endpoints

The widget connects to these backend endpoints:

- `GET /api/webex/conversations/contacts` - Get conversations list
- `GET /api/webex/conversations/{phone}` - Get conversation history
- `POST /api/webex/conversations/{phone}/send` - Send message
- `POST /api/webex/conversations/{phone}/read` - Mark as read

See [CLAUDE.md](./CLAUDE.md) for complete API documentation.

## WebSocket Events

The widget listens to these real-time events:

- `private-conversation.{id}` → `message.received` - New/updated message
- `private-conversation.{id}` → `conversation.updated` - Conversation metadata
- `private-webex.admin` → `message.received` - All messages (admin view)
- `private-webex.admin` → `conversation.updated` - All conversations (admin view)

## Configuration

### Environment Variables

```env
VUE_APP_PUSHER_KEY=your-pusher-app-key
VUE_APP_PUSHER_CLUSTER=eu
VUE_APP_API_BASE_URL=/api/webex
```

### Pusher Setup

1. Create account at https://pusher.com
2. Create new app
3. Update `.env` with credentials
4. Configure Laravel broadcasting

## Development

```bash
# Install dependencies
npm install

# Development mode (hot reload)
npm run dev

# Watch mode (auto-rebuild)
npm run watch

# Production build
npm run build
```

## Customization

### Colors

Edit `tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      primary: {
        500: '#3b82f6', // Your brand color
        // ...
      }
    }
  }
}
```

### Components

All components are in `resources/js/components/Messenger/` and can be customized.

## Mobile Responsive

The widget automatically adapts:

- **Desktop**: 800x600px floating widget
- **Tablet**: 600x500px floating widget
- **Mobile**: Full-screen overlay

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Troubleshooting

### Widget not appearing
- Check browser console for errors
- Verify assets built in `public/build/`
- Confirm auth token is valid

### WebSocket not connecting
- Check Pusher credentials in `.env`
- Verify Laravel broadcasting enabled
- Test at pusher.com/docs/channels/getting_started

### Messages not updating
- Check WebSocket connection in DevTools → Network → WS
- Verify channel subscriptions
- Review Laravel logs

## Security

- ✅ HTTPS required in production
- ✅ Bearer token authentication
- ✅ Private channel authorization
- ✅ CORS configuration
- ✅ Input sanitization

## Performance

- Lazy loading of conversations
- Message pagination (50 per page)
- Debounced search (300ms)
- Virtual scrolling ready
- WebSocket instead of polling

## License

Proprietary - CourierExpert

## Support

- **Backend Issues**: Check Laravel logs
- **Frontend Issues**: Check browser console
- **WebSocket Issues**: Check Pusher dashboard

For detailed documentation, see [CLAUDE.md](./CLAUDE.md) and [INTEGRATION.md](./INTEGRATION.md).
