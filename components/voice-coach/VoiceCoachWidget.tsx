'use client';
import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, X, MessageSquare } from 'lucide-react';

export default function VoiceCoachWidget({ userId }: { userId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState<Array<{ role: string; content: string }>>([]);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [transcript]);

  const startSession = () => {
    setIsConnected(true);
    setTranscript([{ role: 'assistant', content: "Hey! Ready to craft some outreach? Are we reaching out to someone new, or following up with an existing contact?" }]);
  };

  const endSession = () => { setIsConnected(false); setIsListening(false); setTranscript([]); };

  if (!isOpen) {
    return (
      <button onClick={() => setIsOpen(true)} className="fixed bottom-6 right-6 bg-primary-600 text-white p-4 rounded-full shadow-lg hover:bg-primary-700 hover:scale-105 transition z-50" title="Open Voice Coach">
        <MessageSquare className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50">
      <div className="bg-primary-600 text-white p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" /><span className="font-semibold">Voice Coach</span>
          {isConnected && <span className="flex items-center gap-1 text-xs bg-primary-500 px-2 py-0.5 rounded-full"><span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />Connected</span>}
        </div>
        <button onClick={() => { endSession(); setIsOpen(false); }} className="hover:bg-primary-500 p-1 rounded"><X className="h-5 w-5" /></button>
      </div>
      <div className="h-80 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {transcript.length === 0 && !isConnected && (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">Ready to craft your next message?</p>
            <button onClick={startSession} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">Start Conversation</button>
          </div>
        )}
        {transcript.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-lg ${msg.role === 'user' ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-800'}`}>
              <p className="text-sm">{msg.content}</p>
            </div>
          </div>
        ))}
        <div ref={transcriptEndRef} />
      </div>
      {isConnected && (
        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="flex items-center justify-center gap-4">
            <button onClick={() => setIsListening(!isListening)} className={`p-4 rounded-full transition ${isListening ? 'bg-red-500 text-white voice-active' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {isListening ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
            </button>
            <button onClick={endSession} className="text-gray-500 text-sm hover:text-gray-700">End Session</button>
          </div>
          <p className="text-center text-xs text-gray-400 mt-2">{isListening ? 'Listening... speak now' : 'Click mic to speak'}</p>
        </div>
      )}
      <div className="px-4 py-2 bg-gray-100 text-center"><p className="text-xs text-gray-400">Powered by ElevenLabs Conversational AI</p></div>
    </div>
  );
}
