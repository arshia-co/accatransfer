import { supabase } from '../lib/supabaseClient';
import { getTurnstileToken } from '../lib/turnstile';
import { SMART_APPLY_REALTIME_VOICE_IDS } from '../lib/smartApplySettings';

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

const voiceControllerInstructions = {
  fa: 'You are only the voice layer for ACCA Smart Apply. Do not start your own interview. Do not answer unrelated questions. Do not invent questions, options, majors, deadlines, fees, admission facts, or counseling advice. Speak only the exact Smart Apply script sent by the frontend in response.create instructions. If the student speaks, transcribe silently; the frontend conversation engine will decide the next step.',
  en: 'You are only the voice layer for ACCA Smart Apply. Do not start your own interview. Do not answer unrelated questions. Do not invent questions, options, majors, deadlines, fees, admission facts, or counseling advice. Speak only the exact Smart Apply script sent by the frontend in response.create instructions. If the student speaks, transcribe silently; the frontend conversation engine will decide the next step.',
  tr: 'You are only the voice layer for ACCA Smart Apply. Do not start your own interview. Do not answer unrelated questions. Do not invent questions, options, majors, deadlines, fees, admission facts, or counseling advice. Speak only the exact Smart Apply script sent by the frontend in response.create instructions. If the student speaks, transcribe silently; the frontend conversation engine will decide the next step.',
  ar: 'You are only the voice layer for ACCA Smart Apply. Do not start your own interview. Do not answer unrelated questions. Do not invent questions, options, majors, deadlines, fees, admission facts, or counseling advice. Speak only the exact Smart Apply script sent by the frontend in response.create instructions. If the student speaks, transcribe silently; the frontend conversation engine will decide the next step.',
};

const languageNames = {
  fa: 'Persian',
  en: 'English',
  tr: 'Turkish',
  ar: 'Arabic',
};

const VOICE_SCRIPT_LIMIT = 8000;
const VOICE_CHUNK_LIMIT = 1100;
const VOICE_SENTENCE_BOUNDARIES = ['.', '\u061F', '?', '!', '\u061B', '\n'];
const VOICE_SOFT_BOUNDARIES = [',', '\u060C', ':', '\u061B'];

function trimAtSentenceBoundary(text, limit = VOICE_SCRIPT_LIMIT) {
  const clean = String(text || '').trim();
  if (clean.length <= limit) return clean;
  const head = clean.slice(0, limit);
  const boundary = Math.max(...VOICE_SENTENCE_BOUNDARIES.map((mark) => head.lastIndexOf(mark)));
  if (boundary > Math.floor(limit * 0.72)) return head.slice(0, boundary + 1).trim();
  return head.trim();
}

function normalizeVoiceScript(script) {
  const clean = String(script || '')
    .replace(/\s+/g, ' ')
    .trim();
  return trimAtSentenceBoundary(clean);
}

function splitAtNaturalBoundaries(text, limit = VOICE_CHUNK_LIMIT) {
  const chunks = [];
  let rest = String(text || '').trim();

  while (rest.length > limit) {
    const head = rest.slice(0, limit + 1);
    const hardBoundary = Math.max(...VOICE_SENTENCE_BOUNDARIES.map((mark) => head.lastIndexOf(mark)));
    const softBoundary = Math.max(...VOICE_SOFT_BOUNDARIES.map((mark) => head.lastIndexOf(mark)));
    const spaceBoundary = head.lastIndexOf(' ');

    let cut = limit;
    if (hardBoundary > Math.floor(limit * 0.45)) cut = hardBoundary + 1;
    else if (softBoundary > Math.floor(limit * 0.58)) cut = softBoundary + 1;
    else if (spaceBoundary > Math.floor(limit * 0.42)) cut = spaceBoundary;

    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }

  if (rest) chunks.push(rest);
  return chunks.filter(Boolean);
}

