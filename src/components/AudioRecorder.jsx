import { useState, useRef } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function AudioRecorder({ onTranscription, disabled }) {
  const [isRecording, setIsRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        const audioFile = new File([audioBlob], "message_vocal.webm", { type: "audio/webm" });
        setProcessing(true);
        try {
          const { file_url } = await base44.integrations.Core.UploadFile({ file: audioFile });
          const transcription = await base44.integrations.Core.TranscribeAudio({ audio_url: file_url });
          if (transcription?.trim()) onTranscription(transcription.trim());
        } catch (err) {
          console.error("Erreur transcription audio:", err);
        } finally {
          setProcessing(false);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      alert("Accès au microphone refusé. Veuillez autoriser l'accès dans les paramètres du navigateur.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleClick = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  if (processing) {
    return (
      <button disabled className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0" title="Transcription en cours...">
        <Loader2 className="h-4 w-4 text-amber-500 animate-spin" />
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      title={isRecording ? "Arrêter l'enregistrement" : "Envoyer un message vocal (pulaar ou français)"}
      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
        isRecording
          ? "bg-red-500 hover:bg-red-600 animate-pulse"
          : "bg-muted hover:bg-amber-100 text-muted-foreground hover:text-amber-600"
      } disabled:opacity-40`}
    >
      {isRecording ? (
        <MicOff className="h-4 w-4 text-white" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </button>
  );
}