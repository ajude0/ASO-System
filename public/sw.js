// sw.js v2
self.addEventListener("push", function (event) {
    console.log("🔥 PUSH EVENT RECEIVED");

    let data = {
        title: "FastLogistics Notification",
        body: "No message",
        url: "/"
    };

    try {
        data = event.data.json();
    } catch (e) {
        console.error("Failed to parse push data as JSON:", e);
        try {
            data = JSON.parse(event.data.text());
        } catch (e2) {
            console.error("Failed to parse push data as text:", e2);
        }
    }

    const options = {
        body: data.body,
        icon: "/icon.png",
        badge: "/badge.png",
        data: { url: data.url },
        requireInteraction: true
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener("notificationclick", function (event) {
    event.notification.close();
    const urlToOpen = event.notification.data?.url || "/";

    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then(windowClients => {
            for (let client of windowClients) {
                if (client.url.includes(urlToOpen) && "focus" in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});