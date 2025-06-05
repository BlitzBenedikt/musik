const tones = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "H"];
const forbiddenIntervalPairs = [[3, 3], [4, 4], [3, 4], [4, 3]];
let currentSequence = [];
let playbackTimeouts = [];
const audioCache = {};
let currentAudio = null;
let currentTransformationSequence = [];
let history = []; // Verlauf der Reihen

// --- UI Setup ---
window.onload = () => {
    setupControls();
    setupPlaySettings();
    setupTransformationSection();
    preloadAudios();
    generateTones(true);
    document.getElementById("darkmode-toggle").onclick = function() {
        document.body.classList.toggle("darkmode");
        this.innerText = document.body.classList.contains("darkmode") ? "☀️" : "🌙";
    };
};

function setupControls() {
    const controls = document.getElementById("controls");
    controls.innerHTML = `
        <button class="reload-btn" onclick="generateTones()" title="Erzeugt eine neue zufällige Zwölftonreihe">
            &#x21bb;
        </button>
        <button class="play-btn" onclick="playSequence()" title="Spielt die aktuelle Reihenfolge der Töne ab">
            &#9654;
        </button>
        <button class="red-stop" onclick="stopPlayback()" title="Stoppt die Wiedergabe">
            &#9632;
        </button>
        <button class="green-check" onclick="validateSequence()" title="Überprüft, ob die Reihenfolge gültig ist">
            &#10003;
        </button>
    `;
}
function setupPlaySettings() {
    const playSettings = document.getElementById("play-settings");
    playSettings.innerHTML = `
        <label for="play-delay">Zeit pro Ton (ms):</label>
        <input type="number" id="play-delay" value="1000" min="300">
    `;
}
function setupTransformationSection() {
    const section = document.getElementById("transformation-section");
    section.innerHTML = `
        <h2 style="margin-bottom:10px;">Transformationen</h2>
        <div id="transformation-buttons" style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;">
            <button class="secondary" onclick="applyKrebs()" title="Spiegelt die Reihenfolge (Krebs)">Krebs</button>
            <button class="secondary" onclick="applyUmkehrung()" title="Spiegelt die Intervalle (Umkehrung)">Umkehrung</button>
            <button class="secondary" onclick="applyKrebsUmkehrung()" title="Kombiniert Krebs und Umkehrung">Krebs-Umkehrung</button>
        </div>
        <div style="display:flex;justify-content:center;margin-top:12px;gap:10px;">
            <button class="play-btn" onclick="playTransformation()" title="Spielt die aktuelle Transformation ab">&#9654;</button>
            <button class="red-stop" onclick="stopPlayback()" title="Stoppt die Wiedergabe">&#9632;</button>
            <button class="save-btn" onclick="saveTransformationAsOriginal()" title="Transformation als neues Original übernehmen">Als Original speichern</button>
        </div>
        <div id="transformation-result" class="result"></div>
    `;
}

// --- Audio ---
function preloadAudios() {
    tones.forEach(tone => {
        const audio = new Audio(`audio/${tone.replace('#', 'sharp')}.wav`);
        audio.load();
    });
}
const audioElement = new Audio();

function playTone(tone) {
    audioElement.pause();
    audioElement.currentTime = 0;
    audioElement.src = `audio/${tone.replace('#', 'sharp')}.wav`;
    // iOS braucht manchmal ein .play() nach src-Änderung mit kurzem Timeout
    setTimeout(() => {
        audioElement.play().catch(e => {
            console.warn("Audio konnte nicht abgespielt werden:", e);
        });
    }, 50);
}

