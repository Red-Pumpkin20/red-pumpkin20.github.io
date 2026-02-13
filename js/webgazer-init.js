// webgazer-init.js - Инициализация WebGazer для вашего проекта
// Поместите этот файл в папку js/ вашего проекта

console.log('📦 WebGazer initialization script loaded');

// =============================================================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// =============================================================================

let isWebGazerActive = false;
let isCalibrating = false;
let calibrationPoints = [];
let currentCalibrationPoint = 0;

// =============================================================================
// ПРОВЕРКА ПРИ ЗАГРУЗКЕ СТРАНИЦЫ
// =============================================================================

window.addEventListener('load', function() {
    console.log('✅ Страница загружена');
    
    // Проверка что WebGazer загружен
    if (typeof webgazer === 'undefined') {
        console.error('❌ ОШИБКА: WebGazer не загружен!');
        console.error('Проверьте что webgazer.js подключён в HTML до этого скрипта');
        showError('WebGazer не загружен. Проверьте консоль (F12)');
        return;
    }
    
    console.log('✅ WebGazer успешно загружен');
    console.log('Версия WebGazer:', webgazer.version || 'неизвестна');
    
    // Инициализация элементов UI
    initializeUI();
    
    // Не запускаем автоматически, ждём действия пользователя
    console.log('💡 Нажмите кнопку "Запустить WebGazer" для начала работы');
});

// =============================================================================
// ИНИЦИАЛИЗАЦИЯ UI ЭЛЕМЕНТОВ
// =============================================================================

