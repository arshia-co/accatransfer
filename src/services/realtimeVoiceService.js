import { supabase } from '../lib/supabaseClient';

const permissionErrors = new Set(['NotAllowedError', 'PermissionDeniedError', 'SecurityError']);

function voiceError(code, cause) {
  const error = new Error(code);
  error.code = code;
  error.cause = cause;
  return error;
}

function closeMedia(stream) {
  stream?.getTracks().forEach((track) => track.stop());
}

const openingInstructions = {
  fa: 'Start in Persian with one brief, natural greeting. Continue the university admission conversation and ask the single most relevant next education question. Never ask about a job role.',
  en: 'Start in English with one brief, natural greeting. Continue the university admission conversation and ask the single most relevant next education question. Never ask about a job role.',
  tr: 'Start in Turkish with one brief, natural greeting. Continue the university admission conversation and ask the single most relevant next education question. Never ask about a job role.',
  ar: 'Start in Arabic with one brief, natural greeting. Continue the university admission conversation and ask the single most relevant next education question. Never ask about a job role.',
};

export function supportsRealtimeVoice() {
  return Boolean(
    supabase
    && typeof window !== 'undefined'
    && window.RTCPeerConnection
    && navigator.mediaDevices?.getUserMedia,
  );
}

export async function startRealtimeVoiceSession({
  language,
  sessionId,
  context,
  onEvent,
  onConnectionChange,
}) {
  if (!supportsRealtimeVoice()) throw voiceError('unsupported');

  let microphone;
  try {
    microphone = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
  } catch (error) {
    if (permissionErrors.has(error?.name)) throw voiceError('permission_denied', error);
    throw voiceError('microphone_unavailable', error);
  }

  const peer = new RTCPeerConnection();
  const remoteAudio = new Audio();
  remoteAudio.autoplay = true;
  remoteAudio.playsInline = true;
  remoteAudio.setAttribute('aria-hidden', 'true');

  microphone.getTracks().forEach((track) => peer.addTrack(track, microphone));
  peer.ontrack = (event) => {
    remoteAudio.srcObject = event.streams[0];
    remoteAudio.play().catch(() => {});
  };

  const dataChannel = peer.createDataChannel('oai-events');
  dataChannel.addEventListener('message', (event) => {
    try {
      onEvent?.(JSON.parse(event.data));
    } catch {
      // Ignore malformed diagnostic events without ending the voice session.
    }
  });
  dataChannel.addEventListener('open', () => {
    onConnectionChange?.('connected');
    dataChannel.send(JSON.stringify({
      type: 'response.create',
      response: {
        instructions: openingInstructions[language] || openingInstructions.en,
      },
    }));
  });
  dataChannel.addEventListener('close', () => onConnectionChange?.('closed'));
  dataChannel.addEventListener('error', () => onConnectionChange?.('error'));

  peer.addEventListener('connectionstatechange', () => {
    onConnectionChange?.(peer.connectionState);
  });

  try {
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    const { data, error } = await supabase.functions.invoke('smart-apply-voice', {
      body: {
        sdp: peer.localDescription?.sdp || offer.sdp,
        language,
        sessionId,
        context,
      },
    });
    if (error || !data?.sdp) throw voiceError('session_failed', error);
    await peer.setRemoteDescription({ type: 'answer', sdp: data.sdp });
  } catch (error) {
    closeMedia(microphone);
    peer.close();
    remoteAudio.srcObject = null;
    if (error?.code) throw error;
    throw voiceError('session_failed', error);
  }

  return {
    setMuted(muted) {
      microphone.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    },
    interrupt() {
      if (dataChannel.readyState !== 'open') return;
      dataChannel.send(JSON.stringify({ type: 'response.cancel' }));
      dataChannel.send(JSON.stringify({ type: 'output_audio_buffer.clear' }));
    },
    close() {
      closeMedia(microphone);
      if (dataChannel.readyState === 'open') dataChannel.close();
      peer.close();
      remoteAudio.pause();
      remoteAudio.srcObject = null;
    },
  };
}