// --- Zwölftonreihe ---
function generateTones(isInitial = false) {
    let valid = false;
    let tries = 0;
    while (!valid && tries < 100) {
        currentSequence = [...tones].sort(() => Math.random() - 0.5);
        valid = checkSequenceValidity(currentSequence);
        tries++;
    }
    displayTones(currentSequence);
    displayTransformation("Original", currentSequence);
    updateHistoryView();
    if (isInitial) {
        console.log("Erste gültige Zwölftonreihe geladen:", currentSequence);
    } else {
        console.log("Neue Töne geladen:", currentSequence);
    }
}
function checkSequenceValidity(sequence) {
    for (let i = 0; i < sequence.length - 2; i++) {
        const interval1 = calculateInterval(sequence[i], sequence[i + 1]);
        const interval2 = calculateInterval(sequence[i + 1], sequence[i + 2]);
        if (forbiddenIntervalPairs.some(pair => pair[0] === interval1 && pair[1] === interval2)) {
            return false;
        }
    }
    return true;
}
function displayTones(sequence) {
    const toneListDiv = document.getElementById("tone-list");
    if (!toneListDiv) {
        console.error("tone-list div nicht gefunden!");
        return;
    }
    toneListDiv.innerHTML = "";
    sequence.forEach((tone, index) => {
        const div = document.createElement("div");
        div.className = "draggable";
        div.innerText = tone;
        div.draggable = true;
        div.dataset.index = index;

        // Drag & Drop Events (Desktop)
        div.addEventListener("dragstart", dragStart);
        div.addEventListener("dragover", dragOver);
        div.addEventListener("drop", drop);
        div.addEventListener("dragend", dragEnd);

        // Touch-Events (für iPad)
        div.addEventListener("touchstart", touchStart, { passive: false });
        div.addEventListener("touchmove", touchMove, { passive: false });
        div.addEventListener("touchend", touchEnd, { passive: false });

        div.addEventListener("click", () => {
            playTone(tone);
            div.classList.add("playing");
            const delay = parseInt(document.getElementById("play-delay").value, 10);
            setTimeout(() => {
                audioElement.pause();
                audioElement.currentTime = 0;
                div.classList.remove("playing");
            }, delay - 50);
            console.log("Ton abgespielt:", tone);
        });
        toneListDiv.appendChild(div);
    });
}

// --- Transformationen ---
function displayTransformation(type, sequence) {
    const resultDiv = document.getElementById("transformation-result");
    resultDiv.innerText = `${type}: ${sequence.join(" - ")}`;
    currentTransformationSequence = sequence;
    history.unshift({ type, row: [...sequence] });
    updateHistoryView();
    console.log(`${type} angewendet:`, sequence);
}
function applyKrebs() {
    const krebs = [...currentSequence].reverse();
    displayTransformation("Krebs", krebs);
}
function applyUmkehrung() {
    const firstToneIndex = tones.indexOf(currentSequence[0]);
    const umkehrung = currentSequence.map(tone => {
        const interval = (tones.indexOf(tone) - firstToneIndex + tones.length) % tones.length;
        const mirroredIndex = (firstToneIndex - interval + tones.length) % tones.length;
        return tones[mirroredIndex];
    });
    displayTransformation("Umkehrung", umkehrung);
}
function applyKrebsUmkehrung() {
    const firstToneIndex = tones.indexOf(currentSequence[0]);
    const umkehrung = currentSequence.map(tone => {
        const interval = (tones.indexOf(tone) - firstToneIndex + tones.length) % tones.length;
        const mirroredIndex = (firstToneIndex - interval + tones.length) % tones.length;
        return tones[mirroredIndex];
    });
    const krebsUmkehrung = [...umkehrung].reverse();
    displayTransformation("Krebs-Umkehrung", krebsUmkehrung);
}
function saveTransformationAsOriginal() {
    if (!currentTransformationSequence || currentTransformationSequence.length === 0) return;
    history.unshift({ type: "Original", row: [...currentTransformationSequence] });
    updateHistoryView();
    currentSequence = [...history[0].row];
    displayTones(currentSequence); // Anzeige oben aktualisieren
    markInvalidIntervals(currentSequence); // Markierung oben aktualisieren
    const resultDiv = document.getElementById("transformation-result");
    resultDiv.innerText = `Original: ${currentSequence.join(" - ")}`;
    currentTransformationSequence = [...currentSequence];
    console.log("Transformation als neues Original gespeichert:", currentSequence);
}

// --- Drag & Drop ---
let draggedElement = null;
function dragStart(event) {
    draggedElement = event.target;
    event.dataTransfer.effectAllowed = "move";
    draggedElement.classList.add("dragging");
    console.log("Drag gestartet:", draggedElement.innerText);
}
function dragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const target = event.target;
    if (target && target !== draggedElement && target.classList.contains("draggable")) {
        target.classList.add("drop-target");
    }
}
function drop(event) {
    event.preventDefault();
    const target = event.target;
    if (target && target !== draggedElement && target.classList.contains("draggable")) {
        const toneListDiv = document.getElementById("tone-list");
        const children = Array.from(toneListDiv.children);
        const draggedIndex = children.indexOf(draggedElement);
        const targetIndex = children.indexOf(target);

        if (draggedIndex < targetIndex) {
            toneListDiv.insertBefore(draggedElement, target.nextSibling);
        } else {
            toneListDiv.insertBefore(draggedElement, target);
        }
        console.log("Drop ausgeführt von", draggedElement.innerText, "zu", target.innerText);
        updateCurrentSequence();
    }
    document.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));
}
function dragEnd() {
    if (draggedElement) draggedElement.classList.remove("dragging");
    document.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));
    draggedElement = null;
}
function updateCurrentSequence() {
    const toneListDiv = document.getElementById("tone-list");
    currentSequence = Array.from(toneListDiv.children).map(child => child.innerText);
    history.unshift({ type: "Manuell", row: [...currentSequence] });
    updateHistoryView();
    markInvalidIntervals(currentSequence); 
    console.log("Aktuelle Reihenfolge nach Drag & Drop:", currentSequence);
}

