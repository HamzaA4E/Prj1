document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const msg = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const chatSpace = document.querySelector('.chat-space');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');

    // Get username and room from query parameters
    const { username, room, token } = Qs.parse(location.search, { ignoreQueryPrefix: true }) || {};
    const savedUsername = localStorage.getItem('username');
    const savedRoom = localStorage.getItem('room');

    // Use a Set to store rooms to ensure uniqueness
    let savedRooms = new Set(JSON.parse(localStorage.getItem('rooms') || '[]'));

    // Nouvelle fonction pour gérer les badges
    function updateUnreadBadges() {
        const roomItems = document.querySelectorAll('.room-item');
        roomItems.forEach(item => {
            const roomName = item.dataset.roomname;
            const badge = item.querySelector('.unread-badge');
            const savedRooms = JSON.parse(localStorage.getItem('rooms') || '[]');
            const roomData = savedRooms.find(r => r.name === roomName);
            
            if (roomData?.unreadCount > 0) {
                if (!badge) {
                    const newBadge = document.createElement('span');
                    newBadge.className = 'unread-badge';
                    newBadge.textContent = roomData.unreadCount;
                    item.appendChild(newBadge);
                } else {
                    badge.textContent = roomData.unreadCount;
                }
            } else if (badge) {
                badge.remove();
            }
        });
    }

    // Écouteurs modifiés
    socket.on('update-room-list', (rooms) => {
        localStorage.setItem('rooms', JSON.stringify(rooms));
        updateRoomList(rooms);
        updateUnreadBadges();
    });

    socket.on('update-unread', ({ room, count }) => {
        const savedRooms = JSON.parse(localStorage.getItem('rooms') || '[]');
        const roomIndex = savedRooms.findIndex(r => r.name === room);
        
        if (roomIndex > -1) {
            savedRooms[roomIndex].unreadCount = count;
            localStorage.setItem('rooms', JSON.stringify(savedRooms));
            updateUnreadBadges();
        }
    });

    // Mettre à jour la fonction d'affichage
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
    // Update room list on page load
    updateRoomList([...savedRooms]);

    // Emit the 'join-chat' event with username and room
    socket.emit('join-chat', { username, room });

    socket.on('load-messages', (messages) => {
        messages.forEach(message => {
            outputMessage({
                username: message.username,
                message: message.message,
                timestamp: message.timestamp
            });
        });
        socket.emit('read-messages', { room }); // Marquer comme lu
    });

    // Handle incoming messages
    socket.on('message', (data) => {
        outputMessage(data);
        chatSpace.scrollTop = chatSpace.scrollHeight;
        if (document.hasFocus()) {  // Vérifier si la fenêtre est active
            socket.emit('read-messages', { room });
        }
    });

    window.addEventListener('focus', () => {
        socket.emit('read-messages', { room });
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
        const { username, message, timestamp } = data;
        const date = timestamp ? new Date(timestamp) : new Date(); // Utiliser le timestamp si disponible
        const hour = date.getHours().toString().padStart(2, '0');
        const minute = date.getMinutes().toString().padStart(2, '0');
        const div = document.createElement('div');
        div.classList.add('chat', 'user-message');
        div.innerHTML = `
            <h4>${username.charAt(0).toUpperCase() + username.slice(1)}</h4>
            <p>${message}</p><span>${hour}:${minute}</span>
        `;
        chatSpace.appendChild(div);
        chatSpace.scrollTop = chatSpace.scrollHeight; // Faire défiler vers le bas
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

    // Function to send a message
    function sendMessage() {
        const message = msg.value.trim();
        if (message) {
            socket.emit('chat-mssg', message);
            msg.value = ''; // Clear the input field
            msg.focus(); // Focus the input field
        }
    }

    // Function to add users
    function updateUserList(users) {
        const userList = document.querySelector('.list-user');
        userList.innerHTML = '';

        users.forEach((user) => {
            const li = document.createElement('li');
            li.textContent = user.charAt(0).toUpperCase() + user.slice(1);
            userList.appendChild(li);
        });
    }

    document.querySelectorAll('.room-item').forEach(roomItem => {
        roomItem.addEventListener('click', () => {
            const newRoom = roomItem.textContent;
            window.location.href = `chat.html?username=${encodeURIComponent(username)}&room=${encodeURIComponent(newRoom)}&token=${token}`;
        });
    });

    socket.on('active-users', (users) => {
        updateUserList(users);
    });

    // Gestion de la sandwich bar
    const menuToggle = document.getElementById('menu-toggle');
    const menu = document.getElementById('menu');

    // Afficher/masquer le menu
    menuToggle.addEventListener('click', () => {
        menu.classList.toggle('active');
    });

    // Fermer le menu lorsqu'on clique ailleurs
    document.addEventListener('click', (e) => {
        if (!menu.contains(e.target) && !menuToggle.contains(e.target)) {
            menu.classList.remove('active');
        }
    });

    // Gestion des actions du menu
    // document.getElementById('search-message-btn').addEventListener('click', (e) => {
    //     e.preventDefault();
    //     menu.classList.remove('active');
        
    //     // Afficher le champ de recherche
    //     const searchBar = document.getElementById('search-bar');
    //     searchBar.style.display = 'block';
    // });

    document.getElementById('quit-room-btn').addEventListener('click', (e) => {
        e.preventDefault();
        menu.classList.remove('active');
        window.location.href = 'index.html'; // Rediriger vers la page d'accueil
    });

    document.getElementById('logout-btn').addEventListener('click', (e) => {
        e.preventDefault();
        menu.classList.remove('active');
        // Ajouter ici la logique pour se déconnecter
        localStorage.removeItem('token'); // Supprimer le token
        window.location.href = 'index.html'; // Rediriger vers la page d'accueil
    });

    async function searchMessages() {
        const query = searchInput.value.trim();
        if (!query) {
            alert('Veuillez entrer un terme de recherche');
            return;
        }
    
        try {
            const response = await fetch(`/api/auth/search-messages?room=${encodeURIComponent(room)}&query=${encodeURIComponent(query)}`);
            const messages = await response.json();
    
            // Afficher les résultats de la recherche
            chatSpace.innerHTML = ''; // Effacer les messages actuels
    
            messages.forEach(message => {
                outputMessage({
                    username: message.username,
                    message: message.message,
                    timestamp: message.timestamp
                });
            });
        } catch (err) {
            console.error('Erreur lors de la recherche des messages : ', err);
            alert('Une erreur est survenue lors de la recherche des messages');
        }
    }
    
    // Écouteur d'événement pour le bouton de recherche
    searchButton.addEventListener('click', (e) => {
        e.preventDefault();
        searchMessages();
    });
    
    // Écouteur d'événement pour la touche Entrée dans le champ de recherche
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchMessages();
        }
    });


    const addGroupBtn = document.getElementById('add-group-btn');
    const addRoomModal = document.getElementById('add-room-modal');
    const roomNameInput = document.getElementById('room-name-input');
    const createRoomBtn = document.getElementById('create-room-btn');
    const cancelRoomBtn = document.getElementById('cancel-room-btn');

    // Afficher la boîte de dialogue pour créer un nouveau salon
    addGroupBtn.addEventListener('click', () => {
        addRoomModal.style.display = 'block';
    });

    // Annuler la création d'un salon
    cancelRoomBtn.addEventListener('click', () => {
        addRoomModal.style.display = 'none';
        roomNameInput.value = ''; // Réinitialiser le champ
    });

    // Créer un nouveau salon
    createRoomBtn.addEventListener('click', async () => {
        const roomName = roomNameInput.value.trim();

        if (!roomName) {
            alert('Veuillez entrer un nom de salon');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            console.log('Token envoyé :', token); // Log pour déboguer

            if (!token) {
                alert('Token manquant. Veuillez vous reconnecter.');
                return;
            }

            const response = await fetch('/api/auth/create-room', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // Inclure le token
                },
                body: JSON.stringify({ roomName })
            });

            const data = await response.json();
            console.log('Réponse du serveur :', data); // Log pour déboguer

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
});