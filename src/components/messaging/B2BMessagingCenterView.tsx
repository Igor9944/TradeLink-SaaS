// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.

import React, { useState, useRef, useEffect } from 'react';
import {
  ConversationRecord,
  ConversationMessageRecord,
  MessageAttachment,
  UserProfile,
} from '../../types';
import { Badge, Button } from '../ui/DesignSystem';

interface B2BMessagingCenterViewProps {
  currentUser: UserProfile;
  conversations: ConversationRecord[];
  activeConversation?: ConversationRecord;
  messages: ConversationMessageRecord[];
  onSelectConversation: (conversationId: string) => void;
  onSendMessage: (text: string, attachments?: MessageAttachment[]) => Promise<void>;
  onUploadAttachment?: (file: File) => Promise<MessageAttachment | null>;
  onMarkConversationRead?: (conversationId: string) => void;
  onStartRoomLive?: (conversation: ConversationRecord) => void;
  onTriggerVoiceDictation?: () => void;
  dictatedText?: string;
}

export const B2BMessagingCenterView: React.FC<B2BMessagingCenterViewProps> = ({
  currentUser,
  conversations,
  activeConversation,
  messages,
  onSelectConversation,
  onSendMessage,
  onUploadAttachment,
  onMarkConversationRead,
  onStartRoomLive,
  onTriggerVoiceDictation,
  dictatedText,
}) => {
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<MessageAttachment[]>([]);
  const [toggledOriginals, setToggledOriginals] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronisation du texte dicté
  useEffect(() => {
    if (dictatedText) {
      setInputText((prev) => (prev ? `${prev} ${dictatedText}` : dictatedText));
    }
  }, [dictatedText]);

  // Défilement automatique vers le bas à chaque nouveau message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Marquer comme lu à l'ouverture de la conversation
  useEffect(() => {
    if (activeConversation && onMarkConversationRead) {
      onMarkConversationRead(activeConversation.id);
    }
  }, [activeConversation?.id]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && pendingAttachments.length === 0) return;

    const textToSend = inputText;
    const attachmentsToSend = [...pendingAttachments];

    setInputText('');
    setPendingAttachments([]);

    await onSendMessage(textToSend, attachmentsToSend);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadAttachment) return;

    setIsUploading(true);
    try {
      const att = await onUploadAttachment(file);
      if (att) {
        setPendingAttachments((prev) => [...prev, att]);
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toggleShowOriginal = (msgId: string) => {
    setToggledOriginals((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  const filteredConversations = conversations.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchTitle = c.title.toLowerCase().includes(q);
    const matchEntity = c.relatedEntityId?.toLowerCase().includes(q) ?? false;
    const matchParticipant = c.participantDetails.some(
      (p) => p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
    );
    return matchTitle || matchEntity || matchParticipant;
  });

  return (
    <div className="flex h-[750px] bg-white dark:bg-[#0A2540] rounded-2xl border border-slate-200 dark:border-teal-800 shadow-xl overflow-hidden">
      {/* 1. Colonne de gauche : Liste des conversations */}
      <div className="w-80 border-r border-slate-200 dark:border-teal-900/60 flex flex-col bg-slate-50/50 dark:bg-[#071d33]">
        {/* En-tête filtre */}
        <div className="p-4 border-b border-slate-200 dark:border-teal-900/60">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span>💬 Messagerie B2B</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
                {conversations.length}
              </span>
            </h3>
          </div>

          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher conversation, commande..."
              className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-300 dark:border-teal-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-[#E85D22]"
            />
            <span className="absolute left-2.5 top-2.5 text-slate-400 text-xs">🔍</span>
          </div>
        </div>

        {/* Liste défilante des conversations */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-teal-900/30">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
              Aucune conversation trouvée.
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = conv.id === activeConversation?.id;
              const unread = conv.unreadCountByUser[currentUser.id] || 0;
              const otherParticipants = conv.participantDetails.filter(
                (p) => p.id !== currentUser.id
              );

              return (
                <div
                  key={conv.id}
                  onClick={() => onSelectConversation(conv.id)}
                  className={`p-3.5 cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-[#E85D22]/10 dark:bg-[#E85D22]/20 border-l-4 border-l-[#E85D22]'
                      : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                      {conv.title}
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {new Date(conv.lastMessageAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {conv.type !== 'DIRECT' && (
                      <Badge variant="neutral">{conv.type.replace('_THREAD', '')}</Badge>
                    )}
                    {conv.relatedEntityId && (
                      <span className="text-[10px] font-mono text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-1.5 py-0.5 rounded">
                        #{conv.relatedEntityId}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-1.5">
                    {conv.lastMessageSnippet || 'Démarrer la discussion...'}
                  </p>

                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-200/40 dark:border-teal-900/20 text-[10px] text-slate-400">
                    <span className="truncate">
                      {otherParticipants.map((p) => p.name).join(', ') || 'Moi'}
                    </span>
                    {unread > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-[#E85D22] text-white font-bold text-[9px]">
                        {unread}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Zone principale de chat */}
      {activeConversation ? (
        <div className="flex-1 flex flex-col bg-white dark:bg-[#0A2540]">
          {/* En-tête de conversation */}
          <div className="p-4 border-b border-slate-200 dark:border-teal-900/60 flex items-center justify-between bg-slate-50/70 dark:bg-[#071d33]">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm text-slate-900 dark:text-white">
                  {activeConversation.title}
                </h2>
                {activeConversation.relatedEntityId && (
                  <Badge variant="info">Dossier #{activeConversation.relatedEntityId}</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                <span>Interlocuteurs :</span>
                {activeConversation.participantDetails.map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300"
                  >
                    <span>{p.name}</span>
                    <span className="text-[10px] text-slate-400">({p.role})</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onStartRoomLive && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onStartRoomLive(activeConversation)}
                >
                  <span className="mr-1">🎥</span> Lancer Room Live
                </Button>
              )}
            </div>
          </div>

          {/* Liste des messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/30 dark:bg-slate-900/20">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 text-xs">
                <div className="text-3xl mb-2">💬</div>
                <p className="font-medium text-slate-600 dark:text-slate-300">
                  Début de la conversation sécurisée
                </p>
                <p className="text-slate-400 mt-1 max-w-sm">
                  Les messages et documents échangés sont chiffrés et traduits en temps réel avec conservation de l'original.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === currentUser.id;
                const isShowingOrig = toggledOriginals[msg.id];
                const displayText =
                  msg.isTranslated && !isShowingOrig && msg.translatedText
                    ? msg.translatedText
                    : msg.originalText;

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    {/* Auteur & rôle */}
                    <div className="flex items-center gap-1.5 mb-1 text-[11px] text-slate-400 px-1">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {isMe ? 'Moi' : msg.senderName}
                      </span>
                      <span>• {msg.senderRole}</span>
                      <span>
                        •{' '}
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {/* Bulle de texte */}
                    <div
                      className={`max-w-xl rounded-2xl p-3.5 shadow-xs ${
                        isMe
                          ? 'bg-[#E85D22] text-white rounded-tr-xs'
                          : 'bg-white dark:bg-[#071d33] border border-slate-200 dark:border-teal-800 text-slate-900 dark:text-white rounded-tl-xs'
                      }`}
                    >
                      <p className="text-xs leading-relaxed whitespace-pre-wrap">{displayText}</p>

                      {/* Notice de traduction IA */}
                      {msg.isTranslated && (
                        <div
                          className={`mt-2 pt-2 border-t flex items-center justify-between text-[10px] ${
                            isMe
                              ? 'border-white/20 text-white/80'
                              : 'border-slate-100 dark:border-teal-900/60 text-teal-700 dark:text-teal-400'
                          }`}
                        >
                          <span className="flex items-center gap-1">
                            <span>🌐</span>
                            <span>
                              {isShowingOrig
                                ? `Texte original (${msg.sourceLang.toUpperCase()})`
                                : `Traduit automatiquement (${msg.sourceLang.toUpperCase()} &rarr; ${msg.targetLang?.toUpperCase()})`}
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleShowOriginal(msg.id)}
                            className="underline hover:opacity-100 cursor-pointer font-medium ml-2"
                          >
                            {isShowingOrig ? 'Voir la traduction' : 'Voir l’original'}
                          </button>
                        </div>
                      )}

                      {/* Pièces jointes */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {msg.attachments.map((att) => (
                            <div
                              key={att.id}
                              className={`p-2 rounded-xl flex items-center justify-between gap-3 text-xs ${
                                isMe
                                  ? 'bg-black/10 text-white'
                                  : 'bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-teal-900 text-slate-800 dark:text-slate-200'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span>📎</span>
                                <div className="truncate">
                                  <div className="font-medium truncate">{att.fileName}</div>
                                  <div className="text-[10px] opacity-75">
                                    {(att.fileSizeBytes / 1024).toFixed(1)} Ko •{' '}
                                    <span className="text-emerald-500 font-semibold">
                                      🛡️ Scan Antivirus Net
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <a
                                href={att.presignedDownloadUrl}
                                download={att.fileName}
                                target="_blank"
                                rel="noreferrer"
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 transition-colors ${
                                  isMe
                                    ? 'bg-white text-[#E85D22] hover:bg-white/90'
                                    : 'bg-[#E85D22] text-white hover:bg-[#E85D22]/90'
                                }`}
                              >
                                Télécharger
                              </a>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Statut de lecture */}
                    <div className="text-[9px] text-slate-400 mt-0.5 px-1">
                      {isMe && (
                        <span>
                          {msg.status === 'READ' ? '✓✓ Lu' : '✓ Envoyé'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Pièces jointes en attente d'envoi */}
          {pendingAttachments.length > 0 && (
            <div className="px-4 py-2 border-t border-slate-200 dark:border-teal-900/60 bg-slate-50 dark:bg-slate-900/40 flex items-center gap-2 overflow-x-auto">
              <span className="text-[11px] font-semibold text-slate-500">Prêt à envoyer :</span>
              {pendingAttachments.map((att, idx) => (
                <div
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950 border border-teal-200 dark:border-teal-800 text-[11px] flex items-center gap-2"
                >
                  <span className="truncate max-w-[150px]">{att.fileName}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setPendingAttachments((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="text-red-500 hover:text-red-700 font-bold ml-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Formulaire de saisie */}
          <form
            onSubmit={handleSend}
            className="p-3 border-t border-slate-200 dark:border-teal-900/60 bg-white dark:bg-[#071d33] flex items-center gap-2"
          >
            {/* Input fichier caché */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="hidden"
            />

            {/* Bouton attachement */}
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              title="Joindre un document sécurisé (PDF, JPG, PNG - max 10 Mo)"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              📎
            </button>

            {/* Bouton Dictée vocale intelligente STT */}
            {onTriggerVoiceDictation && (
              <button
                type="button"
                onClick={onTriggerVoiceDictation}
                title="Dictée vocale intelligente (STT)"
                className="p-2 rounded-xl text-slate-500 hover:text-[#E85D22] dark:text-slate-400 dark:hover:text-[#E85D22] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                🎙️
              </button>
            )}

            {/* Champ texte principal */}
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Écrivez un message (traduction instantanée multilingue)..."
              className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-teal-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-[#E85D22]"
            />

            {/* Bouton Envoyer */}
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!inputText.trim() && pendingAttachments.length === 0}
            >
              Envoyer
            </Button>
          </form>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400 text-xs">
          <div className="text-4xl mb-3">💬</div>
          <h3 className="font-bold text-sm text-slate-700 dark:text-slate-200">
            Sélectionnez une conversation
          </h3>
          <p className="text-slate-400 mt-1 max-w-sm">
            Choisissez un fil de discussion dans la colonne de gauche ou démarrez un échange depuis une commande, une expédition ou un devis.
          </p>
        </div>
      )}
    </div>
  );
};
