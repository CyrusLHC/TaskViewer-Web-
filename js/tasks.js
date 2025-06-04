// Sign Out Function
function signOut() {
    auth.signOut()
        .then(() => {
            localStorage.removeItem('userId');
            localStorage.removeItem('currentCalendar');
            localStorage.removeItem('currentTask');
            window.location.href = 'index.html';
        })
        .catch((error) => {
            alert("Failed to sign out: " + error.message);
        });
}

// Calendar Variables
let currentDate = new Date();
let tasksByDate = {};

// Render Calendar
function renderCalendar() {
    const calendarGrid = document.getElementById('calendarGrid');
    const monthYear = document.getElementById('monthYear');
    calendarGrid.innerHTML = '';

    // Set month and year header
    monthYear.textContent = `${currentDate.toLocaleString('default', { month: 'long' })} ${currentDate.getFullYear()}`;

    // Get the first day of the month
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    // Add empty cells for days before the first day
    for (let i = 0; i < firstDay.getDay(); i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-day empty';
        calendarGrid.appendChild(emptyCell);
    }

    // Add days of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const cell = document.createElement('div');
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        // 基本的 class
        cell.className = 'calendar-day';
        
        // 檢查該日期的任務
        if (tasksByDate[dateStr]) {
            const hasImportantTask = tasksByDate[dateStr].some(task => task.important);
            if (hasImportantTask) {
                cell.className += ' has-important-tasks';
            } else {
                cell.className += ' has-normal-tasks';
            }
        }
        
        cell.textContent = day;

        // Highlight today's date
        const today = new Date();
        if (
            currentDate.getFullYear() === today.getFullYear() &&
            currentDate.getMonth() === today.getMonth() &&
            day === today.getDate()
        ) {
            cell.classList.add('today');
        }

        // Highlight dates with tasks
        if (tasksByDate[dateStr]) {
            cell.classList.add('has-tasks');
        }

        // 添加該日期的任務
        if (tasksByDate[dateStr]) {
            const tasksDiv = document.createElement('div');
            tasksDiv.className = 'day-tasks';
            
            tasksByDate[dateStr].forEach(task => {
                const taskDiv = document.createElement('div');
                taskDiv.className = 'task-marker';
                taskDiv.textContent = task.taskContent;
                taskDiv.title = `${task.taskContent} (${task.fromTime} - ${task.toTime})`;
                tasksDiv.appendChild(taskDiv);
            });
            
            cell.appendChild(tasksDiv);
        }
        
        calendarGrid.appendChild(cell);
    }
}
// Load Tasks and Update Calendar
function loadTasksAndCalendar() {
    const calendarId = localStorage.getItem('currentCalendar');
    const userId = localStorage.getItem('userId');
    
    if (!calendarId || !userId) {
        console.log('No calendar ID or user ID found');
        return;
    }

    tasksByDate = {};

    // 1. 先讀取直接存儲在tasks下的任務
    database.ref(`tasks/${calendarId}`).on('value', (snapshot) => {
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const task = childSnapshot.val();
                if (task && task.deadline && task.taskContent) {
                    if (!tasksByDate[task.deadline]) {
                        tasksByDate[task.deadline] = [];
                    }
                    tasksByDate[task.deadline].push({
                        id: childSnapshot.key,
                        ...task
                    });
                }
            });
        }
        
        // 2. 然後讀取存儲在calendars下的任務
        database.ref(`tasks/calendars/${userId}/${calendarId}/tasks`).on('value', (calendarSnapshot) => {
            if (calendarSnapshot.exists()) {
                calendarSnapshot.forEach((taskSnapshot) => {
                    const task = taskSnapshot.val();
                    if (task && task.deadline && task.taskContent) {
                        if (!tasksByDate[task.deadline]) {
                            tasksByDate[task.deadline] = [];
                        }
                        tasksByDate[task.deadline].push({
                            id: taskSnapshot.key,
                            ...task
                        });
                    }
                });
            }
            
            console.log('All tasks loaded:', tasksByDate);
            renderCalendar();
            updateTaskList();
        });
    });
}

