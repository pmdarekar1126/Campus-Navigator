// Speech in and out, using what the browser already has. Both halves report
// whether they are supported so the interface can leave the buttons out.

const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export const canListen = Boolean(Recognition);
export const canSpeak = 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';

// Indian English first, so room numbers and local names are heard correctly.
export function createListener({ onInterim, onFinal, onStateChange, onError }) {
  if (!canListen) return null;
  let recognition = null;
  let listening = false;

  function set(state) {
    listening = state;
    onStateChange(state);
  }

  function start() {
    if (listening) return;
    recognition = new Recognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    let finalText = '';

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += piece;
        else interim += piece;
      }
      onInterim((finalText + interim).trim());
    };
    recognition.onerror = (event) => {
      if (event.error !== 'aborted' && event.error !== 'no-speech') onError(event.error);
    };
    recognition.onend = () => {
      set(false);
      if (finalText.trim()) onFinal(finalText.trim());
    };

    try {
      recognition.start();
      set(true);
    } catch (error) {
      onError('unavailable');
    }
  }

  function stop() {
    if (recognition && listening) recognition.stop();
  }

  return { start, stop, toggle: () => (listening ? stop() : start()), isListening: () => listening };
}

let speakingButton = null;

function preferredVoice() {
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => v.lang === 'en-IN')
    || voices.find((v) => /^en[-_]GB/.test(v.lang))
    || voices.find((v) => /^en/.test(v.lang))
    || null;
}

export function stopSpeaking() {
  if (!canSpeak) return;
  window.speechSynthesis.cancel();
  if (speakingButton) speakingButton.dispatchEvent(new CustomEvent('speech-end'));
  speakingButton = null;
}

// One answer speaks at a time; pressing the same button again stops it.
export function speak(text, button) {
  if (!canSpeak) return;
  const wasThis = speakingButton === button;
  stopSpeaking();
  if (wasThis) return;

  const utterance = new SpeechSynthesisUtterance(text);
  const voice = preferredVoice();
  if (voice) utterance.voice = voice;
  utterance.lang = voice ? voice.lang : 'en-IN';
  utterance.rate = 1;
  utterance.onend = utterance.onerror = () => {
    if (speakingButton === button) {
      button.dispatchEvent(new CustomEvent('speech-end'));
      speakingButton = null;
    }
  };
  speakingButton = button;
  button.dispatchEvent(new CustomEvent('speech-start'));
  window.speechSynthesis.speak(utterance);
}