// --- Touch Drag ---
let touchDraggedElement = null;
let touchStartX = 0;
let touchStartY = 0;
let originalIndex = -1;
function touchStart(e) {
    e.preventDefault();
    const target = e.target;
    if (target.classList.contains("draggable")) {
        touchDraggedElement = target;
        const rect = target.getBoundingClientRect();
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;

        target.style.position = "absolute";
        target.style.zIndex = "9999";
        target.style.width = rect.width + "px";
        target.style.height = rect.height + "px";
        target.style.left = rect.left + "px";
        target.style.top = rect.top + "px";
        originalIndex = Array.from(document.getElementById("tone-list").children).indexOf(target);

        console.log("Touchstart auf:", target.innerText);
    }
}
function touchMove(e) {
    if (!touchDraggedElement) return;
    e.preventDefault();
    const dx = e.touches[0].clientX - touchStartX;
    const dy = e.touches[0].clientY - touchStartY;
    touchDraggedElement.style.left = (touchDraggedElement.offsetLeft + dx) + "px";
    touchDraggedElement.style.top = (touchDraggedElement.offsetTop + dy) + "px";
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}
function touchEnd(e) {
    if (!touchDraggedElement) return;
    e.preventDefault();
    const toneListDiv = document.getElementById("tone-list");
    const children = Array.from(toneListDiv.children);
    let dropIndex = children.length;
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (child !== touchDraggedElement) {
            const rect = child.getBoundingClientRect();
            if (touchStartX >= rect.left && touchStartX <= rect.right && touchStartY >= rect.top && touchStartY <= rect.bottom) {
                dropIndex = i;
                break;
            }
        }
    }

    touchDraggedElement.style.position = "";
    touchDraggedElement.style.zIndex = "";
    touchDraggedElement.style.width = "";
    touchDraggedElement.style.height = "";
    touchDraggedElement.style.left = "";
    touchDraggedElement.style.top = "";

    const oldIndex = originalIndex;
    const elementToMove = children[oldIndex];
    if (elementToMove && dropIndex !== oldIndex) {
        toneListDiv.removeChild(elementToMove);
        if (dropIndex >= children.length) {
            toneListDiv.appendChild(elementToMove);
        } else {
            toneListDiv.insertBefore(elementToMove, children[dropIndex]);
        }
        console.log("Element per Touch verschoben von Index", oldIndex, "zu Index", dropIndex);
        updateCurrentSequence();
    }

    touchDraggedElement = null;
    originalIndex = -1;
}

// --- Playback ---
function playSequence() {
    stopPlayback();
    const delay = parseInt(document.getElementById("play-delay").value, 10);
    console.log("Reihenfolge abspielen mit Verzögerung:", delay, "ms");
    const toneListDiv = document.getElementById("tone-list");
    const toneElements = Array.from(toneListDiv.children);

    currentSequence.forEach((tone, index) => {
        const timeout = setTimeout(() => {
            toneElements.forEach(el => el.classList.remove("playing"));
            if (toneElements[index]) {
                toneElements[index].classList.add("playing");
            }
            playTone(tone);
            console.log("Ton abgespielt in Sequenz:", tone);
            if (index === currentSequence.length - 1) {
                setTimeout(() => {
                    audioElement.pause();
                    audioElement.currentTime = 0;
                    toneElements.forEach(el => el.classList.remove("playing"));
                }, delay - 50);
            }
        }, delay * index);
        playbackTimeouts.push(timeout);
    });
}
function playTransformation() {
    stopPlayback();
    const delay = parseInt(document.getElementById("play-delay").value, 10);
    if (!currentTransformationSequence || currentTransformationSequence.length === 0) return;
    const toneListDiv = document.getElementById("tone-list");
    const toneElements = Array.from(toneListDiv.children);

    currentTransformationSequence.forEach((tone, index) => {
        const timeout = setTimeout(() => {
            toneElements.forEach(el => el.classList.remove("playing"));
            const origIndex = currentSequence.indexOf(tone);
            if (origIndex !== -1 && toneElements[origIndex]) {
                toneElements[origIndex].classList.add("playing");
            }
            playTone(tone);
            if (index === currentTransformationSequence.length - 1) {
                setTimeout(() => {
                    audioElement.pause();
                    audioElement.currentTime = 0;
                    toneElements.forEach(el => el.classList.remove("playing"));
                }, delay - 50);
            }
        }, delay * index);
        playbackTimeouts.push(timeout);
    });
}
function stopPlayback() {
    playbackTimeouts.forEach(timeout => clearTimeout(timeout));
    playbackTimeouts = [];
    audioElement.pause();
    audioElement.currentTime = 0;
    const toneListDiv = document.getElementById("tone-list");
    if (toneListDiv) {
        Array.from(toneListDiv.children).forEach(el => el.classList.remove("playing"));
    }
    console.log("Wiedergabe gestoppt.");
}

