# Webex Messenger Frontend Integration Guide

This guide explains how to integrate the Webex Messenger widget into your application.

## Prerequisites

- Node.js 16+ and npm
- Laravel backend with Webex Messenger API (see CLAUDE.md)
- Pusher account for WebSocket broadcasting

## Installation

### 1. Install Dependencies

```bash
npm install
```

This will install:
- Vue 2.7
- Laravel Echo & Pusher
- Axios for HTTP requests
- Tailwind CSS for styling
- date-fns for date formatting
- Vite for building

### 2. Environment Configuration

Create a `.env` file in your project root (or add to existing):

```env
VUE_APP_PUSHER_KEY=your-pusher-app-key
VUE_APP_PUSHER_CLUSTER=eu
VUE_APP_API_BASE_URL=/api/webex
```

### 3. Build Assets

Development mode (with hot reload):
```bash
npm run dev
```

Production build:
```bash
npm run build
```

Watch mode (auto-rebuild on changes):
```bash
npm run watch
```

## Integration Methods

### Method 1: Direct Vue Component (Recommended)

Use this method if you're already using Vue in your application.

```html
<!-- In your HTML/Blade template -->
<div id="messenger-app"></div>

<script src="/build/assets/app.js" type="module"></script>
```

```javascript
// In your JavaScript
import { MessengerWidget } from '/build/assets/app.js';
import Vue from 'vue';

new Vue({
  el: '#messenger-app',
  components: { MessengerWidget },
  template: `
    <MessengerWidget
      :token="authToken"
      :pusher-config="pusherConfig"
      :minimized="true"
      @toggle="onToggle"
    />
  `,
  data() {
    return {
      authToken: 'your-bearer-token',
      pusherConfig: {
        key: 'your-pusher-key',
        cluster: 'eu'
      }
    };
  },
  methods: {
    onToggle(isMinimized) {
      console.log('Widget toggled:', isMinimized);
    }
  }
});
```

### Method 2: Laravel Blade Component

If you're using Laravel Blade, you can create a reusable component.

Create `resources/views/components/messenger-widget.blade.php`:

```blade
<div id="messenger-widget-{{ $id ?? 'default' }}"></div>

@push('scripts')
<script type="module">
  import { MessengerWidget } from '/build/assets/app.js';
  import Vue from 'vue';

  new Vue({
    el: '#messenger-widget-{{ $id ?? 'default' }}',
    components: { MessengerWidget },
    template: `
      <MessengerWidget
        :token="'{{ $token }}'"
        :pusher-config="pusherConfig"
        :minimized="{{ $minimized ?? 'true' }}"
      />
    `,
    data() {
      return {
        pusherConfig: {
          key: '{{ config('broadcasting.connections.pusher.key') }}',
          cluster: '{{ config('broadcasting.connections.pusher.options.cluster') }}'
        }
      };
    }
  });
</script>
@endpush
```

Usage in your Blade templates:

```blade
@include('components.messenger-widget', [
    'token' => auth()->user()->api_token,
    'minimized' => true
])
```

### Method 3: Standalone Widget (Any Framework)

Use this method to integrate with non-Vue applications.

```html
<div id="webex-messenger"></div>

<link rel="stylesheet" href="/build/assets/app.css">
<script src="https://cdn.jsdelivr.net/npm/vue@2.7.14/dist/vue.min.js"></script>
<script src="/build/assets/app.js" type="module"></script>

<script type="module">
  import { MessengerWidget } from '/build/assets/app.js';

  new Vue({
    el: '#webex-messenger',
    components: { MessengerWidget },
    template: '<MessengerWidget :token="token" :pusher-config="config" />',
    data() {
      return {
        token: window.AUTH_TOKEN, // Set this globally
        config: {
          key: window.PUSHER_KEY,
          cluster: 'eu'
        }
      };
    }
  });
</script>
```

## Component Props

The `MessengerWidget` component accepts the following props:

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `token` | String | Yes | - | Bearer token for API authentication |
| `pusherConfig` | Object | No | `{}` | Pusher configuration (key, cluster, etc.) |
| `minimized` | Boolean | No | `true` | Initial state of the widget |

## Component Events

| Event | Payload | Description |
|-------|---------|-------------|
| `toggle` | `Boolean` | Emitted when widget is minimized/expanded |

## API Configuration

The widget uses the API service located at `resources/js/services/api.js`.

### Default Configuration

- Base URL: `/api/webex`
- Auth: Bearer token in `Authorization` header

### Custom Configuration

To customize the API base URL:

```javascript
import api from './services/api';

// Set custom base URL
api.client.defaults.baseURL = 'https://api.example.com/webex';

// Or create a new instance
import { WebexMessengerAPI } from './services/api';
const customApi = new WebexMessengerAPI('https://api.example.com/webex', token);
```

## WebSocket Configuration

The widget uses Laravel Echo with Pusher for real-time updates.

### Pusher Setup

1. Create a Pusher account at https://pusher.com
2. Create a new app
3. Get your credentials (App ID, Key, Secret, Cluster)

### Laravel Configuration

Update `config/broadcasting.php`:

```php
'connections' => [
    'pusher' => [
        'driver' => 'pusher',
        'key' => env('PUSHER_APP_KEY'),
        'secret' => env('PUSHER_APP_SECRET'),
        'app_id' => env('PUSHER_APP_ID'),
        'options' => [
            'cluster' => env('PUSHER_APP_CLUSTER'),
            'useTLS' => true,
        ],
    ],
],
```

Update `.env`:

