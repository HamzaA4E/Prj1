const socket = io();
const msg = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const chatSpace = document.querySelector('.chat-space');


// Get username and room from query parameters
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true });

// Emit the 'join-chat' event with username and room
socket.emit('join-chat', { username, room });

// Add Room to the UI
HandleRooms(room);
//Add user to the UI


// Handle incoming messages
socket.on('message', (data) => {
    outputMessage(data);
    chatSpace.scrollTop = chatSpace.scrollHeight; // Scroll to the bottom
    
});

// Handle bot messages
socket.on('bot', (message) => {
    outputBot(message);
    msg.focus();
    chatSpace.scrollTop = chatSpace.scrollHeight;
    updateUserList(username);
});

msg.addEventListener('input', (e) => {
    const inputValue = e.target.value;
    if (inputValue.length > 0) {
        e.target.value = inputValue.charAt(0).toUpperCase() + inputValue.slice(1);
    }
});

socket.on('active-users', (users) => {
    updateUserList(users);
});

// Send message when the send button is clicked
sendButton.addEventListener('click', (e) => {
    e.preventDefault(); // Prevent form submission
    sendMessage();
});

// Send message when Enter key is pressed
msg.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault(); // Prevent form submission
        sendMessage();
    }
});

// Function to display user messages
function outputMessage(data) {
    const { username, message } = data;
    const date = new Date();
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    const div = document.createElement('div');
    div.classList.add('chat','user-message');
    div.innerHTML = `
        <h4>${username.charAt(0).toUpperCase() + username.slice(1)} </h4>
        <p>${message}</p><span>${hour}:${minute}</span>
    `;
    chatSpace.appendChild(div);
}

// Function to display bot messages
function outputBot(message) {
    const date = new Date();
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    const div = document.createElement('div');
    div.classList.add('chat', 'bot-message');
    div.innerHTML = `
        <p>${message}</p>
        <span>${hour}:${minute}</span>
    `;
    chatSpace.appendChild(div);
}

// Function to handle room display
function HandleRooms(room)
{
    const div = document.createElement('div');
    div.classList.add('nom-salon');
    div.innerHTML = `<h5>${room}</h5>`;
    document.querySelector('.nom-salon').appendChild(div)
}
// Function to send a message
function sendMessage() {
    const message = msg.value.trim();
    if (message) {
        socket.emit('chat-mssg', message);
        msg.value = ''; // Clear the input field
        msg.focus(); // Focus the input field
    }
}

//Function to add users
function updateUserList(users) {
    const userList = document.querySelector('.list-user');
    userList.innerHTML = ''; // Clear the current list

    users.forEach((user) => {
        const li = document.createElement('li');
        li.textContent = user.charAt(0).toUpperCase() + user.slice(1);
        userList.appendChild(li);
    });
}