// --- Verlauf ---
function updateHistoryView() {
    const historyList = document.getElementById("history-list");
    historyList.innerHTML = "";
    history.forEach((entry, idx) => {
        const div = document.createElement("div");
        div.style.display = "flex";
        div.style.alignItems = "center";
        div.style.gap = "10px";
        div.style.background = idx === 0 ? "#ffe066" : "#f8f9fa";
        div.style.borderRadius = "8px";
        div.style.padding = "6px 12px";
        div.style.fontWeight = idx === 0 ? "bold" : "normal";
        div.innerHTML = `<span style="min-width:90px;color:#888;">${entry.type}:</span> ${entry.row.join(" - ")}`;

        // Laden-Button
        const loadBtn = document.createElement("button");
        loadBtn.textContent = "Laden";
        loadBtn.className = "secondary";
        loadBtn.style.marginLeft = "auto";
        loadBtn.onclick = () => {
            currentSequence = [...entry.row];
            displayTones(currentSequence);
            markInvalidIntervals(currentSequence); // <--- HIER
            displayTransformation(entry.type, currentSequence);
            updateHistoryView();
        };

        div.appendChild(loadBtn);
        historyList.appendChild(div);
    });
}

// --- Hilfsfunktionen ---
function calculateInterval(toneA, toneB) {
    const indexA = tones.indexOf(toneA);
    const indexB = tones.indexOf(toneB);
    if (indexA === -1 || indexB === -1) return 0;
    let interval = indexB - indexA;
    if (interval < 0) interval += tones.length;
    return interval;
}
function validateSequence() {
    let isValid = true;
    const toneListDiv = document.getElementById("tone-list");
    const toneElements = Array.from(toneListDiv.children);

    toneElements.forEach(element => {
        element.classList.remove("invalid");
    });

    for (let i = 0; i < currentSequence.length - 2; i++) {
        const interval1 = calculateInterval(currentSequence[i], currentSequence[i + 1]);
        const interval2 = calculateInterval(currentSequence[i + 1], currentSequence[i + 2]);

        if (forbiddenIntervalPairs.some(pair => pair[0] === interval1 && pair[1] === interval2)) {
            isValid = false;
            toneElements[i].classList.add("invalid");
            toneElements[i + 1].classList.add("invalid");
            toneElements[i + 2].classList.add("invalid");
        }
    }

    if (isValid) {
        alert("Die Reihenfolge ist gültig!");
    } else {
        console.warn("Es wurden verbotene Intervalle gefunden. Die ungültigen Töne sind markiert.");
    }
}
function markInvalidIntervals(sequence) {
    const toneListDiv = document.getElementById("tone-list");
    const toneElements = Array.from(toneListDiv.children);

    // Erst alle Markierungen entfernen
    toneElements.forEach(element => {
        element.classList.remove("invalid");
    });

    // Markiere verbotene Intervalle
    for (let i = 0; i < sequence.length - 2; i++) {
        const interval1 = calculateInterval(sequence[i], sequence[i + 1]);
        const interval2 = calculateInterval(sequence[i + 1], sequence[i + 2]);
        if (forbiddenIntervalPairs.some(pair => pair[0] === interval1 && pair[1] === interval2)) {
            toneElements[i].classList.add("invalid");
            toneElements[i + 1].classList.add("invalid");
            toneElements[i + 2].classList.add("invalid");
        }
    }
}

// iOS/iPadOS: Audio-Kontext nach User-Interaktion aktivieren
document.addEventListener('touchstart', unlockAudio, { once: true });
document.addEventListener('mousedown', unlockAudio, { once: true });

function unlockAudio() {
    // Erzeuge einen leeren Ton, um das Audio-System zu aktivieren
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const source = ctx.createBufferSource();
    source.buffer = ctx.createBuffer(1, 1, 22050);
    source.connect(ctx.destination);
    source.start(0);
    setTimeout(() => ctx.close(), 100);
}

function isMobileDevice() {
    return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

window.addEventListener("DOMContentLoaded", () => {
    if (isMobileDevice()) {
        document.body.style.zoom = "1";
    } else {
        document.body.style.zoom = "0.8";
    }
});