function readExactScriptInstructions(language, script) {
  const spokenLanguage = languageNames[language] || 'English';
  return [
    `Read the following Smart Apply script aloud in ${spokenLanguage}.`,
    'Ignore all previous user audio, transcripts, and conversation items for this response.',
    'Treat SCRIPT as the only content you are allowed to say.',
    'This may be one segment of a longer message. Read this segment fully and naturally.',
    'Read every word in SCRIPT. Do not summarize, skip, or stop before the final word.',
    'Use a natural, calm, premium admission-assistant tone.',
    'Do not add any new question, answer, advice, greeting, disclaimer, or explanation beyond this script.',
    'Do not say "part", "segment", "continued", or any transition unless it appears in the script.',
    'If the script contains numbered options, read the numbers clearly.',
    'Finish the final sentence completely, then stop speaking.',
    '',
    'SCRIPT:',
    script,
  ].join('\n');
}

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
  initialScript,
  voiceId,
  inputDeviceId,
  outputDeviceId,
  startMuted = true,
  onEvent,
  onConnectionChange,
}) {
  if (!supportsRealtimeVoice()) throw voiceError('unsupported');

  let turnstileToken;
  try {
    turnstileToken = await getTurnstileToken('smart_apply_voice');
  } catch (error) {
    throw voiceError('security_check_failed', error);
  }

  let microphone;
  try {
    const audioConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      ...(inputDeviceId ? { deviceId: { exact: inputDeviceId } } : {}),
    };
    microphone = await navigator.mediaDevices.getUserMedia({
      audio: audioConstraints,
    });
  } catch (error) {
    if (inputDeviceId && !permissionErrors.has(error?.name)) {
      try {
        microphone = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch (fallbackError) {
        if (permissionErrors.has(fallbackError?.name)) throw voiceError('permission_denied', fallbackError);
        throw voiceError('microphone_unavailable', fallbackError);
      }
    } else {
      if (permissionErrors.has(error?.name)) throw voiceError('permission_denied', error);
      throw voiceError('microphone_unavailable', error);
    }
  }

  const peer = new RTCPeerConnection();
  const remoteAudio = new Audio();
  let userMuted = Boolean(startMuted);
  let assistantSpeaking = false;
  let channelReady = false;
  let responseCompletionFallbackTimer = null;
  const pendingScripts = [];
  remoteAudio.autoplay = true;
  remoteAudio.playsInline = true;
  remoteAudio.setAttribute('aria-hidden', 'true');
  if (outputDeviceId && typeof remoteAudio.setSinkId === 'function') {
    remoteAudio.setSinkId(outputDeviceId).catch(() => {});
  }

  const syncMicrophone = () => {
    microphone.getAudioTracks().forEach((track) => {
      // Half-duplex while the assistant speaks prevents speaker echo or room
      // noise from being mistaken for a student interruption.
      track.enabled = !userMuted && !assistantSpeaking;
    });
  };

  microphone.getTracks().forEach((track) => peer.addTrack(track, microphone));
  syncMicrophone();

  peer.ontrack = (event) => {
    remoteAudio.srcObject = event.streams[0];
    remoteAudio.play().catch(() => {});
  };

  const dataChannel = peer.createDataChannel('oai-events');

  const clearResponseCompletionFallback = () => {
    if (responseCompletionFallbackTimer) {
      window.clearTimeout(responseCompletionFallbackTimer);
      responseCompletionFallbackTimer = null;
    }
  };

  const finishAssistantTurn = ({ notify = false } = {}) => {
    clearResponseCompletionFallback();
    assistantSpeaking = false;
    syncMicrophone();
    if (notify) {
      onEvent?.({ type: 'client.script_finished' });
    }
    drainSpeakQueue();
  };

  const scheduleResponseCompletionFallback = () => {
    clearResponseCompletionFallback();
    responseCompletionFallbackTimer = window.setTimeout(() => {
      if (assistantSpeaking) finishAssistantTurn({ notify: true });
    }, 900);
  };

  const cancelCurrentSpeech = () => {
    if (dataChannel.readyState !== 'open') return;
    clearResponseCompletionFallback();
    try {
      dataChannel.send(JSON.stringify({ type: 'response.cancel' }));
      dataChannel.send(JSON.stringify({ type: 'output_audio_buffer.clear' }));
    } catch {
      // Best-effort cancellation; the next response.create still carries the
      // latest controlled Smart Apply script.
    }
    assistantSpeaking = false;
    syncMicrophone();
  };

  const drainSpeakQueue = () => {
    if (!channelReady || assistantSpeaking || dataChannel.readyState !== 'open') return;
    const item = pendingScripts.shift();
    if (!item?.text) return;
    clearResponseCompletionFallback();
    assistantSpeaking = true;
    syncMicrophone();
    onEvent?.({
      type: 'client.script_started',
      script: item.displayText || item.text,
      spokenChunk: item.text,
      scriptId: item.scriptId,
      chunkIndex: item.chunkIndex,
      chunkTotal: item.chunkTotal,
    });
    dataChannel.send(JSON.stringify({
      type: 'response.create',
      response: {
        instructions: readExactScriptInstructions(language, item.text),
      },
    }));
  };

  const enqueueScript = (script, { replace = false, id = null } = {}) => {
    const clean = normalizeVoiceScript(script);
    if (!clean) return;
    if (replace) {
      pendingScripts.length = 0;
      if (assistantSpeaking) cancelCurrentSpeech();
    }
    const chunks = splitAtNaturalBoundaries(clean);
    const scriptId = id || `script_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    chunks.forEach((chunk, index) => {
      pendingScripts.push({
        text: chunk,
        displayText: clean,
        scriptId,
        chunkIndex: index + 1,
        chunkTotal: chunks.length,
      });
    });
    drainSpeakQueue();
  };

  dataChannel.addEventListener('message', (event) => {
    try {
      const serverEvent = JSON.parse(event.data);
      if (serverEvent.type === 'response.created' || serverEvent.type === 'output_audio_buffer.started') {
        clearResponseCompletionFallback();
        assistantSpeaking = true;
        syncMicrophone();
      }
      if (
        serverEvent.type === 'output_audio_buffer.stopped'
        || serverEvent.type === 'response.audio.done'
        || serverEvent.type === 'response.output_audio.done'
        || (serverEvent.type === 'response.done' && serverEvent.response?.status !== 'completed')
      ) {
        onEvent?.(serverEvent);
        finishAssistantTurn();
      } else if (serverEvent.type === 'response.done' && serverEvent.response?.status === 'completed') {
        onEvent?.(serverEvent);
        scheduleResponseCompletionFallback();
      } else {
        onEvent?.(serverEvent);
      }
    } catch {
      // Ignore malformed diagnostic events without ending the voice session.
    }
  });
  dataChannel.addEventListener('open', () => {
    channelReady = true;
    onConnectionChange?.('connected');
    enqueueScript(initialScript, { replace: true });
  });
  dataChannel.addEventListener('close', () => {
    channelReady = false;
    clearResponseCompletionFallback();
    onConnectionChange?.('closed');
  });
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
        voiceId: SMART_APPLY_REALTIME_VOICE_IDS.has(voiceId) ? voiceId : undefined,
        context: [
          voiceControllerInstructions[language] || voiceControllerInstructions.en,
          context,
        ].filter(Boolean).join('\n\n'),
        turnstileToken,
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
    speak(script, options) {
      enqueueScript(script, options);
    },
    setMuted(muted) {
      userMuted = muted;
      syncMicrophone();
    },
    interrupt() {
      if (dataChannel.readyState !== 'open') return;
      pendingScripts.length = 0;
      cancelCurrentSpeech();
    },
    close() {
      clearResponseCompletionFallback();
      closeMedia(microphone);
      if (dataChannel.readyState === 'open') dataChannel.close();
      peer.close();
      remoteAudio.pause();
      remoteAudio.srcObject = null;
    },
  };
}

export async function playRealtimeVoicePreview({
  language,
  voiceId,
  outputDeviceId,
  text,
  sessionId = `voice_preview_${Date.now()}`,
  onEnded,
}) {
  if (!supabase || typeof window === 'undefined' || !window.RTCPeerConnection) {
    throw voiceError('unsupported');
  }

  const cleanText = normalizeVoiceScript(text);
  if (!cleanText) throw voiceError('preview_empty');

  let turnstileToken;
  try {
    turnstileToken = await getTurnstileToken('smart_apply_voice');
  } catch (error) {
    throw voiceError('security_check_failed', error);
  }

  const peer = new RTCPeerConnection();
  const remoteAudio = new Audio();
  const dataChannel = peer.createDataChannel('oai-preview-events');
  let closed = false;
  let fallbackTimer = null;
  const previewStartedAt = Date.now();
  const previewDurationMs = Math.min(24000, Math.max(6500, cleanText.length * 125));

  const scheduleCloseAfterMinimumPlayback = (tailMs = 1200) => {
    if (closed) return;
    if (fallbackTimer) window.clearTimeout(fallbackTimer);
    const elapsedMs = Date.now() - previewStartedAt;
    const remainingMs = Math.max(tailMs, previewDurationMs - elapsedMs);
    fallbackTimer = window.setTimeout(close, remainingMs);
  };

  const close = () => {
    if (closed) return;
    closed = true;
    if (fallbackTimer) window.clearTimeout(fallbackTimer);
    try {
      if (dataChannel.readyState === 'open') dataChannel.close();
    } catch {
      /* ignore */
    }
    peer.close();
    remoteAudio.pause();
    remoteAudio.srcObject = null;
    onEnded?.();
  };

  remoteAudio.autoplay = true;
  remoteAudio.playsInline = true;
  remoteAudio.setAttribute('aria-hidden', 'true');
  if (outputDeviceId && typeof remoteAudio.setSinkId === 'function') {
    remoteAudio.setSinkId(outputDeviceId).catch(() => {});
  }

  peer.addTransceiver('audio', { direction: 'recvonly' });
  peer.ontrack = (event) => {
    remoteAudio.srcObject = event.streams[0];
    remoteAudio.play().catch(() => {});
  };

  dataChannel.addEventListener('open', () => {
    dataChannel.send(JSON.stringify({
      type: 'response.create',
      response: {
        instructions: readExactScriptInstructions(language, cleanText),
      },
    }));
  });

  dataChannel.addEventListener('message', (event) => {
    try {
      const serverEvent = JSON.parse(event.data);
      if (
        serverEvent.type === 'output_audio_buffer.stopped'
        || serverEvent.type === 'response.audio.done'
        || serverEvent.type === 'response.output_audio.done'
        || serverEvent.type === 'response.done'
      ) {
        scheduleCloseAfterMinimumPlayback();
      }
    } catch {
      /* ignore malformed diagnostic events */
    }
  });

  dataChannel.addEventListener('close', () => scheduleCloseAfterMinimumPlayback(1500));
  dataChannel.addEventListener('error', close);
  peer.addEventListener('connectionstatechange', () => {
    if (['failed', 'closed', 'disconnected'].includes(peer.connectionState)) close();
  });

  try {
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    const { data, error } = await supabase.functions.invoke('smart-apply-voice', {
      body: {
        sdp: peer.localDescription?.sdp || offer.sdp,
        language,
        sessionId,
        voiceId: SMART_APPLY_REALTIME_VOICE_IDS.has(voiceId) ? voiceId : undefined,
        context: voiceControllerInstructions[language] || voiceControllerInstructions.en,
        turnstileToken,
      },
    });
    if (error || !data?.sdp) throw voiceError('session_failed', error);
    await peer.setRemoteDescription({ type: 'answer', sdp: data.sdp });
    fallbackTimer = window.setTimeout(close, previewDurationMs + 2500);
    return { stop: close };
  } catch (error) {
    close();
    if (error?.code) throw error;
    throw voiceError('session_failed', error);
  }
}
