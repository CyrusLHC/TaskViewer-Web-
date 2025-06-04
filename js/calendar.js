function showCreateCalendar() {
    const modal = document.getElementById('createCalendarModal');
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
}

function closeModal() {
    const modal = document.getElementById('createCalendarModal');
    modal.style.display = 'none';
}

function createCalendar() {
    const calendarName = document.getElementById('calendarName').value;
    const userId = localStorage.getItem('userId');

    if (!calendarName) {
        alert("Please enter a calendar name.");
        return;
    }

    // Generate a random 16-digit calendar ID
    const calendarId = String(Math.floor(Math.random() * 1e16)).padStart(16, '0');

    const newCalendar = {
        calendarId: calendarId,
        calendarName: calendarName,
        owner: userId,
        created: Date.now()
    };

    // Save calendar under tasks/calendars/{userId}/{calendarId}
    database.ref(`tasks/calendars/${userId}`).push(newCalendar)
        .then(() => {
            closeModal();
            loadCalendars();
        })
        .catch((error) => {
            alert("Failed to create calendar: " + error.message);
        });
}

function loadCalendars() {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    database.ref(`tasks/calendars/${userId}`).on('value', (snapshot) => {
        const calendarList = document.getElementById('calendarList');
        calendarList.innerHTML = '';
        
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const calendar = childSnapshot.val();
                // 只顯示未隱藏的日曆
                if (!calendar.hidden) {
                    const div = document.createElement('div');
                    div.className = 'calendar-item';
                    div.innerHTML = `
                        <h3>${calendar.calendarName}</h3>
                        <p>ID: ${calendar.calendarId}</p>
                        <div class="calendar-buttons">
                            <button onclick="openCalendar('${calendar.calendarId}')">Open</button>
                            <button onclick="shareCalendar('${calendar.calendarId}')">Share</button>
                            <button onclick="deleteCalendarForMe('${calendar.calendarId}', '${childSnapshot.key}')">DELETE FOR ME</button>
                            <button onclick="deleteCalendarForEveryone('${calendar.calendarId}', '${childSnapshot.key}')">DELETE FOR EVERYONE</button>
                        </div>
                    `;
                    calendarList.appendChild(div);
                }
            });
        }
    });
}

function openCalendar(calendarId) {
    localStorage.setItem('currentCalendar', calendarId);
    window.location.href = 'MainActivity.html';
}

function addCalendarById() {
    const calendarId = document.getElementById('calendarId').value;
    const userId = localStorage.getItem('userId');

    if (!calendarId) {
        alert("Please enter a calendar ID.");
        return;
    }

    // 檢查日曆是否存在
    database.ref(`tasks/${calendarId}`).once('value')
        .then((snapshot) => {
            if (!snapshot.exists()) {
                alert("Calendar not found.");
                return;
            }

            // 檢查用戶是否已經擁有這個日曆
            database.ref(`tasks/calendars/${userId}`).once('value')
                .then((userCalendars) => {
                    let alreadyExists = false;
                    userCalendars.forEach((calendar) => {
                        if (calendar.val().calendarId === calendarId) {
                            alreadyExists = true;
                        }
                    });

                    if (alreadyExists) {
                        alert("You already have this calendar.");
                        return;
                    }

                    // 獲取日曆名稱
                    const calendarName = prompt("Please enter a name for this calendar:");
                    if (!calendarName) {
                        alert("Calendar name is required.");
                        return;
                    }

                    // 添加日曆到用戶的日曆列表
                    const newCalendar = {
                        calendarId: calendarId,
                        calendarName: calendarName,
                        owner: userId,
                        created: Date.now()
                    };

                    database.ref(`tasks/calendars/${userId}`).push(newCalendar)
                        .then(() => {
                            alert("Calendar added successfully!");
                            closeModal();
                            loadCalendars();
                        })
                        .catch((error) => {
                            alert("Failed to add calendar: " + error.message);
                        });
                });
        })
        .catch((error) => {
            alert("Error checking calendar: " + error.message);
        });
}

function shareCalendar(calendarId) {
    const modal = document.getElementById('shareCalendarModal');
    const shareInput = document.getElementById('shareCalendarId');
    shareInput.value = calendarId;
    modal.style.display = 'flex';
}

function closeShareModal() {
    const modal = document.getElementById('shareCalendarModal');
    modal.style.display = 'none';
}

function copyCalendarId() {
    const shareInput = document.getElementById('shareCalendarId');
    shareInput.select();
    document.execCommand('copy');
    alert('Calendar ID copied to clipboard!');
}

function deleteCalendarForMe(calendarId, calendarKey) {
    if (confirm('Are you sure you want to hide this calendar from your list?')) {
        const userId = localStorage.getItem('userId');
        // Update hidden field to true instead of deleting
        database.ref(`tasks/calendars/${userId}/${calendarKey}`).update({
            hidden: true
        })
            .then(() => {
                alert('Calendar has been hidden from your list.');
                loadCalendars();
            })
            .catch((error) => {
                alert('Error hiding calendar: ' + error.message);
            });
    }
}

function deleteCalendarForEveryone(calendarId, calendarKey) {
    if (confirm('WARNING: This will permanently delete the calendar for all users. Are you sure?')) {
        const userId = localStorage.getItem('userId');
        
        // 首先檢查用戶是否是日曆的所有者
        database.ref(`tasks/${calendarId}`).once('value')
            .then((snapshot) => {
                if (snapshot.exists() && snapshot.val().owner === userId) {
                    // 刪除日曆的所有任務
                    database.ref(`tasks/${calendarId}`).remove()
                        .then(() => {
                            // 從所有用戶的日曆列表中刪除
                            return database.ref('tasks/calendars').once('value');
                        })
                        .then((snapshot) => {
                            const promises = [];
                            snapshot.forEach((userSnapshot) => {
                                userSnapshot.forEach((calendarSnapshot) => {
                                    if (calendarSnapshot.val().calendarId === calendarId) {
                                        promises.push(calendarSnapshot.ref.remove());
                                    }
                                });
                            });
                            return Promise.all(promises);
                        })
                        .then(() => {
                            alert('Calendar deleted successfully.');
                            loadCalendars();
                        })
                        .catch((error) => {
                            alert('Error deleting calendar: ' + error.message);
                        });
                } else {
                    alert('You do not have permission to delete this calendar.');
                }
            })
            .catch((error) => {
                alert('Error checking calendar ownership: ' + error.message);
            });
    }
}

// Load calendars on page load
if (window.location.pathname.endsWith('PickCalendar.html')) {
    auth.onAuthStateChanged((user) => {
        if (!user) {
            window.location.href = 'index.html';
        } else {
            loadCalendars();
        }
    });
}