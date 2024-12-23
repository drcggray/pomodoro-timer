// Default timer configuration
const DEFAULT_SETTINGS = {
    pomodoro: 25, // minutes
    shortBreak: 5,
    longBreak: 15,
    longBreakInterval: 4,
    autoStartBreaks: false
};

// Task management
class TaskManager {
    constructor() {
        this.tasks = this.loadTasks();
    }

    // Load tasks from localStorage
    loadTasks() {
        const savedTasks = localStorage.getItem('pomodoroTasks');
        return savedTasks ? JSON.parse(savedTasks) : [];
    }

    // Save tasks to localStorage
    saveTasks() {
        localStorage.setItem('pomodoroTasks', JSON.stringify(this.tasks));
    }

    // Add a new task
    addTask(taskName, estimatedPomodoros) {
        const task = {
            id: Date.now(),
            name: taskName,
            estimatedPomodoros: estimatedPomodoros,
            completedPomodoros: 0
        };
        this.tasks.push(task);
        this.saveTasks();
        return task;
    }

    // Update task's completed pomodoros
    updateTaskProgress(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.completedPomodoros++;
            this.saveTasks();
        }
    }

    // Delete a task
    deleteTask(taskId) {
        this.tasks = this.tasks.filter(task => task.id !== taskId);
        this.saveTasks();
    }

    // Get all tasks
    getTasks() {
        return [...this.tasks];
    }

    // Clear completed tasks
    clearCompletedTasks() {
        this.tasks = this.tasks.filter(task => !task.completed);
        this.saveTasks();
    }

    // Clear all tasks
    clearAllTasks() {
        this.tasks = [];
        this.saveTasks();
    }

    // Toggle task completion
    toggleTaskCompletion(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            this.saveTasks();
        }
    }
}

// Settings management
class Settings {
    constructor() {
        this.settings = this.loadSettings();
    }

    // Load settings from localStorage or use defaults
    loadSettings() {
        const savedSettings = localStorage.getItem('pomodoroSettings');
        return savedSettings ? JSON.parse(savedSettings) : {...DEFAULT_SETTINGS};
    }

    // Save settings to localStorage
    saveSettings(newSettings) {
        this.settings = {...newSettings};
        localStorage.setItem('pomodoroSettings', JSON.stringify(this.settings));
    }

    // Get current settings
    getSettings() {
        return {...this.settings};
    }
}

// Timer state management
class PomodoroTimer {
    constructor() {
        // Initialize settings and task manager
        this.settings = new Settings();
        this.taskManager = new TaskManager();
        
        // Initialize timer state
        const currentSettings = this.settings.getSettings();
        this.timeRemaining = currentSettings.pomodoro * 60;
        this.currentMode = 'pomodoro';
        this.isRunning = false;
        this.timerInterval = null;
        this.sessionsCompleted = 0;
        this.currentTaskId = null;

        // Cache DOM elements
        this.timerDisplay = document.querySelector('.timer-display');
        this.startButton = document.getElementById('startBtn');
        this.resetButton = document.getElementById('resetBtn');
        this.sessionCounter = document.getElementById('sessionCount');
        this.modeButtons = document.querySelectorAll('.mode-btn');
        this.settingsButton = document.getElementById('settingsBtn');
        this.settingsModal = document.getElementById('settingsModal');
        this.closeSettingsButton = document.getElementById('closeSettingsBtn');
        this.saveSettingsButton = document.getElementById('saveSettingsBtn');

        // Task-related elements
        this.tasksList = document.getElementById('tasksList');
        this.addTaskBtn = document.getElementById('addTaskBtn');
        this.taskModal = document.getElementById('taskModal');
        this.taskInput = document.getElementById('taskInput');
        this.pomodoroEstimate = document.getElementById('pomodoroEstimate');
        this.decreaseEstimateBtn = document.getElementById('decreaseEstimate');
        this.increaseEstimateBtn = document.getElementById('increaseEstimate');
        this.closeTaskBtn = document.getElementById('closeTaskBtn');
        this.cancelTaskBtn = document.getElementById('cancelTaskBtn');
        this.saveTaskBtn = document.getElementById('saveTaskBtn');
        this.clearFinishedBtn = document.getElementById('clearFinishedBtn');
        this.clearAllBtn = document.getElementById('clearAllBtn');

        // Settings form elements
        this.pomodoroInput = document.getElementById('pomodoroTime');
        this.shortBreakInput = document.getElementById('shortBreakTime');
        this.longBreakInput = document.getElementById('longBreakTime');
        this.autoStartBreaksInput = document.getElementById('autoStartBreaks');
        this.longBreakIntervalInput = document.getElementById('longBreakInterval');

        // Load initial settings into form
        this.loadSettingsIntoForm();

        // Bind event listeners
        this.bindEvents();
        
        // Initial display update
        this.updateDisplay();
    }