function initializeUI() {
    // Создаём необходимые элементы если их нет
    
    // Точка взгляда
    if (!document.getElementById('gaze-dot')) {
        const gazeDot = document.createElement('div');
        gazeDot.id = 'gaze-dot';
        gazeDot.style.cssText = `
            position: fixed;
            width: 15px;
            height: 15px;
            background: radial-gradient(circle, #ff0000, #ff6b6b);
            border: 2px solid white;
            border-radius: 50%;
            pointer-events: none;
            z-index: 10000;
            display: none;
            box-shadow: 0 0 10px rgba(255, 0, 0, 0.5);
            transition: all 0.05s ease-out;
        `;
        document.body.appendChild(gazeDot);
        console.log('✅ Создан элемент gaze-dot');
    }
    
    // Панель координат
    if (!document.getElementById('coords')) {
        const coords = document.createElement('div');
        coords.id = 'coords';
        coords.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.85);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            z-index: 9999;
            display: none;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        `;
        coords.innerHTML = `
            <div>👁️ <strong>Отслеживание взгляда</strong></div>
            <div style="margin-top: 8px;">X: <span id="coord-x">-</span></div>
            <div>Y: <span id="coord-y">-</span></div>
        `;
        document.body.appendChild(coords);
        console.log('✅ Создана панель координат');
    }
}

// =============================================================================
// ЗАПУСК WEBGAZER
// =============================================================================

function initWebGazer() {
    if (isWebGazerActive) {
        console.log('⚠️ WebGazer уже запущен');
        return;
    }
    
    console.log('🚀 Запуск WebGazer...');
    
    try {
        // Установка callback для получения координат взгляда
        webgazer.setGazeListener(function(data, elapsedTime) {
            if (data == null) {
                return;
            }
            
            // Обновляем позицию точки
            updateGazePosition(data.x, data.y);
            
            // Можете добавить свою логику здесь
            // onGazeUpdate(data.x, data.y, elapsedTime);
            
        }).begin();
        
        // Настройки WebGazer
        webgazer
            .showVideoPreview(true)         // Показать видео с камеры
            .showPredictionPoints(true)     // Показать точки предсказания на видео
            .applyKalmanFilter(true);       // Применить фильтр сглаживания
        
        // Сохранение данных между сессиями (можете изменить на true)
        webgazer.saveDataAcrossSessions(false);
        
        isWebGazerActive = true;
        
        // Обновляем UI
        updateUIAfterStart();
        
        // Показываем точку и координаты
        setTimeout(() => {
            document.getElementById('gaze-dot').style.display = 'block';
            document.getElementById('coords').style.display = 'block';
        }, 1000);
        
        console.log('✅ WebGazer запущен успешно!');
        console.log('💡 Рекомендуем провести калибровку для лучшей точности');
        
        showSuccess('WebGazer запущен! Проведите калибровку.');
        
    } catch (error) {
        console.error('❌ Ошибка при запуске WebGazer:', error);
        showError('Не удалось запустить WebGazer. Проверьте разрешение на камеру.');
    }
}

// =============================================================================
// ОСТАНОВКА WEBGAZER
// =============================================================================

function stopWebGazer() {
    if (!isWebGazerActive) {
        console.log('⚠️ WebGazer не был запущен');
        return;
    }
    
    console.log('⏹️ Остановка WebGazer...');
    
    webgazer.end();
    isWebGazerActive = false;
    
    // Скрываем элементы
    document.getElementById('gaze-dot').style.display = 'none';
    document.getElementById('coords').style.display = 'none';
    
    // Удаляем точки калибровки если есть
    removeCalibrationPoints();
    
    // Обновляем UI
    updateUIAfterStop();
    
    console.log('✅ WebGazer остановлен');
    showSuccess('WebGazer остановлен');
}

// =============================================================================
// ОБНОВЛЕНИЕ ПОЗИЦИИ ВЗГЛЯДА
// =============================================================================

function updateGazePosition(x, y) {
    // Обновляем точку взгляда
    const gazeDot = document.getElementById('gaze-dot');
    if (gazeDot) {
        gazeDot.style.left = x + 'px';
        gazeDot.style.top = y + 'px';
    }
    
    // Обновляем координаты
    const coordX = document.getElementById('coord-x');
    const coordY = document.getElementById('coord-y');
    if (coordX && coordY) {
        coordX.textContent = Math.round(x);
        coordY.textContent = Math.round(y);
    }
}

// =============================================================================
// КАЛИБРОВКА
// =============================================================================

function startCalibration() {
    if (!isWebGazerActive) {
        showError('Сначала запустите WebGazer!');
        return;
    }
    
    console.log('🎯 Начинаем калибровку...');
    
    isCalibrating = true;
    currentCalibrationPoint = 0;
    
    // Удаляем старые точки если есть
    removeCalibrationPoints();
    
    // Создаём 9 калибровочных точек
    const positions = [
        { x: 10, y: 10 },   // Верхний левый
        { x: 50, y: 10 },   // Верхний центр
        { x: 90, y: 10 },   // Верхний правый
        { x: 10, y: 50 },   // Средний левый
        { x: 50, y: 50 },   // Центр
        { x: 90, y: 50 },   // Средний правый
        { x: 10, y: 90 },   // Нижний левый
        { x: 50, y: 90 },   // Нижний центр
        { x: 90, y: 90 }    // Нижний правый
    ];
    
    positions.forEach((pos, index) => {
        const point = document.createElement('div');
        point.className = 'calibration-point';
        point.dataset.index = index;
        point.style.cssText = `
            position: fixed;
            left: ${pos.x}%;
            top: ${pos.y}%;
            transform: translate(-50%, -50%);
            width: 20px;
            height: 20px;
            background: #FFD700;
            border: 3px solid white;
            border-radius: 50%;
            cursor: pointer;
            z-index: 9998;
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.8);
            animation: pulse 1s infinite;
        `;
        
        // Добавляем анимацию пульсации
        if (!document.getElementById('calibration-animation-style')) {
            const style = document.createElement('style');
            style.id = 'calibration-animation-style';
            style.textContent = `
                @keyframes pulse {
                    0%, 100% { transform: translate(-50%, -50%) scale(1); }
                    50% { transform: translate(-50%, -50%) scale(1.3); }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Обработчик клика
        point.addEventListener('click', function() {
            this.style.display = 'none';
            currentCalibrationPoint++;
            
            console.log(`✅ Точка калибровки ${currentCalibrationPoint}/9`);
            
            if (currentCalibrationPoint === positions.length) {
                finishCalibration();
            }
        });
        
        document.body.appendChild(point);
        calibrationPoints.push(point);
    });
    
    showSuccess('Кликайте по жёлтым точкам, глядя на них!');
}

function finishCalibration() {
    console.log('✅ Калибровка завершена!');
    isCalibrating = false;
    removeCalibrationPoints();
    showSuccess('Калибровка завершена! Теперь точность должна быть лучше.');
}