// Navigate to Previous Month
function previousMonth() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
}

// Navigate to Next Month
function nextMonth() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
}

// Task Management Functions
function showAddTask() {
    document.getElementById('addTaskModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('addTaskModal').style.display = 'none';
}

// 添加日期格式化函數
function formatDate(date) {
    try {
        const [year, month, day] = date.split('-');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    } catch (error) {
        console.error('Date formatting error:', error);
        return date;
    }
}

function formatTime(time) {
    try {
        const [hours, minutes] = time.split(':');
        const date = new Date();
        date.setHours(parseInt(hours));
        date.setMinutes(parseInt(minutes));
        
        return date.toLocaleString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: true 
        }).toUpperCase();
    } catch (error) {
        console.error('Time formatting error:', error);
        return time;
    }
}

function addTask() {
    const calendarId = localStorage.getItem('currentCalendar');
    const userId = localStorage.getItem('userId');
    const taskTitle = document.getElementById('taskTitle').value;
    const taskDate = document.getElementById('taskDate').value;
    const taskStartTime = document.getElementById('taskStartTime').value;
    const taskEndTime = document.getElementById('taskEndTime').value;
    
    const importantCheckbox = document.getElementById('importantCheckbox');
    const isImportant = importantCheckbox ? importantCheckbox.checked : false;

    if (!taskTitle || !taskDate || !taskStartTime || !taskEndTime) {
        alert('Please fill in all fields');
        return;
    }

    const formattedStartTime = formatTime(taskStartTime);
    const formattedEndTime = formatTime(taskEndTime);
    const formattedDate = formatDate(taskDate);

    // 生成一個新的任務ID
    const taskId = database.ref().push().key;

    const newTask = {
        deadline: formattedDate,
        fromTime: formattedStartTime,
        toTime: formattedEndTime,
        id: taskId,
        importanceDisplay: isImportant ? "★" : "☆",
        important: isImportant,
        taskContent: taskTitle,
        type: isImportant ? "important" : "deadline"
    };

    // 使用正確的儲存路徑：calendarId/taskId
    const savePath = `tasks/${calendarId}/${taskId}`;
    console.log('Saving task to path:', savePath);
    console.log('Task data:', newTask);

    database.ref(savePath).set(newTask)
        .then(() => {
            console.log('Task saved successfully');
            closeModal();
            loadTasksAndCalendar();
        })
        .catch((error) => {
            console.error('Error saving task:', error);
            alert('Error adding task: ' + error.message);
        });
}
// Delete Task Function
function deleteTask(taskId) {
    const calendarId = localStorage.getItem('currentCalendar');
    if (confirm("Are you sure you want to delete this task?")) {
        database.ref(`tasks/${calendarId}/${taskId}`).remove()
            .then(() => {
                loadTasksAndCalendar(); // Refresh the task list and calendar
            })
            .catch((error) => {
                alert("Failed to delete task: " + error.message);
            });
    }
}

// Edit Task Function
function editTask(taskId) {
    const calendarId = localStorage.getItem('currentCalendar');
    database.ref(`tasks/${calendarId}/${taskId}`).once('value').then((snapshot) => {
        const task = snapshot.val();
        if (task) {
            // Store the task ID in localStorage for use in EditActivity.html
            localStorage.setItem('currentTask', taskId);
            // Redirect to EditActivity.html
            window.location.href = 'EditActivity.html';
        }
    }).catch((error) => {
        alert("Failed to fetch task details: " + error.message);
    });
}

