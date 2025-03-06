document.addEventListener('DOMContentLoaded', () => {
    const socket = io(); // Connexion au serveur Socket.IO
    const msg = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const chatSpace = document.querySelector('.chat-space');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const notificationCount = document.getElementById('notification-count');
    const notificationSound = document.getElementById('notification-sound');
    const logoutBtn = document.getElementById('logout-btn');
    const addGroupBtn = document.getElementById('add-group-btn');
    const addRoomModal = document.getElementById('add-room-modal');
    const roomNameInput = document.getElementById('room-name-input');
    const createRoomBtn = document.getElementById('create-room-btn');
    const cancelRoomBtn = document.getElementById('cancel-room-btn');
    const deleteGroupBtn = document.getElementById('delete-group-btn');
    const deleteRoomModal = document.getElementById('delete-room-modal');
    const deleteRoomList = document.getElementById('delete-room-list');
    const confirmDeleteRoomBtn = document.getElementById('confirm-delete-room-btn');
    const cancelDeleteRoomBtn = document.getElementById('cancel-delete-room-btn');
    const quitRoomBtn = document.getElementById('quit-room-btn');
    const inviteFriendsBtn = document.getElementById('invite-friends-btn');
    const addMembersModal = document.getElementById('add-members-modal');
    const addMembersInput = document.getElementById('add-members-input');
    const addMembersBtn = document.getElementById('add-members-btn');
    const cancelAddMembersBtn = document.getElementById('cancel-add-members-btn');

    // Récupérer les paramètres depuis l'URL
    const { username, room, token } = Qs.parse(location.search, { ignoreQueryPrefix: true }) || {};

    // Vérifier que les éléments nécessaires existent
    if (!msg || !sendButton || !chatSpace) {
        console.error('Un ou plusieurs éléments du DOM sont manquants');
        return;
    }

    // Joindre le chat
    socket.emit('join-chat', { username, room, token });

    // Écouter les messages précédents
    socket.on('load-messages', (messages) => {
        chatSpace.lastMessageDate = null; // Réinitialiser la dernière date affichée
        messages.forEach(message => {
            outputMessage({
                username: message.username,
                message: message.message,
                timestamp: message.timestamp,
                mentions: message.mentions
            });
        });
        chatSpace.scrollTop = chatSpace.scrollHeight;
        socket.emit('read-messages', { room }); // Marquer les messages comme lus
    });

    // Écouter les nouveaux messages
    socket.on('message', (data) => {
        outputMessage(data);
        chatSpace.scrollTop = chatSpace.scrollHeight;
        if (document.hasFocus()) {
            socket.emit('read-messages', { room });
        }
    });

    // Écouter les messages du bot
    socket.on('bot', (message) => {
        outputBot(message);
        chatSpace.scrollTop = chatSpace.scrollHeight;
    });

    // Écouter les utilisateurs actifs
    socket.on('active-users', (users) => {
        updateUserList(users);
    });

    // Écouter la mise à jour des compteurs non lus
    socket.on('update-unread', ({ room: roomName, count }) => {
        console.log(`Mise à jour non lus pour ${roomName}: ${count}`); // Log pour débogage
        const savedRooms = JSON.parse(localStorage.getItem('rooms')) || [];
        const roomIndex = savedRooms.findIndex(r => r.name === roomName);

        if (roomIndex > -1) {
            savedRooms[roomIndex].unreadCount = count;
            localStorage.setItem('rooms', JSON.stringify(savedRooms));
            updateRoomList(savedRooms); // Mettre à jour l'interface immédiatement
        } else if (count > 0) {
            // Ajouter la salle si elle n'existe pas encore
            savedRooms.push({ name: roomName, unreadCount: count });
            localStorage.setItem('rooms', JSON.stringify(savedRooms));
            updateRoomList(savedRooms);
        }
    });

    // Écouter la mise à jour de la liste des salons
    socket.on('update-room-list', (rooms) => {
        console.log('Liste des salons mise à jour :', rooms); // Log pour débogage
        localStorage.setItem('rooms', JSON.stringify(rooms));
        updateRoomList(rooms); // Mettre à jour l'interface immédiatement
    });

    // Initialiser la liste des salons depuis localStorage
    const initialRooms = JSON.parse(localStorage.getItem('rooms')) || [];
    updateRoomList(initialRooms);

    // Envoyer un message via le bouton
    sendButton.addEventListener('click', (e) => {
        e.preventDefault();
        sendMessage();
    });

    // Envoyer un message via la touche Entrée
    msg.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
        }
    });

    // Gestion de la recherche de messages
    searchButton.addEventListener('click', (e) => {
        e.preventDefault();
        searchMessages();
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchMessages();
        }
    });

    // Gestion du menu
    const menuToggle = document.getElementById('menu-toggle');
    const menu = document.getElementById('menu');
    if (menuToggle && menu) {
        menuToggle.addEventListener('click', () => {
            menu.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (!menu.contains(e.target) && !menuToggle.contains(e.target)) {
                menu.classList.remove('active');
            }
        });
    }

    // Se déconnecter
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            menu.classList.remove('active');
            localStorage.removeItem('token');
            window.location.href = 'index.html';
        });
    }

    // Gestion de la création de salons
    if (addGroupBtn && addRoomModal) {
        addGroupBtn.addEventListener('click', () => {
            addRoomModal.style.display = 'block';
        });

        cancelRoomBtn.addEventListener('click', () => {
            addRoomModal.style.display = 'none';
            roomNameInput.value = '';
        });

        createRoomBtn.addEventListener('click', async () => {
            const roomName = roomNameInput.value.trim();
            if (!roomName) {
                alert('Veuillez entrer un nom de salon');
                return;
            }

            try {
                const token = localStorage.getItem('token');
                const response = await fetch('/api/auth/create-room', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ roomName })
                });

                const data = await response.json();
                if (response.ok) {
                    alert(data.msg);
                    addRoomModal.style.display = 'none';
                    roomNameInput.value = '';

                    const savedRooms = JSON.parse(localStorage.getItem('rooms')) || [];
                    savedRooms.push({ name: roomName, unreadCount: 0 });
                    localStorage.setItem('rooms', JSON.stringify(savedRooms));
                    updateRoomList(savedRooms);
                } else {
                    alert(data.msg || 'Erreur lors de la création du salon');
                }
            } catch (err) {
                console.error('Erreur lors de la création du salon :', err);
                alert('Une erreur est survenue');
            }
        });
    }

    // Gestion de la suppression de salons
    if (deleteGroupBtn && deleteRoomModal) {
        deleteGroupBtn.addEventListener('click', () => {
            deleteRoomModal.style.display = 'block';
            loadRoomsForDeletion();
        });

        cancelDeleteRoomBtn.addEventListener('click', () => {
            deleteRoomModal.style.display = 'none';
        });

        confirmDeleteRoomBtn.addEventListener('click', async () => {
            const selectedRooms = Array.from(document.querySelectorAll('.delete-room-checkbox:checked'))
                .map(checkbox => checkbox.value);

            if (selectedRooms.length === 0) {
                alert('Veuillez sélectionner au moins un salon à supprimer');
                return;
            }

            try {
                const token = localStorage.getItem('token');
                const response = await fetch('/api/auth/delete-room', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ roomNames: selectedRooms })
                });

                const data = await response.json();
                if (response.ok) {
                    alert(data.msg);
                    deleteRoomModal.style.display = 'none';

                    // Mettre à jour la liste des salons dans localStorage
                    const savedRooms = JSON.parse(localStorage.getItem('rooms')) || [];
                    const updatedRooms = savedRooms.filter(room => !selectedRooms.includes(room.name));
                    localStorage.setItem('rooms', JSON.stringify(updatedRooms));

                    // Rafraîchir la liste des salons affichée
                    updateRoomList(updatedRooms);

                    // Rediriger l'utilisateur vers la page d'accueil si le salon actuel est supprimé
                    if (selectedRooms.includes(room)) {
                        window.location.href = 'index.html';
                    }
                } else {
                    alert(data.msg || 'Erreur lors de la suppression du salon');
                }
            } catch (err) {
                console.error('Erreur lors de la suppression du salon :', err);
                alert('Une erreur est survenue');
            }
        });
    }

    // Gestion du bouton "Quitter le salon"
    if (quitRoomBtn) {
        quitRoomBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            // Récupérer les informations de l'utilisateur et du salon
            const { username, room, token } = Qs.parse(location.search, { ignoreQueryPrefix: true });

            if (!room) {
                alert('Aucun salon actif');
                return;
            }

            // Confirmer l'action avec l'utilisateur
            const confirmQuit = confirm(`Êtes-vous sûr de vouloir quitter le salon "${room}" ?`);
            if (!confirmQuit) {
                console.log('Action annulée par l\'utilisateur');
                return;
            }

            try {
                const response = await fetch('/api/auth/leave-room', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ roomName: room })
                });

                const data = await response.json();
                if (response.ok) {
                    alert(data.msg);

                    // Mettre à jour la liste des salons dans localStorage
                    const savedRooms = JSON.parse(localStorage.getItem('rooms')) || [];
                    const updatedRooms = savedRooms.filter(r => r.name !== room);
                    localStorage.setItem('rooms', JSON.stringify(updatedRooms));

                    // Rediriger l'utilisateur vers un autre salon
                    if (updatedRooms.length > 0) {
                        const randomIndex = Math.floor(Math.random() * updatedRooms.length);
                        const defaultRoom = updatedRooms[randomIndex].name;
                        window.location.href = `chat.html?username=${encodeURIComponent(username)}&room=${encodeURIComponent(defaultRoom)}&token=${token}`;
                    } else {
                        alert('Vous avez quitté le dernier salon. Vous ne pouvez pas quitter tous les salons.');
                    }
                } else {
                    alert(data.msg || 'Erreur lors de la sortie du salon');
                }
            } catch (err) {
                console.error('Erreur lors de la sortie du salon :', err);
                alert('Une erreur est survenue');
            }
        });
    }

    // Gestion de l'ajout de membres
    if (inviteFriendsBtn && addMembersModal) {
        inviteFriendsBtn.addEventListener('click', () => {
            addMembersModal.style.display = 'block';
        });

        cancelAddMembersBtn.addEventListener('click', () => {
            addMembersModal.style.display = 'none';
            addMembersInput.value = '';
        });

        addMembersBtn.addEventListener('click', async () => {
            const usernames = addMembersInput.value.split(',').map(u => u.trim()); // Récupérer les noms d'utilisateurs
            const roomName = room; // Utiliser la salle actuelle
        
            if (!roomName || usernames.length === 0) {
                alert('Veuillez entrer des noms d\'utilisateurs valides.');
                return;
            }
        
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('/api/auth/add-members', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ roomName, usernames }) // Envoyer les noms d'utilisateurs
                });
        
                const data = await response.json();
                if (response.ok) {
                    alert(data.msg);
                    addMembersModal.style.display = 'none';
                    addMembersInput.value = '';
                } else {
                    alert(data.msg || 'Erreur lors de l\'ajout des membres');
                }
            } catch (err) {
                console.error('Erreur lors de l\'ajout des membres :', err);
                alert('Une erreur est survenue');
            }
        });
    }

    // Fonctions utilitaires

    function sendMessage() {
        const message = msg.value.trim();
        if (message) {
            const mentions = detectMentions(message);
            socket.emit('chat-mssg', { message, mentions });
            msg.value = '';
            msg.focus();
        }
    }

    function detectMentions(message) {
        const mentionRegex = /@(\w+)/g;
        const mentions = [];
        let match;
        while ((match = mentionRegex.exec(message)) !== null) {
            mentions.push(match[1]); // match[1] contient le nom d'utilisateur sans le @
        }
        return mentions;
    }

    function outputMessage(data) {
        const { username, message, mentions, timestamp } = data;

        // Vérifiez que le timestamp est valide
        if (!timestamp || isNaN(new Date(timestamp))) {
            console.error('Timestamp invalide :', timestamp);
            return;
        }

        const date = new Date(timestamp);
        const hour = date.getHours().toString().padStart(2, '0');
        const minute = date.getMinutes().toString().padStart(2, '0');
        const messageDate = formatMessageDate(timestamp); // Utiliser la fonction utilitaire

        // Vérifier si la date du message est différente de la date du dernier message affiché
        const lastMessageDate = chatSpace.lastMessageDate;
        if (lastMessageDate !== messageDate) {
            const dateHeader = document.createElement('div');
            dateHeader.classList.add('date-header');
            dateHeader.textContent = messageDate;
            chatSpace.appendChild(dateHeader);
            chatSpace.lastMessageDate = messageDate; // Mettre à jour la dernière date affichée
        }

        const div = document.createElement('div');
        div.classList.add('chat', 'user-message');

        // Mettre en évidence les mentions
        let formattedMessage = message;
        if (mentions && mentions.length > 0) {
            mentions.forEach(mention => {
                formattedMessage = formattedMessage.replace(new RegExp(`@${mention}`, 'g'), `<span class="mention">@${mention}</span>`);
            });
        }

        div.innerHTML = `
            <h4>${username.charAt(0).toUpperCase() + username.slice(1)}</h4>
            <p>${formattedMessage}</p><span>${hour}:${minute}</span>
        `;
        chatSpace.appendChild(div);
        chatSpace.scrollTop = chatSpace.scrollHeight;
    }

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
        chatSpace.scrollTop = chatSpace.scrollHeight;
    }

    function updateUserList(users) {
        const userList = document.querySelector('.list-user');
        if (!userList) return;

        userList.innerHTML = '';
        users.forEach((user) => {
            const li = document.createElement('li');
            li.textContent = user.charAt(0).toUpperCase() + user.slice(1);
            userList.appendChild(li);
        });
    }

    function updateRoomList(rooms) {
        const roomList = document.querySelector('.nom-salon');
        if (!roomList) return;
    
        roomList.innerHTML = '';
        const header = document.createElement('h3');
        header.className = 'fs-3 mt-4';
        header.innerHTML = '<i class="fa-solid fa-comment"></i> Salon';
        roomList.appendChild(header);
    
        // Récupérer la salle actuelle depuis l'URL
        const urlParams = new URLSearchParams(window.location.search);
        const currentRoom = urlParams.get('room'); // Récupère la salle actuelle depuis l'URL
    
        rooms.forEach(room => {
            if (!room || !room.name) return;
    
            const roomDiv = document.createElement('div');
            roomDiv.className = `room-item ${room.name === currentRoom ? 'current-room' : ''}`; // Ajoute la classe si c'est la salle actuelle
            roomDiv.dataset.roomname = room.name;
            roomDiv.innerHTML = `
                ${room.name}
                ${room.unreadCount > 0 ? `<span class="unread-badge">${room.unreadCount}</span>` : ''}
                ${room.isMentioned ? `<span class="mention-badge">@</span>` : ''}
            `;
            roomDiv.addEventListener('click', () => {
                window.location.href = `chat.html?username=${encodeURIComponent(username)}&room=${encodeURIComponent(room.name)}&token=${token}`;
            });
            roomList.appendChild(roomDiv);
        });
    }

    async function searchMessages() {
        const query = searchInput.value.trim();
        if (!query) {
            alert('Veuillez entrer un terme de recherche');
            return;
        }

        try {
            const response = await fetch(`/api/auth/search-messages?room=${encodeURIComponent(room)}&query=${encodeURIComponent(query)}`);
            const messages = await response.json();
            chatSpace.innerHTML = '';
            messages.forEach(message => {
                outputMessage({
                    username: message.username,
                    message: message.message,
                    timestamp: message.timestamp
                });
            });
        } catch (err) {
            console.error('Erreur lors de la recherche des messages :', err);
            alert('Une erreur est survenue');
        }
    }

    function formatMessageDate(timestamp) {
        const messageDate = new Date(timestamp);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        // Comparer les dates (en ignorant l'heure)
        if (
            messageDate.getDate() === today.getDate() &&
            messageDate.getMonth() === today.getMonth() &&
            messageDate.getFullYear() === today.getFullYear()
        ) {
            return "Aujourd'hui";
        } else if (
            messageDate.getDate() === yesterday.getDate() &&
            messageDate.getMonth() === yesterday.getMonth() &&
            messageDate.getFullYear() === yesterday.getFullYear()
        ) {
            return "Hier";
        } else {
            // Formater la date au format DD/MM/YYYY
            return messageDate.toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        }
    }

    // Charger la liste des salons pour la suppression
    function loadRoomsForDeletion() {
        const savedRooms = JSON.parse(localStorage.getItem('rooms')) || [];
        deleteRoomList.innerHTML = ''; // Clear the list before populating

        savedRooms.forEach(room => {
            const roomDiv = document.createElement('div');
            roomDiv.className = 'delete-room-item';
            roomDiv.innerHTML = `
                <input type="checkbox" class="delete-room-checkbox" id="${room.name}" value="${room.name}">
                <label for="${room.name}" id="delete-room">${room.name}</label>
            `;
            deleteRoomList.appendChild(roomDiv);
        });
    }

    // Récupérer les éléments du DOM pour les paramètres
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const toggleDarkModeBtn = document.getElementById('toggle-dark-mode-btn');
    const userIdDisplay = document.getElementById('user-id-display');

    // Fonction pour récupérer l'ID de l'utilisateur
    async function fetchUserId() {
        try {
            const token = localStorage.getItem('token');
            console.log('Token :', token); // Afficher le token dans la console

            const response = await fetch('/api/auth/user-info', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Erreur lors de la récupération des informations utilisateur');
            }

            const data = await response.json();
            console.log('Réponse de l\'API :', data); // Afficher la réponse de l'API

            // Vérifier que data.userId existe
            if (data.userId) {
                userIdDisplay.textContent = data.userId; // Afficher l'ID de l'utilisateur
            } else {
                console.error('userId non trouvé dans la réponse de l\'API');
                userIdDisplay.textContent = "ID non disponible";
            }
        } catch (err) {
            console.error('Erreur :', err);
            alert('Impossible de récupérer l\'ID utilisateur');
        }
    }

    // Ouvrir la boîte de dialogue des paramètres
    settingsBtn.addEventListener('click', () => {
        settingsModal.style.display = 'block';
        fetchUserId(); // Appeler la fonction pour récupérer l'ID de l'utilisateur
    });

    // Fermer la boîte de dialogue des paramètres
    closeSettingsBtn.addEventListener('click', () => {
        settingsModal.style.display = 'none';
    });

    // Basculer le mode sombre
    toggleDarkModeBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    });

    // Vérifier si le mode sombre est activé au chargement de la page
    window.addEventListener('load', () => {
        const darkMode = localStorage.getItem('darkMode') === 'true';
        if (darkMode) {
            document.body.classList.add('dark-mode');
        }
    });
});

