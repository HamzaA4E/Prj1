document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('loginBtn');
    const signUpBtn = document.getElementById('signUpBtn');

    // Gestion de la connexion
    loginBtn.addEventListener('click', async (event) => {
        event.preventDefault();

        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        const room = document.getElementById('room').value;

        if (!username || !password || !room) {
            showNotification('Tous les champs sont requis.', 'error');
            return;
        }

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password, room }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.msg || 'Erreur lors de la connexion');
            }

            // Stocker le token JWT dans localStorage
            localStorage.setItem('token', data.token);

            // Afficher la notification de succès
            showNotification('Connexion réussie!', 'success');

            // Rediriger après 2 secondes
            setTimeout(() => {
                window.location.href = `/chat.html?username=${encodeURIComponent(username)}&room=${encodeURIComponent(room)}&token=${data.token}`;
            }, 2000);
        } catch (err) {
            console.error('Erreur lors de la connexion :', err);
            showNotification('Nom d\'utilisateur ou mot de passe incorrect.', 'error');
        }
    });

    // Gestion de l'inscription
    signUpBtn.addEventListener('click', async (event) => {
        event.preventDefault();

        const username = document.getElementById('signupUsername').value;
        const password = document.getElementById('signupPassword').value;

        if (!username || !password) {
            showNotification('Tous les champs sont requis.', 'error');
            return;
        }

        // Validation du mot de passe
        if (password.length < 8) {
            showNotification('Le mot de passe doit contenir au moins 8 caractères.', 'error');
            return;
        }

        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.msg || 'Erreur lors de l\'inscription');
            }

            showNotification('Inscription réussie !', 'success');
            setTimeout(() => {
                window.location.reload(); // Recharger la page pour afficher le formulaire de connexion
            }, 2000);
        } catch (err) {
            console.error('Erreur lors de l\'inscription :', err);
            showNotification(err.message, 'error');
        }
    });

    // Fonction pour afficher les notifications
    function showNotification(message, type) {
        const notificationContainer = document.getElementById('notification-container');

        // Créer une nouvelle notification
        const notification = document.createElement('div');
        notification.classList.add('notification', type);
        notification.textContent = message;

        // Ajouter la notification au conteneur
        notificationContainer.appendChild(notification);

        // Animation d'apparition
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        // Supprimer la notification après 5 secondes
        setTimeout(() => {
            notification.classList.remove('show');
            notification.classList.add('hide');

            // Supprimer la notification du DOM après l'animation
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 5000);
    }

    // Fonction pour masquer les notifications
    function hideNotification(notification) {
        notification.classList.add('hide');
        notification.addEventListener('transitionend', () => {
            notification.remove();
        });
    }
});