// Save Task Function
function saveTask() {
    const taskId = localStorage.getItem('currentTask');
    const calendarId = localStorage.getItem('currentCalendar');
    if (!taskId || !calendarId) {
        alert("Task ID or Calendar ID not found.");
        return;
    }

    const taskTitle = document.getElementById('editTaskTitle').value;
    const taskDate = document.getElementById('editTaskDate').value;
    const taskStartTime = document.getElementById('editStartTime').value;
    const taskEndTime = document.getElementById('editEndTime').value;
    const taskImportant = document.getElementById('editImportant').checked;

    if (!taskTitle || !taskDate || !taskStartTime || !taskEndTime) {
        alert("Please fill in all fields.");
        return;
    }

    const updatedTask = {
        taskContent: taskTitle,
        deadline: taskDate,
        fromTime: taskStartTime,
        toTime: taskEndTime,
        important: taskImportant,
        importanceDisplay: taskImportant ? "★" : "☆",
        type: "deadline"
    };

    database.ref(`tasks/${calendarId}/${taskId}`).update(updatedTask)
        .then(() => {
            alert("Task updated successfully!");
            window.location.href = 'MainActivity.html';
        })
        .catch((error) => {
            alert("Failed to update task: " + error.message);
        });
}

// Initialize when on MainActivity
if (window.location.pathname.endsWith('MainActivity.html')) {
    auth.onAuthStateChanged(user => {
        if (!user) {
            window.location.href = 'index.html'; // Redirect to login if not authenticated
        } else {
            // Display the user's email in the header
            const userEmailElement = document.getElementById('userEmail');
            if (userEmailElement) {
                userEmailElement.textContent = user.email; // Set the user's email
            }

            // Load tasks and render the calendar
            loadTasksAndCalendar();
            renderCalendar();
        }
    });
}

// 添加更新任务列表的函數
function updateTaskList() {
    const activeTaskList = document.getElementById('activeTaskList');
    const timeoutTaskList = document.getElementById('timeoutTaskList');
    
    if (!activeTaskList || !timeoutTaskList) return;  // 如果不在任务列表页面则返回

    const calendarId = localStorage.getItem('currentCalendar');
    const userId = localStorage.getItem('userId');
    
    if (!calendarId || !userId) {
        console.log('No calendar ID or user ID found');
        return;
    }

    // 清空現有列表
    activeTaskList.innerHTML = '';
    timeoutTaskList.innerHTML = '';
    
    // 將所有任務按日期排序
    const allTasks = [];
    Object.keys(tasksByDate).forEach(date => {
        tasksByDate[date].forEach(task => {
            allTasks.push({
                date: date,
                ...task
            });
        });
    });
    
    // 按日期排序
    allTasks.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // 获取当前日期（不含时间）
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 创建任务列表
    allTasks.forEach(task => {
        const taskDate = new Date(task.deadline);
        taskDate.setHours(0, 0, 0, 0);
        
        const taskElement = document.createElement('div');
        taskElement.className = 'task-item';
        taskElement.innerHTML = `
            <div class="task-content">
                <h3>${task.taskContent}</h3>
                <p>Date: ${task.deadline}</p>
                <p>Time: ${task.fromTime} - ${task.toTime}</p>
                <p>Priority: ${task.important ? '⭐ Important' : 'Normal'}</p>
            </div>
            <div class="task-actions">
                <button onclick="editTask('${task.id}')">Edit</button>
                <button onclick="deleteTask('${task.id}', '${task.deadline}')">Delete</button>
            </div>
        `;
        
        // 判断任务是否过期
        if (taskDate < today) {
            // 过期任务添加到TimeOut列表
            timeoutTaskList.appendChild(taskElement);
        } else {
            // 未过期任务添加到活动任务列表
            activeTaskList.appendChild(taskElement);
        }
    });
}

// 在頁面加載時調用更新任務列表
if (window.location.pathname.endsWith('ViewDataActivity.html')) {
    auth.onAuthStateChanged(user => {
        if (!user) {
            window.location.href = 'index.html';
        } else {
            loadTasksAndCalendar();  // 這會觸發任務加載
        }
    });
}

// AI Assistant Functions (unchanged up to processAIInput)
function showAIModal() {
    // 检查麦克风权限
    checkMicrophonePermission().then(hasPermission => {
        if (!hasPermission) {
            alert('Please allow microphone access to use voice input.\n\n' +
                  '1. Click the lock or info icon in the address bar\n' +
                  '2. Find the "Microphone" option\n' +
                  '3. Select "Allow"');
        }
        document.getElementById('aiModal').style.display = 'flex';
    });
}

