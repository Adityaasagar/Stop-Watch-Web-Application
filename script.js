// My Personal Stopwatch App - Built with passion and attention to detail
// Features: Lap tracking, keyboard shortcuts, state persistence, and smooth animations
// Author: YourName | Version: 2.1.0 | Last Updated: 2024

(function() {
  'use strict';
  
  // DOM elements
  const timeDisplay = document.getElementById('time-display');
  const statusDisplay = document.getElementById('status-display');
  const startPauseBtn = document.getElementById('start-pause');
  const lapBtn = document.getElementById('lap');
  const resetBtn = document.getElementById('reset');
  const clearLapsBtn = document.getElementById('clear-laps');
  const lapsList = document.getElementById('laps-list');
  const lapCount = document.getElementById('lap-count');
  
  // State variables
  let isRunning = false;
  let startEpochMs = 0;
  let accumulatedMs = 0;
  let rafId = 0;
  let lastLapElapsedMs = 0;
  let lapCounter = 0;
  let bestLapTime = Infinity;
  let worstLapTime = 0;
  
  // Configuration
  const CONFIG = {
    STORAGE_KEY: 'my_stopwatch_v2_1_0',
    UPDATE_INTERVAL: 16, // ~60fps
    MAX_LAPS: 50,
    ANIMATION_DURATION: 300
  };
  
  // Utility functions
  const utils = {
    formatTime(ms) {
      if (ms < 0) ms = 0;
      const totalCentiseconds = Math.floor(ms / 10);
      const centiseconds = totalCentiseconds % 100;
      const totalSeconds = Math.floor(totalCentiseconds / 100);
      const seconds = totalSeconds % 60;
      const minutes = Math.floor(totalSeconds / 60);
      const hours = Math.floor(minutes / 60);
      
      if (hours > 0) {
        return `${String(hours).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
      }
      
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
    },
    
    updateStatus(message, type = 'info') {
      statusDisplay.textContent = message;
      statusDisplay.className = `display__status status--${type}`;
      
      // Auto-clear status after 3 seconds
      setTimeout(() => {
        if (statusDisplay.textContent === message) {
          statusDisplay.textContent = isRunning ? 'Running...' : 'Ready to start';
          statusDisplay.className = 'display__status';
        }
      }, 3000);
    },
    
    animateElement(element, animation) {
      element.style.animation = 'none';
      element.offsetHeight; // Trigger reflow
      element.style.animation = animation;
    },
    
    getRandomColor() {
      const colors = ['#00d4aa', '#ff6b6b', '#ffa502', '#ff4757', '#3742fa'];
      return colors[Math.floor(Math.random() * colors.length)];
    }
  };
  
  // Core stopwatch functionality
  const stopwatch = {
    start() {
      if (isRunning) return;
      
      startEpochMs = performance.now();
      isRunning = true;
      this.updateUI();
      this.startTimer();
      
      utils.updateStatus('Stopwatch started!', 'success');
      this.animateButton(startPauseBtn, 'pulse');
    },
    
    pause() {
      if (!isRunning) return;
      
      const now = performance.now();
      accumulatedMs += (now - startEpochMs);
      cancelAnimationFrame(rafId);
      isRunning = false;
      this.updateUI();
      this.renderTime();
      
      utils.updateStatus('Paused', 'warning');
      this.animateButton(startPauseBtn, 'bounce');
    },
    
    reset() {
      cancelAnimationFrame(rafId);
      accumulatedMs = 0;
      startEpochMs = performance.now();
      lastLapElapsedMs = 0;
      lapCounter = 0;
      bestLapTime = Infinity;
      worstLapTime = 0;
      isRunning = false;
      
      this.clearLaps();
      this.updateUI();
      this.renderTime();
      this.updateLapCount();
      
      utils.updateStatus('Reset to zero', 'info');
      this.animateButton(resetBtn, 'shake');
    },
    
    startTimer() {
      const tick = () => {
        this.renderTime();
        if (isRunning) {
          rafId = requestAnimationFrame(tick);
        }
      };
      rafId = requestAnimationFrame(tick);
    },
    
    renderTime() {
      const now = performance.now();
      const elapsed = isRunning ? (accumulatedMs + (now - startEpochMs)) : accumulatedMs;
      timeDisplay.textContent = utils.formatTime(elapsed);
    },
    
    updateUI() {
      const btnText = isRunning ? 'Pause' : 'Start';
      const btnIcon = isRunning ? '⏸️' : '▶️';
      
      startPauseBtn.querySelector('.btn__text').textContent = btnText;
      startPauseBtn.querySelector('.btn__icon').textContent = btnIcon;
      startPauseBtn.setAttribute('aria-pressed', String(isRunning));
      
      lapBtn.disabled = !isRunning;
      resetBtn.disabled = (!isRunning && accumulatedMs === 0);
      
      // Update button styles
      if (isRunning) {
        startPauseBtn.classList.add('btn--running');
        startPauseBtn.classList.remove('btn--primary');
      } else {
        startPauseBtn.classList.remove('btn--running');
        startPauseBtn.classList.add('btn--primary');
      }
    },
    
    animateButton(button, animation) {
      const animations = {
        pulse: 'pulse 0.6s ease-in-out',
        bounce: 'bounce 0.6s ease-in-out',
        shake: 'shake 0.6s ease-in-out'
      };
      
      if (animations[animation]) {
        utils.animateElement(button, animations[animation]);
      }
    }
  };
  
  // Lap management
  const lapManager = {
    addLap() {
      if (!isRunning) return;
      
      const now = performance.now();
      const elapsed = accumulatedMs + (now - startEpochMs);
      const lapMs = elapsed - lastLapElapsedMs;
      
      // Update statistics
      if (lapMs < bestLapTime) bestLapTime = lapMs;
      if (lapMs > worstLapTime) worstLapTime = lapMs;
      
      lastLapElapsedMs = elapsed;
      lapCounter++;
      
      this.createLapElement(lapMs, elapsed);
      this.updateLapCount();
      this.saveState();
      
      utils.updateStatus(`Lap ${lapCounter} recorded!`, 'success');
      
      // Limit laps to prevent memory issues
      if (lapsList.children.length >= CONFIG.MAX_LAPS) {
        const oldestLap = lapsList.lastElementChild;
        if (oldestLap) oldestLap.remove();
      }
    },
    
    createLapElement(lapMs, totalMs) {
      const li = document.createElement('li');
      li.className = 'lap';
      
      // Add special styling for best/worst laps
      if (lapMs === bestLapTime) {
        li.classList.add('lap--best');
        li.style.borderColor = '#00d4aa';
      } else if (lapMs === worstLapTime && lapCounter > 1) {
        li.classList.add('lap--worst');
        li.style.borderColor = '#ff4757';
      }
      
      const name = document.createElement('span');
      name.className = 'lap__name';
      name.textContent = `Lap ${lapCounter}`;
      
      const time = document.createElement('span');
      time.className = 'lap__time';
      time.textContent = `${utils.formatTime(lapMs)} (total: ${utils.formatTime(totalMs)})`;
      
      // Add lap time indicator
      if (lapMs === bestLapTime) {
        const indicator = document.createElement('span');
        indicator.className = 'lap__indicator';
        indicator.textContent = '🏆';
        indicator.title = 'Best lap!';
        li.appendChild(indicator);
      }
      
      li.appendChild(name);
      li.appendChild(time);
      
      // Animate in
      li.style.opacity = '0';
      li.style.transform = 'translateX(-20px)';
      lapsList.insertBefore(li, lapsList.firstChild);
      
      // Trigger animation
      requestAnimationFrame(() => {
        li.style.transition = 'all 0.3s ease-out';
        li.style.opacity = '1';
        li.style.transform = 'translateX(0)';
      });
      
      clearLapsBtn.disabled = false;
    },
    
    clearLaps() {
      lapsList.innerHTML = '';
      clearLapsBtn.disabled = true;
      lapCounter = 0;
      bestLapTime = Infinity;
      worstLapTime = 0;
      this.updateLapCount();
      
      utils.updateStatus('All laps cleared', 'info');
    },
    
    updateLapCount() {
      const text = lapCounter === 1 ? '1 lap' : `${lapCounter} laps`;
      lapCount.textContent = text;
      
      // Add some personality to the counter
      if (lapCounter > 10) {
        lapCount.style.background = utils.getRandomColor();
        lapCount.style.color = '#000';
      }
    }
  };
  
  // State management
  const stateManager = {
    saveState() {
      try {
        const state = {
          accumulatedMs,
          isRunning,
          lapCounter,
          bestLapTime,
          worstLapTime,
          laps: Array.from(lapsList.children).map(li => ({
            name: li.querySelector('.lap__name').textContent,
            time: li.querySelector('.lap__time').textContent,
            isBest: li.classList.contains('lap--best'),
            isWorst: li.classList.contains('lap--worst')
          }))
        };
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(state));
      } catch (error) {
        console.warn('Failed to save state:', error);
      }
    },
    
    loadState() {
      try {
        const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
        if (!raw) return;
        
        const state = JSON.parse(raw);
        accumulatedMs = Number(state.accumulatedMs) || 0;
        lapCounter = Number(state.lapCounter) || 0;
        bestLapTime = Number(state.bestLapTime) || Infinity;
        worstLapTime = Number(state.worstLapTime) || 0;
        
        stopwatch.updateUI();
        stopwatch.renderTime();
        lapManager.updateLapCount();
        
        // Restore laps
        if (Array.isArray(state.laps)) {
          state.laps.forEach(lapData => {
            const li = document.createElement('li');
            li.className = 'lap';
            if (lapData.isBest) li.classList.add('lap--best');
            if (lapData.isWorst) li.classList.add('lap--worst');
            
            const name = document.createElement('span');
            name.className = 'lap__name';
            name.textContent = lapData.name;
            
            const time = document.createElement('span');
            time.className = 'lap__time';
            time.textContent = lapData.time;
            
            li.appendChild(name);
            li.appendChild(time);
            lapsList.appendChild(li);
          });
          
          clearLapsBtn.disabled = lapsList.children.length === 0;
        }
        
        // Resume if it was running
        if (state.isRunning) {
          stopwatch.start();
        }
        
        utils.updateStatus('State restored', 'success');
      } catch (error) {
        console.warn('Failed to load state:', error);
      }
    }
  };
  
  // Event handlers
  const eventHandlers = {
    init() {
      startPauseBtn.addEventListener('click', () => {
        if (isRunning) {
          stopwatch.pause();
        } else {
          stopwatch.start();
        }
        stateManager.saveState();
      });
      
      resetBtn.addEventListener('click', () => {
        stopwatch.reset();
        stateManager.saveState();
      });
      
      lapBtn.addEventListener('click', () => {
        if (isRunning) lapManager.addLap();
      });
      
      clearLapsBtn.addEventListener('click', () => {
        lapManager.clearLaps();
        stateManager.saveState();
      });
      
      // Keyboard shortcuts
      document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        switch(e.code) {
          case 'Space':
            e.preventDefault();
            if (isRunning) {
              stopwatch.pause();
            } else {
              stopwatch.start();
            }
            stateManager.saveState();
            break;
          case 'KeyL':
            if (isRunning) lapManager.addLap();
            break;
          case 'KeyR':
            stopwatch.reset();
            stateManager.saveState();
            break;
        }
      });
      
      // Auto-save every 5 seconds
      setInterval(() => {
        if (isRunning || accumulatedMs > 0) {
          stateManager.saveState();
        }
      }, 5000);
    }
  };
  
  // Initialize the app
  function init() {
    eventHandlers.init();
    stopwatch.renderTime();
    stateManager.loadState();
    
    // Add some personality
    const messages = [
      'Ready to track some time!',
      'Let\'s get timing!',
      'Time waits for no one!',
      'Ready to start the clock!'
    ];
    
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    utils.updateStatus(randomMessage, 'info');
    
    console.log('🚀 My Personal Stopwatch v2.1.0 initialized successfully!');
  }
  
  // Start the app when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();


