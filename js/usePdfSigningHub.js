// composables/usePdfSigningHub.js
import { ref, readonly, unref } from 'vue';
import * as signalR from '@microsoft/signalr';
import { API_BASE_URL } from '~/config';

export function usePdfSigningHub(documentId, emplId, userName) {
  // ─── State ────────────────────────────────────────────────────────
  const isConnected = ref(false);
  const activeUsers = ref([]);
  const remoteCursors = ref({});

  let connection = null;

  // ─── Simple event bus ─────────────────────────────────────────────
  const _handlers = {};

  function _emit(event, data) {
    (_handlers[event] || []).forEach(fn => fn(data));
  }

  function on(event, fn) {
    if (!_handlers[event]) _handlers[event] = [];
    _handlers[event].push(fn);
    // Returns an unsubscribe function
    return () => { _handlers[event] = _handlers[event].filter(h => h !== fn); };
  }

  // FIX: Clear ALL registered event bus handlers so that when the modal
  // reopens and registerHubListeners() runs again, we don't stack duplicates.
  function _clearHandlers() {
    Object.keys(_handlers).forEach(key => { _handlers[key] = []; });
  }

  // Throttle helper
  function throttle(fn, ms) {
    let last = 0;
    return (...args) => {
      const now = Date.now();
      if (now - last >= ms) { last = now; fn(...args); }
    };
  }

  // ─── Connection lifecycle ─────────────────────────────────────────
  async function connect() {
    // FIX: If a connection already exists and is connected/connecting,
    // don't build a new one — this was the root cause of duplicate handlers.
    // Each new HubConnectionBuilder() call created a fresh SignalR connection
    // that re-fired UserJoined/UserLeft, but _handlers still had the old
    // registrations from the previous connect(), doubling up the toasts.
    if (
      connection &&
      (connection.state === signalR.HubConnectionState.Connected ||
       connection.state === signalR.HubConnectionState.Connecting ||
       connection.state === signalR.HubConnectionState.Reconnecting)
    ) {
      return;
    }

    connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}/hubs/pdf-signing`)
      .withAutomaticReconnect([0, 1000, 3000, 5000, 10000])
      .configureLogging(
        import.meta.env.DEV
          ? signalR.LogLevel.Information
          : signalR.LogLevel.Warning
      )
      .build();

    // ── Inbound SignalR → internal event bus ────────────────────────
    connection.on('ActiveUsers', (users) => {
      activeUsers.value = users;
    });

    connection.on('UserJoined', ({ emplId: id, userName: name, activeUsers: users }) => {
      activeUsers.value = users;
      _emit('userJoined', { emplId: id, userName: name });
    });

    connection.on('UserLeft', ({ emplId: id, userName: name, activeUsers: users }) => {
      activeUsers.value = users;
      delete remoteCursors.value[id];
      _emit('userLeft', { emplId: id, userName: name });
    });

    connection.on('SignaturePlaced', (payload) => {
      console.log('SignaturePlaced',payload);
      _emit('signaturePlaced', payload);
    });

    connection.on('SignatureMoved', (payload) => {
      console.log('signatureMoved', payload);
      _emit('signatureMoved', payload);
    });

    connection.on('SignatureResized', (payload) => {
      console.log('signatureResized', payload);
      _emit('signatureResized', payload);
    });

    connection.on('DateMoved', (payload) => {
      console.log('DateMoved', payload);
      _emit('dateMoved', payload);
    });

    connection.on('SignaturesSaved', (payload) => {
      console.log('signatureSaved', payload);
      _emit('signaturesSaved', payload);
    });

    connection.on('RemoteCursor', ({ emplId: id, userName: name, x, y, page, color }) => {
      remoteCursors.value[id] = { x, y, page, userName: name, color };
      _emit('remoteCursor', { emplId: id, userName: name, x, y, page, color });
    });

    // ── Reconnection hooks ──────────────────────────────────────────
    connection.onreconnecting(() => {
      isConnected.value = false;
      _emit('reconnecting');
    });

    connection.onreconnected(async () => {
      isConnected.value = true;
      await connection.invoke(
        'JoinDocument',
        unref(documentId),
        unref(emplId),
        unref(userName)
      );
      _emit('reconnected');
    });

    connection.onclose(() => {
      isConnected.value = false;
    });

    // ── Start ───────────────────────────────────────────────────────
    await connection.start();
    isConnected.value = true;
    await connection.invoke(
      'JoinDocument',
      unref(documentId),
      unref(emplId),
      unref(userName)
    );
  }

  async function disconnect() {
    if (!connection) return;
    try {
      await connection.invoke('LeaveDocument', unref(documentId));
    } catch { /* ignore */ }
    await connection.stop();
    isConnected.value = false;
    connection = null;

    // FIX: Clear all event bus handlers on disconnect so the next
    // connect() + registerHubListeners() starts with a clean slate.
    // Without this, reopening the modal re-registers onUserJoined etc.
    // on top of the previous ones, causing 2×, 3×... duplicate toasts.
    _clearHandlers();
  }

  // ─── Outbound helpers ─────────────────────────────────────────────
  function send(method, ...args) {
    if (connection && isConnected.value) {
      connection.invoke(method, ...args).catch(console.error);
    }
  }

  function sendSignaturePlaced(sigIndex, sigData) {
    send('SignaturePlaced', unref(documentId), sigIndex, sigData);
  }

  const sendSignatureMoved = throttle((sigIndex, sig) => {
    const plainSig = {
      ...unref(sig),
      datePosition: sig.datePosition ? { ...unref(sig.datePosition) } : null
    };
    send('SignatureMoved', unref(documentId), sigIndex, plainSig);
  }, 50);

  function sendSignatureResized(sigIndex, width, height) {
    send('SignatureResized', unref(documentId), sigIndex, { width, height });
  }

  const sendDateMoved = throttle((sigIndex, datePosition) => {
    send('DateMoved', unref(documentId), sigIndex, datePosition);
  }, 50);

function sendSignaturesSaved(signatures) {
  send('SignaturesSaved', unref(documentId), unref(emplId), signatures);
}

  const sendCursorMoved = throttle((x, y, page, color) => {
    send('CursorMoved', unref(documentId), x, y, page, color);
  }, 80);

  // ─── Convenience on* helpers ──────────────────────────────────────
  const onUserJoined       = (fn) => on('userJoined',       fn);
  const onUserLeft         = (fn) => on('userLeft',         fn);
  const onSignaturePlaced  = (fn) => on('signaturePlaced',  fn);
  const onSignatureMoved   = (fn) => on('signatureMoved',   fn);
  const onSignatureResized = (fn) => on('signatureResized', fn);
  const onDateMoved        = (fn) => on('dateMoved',        fn);
  const onSignaturesSaved  = (fn) => on('signaturesSaved',  fn);
  const onRemoteCursor     = (fn) => on('remoteCursor',     fn);
  const onReconnecting     = (fn) => on('reconnecting',     fn);
  const onReconnected      = (fn) => on('reconnected',      fn);

  return {
    isConnected: readonly(isConnected),
    activeUsers: readonly(activeUsers),
    remoteCursors: readonly(remoteCursors),
    connect,
    disconnect,
    sendSignaturePlaced,
    sendSignatureMoved,
    sendSignatureResized,
    sendDateMoved,
    sendSignaturesSaved,
    sendCursorMoved,
    onUserJoined,
    onUserLeft,
    onSignaturePlaced,
    onSignatureMoved,
    onSignatureResized,
    onDateMoved,
    onSignaturesSaved,
    onRemoteCursor,
    onReconnecting,
    onReconnected,
  };
}