// Afficher ou masquer le bouton "Inviter des amis" en fonction du rôle de l'utilisateur
// Lors de la connexion au chat, vérifier si l'utilisateur est le créateur du salon

function updateUIForAllUsers() {
    const inviteFriendsBtn = document.getElementById('invite-friends-btn');
    if (inviteFriendsBtn) {
        inviteFriendsBtn.style.display = 'block'; // Toujours afficher le bouton
    }
}

// Lors de la connexion au chat, afficher le bouton pour tous les utilisateurs
socket.on('join-chat', async (data) => {
    const { username, room, token } = data;

    if (!username || !room || !token) {
        return socket.emit('error', 'Données manquantes');
    }

    try {
        // Récupérer l'utilisateur depuis la base de données
        const user = await User.findOne({ username });
        if (!user) {
            throw new Error('Utilisateur non trouvé');
        }

        // Afficher le bouton "Inviter des amis" pour tous les utilisateurs
        updateUIForAllUsers();

        // Rejoindre la salle
        socket.join(room);
        socket.username = username;
        socket.room = room;

        // Charger les messages précédents
        const messages = await Message.find({ room }).sort({ timestamp: 1 });
        socket.emit('load-messages', messages);

        // Envoyer la liste initiale des salons avec compteurs et mentions
        const rooms = user.rooms.map(r => ({
            name: r,
            unreadCount: user.unreadMessages.get(r) || 0,
            isMentioned: user.mentions.get(r) || false
        }));
        socket.emit('update-room-list', rooms);

        // Ajouter l'utilisateur aux actifs et notifier
        if (!activeUsers[room]) activeUsers[room] = [];
        if (!activeUsers[room].includes(username)) activeUsers[room].push(username);
        io.to(room).emit('active-users', activeUsers[room]);
    } catch (err) {
        console.error('Erreur lors de la connexion au chat :', err);
        socket.emit('error', 'Erreur lors de la connexion');
    }
});