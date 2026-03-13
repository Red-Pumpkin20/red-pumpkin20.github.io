    // ═══════════════════════════════════════════════════════════
    // ВСТАВЬТЕ ВАШ URL ОТ GOOGLE APPS SCRIPT НИЖЕ
    // ═══════════════════════════════════════════════════════════
    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxbxJtVLroOLQNHyYhlrhNOdjGknYAlDLN6tUBH4r0Y9k1jOMIFl70vny0imH5R_J5cSA/exec';

    // ВСТАВЬТЕ ССЫЛКУ НА ВАШУ GOOGLE ФОРМУ НИЖЕ
    const GOOGLE_FORM_URL   = 'https://forms.gle/FaTTjnU39ywQdZMSA';
    // ═══════════════════════════════════════════════════════════

    const SAMPLE_RATE_MS = 33; // точка каждые ~33 мс ≈ 30 точек/сек
    const SCROLL_SAMPLE_RATE_MS = 50; // записываем скролл до 20 раз/сек
    const BANNER_AOI_PADDING_PX = 0; // дополнительная зона AOI вокруг баннера
    const WEBGAZER_TRACKER = 'TFFacemesh';
    const WEBGAZER_REGRESSION = 'ridge';

    window._bannerRectViewport = null;
    window._bannerRectPage = null;
    window._bannerHits = 0;
    window._scrollEvents = [];

    function getViewportMetrics() {
      return {
        scroll_x: Math.round(window.scrollX || 0),
        scroll_y: Math.round(window.scrollY || 0),
        viewport_w: Math.round(window.innerWidth || document.documentElement.clientWidth || 0),
        viewport_h: Math.round(window.innerHeight || document.documentElement.clientHeight || 0),
        doc_w: Math.round(document.documentElement.scrollWidth || 0),
        doc_h: Math.round(document.documentElement.scrollHeight || 0),
        dpr: Number((window.devicePixelRatio || 1).toFixed(2))
      };
    }

    function recordScrollEvent(reason) {
      if (!window._sessionStart) return;
      const m = getViewportMetrics();
      window._scrollEvents.push({
        t: Date.now() - window._sessionStart,
        reason: reason,
        scroll_x: m.scroll_x,
        scroll_y: m.scroll_y,
        viewport_w: m.viewport_w,
        viewport_h: m.viewport_h
      });
    }

    function updateBannerRect() {
      const bannerEl = document.getElementById('research-banner');
      if (!bannerEl) return;
      const rect = bannerEl.getBoundingClientRect();
      const pad = BANNER_AOI_PADDING_PX;
      window._bannerRectViewport = {
        left: Math.round(rect.left - pad),
        top: Math.round(rect.top - pad),
        right: Math.round(rect.right + pad),
        bottom: Math.round(rect.bottom + pad),
        width: Math.round(rect.width + pad * 2),
        height: Math.round(rect.height + pad * 2),
        padding_px: pad
      };
      window._bannerRectPage = {
        left: Math.round(rect.left + window.scrollX - pad),
        top: Math.round(rect.top + window.scrollY - pad),
        right: Math.round(rect.right + window.scrollX + pad),
        bottom: Math.round(rect.bottom + window.scrollY + pad),
        width: Math.round(rect.width + pad * 2),
        height: Math.round(rect.height + pad * 2),
        padding_px: pad
      };
    }

    function isPointInsideBannerViewport(x, y) {
      const rect = window._bannerRectViewport;
      if (!rect) return false;
      return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    }

    function isPointInsideBannerPage(x, y) {
      const rect = window._bannerRectPage;
      if (!rect) return false;
      return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    }

    function ensureWebGazerStarted(stageLabel) {
      if (!window.webgazer) {
        console.error('❌ WebGazer не загрузился');
        return Promise.resolve(false);
      }

      webgazer
        .saveDataAcrossSessions(true)
        .showVideoPreview(false)
        .showFaceOverlay(false)
        .showFaceFeedbackBox(false)
        .showPredictionPoints(false)
        .applyKalmanFilter(true);

      try {
        if (typeof webgazer.setRegression === 'function') {
          webgazer.setRegression(WEBGAZER_REGRESSION);
        }
        if (typeof webgazer.setTracker === 'function') {
          webgazer.setTracker(WEBGAZER_TRACKER);
        }
      } catch (configError) {
        console.warn('⚠️ Не удалось применить конфигурацию tracker/regression:', configError);
      }

      if (window._webgazerStarted) {
        return Promise.resolve(true);
      }

      return Promise.resolve(webgazer.begin())
        .then(function () {
          window._webgazerStarted = true;
          if (typeof webgazer.removeMouseEventListeners === 'function') {
            webgazer.removeMouseEventListeners();
          }
          return true;
        })
        .catch(function (error) {
          console.error('❌ Ошибка запуска WebGazer во время ' + stageLabel + ' (tracker=' + WEBGAZER_TRACKER + '):', error);
          return false;
        });
    }

    function initExperimentTracking() {
      if (window._trackingInitialized) return;
      window._trackingInitialized = true;

      // Уникальный ID участника
      window._participantId  = 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      window._sessionStart   = Date.now();
      window._gazePoints     = [];
      window._bannerHits     = 0;
      window._scrollEvents   = [];
      let lastSample         = 0;
      let lastScrollSample   = 0;

      updateBannerRect();
      recordScrollEvent('init');

      window.addEventListener('resize', function () {
        updateBannerRect();
        recordScrollEvent('resize');
      });

      window.addEventListener('scroll', function () {
        const now = Date.now();
        if (now - lastScrollSample < SCROLL_SAMPLE_RATE_MS) return;
        lastScrollSample = now;
        updateBannerRect();
        recordScrollEvent('scroll');
      }, { passive: true });

      webgazer.setGazeListener(function (data) {
        if (!data) return;
        const now = Date.now();
        if (now - lastSample < SAMPLE_RATE_MS) return;
        lastSample = now;
        const view = getViewportMetrics();
        updateBannerRect();
        const point = {
          x: Math.round(data.x),
          y: Math.round(data.y),
          t: now - window._sessionStart,
          page_x: Math.round(data.x + view.scroll_x),
          page_y: Math.round(data.y + view.scroll_y),
          scroll_x: view.scroll_x,
          scroll_y: view.scroll_y,
          viewport_w: view.viewport_w,
          viewport_h: view.viewport_h,
          doc_w: view.doc_w,
          doc_h: view.doc_h,
          dpr: view.dpr
        };

        point.on_banner_viewport = isPointInsideBannerViewport(point.x, point.y);
        point.on_banner_page = isPointInsideBannerPage(point.page_x, point.page_y);
        point.on_banner = point.on_banner_viewport || point.on_banner_page;
        if (point.on_banner) {
          window._bannerHits++;
        }

        window._gazePoints.push(point);
        if (window._gazePoints.length % 100 === 0)
          console.log('📊 Точек собрано:', window._gazePoints.length);
      });

      ensureWebGazerStarted('эксперимента').then(function (started) {
        if (!started) {
          window._trackingInitialized = false;
          return;
        }
        console.log('🎯 WebGazer запущен. ID участника:', window._participantId);
      });
    }

    let calibrationStarted = false;
    let calibrationComplete = false;
    let calibrationPoints = [];
    let currentCalibrationPoint = 0;
    const totalCalibrationPoints = 9;
    const totalCalibrationRounds = 2;
    const calibrationDwellMs = 500;
    let currentCalibrationRound = 1;

    function showStatus(message, type) {
      const statusEl = document.getElementById('calibration-status');
      statusEl.textContent = message;
      statusEl.className = 'status ' + type;
      statusEl.style.display = 'block';
    }

    function updateProgress(current, total) {
      const progressEl = document.getElementById('calibration-progress');
      const percentage = (current / total) * 100;
      progressEl.style.width = percentage + '%';
      progressEl.textContent = current + ' / ' + total;
    }

    function startCalibrationProcess() {
      document.getElementById('instruction-section').style.display = 'none';
      document.getElementById('calibration-section').style.display = 'block';
      showStatus('⏳ Инициализация камеры...', 'warning');
      document.getElementById('start-calibration-btn').disabled = true;

      ensureWebGazerStarted('калибровки').then((started) => {
        document.getElementById('start-calibration-btn').disabled = false;
        if (!started) {
          showStatus('❌ Не удалось запустить камеру. Проверьте доступ к камере и обновите страницу.', 'warning');
          return;
        }
        showStatus('✅ Камера активна! Нажмите "Начать калибровку точек"', 'success');
      });
    }

    function startWebGazerCalibration() {
      if (calibrationStarted) return;
      calibrationStarted = true;
      currentCalibrationPoint = 0;
      currentCalibrationRound = 1;
      updateProgress(0, totalCalibrationPoints * totalCalibrationRounds);
      renderCalibrationRound();
      showStatus('👀 Раунд 1/2: смотрите на точку ~0.5 сек, затем кликайте по ней', 'warning');
      document.getElementById('start-calibration-btn').disabled = true;
    }

    function renderCalibrationRound() {
      document.querySelectorAll('.calibration-point').forEach(el => el.remove());
      calibrationPoints = [];
      const positions = [
        { x: 10, y: 10 }, { x: 50, y: 10 }, { x: 90, y: 10 },
        { x: 10, y: 50 }, { x: 50, y: 50 }, { x: 90, y: 50 },
        { x: 10, y: 90 }, { x: 50, y: 90 }, { x: 90, y: 90 }
      ];
      positions.forEach((pos) => {
        const point = document.createElement('div');
        point.className = 'calibration-point';
        point.style.left = pos.x + '%';
        point.style.top = pos.y + '%';
        point.dataset.readyAt = String(Date.now() + calibrationDwellMs);
        point.onclick = function() {
          const now = Date.now();
          const readyAt = Number(this.dataset.readyAt || 0);
          if (now < readyAt) {
            const waitMs = Math.max(0, readyAt - now);
            showStatus(`Удерживайте взгляд на точке ещё ${waitMs} мс перед кликом`, 'warning');
            return;
          }
          const rect = this.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          if (typeof webgazer !== 'undefined' && typeof webgazer.recordScreenPosition === 'function') {
            webgazer.recordScreenPosition(centerX, centerY, 'click');
          }
          this.style.display = 'none';
          currentCalibrationPoint++;
          updateProgress(currentCalibrationPoint, totalCalibrationPoints * totalCalibrationRounds);
          const roundCompleted = currentCalibrationPoint % totalCalibrationPoints === 0;
          if (currentCalibrationPoint === totalCalibrationPoints * totalCalibrationRounds) {
            finishCalibration();
          } else if (roundCompleted) {
            currentCalibrationRound++;
            showStatus(`✅ Раунд ${currentCalibrationRound - 1}/2 завершён. Начинаем раунд ${currentCalibrationRound}/2`, 'success');
            renderCalibrationRound();
          } else {
            const roundPoint = currentCalibrationPoint - (currentCalibrationRound - 1) * totalCalibrationPoints;
            showStatus(`Раунд ${currentCalibrationRound}/2: точка ${roundPoint}/${totalCalibrationPoints} откалибрована`, 'success');
          }
        };
        document.body.appendChild(point);
        calibrationPoints.push(point);
      });
    }

    function finishCalibration() {
      calibrationComplete = true;
      calibrationPoints.forEach(point => {
        if (point && point.parentNode) point.parentNode.removeChild(point);
      });
      showStatus('Калибровка (2 раунда) завершена успешно!', 'success');
      document.getElementById('proceed-btn').style.display = 'inline-block';
      document.getElementById('start-calibration-btn').textContent = 'Повторить калибровку';
      document.getElementById('start-calibration-btn').disabled = false;
      calibrationStarted = false;
    }

    function proceedToExperiment() {
      if (!calibrationComplete) {
        showStatus('Сначала пройдите калибровку!', 'warning');
        return;
      }

      sessionStorage.setItem('calibrationComplete', 'true');
      document.getElementById('intro-merged').style.display = 'none';
      document.getElementById('experiment-content').style.display = 'block';
      initExperimentTracking();
      window.scrollTo(0, 0);
    }


    function bindExperimentControls() {
      const openCalibrationBtn = document.getElementById('open-calibration-btn');
      const startCalibrationBtn = document.getElementById('start-calibration-btn');
      const proceedBtn = document.getElementById('proceed-btn');
      const finishBtn = document.getElementById('finish-experiment-btn');

      if (openCalibrationBtn) openCalibrationBtn.addEventListener('click', startCalibrationProcess);
      if (startCalibrationBtn) startCalibrationBtn.addEventListener('click', startWebGazerCalibration);
      if (proceedBtn) proceedBtn.addEventListener('click', proceedToExperiment);
      if (finishBtn) finishBtn.addEventListener('click', finishExperiment);
    }
    document.addEventListener('DOMContentLoaded', function () {
      bindExperimentControls();
      if (sessionStorage.getItem('calibrationComplete')) {
        calibrationComplete = true;
        document.getElementById('intro-merged').style.display = 'none';
        document.getElementById('experiment-content').style.display = 'block';
        initExperimentTracking();
      }
    });

    // ── Вызывается при нажатии "Перейти к оформлению" ───────────────
    function downloadWebgazerData(payload, participantId) {
      const blob = new Blob([
        JSON.stringify(payload, null, 2)
      ], { type: 'application/json;charset=utf-8' });

      const safeId = String(participantId || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `webgazer_${safeId}_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 1000);
    }

    async function finishExperiment(event) {
      const btn = event?.currentTarget || document.getElementById('finish-experiment-btn');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Отправка...';
      }

      const gazePoints = window._gazePoints || [];
      const sessionStart = window._sessionStart || Date.now();
      const participantId = window._participantId || 'unknown';

      console.log('🏁 Эксперимент завершён. Точек: ' + gazePoints.length);

      recordScrollEvent('finish');

      const fields = {
        participant_id: participantId,
        date: new Date(sessionStart).toLocaleString('ru-RU'),
        duration_sec: Math.round((Date.now() - sessionStart) / 1000),
        points_count: gazePoints.length,
        screen_w: window.screen.width,
        screen_h: window.screen.height,
        device_pixel_ratio: window.devicePixelRatio || 1,
        user_agent: navigator.userAgent,
        scroll_events: JSON.stringify(window._scrollEvents || []),
        banner_rect_viewport: JSON.stringify(window._bannerRectViewport || {}),
        banner_rect_page: JSON.stringify(window._bannerRectPage || {}),
        banner_hits: window._bannerHits || 0,
        gaze_data: JSON.stringify(gazePoints),
        send_reason: 'checkout'
      };

      const jsonPayload = {
        participant_id: participantId,
        date_iso: new Date(sessionStart).toISOString(),
        duration_sec: Math.round((Date.now() - sessionStart) / 1000),
        points_count: gazePoints.length,
        screen_w: window.screen.width,
        screen_h: window.screen.height,
        device_pixel_ratio: window.devicePixelRatio || 1,
        user_agent: navigator.userAgent,
        scroll_events: window._scrollEvents || [],
        banner_rect_viewport: window._bannerRectViewport || {},
        banner_rect_page: window._bannerRectPage || {},
        banner_hits: window._bannerHits || 0,
        gaze_data: gazePoints,
        send_reason: 'checkout'
      };

      try {
        downloadWebgazerData(jsonPayload, participantId);
        console.log('💾 JSON с данными WebGazer сохранён локально.');
      } catch (downloadError) {
        console.error('⚠️ Не удалось скачать JSON с данными WebGazer:', downloadError);
      }

      const body = new URLSearchParams(fields);
      try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          body
        });

        if (response.ok) {
          console.log('✅ Данные успешно отправлены. Переход на Google Form.');
          window.location.href = GOOGLE_FORM_URL;
          return;
        }

        console.error('❌ Ошибка отправки: сервер вернул код', response.status);
        alert('Не удалось отправить данные эксперимента. Пожалуйста, попробуйте ещё раз.');
      } catch (error) {
        console.error('❌ Ошибка отправки данных эксперимента:', error);
        alert('Ошибка сети при отправке данных. Проверьте подключение и попробуйте снова.');
      }

      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Перейти к оформлению';
      }
    }