function closeAIModal() {
    document.getElementById('aiModal').style.display = 'none';
}

function showTextInput() {
    closeAIModal();
    document.getElementById('textInputModal').style.display = 'flex';
}

function closeTextInputModal() {
    document.getElementById('textInputModal').style.display = 'none';
    document.getElementById('scheduleText').value = '';
}

// Add these global variables at the top of the file
let hasMicrophonePermission = false;
let microphonePermissionChecked = false;
let recognition = null;
let isRecording = false;

// Modify the checkMicrophonePermission function
async function checkMicrophonePermission() {
    if (microphonePermissionChecked) {
        return hasMicrophonePermission;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        hasMicrophonePermission = true;
        microphonePermissionChecked = true;
        return true;
    } catch (error) {
        console.error('Microphone permission error:', error);
        hasMicrophonePermission = false;
        microphonePermissionChecked = true;
        return false;
    }
}

// Voice input control functions
function toggleVoiceInput() {
    if (!hasMicrophonePermission) {
        alert('Microphone access is required for voice input. Please enable it in your browser settings.');
        return;
    }

    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
}

function startRecording() {
    if (!recognition) {
        alert('Voice recognition is not initialized. Please try again.');
        return;
    }

    try {
        recognition.start();
        isRecording = true;
        document.getElementById('voiceButton').classList.add('recording');
        document.getElementById('voiceButton').textContent = 'Recording... Click to Stop';
        console.log('Recording started');
    } catch (error) {
        console.error('Failed to start recording:', error);
        alert('Failed to start recording. Please ensure microphone access is granted.');
        stopRecording();
    }
}

function stopRecording() {
    if (recognition) {
        try {
            recognition.stop();
            isRecording = false;
            document.getElementById('voiceButton').classList.remove('recording');
            document.getElementById('voiceButton').textContent = 'Click And Tell Us What Schedule You Need To Add';
            console.log('Recording stopped');
        } catch (error) {
            console.error('Failed to stop recording:', error);
        }
    }
}

// Modify the showVoiceInput function
function showVoiceInput() {
    closeAIModal();
    document.getElementById('voiceInputModal').style.display = 'flex';
    
    // Only check permission if we haven't checked before
    if (!microphonePermissionChecked) {
        checkMicrophonePermission().then(hasPermission => {
            if (!hasPermission) {
                alert('Microphone permission is required for voice input.\n\n' +
                      '1. Click the lock or info icon in the address bar\n' +
                      '2. Find the "Microphone" option\n' +
                      '3. Select "Allow"');
                closeVoiceInputModal();
                return;
            }
            initializeVoiceRecognition();
        });
    } else if (!hasMicrophonePermission) {
        alert('Microphone access is required for voice input. Please enable it in your browser settings.');
        closeVoiceInputModal();
        return;
    } else {
        initializeVoiceRecognition();
    }
}

// Add a new function to handle voice recognition initialization
function initializeVoiceRecognition() {
    if (!recognition) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Your browser does not support speech recognition. Please use Chrome browser.');
            closeVoiceInputModal();
            return;
        }

        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        
        recognition.onstart = function() {
            console.log('Voice recognition started');
            isRecording = true;
            document.getElementById('voiceButton').classList.add('recording');
            document.getElementById('voiceButton').textContent = 'Recording... Click to Stop';
            document.getElementById('voiceText').value = ''; // Clear previous input
        };
        
        recognition.onresult = function(event) {
            const voiceText = document.getElementById('voiceText');
            const transcript = event.results[0][0].transcript;
            voiceText.value = transcript;
            stopRecording();
            console.log('Voice input:', transcript);
        };
        
        recognition.onerror = function(event) {
            console.error('Voice recognition error:', event.error);
            let errorMessage = 'Voice recognition error: ';
            switch(event.error) {
                case 'no-speech':
                    errorMessage += 'No speech detected. Please try speaking again.';
                    break;
                case 'aborted':
                    errorMessage += 'Voice recognition aborted';
                    break;
                case 'audio-capture':
                    errorMessage += 'Cannot access microphone. Please check your microphone settings.';
                    break;
                case 'network':
                    errorMessage += 'Network error. Please check your internet connection.';
                    break;
                case 'not-allowed':
                    errorMessage += 'Microphone access denied. Please allow microphone access.';
                    break;
                case 'service-not-allowed':
                    errorMessage += 'Voice recognition service denied';
                    break;
                default:
                    errorMessage += event.error;
            }
            alert(errorMessage);
            stopRecording();
        };
        
        recognition.onend = function() {
            stopRecording();
        };
    }
}

