document.addEventListener('DOMContentLoaded', function() {
    let currentMessages = [];
    let isPaused = true;
    let wavesurfer;

    // Ініціалізація WaveSurfer
    wavesurfer = WaveSurfer.create({
        container: '#waveform',
        waveColor: '#90caf9',
        progressColor: '#2196f3',
        cursorColor: '#2196f3',
        barWidth: 2,
        barRadius: 3,
        cursorWidth: 0,
        height: 40,
        barGap: 2,
        normalize: true,
        barMinHeight: 1,
    });

    // Завантаження аудіо
    wavesurfer.load('assets/example-audio.mp3');

    // Контроль відтворення
    const playPauseButton = document.getElementById('playPause');
    const currentTimeDisplay = document.getElementById('currentTime');

    playPauseButton.onclick = function() {
        wavesurfer.playPause();
    };

    // Оновлення стану кнопки та часу
    wavesurfer.on('play', () => {
        playPauseButton.textContent = '⏸️';
        isPaused = false;
        document.querySelectorAll('.message').forEach(msg => msg.classList.remove('paused'));
    });

    wavesurfer.on('pause', () => {
        playPauseButton.textContent = '▶️';
        isPaused = true;
        document.querySelectorAll('.message').forEach(msg => msg.classList.add('paused'));
    });

    wavesurfer.on('audioprocess', () => {
        const time = wavesurfer.getCurrentTime();
        currentTimeDisplay.textContent = formatTime(time);
        updateMessages(time);
    });

    const audioPlayer = document.getElementById('audioPlayer');
    const chatContainer = document.getElementById('chatContainer');
    const emojiSelector = document.getElementById('emojiSelector');
    const messagesWrapper = document.getElementById('messagesWrapper');
    
    // Emoji options for avatars
    const emojiOptions = {
        'A': ['👨‍⚕️', '🧐', '💡', '📝', '🔍', '💪', '👍', '🎯', '⚕️', '🏥'],
        'B': ['🤔', '😊', '🙂', '😌', '🤗', '👋', '✨', '💫', '🌟', '💝']
    };

    // Improved emotion patterns with direct emoji insertion
    const emotionPatterns = [
        { pattern: /\?/g, emoji: ' 🤔' },
        { pattern: /!/g, emoji: ' 💡' },
        { pattern: /(ні|не|нет)([.!?]|\s|$)/gi, emoji: ' ❌' },
        { pattern: /(так|да|згод|правильн)([.!?]|\s|$)/gi, emoji: ' ✅' },
        { pattern: /(обережн|увага|warning)([.!?]|\s|$)/gi, emoji: ' ⚠️' },
        { pattern: /(цікав|интерес)([.!?]|\s|$)/gi, emoji: ' 💫' }
    ];

    fetch('transcription.json')
        .then(response => response.json())
        .then(data => {
            currentMessages = data;
            setupAudioSync();
        })
        .catch(error => console.error('Помилка завантаження транскрипції:', error));

    function setupAudioSync() {
        audioPlayer.addEventListener('timeupdate', function() {
            if (!isPaused) {
                const currentTime = audioPlayer.currentTime;
                updateMessages(currentTime);
            }
        });

        audioPlayer.addEventListener('play', function() {
            isPaused = false;
            document.querySelectorAll('.message').forEach(msg => msg.classList.remove('paused'));
        });

        audioPlayer.addEventListener('pause', function() {
            isPaused = true;
            document.querySelectorAll('.message').forEach(msg => msg.classList.add('paused'));
        });
    }

    function updateMessages(currentTime) {
        currentMessages.forEach(message => {
            if (message.timestamp <= currentTime && !message.displayed) {
                // Перевіряємо, чи це перемотка чи звичайне відтворення
                const isSeek = Math.abs(message.timestamp - currentTime) > 0.5; // якщо різниця більше 0.5 секунд, вважаємо що це перемотка
                
                if (isSeek || isPaused) {
                    showMessageInstantly(message);
                } else {
                    animateMessage(message);
                }
                message.displayed = true;
            }
        });
    }

    function createEmojiSelector(avatarElement, speaker) {
        const emojiGrid = emojiSelector.querySelector('.emoji-grid');
        emojiGrid.innerHTML = '';
        
        emojiOptions[speaker].forEach(emoji => {
            const emojiDiv = document.createElement('div');
            emojiDiv.className = 'emoji-option';
            emojiDiv.textContent = emoji;
            emojiDiv.onclick = () => {
                avatarElement.textContent = emoji;
                emojiSelector.style.display = 'none';
            };
            emojiGrid.appendChild(emojiDiv);
        });

        const rect = avatarElement.getBoundingClientRect();
        emojiSelector.style.top = `${rect.top}px`;
        emojiSelector.style.left = `${rect.left}px`;
        emojiSelector.style.display = 'block';
    }

    function detectEmotions(text) {
        // Визначаємо шаблони для емоцій
        const emotionPatterns = [
            { pattern: /\?/g, emoji: ' 🤔' },
            { pattern: /!/g, emoji: ' 💡' },
            { pattern: /(ні|не|нет)([.!?]|\s|$)/gi, emoji: ' ❌' },
            { pattern: /(так|да|згод|правильн)([.!?]|\s|$)/gi, emoji: ' ✅' },
            { pattern: /(обережн|увага|warning)([.!?]|\s|$)/gi, emoji: ' ⚠️' },
            { pattern: /(цікав|интерес)([.!?]|\s|$)/gi, emoji: ' 💫' }
        ];

        // Очищаємо текст від цифр та спеціальних символів, крім пунктуації
        let cleanText = text
            .replace(/[0-9]/g, '')  // Видаляємо цифри
            .replace(/[^\wа-яА-ЯіїєґІЇЄҐ\s.!?,]/g, '')  // Залишаємо тільки букви, пробіли та пунктуацію
            .replace(/\s+/g, ' ')  // Замінюємо множинні пробіли на один
            .trim();

        // Додаємо емоджі
        emotionPatterns.forEach(({ pattern, emoji }) => {
            cleanText = cleanText.replace(pattern, (match, p1, p2) => {
                if (p1) {
                    return `${p1}${emoji}${p2 || ''}`;
                }
                return match + emoji;
            });
        });

        return cleanText;
    }

    function animateMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${message.speaker === 'A' ? 'left' : 'right'}`;
        messageDiv.dataset.timestamp = message.timestamp;
        
        const avatar = message.speaker === 'A' ? 
            'assets/doctor.webp' : 
            'assets/patient.webp';
        
        // Створюємо контейнер для аватара, який буде видимий одразу
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'avatar visible';
        avatarDiv.innerHTML = `<img src="${avatar}" alt="Avatar">`;
        
        // Створюємо контейнер для контенту повідомлення
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.innerHTML = `
            <div class="message-text"></div>
            <div class="message-time"></div>
        `;
        
        // Додаємо обидва елементи до повідомлення
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);

        const textContainer = contentDiv.querySelector('.message-text');
        const timeContainer = contentDiv.querySelector('.message-time');

        avatarDiv.onclick = (e) => {
            e.stopPropagation();
            createEmojiSelector(avatarDiv, message.speaker);
        };

        messageDiv.onclick = () => {
            const timestamp = parseFloat(messageDiv.dataset.timestamp);
            if (!isNaN(timestamp)) {
                wavesurfer.setTime(timestamp);
                document.querySelectorAll('.message').forEach(msg => {
                    msg.classList.remove('active');
                });
                messageDiv.classList.add('active');
            }
        };

        // Додаємо повідомлення
        messagesWrapper.appendChild(messageDiv);
        
        // Оновлена логіка прокрутки з урахуванням висоти плеєра
        setTimeout(() => {
            const messageRect = messageDiv.getBoundingClientRect();
            const containerRect = chatContainer.getBoundingClientRect();
            const playerHeight = document.querySelector('.audio-controls').offsetHeight;
            
            if (messageRect.bottom > containerRect.bottom - playerHeight) {
                const scrollOffset = messageRect.bottom - containerRect.bottom + playerHeight + 20;
                
                chatContainer.scrollTo({
                    top: chatContainer.scrollTop + scrollOffset,
                    behavior: 'smooth'
                });
            }
            
            // Анімуємо тільки текстовий контент
            setTimeout(() => {
                contentDiv.classList.add('visible');
                animateText();
            }, 300);
        }, 100);

        function animateText() {
            let chars = [...message.text];
            let currentChar = 0;
            const typingSpeed = 50;

            function typeNextChar() {
                if (currentChar < chars.length && !isPaused) {
                    let char = chars[currentChar];
                    
                    if (char === '\n') {
                        textContainer.innerHTML += '<br>';
                    } else {
                        textContainer.innerHTML += char;
                    }
                    
                    currentChar++;

                    if (currentChar === chars.length || chars[currentChar] === ' ' || chars[currentChar] === '\n') {
                        const currentText = textContainer.innerHTML;
                        if (currentText.endsWith('?')) {
                            textContainer.innerHTML += ' 🤔';
                        } else if (currentText.endsWith('!')) {
                            textContainer.innerHTML += ' 💡';
                        } else if (currentText.endsWith('...')) {
                            textContainer.innerHTML += ' 💭';
                        }

                        const playerHeight = document.querySelector('.audio-controls').offsetHeight;
                        const newMessageRect = messageDiv.getBoundingClientRect();
                        const newContainerRect = chatContainer.getBoundingClientRect();
                        
                        if (newMessageRect.bottom > newContainerRect.bottom - playerHeight) {
                            chatContainer.scrollTo({
                                top: chatContainer.scrollTop + (newMessageRect.bottom - newContainerRect.bottom + playerHeight + 20),
                                behavior: 'smooth'
                            });
                        }
                    }

                    if (!isPaused) {
                        setTimeout(typeNextChar, typingSpeed);
                    }
                } else if (currentChar >= chars.length) {
                    timeContainer.textContent = formatTime(message.timestamp);
                    timeContainer.classList.add('visible');
                }
            }

            typeNextChar();
        }
    }

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    // Close emoji selector when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.emoji-selector') && !e.target.closest('.avatar')) {
            emojiSelector.style.display = 'none';
        }
    });

    // Оновлюємо обробник паузи
    audioPlayer.addEventListener('pause', function() {
        isPaused = true;
        document.querySelectorAll('.message').forEach(msg => {
            msg.classList.add('paused');
        });
    });

    // Оновлюємо обробник відтворення
    audioPlayer.addEventListener('play', function() {
        isPaused = false;
        document.querySelectorAll('.message').forEach(msg => {
            msg.classList.remove('paused');
            // Відновлюємо анімацію для незавершених повідомлень
            const textContainer = msg.querySelector('.message-text');
            if (textContainer.textContent === '...') {
                const messageData = currentMessages.find(m => m.timestamp === parseFloat(msg.dataset.timestamp));
                if (messageData) {
                    animateMessage(messageData);
                    msg.remove(); // Видаляємо старе повідомлення
                }
            }
        });
    });

    // Додаємо обробник прокрутки
    chatContainer.addEventListener('wheel', function(e) {
        if (e.deltaY !== 0) {
            e.preventDefault();
            chatContainer.scrollTop += e.deltaY;
        }
    }, { passive: false });

    // Додаємо підтримку тач-жестів
    let touchStartY = 0;
    let scrollStartY = 0;

    chatContainer.addEventListener('touchstart', function(e) {
        touchStartY = e.touches[0].pageY;
        scrollStartY = chatContainer.scrollTop;
    }, { passive: true });

    chatContainer.addEventListener('touchmove', function(e) {
        const touchY = e.touches[0].pageY;
        const diff = touchStartY - touchY;
        chatContainer.scrollTop = scrollStartY + diff;
    }, { passive: true });

    // Додаємо обробник кліку на waveform
    wavesurfer.on('seek', function(progress) {
        const currentTime = wavesurfer.getCurrentTime();
        
        // Очищаємо всі повідомлення
        messagesWrapper.innerHTML = '';
        
        // Скидаємо флаг displayed для всіх повідомлень
        currentMessages.forEach(msg => {
            msg.displayed = false;
        });
        
        // Знаходимо повідомлення, найближче до поточного часу
        const messagesToShow = currentMessages.filter(msg => msg.timestamp <= currentTime);
        let targetMessage = null;
        
        // Показуємо всі повідомлення миттєво
        messagesToShow.forEach((msg, index) => {
            showMessageInstantly(msg);
            msg.displayed = true;
            
            // Знаходимо повідомлення, найближче до точки кліку
            if (index === messagesToShow.length - 1 || 
                (currentMessages[index + 1] && currentMessages[index + 1].timestamp > currentTime)) {
                targetMessage = messagesWrapper.lastElementChild;
            }
        });
        
        // Прокручуємо до цільового повідомлення
        if (targetMessage) {
            const playerHeight = document.querySelector('.audio-controls').offsetHeight;
            const messageRect = targetMessage.getBoundingClientRect();
            const containerRect = chatContainer.getBoundingClientRect();
            
            // Розраховуємо позицію прокрутки так, щоб повідомлення було посередині
            const middleOffset = (containerRect.height - playerHeight - messageRect.height) / 2;
            const scrollOffset = messageRect.top - containerRect.top - middleOffset;
            
            chatContainer.scrollTo({
                top: chatContainer.scrollTop + scrollOffset,
                behavior: 'smooth'
            });
            
            // Додаємо підсвічування для цільового повідомлення
            document.querySelectorAll('.message').forEach(msg => msg.classList.remove('active'));
            targetMessage.classList.add('active');
            
            // Прибираємо підсвічування через 2 секунди
            setTimeout(() => {
                targetMessage.classList.remove('active');
            }, 2000);
        }
    });

    // Функція для миттєвого показу повідомлення без анімації
    function showMessageInstantly(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${message.speaker === 'A' ? 'left' : 'right'} visible`;
        messageDiv.dataset.timestamp = message.timestamp;
        
        // Різні емодзі для різних спікерів
        const defaultEmoji = message.speaker === 'A' ? '👨‍⚕️' : '🤔';
        
        // Створюємо контейнер для аватара
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'avatar visible';
        avatarDiv.innerHTML = `<div class="emoji-avatar">${defaultEmoji}</div>`;
        
        // Створюємо контейнер для контенту
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content visible';
        contentDiv.innerHTML = `
            <div class="message-text">${message.text}</div>
            <div class="message-time visible">${formatTime(message.timestamp)}</div>
        `;
        
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);

        // Додаємо обробники подій
        avatarDiv.onclick = (e) => {
            e.stopPropagation();
            createEmojiSelector(avatarDiv, message.speaker);
        };

        messageDiv.onclick = () => {
            const timestamp = parseFloat(messageDiv.dataset.timestamp);
            if (!isNaN(timestamp)) {
                wavesurfer.setTime(timestamp);
                document.querySelectorAll('.message').forEach(msg => {
                    msg.classList.remove('active');
                });
                messageDiv.classList.add('active');
            }
        };

        messagesWrapper.appendChild(messageDiv);
    }
});