```env
BROADCAST_DRIVER=pusher
PUSHER_APP_ID=your-app-id
PUSHER_APP_KEY=your-app-key
PUSHER_APP_SECRET=your-app-secret
PUSHER_APP_CLUSTER=eu
```

### Broadcasting Authentication

The widget requires authentication for private channels. Configure your `routes/channels.php`:

```php
use App\Models\User;

Broadcast::channel('webex.admin', function (User $user) {
    // Return true if user can access admin channel
    return $user->hasRole('admin');
});

Broadcast::channel('conversation.{conversationId}', function (User $user, $conversationId) {
    // Return true if user can access this conversation
    return true; // Add your authorization logic
});
```

## Customization

### Styling

The widget uses Tailwind CSS. To customize colors, edit `tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',  // Change primary color
          600: '#2563eb',
          // ... other shades
        }
      }
    }
  }
}
```

### Component Customization

All components are in `resources/js/components/Messenger/`. You can:

1. Edit existing components
2. Create custom variants
3. Override styles with scoped CSS

Example: Custom message bubble colors

```vue
<!-- In MessageBubble.vue -->
<style scoped>
.message-outbound .message-content {
  @apply bg-green-500 text-white; /* Change from blue to green */
}
</style>
```

## Features

### Real-time Updates

The widget automatically receives updates via WebSocket:

- New messages (inbound/outbound)
- Message status changes (queued → delivered/failed)
- Conversation updates (unread count, etc.)
- Contact list updates

### Mobile Responsive

The widget adapts to mobile devices:

- Desktop: 800x600px floating widget
- Tablet: 600x500px floating widget
- Mobile: Full-screen overlay

### Message Status

Outbound messages show status indicators:

- ⏱️ Queued - Message is being sent
- ✓✓ Delivered - Message delivered to carrier
- ⚠️ Failed - Delivery failed

### Pagination

Both conversation list and message history support pagination:

- Scroll to bottom/top to load more
- Auto-maintains scroll position
- Loading indicators

### Notifications

Built-in notification system for:

- New messages when conversation is inactive
- Error messages
- Success confirmations

## Troubleshooting

### Widget not appearing

1. Check browser console for errors
2. Verify build assets exist in `public/build/`
3. Check authentication token is valid
4. Ensure Pusher credentials are correct

### WebSocket not connecting

1. Verify Pusher configuration in `.env`
2. Check Laravel broadcasting is enabled
3. Test Pusher connection at https://pusher.com/docs/channels/getting_started/javascript#test-your-installation
4. Check authentication endpoint `/broadcasting/auth` is accessible

### Messages not updating

1. Open browser DevTools → Network → WS
2. Check WebSocket connection is active
3. Verify you're subscribed to correct channels
4. Check Laravel logs for broadcasting errors

### API errors

1. Check network tab for failed requests
2. Verify API endpoints match backend routes
3. Check authentication token is valid
4. Review Laravel logs for backend errors

## Production Deployment

### 1. Build for Production

```bash
npm run build
```

### 2. Optimize Assets

The build process automatically:
- Minifies JavaScript and CSS
- Removes unused CSS (Tailwind purge)
- Generates source maps
- Creates manifest for versioning

### 3. CDN (Optional)

Upload `public/build/` to your CDN and update asset URLs:

```html
<link rel="stylesheet" href="https://cdn.example.com/messenger/app.css">
<script src="https://cdn.example.com/messenger/app.js" type="module"></script>
```

### 4. Security Checklist

- [ ] Use HTTPS in production
- [ ] Enable Pusher TLS
- [ ] Implement proper channel authorization
- [ ] Rotate API tokens regularly
- [ ] Enable CORS only for trusted domains
- [ ] Sanitize user input in messages

## Performance Tips

1. **Lazy Loading**: Widget loads on demand when minimized
2. **Virtual Scrolling**: For conversations with 1000+ messages, consider vue-virtual-scroller
3. **Debouncing**: Search is debounced to reduce API calls
4. **Pagination**: Only loads 50 messages/contacts at a time
5. **WebSocket**: Reduces HTTP polling overhead

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Development

### Project Structure

```
resources/
├── js/
│   ├── components/
│   │   └── Messenger/
│   │       ├── MessengerWidget.vue      # Main widget container
│   │       ├── ConversationList.vue     # Left sidebar
│   │       ├── ConversationItem.vue     # Individual conversation
│   │       ├── MessageThread.vue        # Right side message view
│   │       ├── MessageList.vue          # Messages container
│   │       ├── MessageBubble.vue        # Individual message
│   │       └── MessageInput.vue         # Send message input
│   ├── services/
│   │   ├── api.js                       # HTTP API client
│   │   └── echo.js                      # WebSocket configuration
│   └── app.js                           # Entry point
├── css/
│   └── app.css                          # Tailwind styles
└── views/
    └── messenger-demo.html              # Demo page
```

### Running the Demo

1. Build the assets: `npm run dev`
2. Serve the demo page (use Laravel's built-in server or any HTTP server)
3. Open `http://localhost/messenger-demo.html`

### Testing

The widget can be tested without a backend by mocking the API:

```javascript
// Mock API for testing
import api from './services/api';

api.getContacts = async () => ({
  success: true,
  data: {
    contacts: [/* mock data */],
    pagination: { has_more: false }
  }
});
```

## Support

For backend API documentation, see [CLAUDE.md](./CLAUDE.md).

For issues and questions:
- Backend: Check Laravel logs
- Frontend: Check browser console
- WebSocket: Check Pusher dashboard

## License

This is proprietary software for CourierExpert.