function removeCalibrationPoints() {
    calibrationPoints.forEach(point => {
        if (point && point.parentNode) {
            point.parentNode.removeChild(point);
        }
    });
    calibrationPoints = [];
}

// =============================================================================
// ОБНОВЛЕНИЕ UI
// =============================================================================

function updateUIAfterStart() {
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    const calibrateBtn = document.getElementById('calibrate-btn');
    
    if (startBtn) startBtn.style.display = 'none';
    if (stopBtn) stopBtn.style.display = 'inline-block';
    if (calibrateBtn) calibrateBtn.style.display = 'inline-block';
    
    document.body.classList.add('webgazer-active');
}

function updateUIAfterStop() {
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    const calibrateBtn = document.getElementById('calibrate-btn');
    
    if (startBtn) startBtn.style.display = 'inline-block';
    if (stopBtn) stopBtn.style.display = 'none';
    if (calibrateBtn) calibrateBtn.style.display = 'none';
    
    document.body.classList.remove('webgazer-active');
}

// =============================================================================
// УВЕДОМЛЕНИЯ
// =============================================================================

function showSuccess(message) {
    showNotification(message, 'success');
}

function showError(message) {
    showNotification(message, 'error');
}

function showNotification(message, type = 'info') {
    // Создаём элемент уведомления
    let notification = document.getElementById('webgazer-notification');
    
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'webgazer-notification';
        document.body.appendChild(notification);
    }
    
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 12px 24px;
        border-radius: 8px;
        color: white;
        font-family: Arial, sans-serif;
        font-size: 14px;
        z-index: 10001;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        animation: slideDown 0.3s ease-out;
    `;
    
    // Цвет в зависимости от типа
    if (type === 'success') {
        notification.style.background = 'rgba(76, 175, 80, 0.95)';
    } else if (type === 'error') {
        notification.style.background = 'rgba(244, 67, 54, 0.95)';
    } else {
        notification.style.background = 'rgba(33, 150, 243, 0.95)';
    }
    
    // Добавляем анимацию
    if (!document.getElementById('notification-animation-style')) {
        const style = document.createElement('style');
        style.id = 'notification-animation-style';
        style.textContent = `
            @keyframes slideDown {
                from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
                to { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
        `;
        document.head.appendChild(style);
    }
    
    notification.style.display = 'block';
    
    // Автоматически скрываем через 3 секунды
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

// =============================================================================
// ОЧИСТКА ПРИ ЗАКРЫТИИ СТРАНИЦЫ
// =============================================================================

window.addEventListener('beforeunload', function() {
    if (isWebGazerActive) {
        console.log('🔄 Остановка WebGazer перед закрытием страницы...');
        webgazer.end();
    }
});

// =============================================================================
// ПОЛЕЗНЫЕ УТИЛИТЫ (ОПЦИОНАЛЬНО)
// =============================================================================

// Функция для получения текущего предсказания вручную
function getCurrentGaze() {
    if (!isWebGazerActive) {
        console.warn('⚠️ WebGazer не активен');
        return null;
    }
    
    const prediction = webgazer.getCurrentPrediction();
    return prediction;
}

// Функция для проверки попадания взгляда в элемент
function isLookingAt(element) {
    const prediction = getCurrentGaze();
    if (!prediction) return false;
    
    const rect = element.getBoundingClientRect();
    
    return prediction.x >= rect.left &&
           prediction.x <= rect.right &&
           prediction.y >= rect.top &&
           prediction.y <= rect.bottom;
}

// Экспортируем функции в глобальную область (если нужно)
window.initWebGazer = initWebGazer;
window.stopWebGazer = stopWebGazer;
window.startCalibration = startCalibration;
window.getCurrentGaze = getCurrentGaze;
window.isLookingAt = isLookingAt;

console.log('✅ Все функции WebGazer загружены и готовы к использованию!');
console.log('Доступные функции:');
console.log('  - initWebGazer()     - запустить WebGazer');
console.log('  - stopWebGazer()     - остановить WebGazer');
console.log('  - startCalibration() - запустить калибровку');
console.log('  - getCurrentGaze()   - получить текущие координаты');
console.log('  - isLookingAt(elem)  - проверить смотрит ли на элемент');
