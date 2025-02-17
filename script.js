const signInBtn = document.getElementById('signInBtn');
const signUpBtn = document.getElementById('signUpBtn');
const socket = io('http://localhost:5000'); // Connexion au serveur Socket.IO

// Fonction pour l'inscription
signUpBtn.addEventListener('click', async () => {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Vérifier si les champs sont vides
    if (!username || !password) {
        alert("Tous les champs sont requis.");
        return;
    }

    // Envoi des données à l'API pour inscription
    try {
        const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

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
    const room = document.getElementById('room').value;  // Récupérer la room sélectionnée

    if (!username || !password || !room) {  // Vérification que la room est sélectionnée
        alert("Tous les champs sont requis.");
        return;
    }

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        if (data.token) {
            alert('Connexion réussie');

            // Redirection vers chat.html avec username, token, et room dans la query string
            window.location.href = `chat.html?username=${encodeURIComponent(username)}&room=${encodeURIComponent(room)}&token=${data.token}`;
        } else {
            alert(data.msg);
        }
    } catch (err) {
        console.error("Erreur lors de la connexion : ", err);
        alert("Une erreur est survenue.");
    }
});






// Écoute des messages du serveur via Socket.IO
socket.on('bot', (msg) => {
    console.log(msg);  // Affiche le message du bot dans la console
});
