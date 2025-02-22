const signInBtn = document.getElementById('signInBtn');
const signUpBtn = document.getElementById('signUpBtn');
const createRoomBtn = document.getElementById('createRoomBtn');
const roomNameInput = document.getElementById('roomNameInput');
const addRoomModal = document.getElementById('addRoomModal');
const socket = io('http://localhost:5000'); // Connexion au serveur Socket.IO

// Fonction pour l'inscription
signUpBtn.addEventListener('click', async () => {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (!username || !password) {
        alert("Tous les champs sont requis.");
        return;
    }

    try {
        const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
            throw new Error('Erreur lors de l\'inscription');
        }

        const data = await response.json();
        alert(data.msg);
    } catch (err) {
        console.error("Erreur lors de l'inscription : ", err);
        alert("Une erreur est survenue.");
    }
});

// Fonction pour la connexion
signInBtn.addEventListener('click', async () => {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const room = document.getElementById('room').value;

    if (!username || !password || !room) {
        alert("Tous les champs sont requis.");
        return;
    }

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password, room })
        });

        if (!response.ok) {
            throw new Error('Erreur lors de la connexion');
        }

        const data = await response.json();
        if (data.token) {
            alert('Connexion réussie');
            localStorage.setItem('token', data.token); // Stocker le token
            localStorage.setItem('rooms', JSON.stringify(data.rooms));
            window.location.href = `chat.html?username=${encodeURIComponent(username)}&room=${encodeURIComponent(room)}&token=${data.token}`;
        } else {
            alert(data.msg);
        }
    } catch (err) {
        console.error("Erreur lors de la connexion : ", err);
        alert("Une erreur est survenue.");
    }
});

// Fonction pour créer un salon
createRoomBtn.addEventListener('click', async () => {
    const roomName = roomNameInput.value.trim();

    if (!roomName) {
        alert('Veuillez entrer un nom de salon');
        return;
    }

    try {
        const response = await fetch('/api/auth/create-room', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}` // Inclure le token
            },
            body: JSON.stringify({ roomName })
        });

        const data = await response.json();

        if (response.ok) {
            alert(data.msg);
            addRoomModal.style.display = 'none';
            roomNameInput.value = ''; // Réinitialiser le champ

            // Mettre à jour la liste des salons dans localStorage
            const rooms = JSON.parse(localStorage.getItem('rooms')) || [];
            rooms.push({ name: roomName, unreadCount: 0 });
            localStorage.setItem('rooms', JSON.stringify(rooms));

            // Rafraîchir la liste des salons affichée
            updateRoomList(rooms);
        } else {
            alert(data.msg || 'Erreur lors de la création du salon');
        }
    } catch (err) {
        console.error('Erreur lors de la création du salon : ', err);
        alert('Une erreur est survenue lors de la création du salon');
    }
});

// Fonction pour mettre à jour la liste des salons
function updateRoomList(rooms) {
    const roomList = document.querySelector('.nom-salon');
    roomList.innerHTML = '';

    const header = document.createElement('h3');
    header.className = 'fs-3 mt-4';
    header.innerHTML = '<i class="fa-solid fa-comment"></i> Salon';
    roomList.appendChild(header);

    rooms.forEach(room => {
        if (!room) return;

        const roomDiv = document.createElement('div');
        roomDiv.className = 'room-item';
        roomDiv.innerHTML = `
            ${room.name} 
            ${room.unreadCount > 0 ? `<span class="unread-badge">${room.unreadCount}</span>` : ''}
        `;

        roomDiv.addEventListener('click', () => {
            window.location.href = `chat.html?username=${encodeURIComponent(username)}&room=${encodeURIComponent(room.name)}&token=${token}`;
        });

        roomList.appendChild(roomDiv);
    });
}

// Gestion des messages du bot
socket.on('bot', (msg) => {
    console.log(msg);
});