/* eslint-disable no-undef */
importScripts(
  'https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js'
);
importScripts(
  'https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js'
);

firebase.initializeApp({
  apiKey: 'YOUR_FIREBASE_WEB_API_KEY',
  authDomain: 'your-firebase-project.firebaseapp.com',
  projectId: 'your-firebase-project',
  storageBucket: 'your-firebase-project.firebasestorage.app',
  messagingSenderId: 'YOUR_FIREBASE_SENDER_ID',
  appId: 'YOUR_FIREBASE_APP_ID',
  measurementId: 'YOUR_FIREBASE_MEASUREMENT_ID',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('📩 Background Notification Received:', payload);

  const { title, body, redirectUrl } = payload.data;

  if (!title || !body) {
    console.error('🚨 Missing notification payload:', payload);
    return;
  }

  const notificationOptions = {
    body,
    icon: 'https://e7.pngegg.com/pngimages/875/651/png-clipart-background-brush-texture-brush-black.png',
    requireInteraction: true,
    vibrate: [200, 100, 200],
    tag: 'rider-updated',
    data: { redirectUrl },
    actions: [{ action: 'open', title: 'View Details' }],
  };

  self.registration.showNotification(title, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const redirectUrl = event.notification.data?.redirectUrl || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(() => {
      // Otherwise, open a new window/tab
      return clients.openWindow(redirectUrl);
    })
  );
});
