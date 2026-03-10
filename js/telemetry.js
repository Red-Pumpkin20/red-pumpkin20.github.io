(function (window) {
  const TELEMETRY_ENDPOINT = 'https://script.google.com/macros/s/AKfycbx_telemetry_endpoint_placeholder/exec';
  const PARTICIPANT_STORAGE_KEY = 'participantId';

  function ensureParticipantId() {
    try {
      const existing = sessionStorage.getItem(PARTICIPANT_STORAGE_KEY);
      if (existing) return existing;
      const created = 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      sessionStorage.setItem(PARTICIPANT_STORAGE_KEY, created);
      return created;
    } catch (error) {
      return 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    }
  }

  const logger = {
    participantId: ensureParticipantId(),

    setParticipantId(participantId) {
      if (!participantId) return;
      this.participantId = participantId;
      try {
        sessionStorage.setItem(PARTICIPANT_STORAGE_KEY, participantId);
      } catch (error) {
        // no-op
      }
    },

    log(eventName, extra) {
      const payload = {
        participant_id: this.participantId || ensureParticipantId(),
        timestamp: new Date().toISOString(),
        event_name: eventName,
        page: window.location.pathname,
        meta: JSON.stringify(extra || {})
      };

      const body = new URLSearchParams(payload).toString();

      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: 'application/x-www-form-urlencoded;charset=UTF-8' });
        navigator.sendBeacon(TELEMETRY_ENDPOINT, blob);
        return Promise.resolve();
      }

      return fetch(TELEMETRY_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body,
        keepalive: true,
        mode: 'no-cors'
      }).catch(function () {
        // intentionally swallow telemetry transport errors
      });
    }
  };

  window.telemetryLogger = logger;

  window.addEventListener('error', function (event) {
    logger.log('window_error', {
      message: event.message,
      source: event.filename,
      line: event.lineno,
      column: event.colno
    });
  });

  window.addEventListener('unhandledrejection', function (event) {
    const reason = event.reason;
    logger.log('unhandled_rejection', {
      message: reason && reason.message ? reason.message : String(reason)
    });
  });
})(window);