    // Set up event listeners for all buttons
    bindEvents() {
        this.startButton.addEventListener('click', () => this.toggleTimer());
        this.resetButton.addEventListener('click', () => this.resetTimer());
        
        this.modeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const mode = e.target.dataset.mode;
                this.switchMode(mode);
            });
        });

        // Settings modal events
        this.settingsButton.addEventListener('click', () => this.openSettings());
        this.closeSettingsButton.addEventListener('click', () => this.closeSettings());
        this.saveSettingsButton.addEventListener('click', () => this.saveSettings());
        
        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) {
                this.closeSettings();
            }
            if (e.target === this.taskModal) {
                this.closeTaskModal();
            }
        });

        // Task-related events
        this.addTaskBtn.addEventListener('click', () => this.openTaskModal());
        this.closeTaskBtn.addEventListener('click', () => this.closeTaskModal());
        this.cancelTaskBtn.addEventListener('click', () => this.closeTaskModal());
        this.saveTaskBtn.addEventListener('click', () => this.saveTask());
        this.clearFinishedBtn.addEventListener('click', () => {
            this.taskManager.clearCompletedTasks();
            this.renderTasks();
        });
        this.clearAllBtn.addEventListener('click', () => {
            this.taskManager.clearAllTasks();
            this.renderTasks();
        });
        
        // Pomodoro estimate controls
        this.decreaseEstimateBtn.addEventListener('click', () => {
            const currentValue = parseInt(this.pomodoroEstimate.value);
            if (currentValue > 1) {
                this.pomodoroEstimate.value = currentValue - 1;
            }
        });
        
        this.increaseEstimateBtn.addEventListener('click', () => {
            const currentValue = parseInt(this.pomodoroEstimate.value);
            this.pomodoroEstimate.value = currentValue + 1;
        });

        // Initial task list render
        this.renderTasks();
    }

    // Task Modal Methods
    openTaskModal() {
        this.taskModal.style.display = 'block';
        this.taskInput.value = '';
        this.pomodoroEstimate.value = '1';
        this.taskInput.focus();
    }

    closeTaskModal() {
        this.taskModal.style.display = 'none';
    }

    saveTask() {
        const taskName = this.taskInput.value.trim();
        const estimatedPomodoros = parseInt(this.pomodoroEstimate.value);
        
        if (taskName && estimatedPomodoros > 0) {
            this.taskManager.addTask(taskName, estimatedPomodoros);
            this.renderTasks();
            this.closeTaskModal();
        }
    }

    // Task Display Methods
    renderTasks() {
        const tasks = this.taskManager.getTasks();
        this.tasksList.innerHTML = '';
        
        tasks.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = `task-item${task.completed ? ' completed' : ''}${task.id === this.currentTaskId ? ' selected' : ''}`;
            taskElement.innerHTML = `
                <div class="task-checkbox"></div>
                <div class="task-name">${task.name}</div>
                <div class="task-pomodoros">${task.completedPomodoros}/${task.estimatedPomodoros}</div>
            `;
            
            // Add click handler for the checkbox
            const checkbox = taskElement.querySelector('.task-checkbox');
            checkbox.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent task selection when clicking checkbox
                this.taskManager.toggleTaskCompletion(task.id);
                this.renderTasks();
            });
            
            // Add click handler for task selection
            taskElement.addEventListener('click', () => {
                if (!task.completed) {
                    this.selectTask(task.id);
                    this.renderTasks();
                }
            });

            this.tasksList.appendChild(taskElement);
        });
    }

    selectTask(taskId) {
        this.currentTaskId = taskId;
    }

    // Update task progress when pomodoro completes
    updateTaskProgress() {
        if (this.currentTaskId && this.currentMode === 'pomodoro') {
            this.taskManager.updateTaskProgress(this.currentTaskId);
            this.renderTasks();
        }
    }

    // Load current settings into the form
    loadSettingsIntoForm() {
        const currentSettings = this.settings.getSettings();
        this.pomodoroInput.value = currentSettings.pomodoro;
        this.shortBreakInput.value = currentSettings.shortBreak;
        this.longBreakInput.value = currentSettings.longBreak;
        this.autoStartBreaksInput.checked = currentSettings.autoStartBreaks;
        this.longBreakIntervalInput.value = currentSettings.longBreakInterval;
    }

    // Open settings modal
    openSettings() {
        this.settingsModal.style.display = 'block';
        this.loadSettingsIntoForm();
    }

    // Close settings modal
    closeSettings() {
        this.settingsModal.style.display = 'none';
    }

    // Save settings
    saveSettings() {
        const newSettings = {
            pomodoro: parseInt(this.pomodoroInput.value),
            shortBreak: parseInt(this.shortBreakInput.value),
            longBreak: parseInt(this.longBreakInput.value),
            autoStartBreaks: this.autoStartBreaksInput.checked,
            longBreakInterval: parseInt(this.longBreakIntervalInput.value)
        };

        this.settings.saveSettings(newSettings);
        this.closeSettings();
        this.resetTimer();
    }

    // Format time in seconds to MM:SS display
    formatTime(timeInSeconds) {
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = timeInSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // Update the timer display
    updateDisplay() {
        this.timerDisplay.textContent = this.formatTime(this.timeRemaining);
        this.startButton.textContent = this.isRunning ? 'PAUSE' : 'START';
        this.sessionCounter.textContent = this.sessionsCompleted;
    }

    // Toggle timer between running and paused states
    toggleTimer() {
        if (this.isRunning) {
            this.pauseTimer();
        } else {
            this.startTimer();
        }
    }

    // Start the timer
    startTimer() {
        this.isRunning = true;
        this.timerInterval = setInterval(() => {
            this.timeRemaining--;
            this.updateDisplay();

            if (this.timeRemaining <= 0) {
                this.handleTimerComplete();
            }
        }, 1000);
        this.updateDisplay();
    }

    // Pause the timer
    pauseTimer() {
        this.isRunning = false;
        clearInterval(this.timerInterval);
        this.updateDisplay();
    }

    // Reset the timer
    resetTimer() {
        this.pauseTimer();
        const currentSettings = this.settings.getSettings();
        this.timeRemaining = currentSettings[this.currentMode] * 60;
        this.updateDisplay();
    }

    // Handle timer completion
    handleTimerComplete() {
        this.pauseTimer();
        
        // Play notification sound and show browser notification
        this.playNotification();
        
        if (this.currentMode === 'pomodoro') {
            this.sessionsCompleted++;
            
            // Update task progress if a task is selected
            this.updateTaskProgress();
            
            const currentSettings = this.settings.getSettings();
            
            // Check if it's time for a long break
            if (this.sessionsCompleted % currentSettings.longBreakInterval === 0) {
                this.switchMode('longBreak');
            } else {
                this.switchMode('shortBreak');
            }

            // Auto start breaks if enabled
            if (currentSettings.autoStartBreaks) {
                this.startTimer();
            }
        } else {
            this.switchMode('pomodoro');
        }
    }

    // Switch between different timer modes
    switchMode(mode) {
        // Update active button styling
        this.modeButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.mode === mode);
        });

        // Update timer mode and reset
        this.currentMode = mode;
        document.body.dataset.mode = mode;
        this.resetTimer();
    }

    // Play notification sound and show browser notification
    playNotification() {
        // Create and play a beep sound
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        oscillator.connect(audioContext.destination);
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2);

        // Show browser notification if permitted
        if (Notification.permission === 'granted') {
            new Notification('Pomodoro Timer', {
                body: `${this.currentMode === 'pomodoro' ? 'Time for a break!' : 'Break is over!'}`,
                icon: '/favicon.ico'
            });
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }
}

// Initialize the timer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new PomodoroTimer();
});