function processScheduleText() {
    const scheduleText = document.getElementById('scheduleText').value.trim();
    if (!scheduleText) {
        alert('Please enter a schedule');
        return;
    }
    processAIInput(scheduleText);
    closeTextInputModal();
}

function processVoiceInput() {
    const voiceText = document.getElementById('voiceText').value.trim();
    if (!voiceText) {
        alert('Please speak something first');
        return;
    }
    
    // Show loading state
    showLoading();
    
    // Process the input
    processAIInput(voiceText)
        .then(() => {
            // Refresh the task list and calendar
            loadTasksAndCalendar();
        })
        .catch(error => {
            console.error('Error processing voice input:', error);
            alert('Error processing voice input: ' + error.message);
        })
        .finally(() => {
            hideLoading();
            // Always close the modal after processing
            closeVoiceInputModal();
        });
}

// AI API Configuration
const AI_API_URL = 'http://localhost:8080/api/chat/completions'; // Replace with your actual API URL
const API_KEY = 'sk-7896ed6d903d4344b68bad8cf7aeabac';

// Loading UI Control
function showLoading() {
    document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

function processAIInput(input) {
    const calendarId = localStorage.getItem('currentCalendar');
    const userId = localStorage.getItem('userId');
    if (!calendarId || !userId) {
        alert('Calendar ID or User ID not found. Please ensure you are logged in and have selected a calendar.');
        console.error('Missing calendarId or userId:', { calendarId, userId });
        return;
    }

    const currentDateStr = new Date().toISOString().split('T')[0];
    const taskId = database.ref(`tasks/${calendarId}`).push().key;

    const requestBody = {
        model: 'deepseek-r1:8b',
        messages: [
            {
                role: 'system',
                content: `Transform the user's sentence into the following structured format:\n\n` +
                         `Current Date: ${currentDateStr}\n\n` +
                         `Task ID: ${taskId}\n\n` +
                         `Input Sentence:\n\n"${input}"\n\n` +
                         `Output Format:\n\n` +
                         `TaskData{\n` +
                         `  id='[use the provided Task ID]',\n` +
                         `  taskContent='user_input',\n` +
                         `  deadline='user_input',\n` +
                         `  fromTime='user_input',\n` +
                         `  toTime='user_input',\n` +
                         `  isImportant=user_input,\n` +
                         `  type='user_input'\n` +
                         `}\n\n` +
                         `Instructions:\n` +
                         `Use the Current Date provided above as a reference.\n` +
                         `Use the Task ID provided above for the id field.\n` +
                         `Replace user_input with relevant details extracted from the input sentence.\n` +
                         `For taskContent, extract the task description.\n` +
                         `For deadline, calculate and format the date as YYYY-MM-DD based on the Current Date and any relative time references (e.g., 'tomorrow' means Current Date + 1 day).\n` +
                         `For fromTime and toTime, extract and format the time as h:mm a in 12-hour format with AM/PM.\n` +
                         `For isImportant, set it to true if the task seems important (e.g., exams, deadlines) or false otherwise.\n` +
                         `For type, set to 'important' if isImportant is true, otherwise 'deadline'.`
            },
            {
                role: 'user',
                content: `Input Sentence:\n\n"${input}"`
            }
        ]
    };

    console.log('Sending request to:', AI_API_URL);
    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    const submitButtons = document.querySelectorAll('.modal-button:not(.cancel)');
    submitButtons.forEach(btn => btn.disabled = true);
    showLoading(); // Show loading spinner

    fetch(AI_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(`API request failed with status ${response.status}: ${text}`);
            });
        }
        console.log('Response status:', response.status);
        return response.json();
    })
    .then(data => {
        console.log('Raw API response:', data);
        const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
        if (!content) throw new Error('Invalid API response: No content found');

        console.log('Parsed content:', content);
        const taskDataMatch = content.match(/TaskData\{([\s\S]*?)\}/);
        if (!taskDataMatch) throw new Error('Invalid AI response format: TaskData not found');

        const taskDataStr = taskDataMatch[1];
        const task = parseTaskData(taskDataStr);
        console.log('Extracted task:', task);

        const savePath = `tasks/${calendarId}/${task.id}`;
        return database.ref(savePath).set(task)
            .then(() => {
                console.log('Task saved to Firebase:', task);
                alert('Task added successfully!');
                loadTasksAndCalendar();
            });
    })
    .catch(error => {
        console.error('Detailed error:', error);
        if (error.message.includes('Failed to fetch')) {
            alert('Failed to connect to the AI server. Check your network or server status.');
        } else {
            alert('Error processing schedule: ' + error.message);
        }
    })
    .finally(() => {
        hideLoading(); // Hide loading spinner
        submitButtons.forEach(btn => btn.disabled = false);
    });
}

