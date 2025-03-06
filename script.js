// document.addEventListener('DOMContentLoaded', function () {

//     const createRoomBtn = document.getElementById('createRoomBtn');
//     const roomNameInput = document.getElementById('roomNameInput');
//     const addRoomModal = document.getElementById('addRoomModal');

//     // Fonction pour l'inscription (Sign Up)
   

//     // Fonction pour créer un salon
//     createRoomBtn.addEventListener('click', async () => {
//         const roomName = roomNameInput.value.trim();

//         if (!roomName) {
//             alert('Veuillez entrer un nom de salon');
//             return;
//         }

//         try {
//             const response = await fetch('/api/auth/create-room', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${localStorage.getItem('token')}` // Inclure le token
//                 },
//                 body: JSON.stringify({ roomName })
//             });

//             const data = await response.json();

//             if (response.ok) {
//                 alert(data.msg);
//                 addRoomModal.style.display = 'none';
//                 roomNameInput.value = ''; // Réinitialiser le champ

//                 // Mettre à jour la liste des salons dans localStorage
//                 const rooms = JSON.parse(localStorage.getItem('rooms')) || [];
//                 rooms.push({ name: roomName, unreadCount: 0 });
//                 localStorage.setItem('rooms', JSON.stringify(rooms));

//                 // Rafraîchir la liste des salons affichée
//                 updateRoomList(rooms);
//             } else {
//                 alert(data.msg || 'Erreur lors de la création du salon');
//             }
//         } catch (err) {
//             console.error('Erreur lors de la création du salon : ', err);
//             alert('Une erreur est survenue lors de la création du salon');
//         }
//     });

//     // Fonction pour mettre à jour la liste des salons
//     function updateRoomList(rooms) {
//         const roomList = document.querySelector('.nom-salon');
//         if (!roomList) return;
    
//         roomList.innerHTML = '';
//         const header = document.createElement('h3');
//         header.className = 'fs-3 mt-4';
//         header.innerHTML = '<i class="fa-solid fa-comment"></i> Salon';
//         roomList.appendChild(header);
    
//         // Récupérer la salle actuelle depuis l'URL
//         const urlParams = new URLSearchParams(window.location.search);
//         const currentRoom = urlParams.get('room'); // Récupère la salle actuelle depuis l'URL
    
//         rooms.forEach(room => {
//             if (!room || !room.name) return;
    
//             const roomDiv = document.createElement('div');
//             roomDiv.className = `room-item ${room.name === currentRoom ? 'current-room' : ''}`; // Ajoute la classe si c'est la salle actuelle
//             roomDiv.dataset.roomname = room.name;
//             roomDiv.innerHTML = `
//                 ${room.name}
//                 ${room.unreadCount > 0 ? `<span class="unread-badge">${room.unreadCount}</span>` : ''}
//                 ${room.isMentioned ? `<span class="mention-badge">@</span>` : ''}
//             `;
//             roomDiv.addEventListener('click', () => {
//                 window.location.href = `chat.html?username=${encodeURIComponent(username)}&room=${encodeURIComponent(room.name)}&token=${token}`;
//             });
//             roomList.appendChild(roomDiv);
//         });
//     }

// //     // Gestion des messages du bot
//     socket.on('bot', (msg) => {
//         console.log(msg);
//     });

// //     // Gestion des notifications
//     const notificationCount = document.getElementById('notification-count');
//     const notificationSound = document.getElementById('notification-sound');

//     socket.on('new-notification', (data) => {
//         console.log('Nouvelle notification reçue :', data); // Log pour déboguer
//         const { room, message, unreadCount } = data;

//         // Mettre à jour le compteur de notifications
//         if (notificationCount) {
//             notificationCount.textContent = unreadCount;
//             notificationCount.style.display = 'block'; // Afficher le compteur
//         } else {
//             console.error('Élément notification-count non trouvé dans le DOM');
//         }

//         // Jouer le son de notification
//         if (notificationSound) {
//             notificationSound.play();
//         } else {
//             console.error('Élément notification-sound non trouvé dans le DOM');
//         }

//         // Afficher une notification à l'utilisateur
//         alert(`Nouveau message dans ${room}: ${message}`);

//         // Mettre à jour l'interface utilisateur (par exemple, un badge de notification)
//         const roomItem = document.querySelector(`.room-item[data-room="${room}"]`);
//         if (roomItem) {
//             const badge = roomItem.querySelector('.unread-badge');
//             if (badge) {
//                 badge.textContent = parseInt(badge.textContent || 0) + 1;
//             } else {
//                 const newBadge = document.createElement('span');
//                 newBadge.className = 'unread-badge';
//                 newBadge.textContent = 1;
//                 roomItem.appendChild(newBadge);
//             }
//         }
//     });

//     // Lorsque l'utilisateur ouvre une salle
//     socket.emit('mark-notifications-as-read', { room: currentRoom });

//     // Mettre à jour l'interface utilisateur
//     socket.on('notifications-cleared', ({ room }) => {
//         const roomItem = document.querySelector(`.room-item[data-room="${room}"]`);
//         if (roomItem) {
//             const badge = roomItem.querySelector('.unread-badge');
//             if (badge) {
//                 badge.remove();
//             }
//         }
//     });

//     // Écouter les mises à jour de la liste des salons
//     socket.on('update-room-list', (rooms) => {
//         updateRoomList(rooms); // Mettre à jour la liste des salons
//     });

//     // Charger la liste des salons au démarrage
//     const rooms = JSON.parse(localStorage.getItem('rooms')) || [];
//     updateRoomList(rooms);

// });
