/**
 * Webex Messenger Frontend Entry Point
 */

import Vue from 'vue';
import '../css/app.css';

// Import the main widget component
import MessengerWidget from './components/Messenger/MessengerWidget.vue';

// Register components globally (optional)
Vue.component('messenger-widget', MessengerWidget);

// Configure Vue
Vue.config.productionTip = false;

// Export for direct usage
export { MessengerWidget };

// Initialize Vue app if there's a root element
if (document.getElementById('app')) {
  new Vue({
    el: '#app',
    components: {
      MessengerWidget
    }
  });
}