function parseTaskData(taskDataStr) {
    const extractValue = (str, key) => {
        const regex = new RegExp(`${key}='([^']*)'`);
        const match = str.match(regex);
        return match ? match[1] : '';
    };

    const extractBoolean = (str, key) => {
        const regex = new RegExp(`${key}=([^,]+)`);
        const match = str.match(regex);
        return match ? match[1].trim() === 'true' : false;
    };

    const task = {
        id: extractValue(taskDataStr, 'id'),
        taskContent: extractValue(taskDataStr, 'taskContent'),
        deadline: extractValue(taskDataStr, 'deadline'),
        fromTime: extractValue(taskDataStr, 'fromTime'),
        toTime: extractValue(taskDataStr, 'toTime'),
        important: extractBoolean(taskDataStr, 'isImportant'),
        type: extractValue(taskDataStr, 'type')
    };

    task.importanceDisplay = task.important ? "★" : "";
    return task;
}
// Dark Mode Functions
function toggleDarkMode() {
    const body = document.body;
    const isDarkMode = document.getElementById('darkModeToggle').checked;
    
    if (isDarkMode) {
        body.classList.add('dark-mode');
        localStorage.setItem('darkMode', 'enabled');
    } else {
        body.classList.remove('dark-mode');
        localStorage.setItem('darkMode', 'disabled');
    }
}

// 初始化Dark Mode状态
function initDarkMode() {
    const darkMode = localStorage.getItem('darkMode');
    const darkModeToggle = document.getElementById('darkModeToggle');
    
    if (darkMode === 'enabled') {
        document.body.classList.add('dark-mode');
        darkModeToggle.checked = true;
    }
}

// 在页面加载时初始化Dark Mode
document.addEventListener('DOMContentLoaded', function() {
    initDarkMode();
});

function closeVoiceInputModal() {
    // Stop any ongoing recording
    if (isRecording) {
        stopRecording();
    }
    
    // Hide the modal
    const modal = document.getElementById('voiceInputModal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    // Clear the text area
    const voiceText = document.getElementById('voiceText');
    if (voiceText) {
        voiceText.value = '';
    }
    
    // Reset the button state
    const voiceButton = document.getElementById('voiceButton');
    if (voiceButton) {
        voiceButton.classList.remove('recording');
        voiceButton.textContent = 'Click And Tell Us What Schedule You Need To Add';
    }
}


