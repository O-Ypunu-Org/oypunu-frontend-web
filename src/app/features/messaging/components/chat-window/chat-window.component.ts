import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  OnChanges,
  SimpleChanges,
  HostListener,
  NgZone,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessagingService } from '../../../../core/services/messaging.service';
import { AuthService } from '../../../../core/services/auth.service';
import { WebSocketService } from '../../../../core/services/websocket.service';
import {
  Conversation,
  Message,
  MessagesResponse,
} from '../../../../core/models/message';
import { Subject, Subscription, debounceTime } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-chat-window',
  standalone: false,
  templateUrl: './chat-window.component.html',
  styleUrls: ['./chat-window.component.scss'],
})
export class ChatWindowComponent
  implements OnInit, OnDestroy, AfterViewChecked, OnChanges
{
  @Input() conversation: Conversation | null = null;
  @ViewChild('messagesContainer', { static: false })
  messagesContainer!: ElementRef;
  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef;

  messageForm: FormGroup;
  messages: Message[] = [];
  loading = false;
  loadingMessages = false;
  sendingMessage = false;
  error: string | null = null;
  currentUserId: string | null = null;
  typingUsers: string[] = [];
  isTyping: { [userId: string]: boolean } = {};

  // Online status
  onlineUsers: Set<string> = new Set();

  // Image upload
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  isUploadingImage = false;

  // Voice recording
  isRecording = false;
  recordingDuration = 0;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private recordingTimer: any;

  // Audio playback
  playingAudioId: string | null = null;
  audioElapsed: Record<string, number> = {};
  private _audioEl: HTMLAudioElement | null = null;
  private _waveformCache = new Map<string, number[]>();

  // Lightbox
  lightboxUrl: string | null = null;

  // Message actions
  activeMenuMessageId: string | null = null;
  showReactionPickerForId: string | null = null;
  editingMessageId: string | null = null;
  editContent = '';
  reactionDetailMessageId: string | null = null;

  private shouldScrollToBottom = false;
  private subscriptions: Subscription = new Subscription();
  private destroy$ = new Subject<void>();
  private typingTimer: any;

  readonly REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡', '🔥', '👏'];

  constructor(
    private fb: FormBuilder,
    private messagingService: MessagingService,
    private authService: AuthService,
    private webSocketService: WebSocketService,
    private ngZone: NgZone
  ) {
    this.messageForm = this.fb.group({
      content: ['', [Validators.maxLength(1000)]],
    });
  }

  ngOnInit(): void {
    this.currentUserId = this.authService.getCurrentUserId();
    this.setupWebSocketListeners();
    this.setupTypingDetection();

    if (this.conversation) {
      this.loadMessages();
      this.joinConversation();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['conversation']) {
      const prev = changes['conversation'].previousValue;
      if (prev?._id) {
        this.webSocketService.leaveConversation(prev._id);
      }
      if (this.conversation) {
        this.activeMenuMessageId = null;
        this.showReactionPickerForId = null;
        this.reactionDetailMessageId = null;
        this.editingMessageId = null;
        this.cancelRecording();
        this._stopAudio();
        this.clearSelectedFile();
        this.loadMessages();
        this.joinConversation();
      }
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy(): void {
    if (this.conversation?._id) {
      this.webSocketService.leaveConversation(this.conversation._id);
      this.webSocketService.stopTyping(this.conversation._id);
    }
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
    }
    this.cancelRecording();
    this._stopAudio();
    this.destroy$.next();
    this.destroy$.complete();
    this.subscriptions.unsubscribe();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.msg-action-container')) {
      this.activeMenuMessageId = null;
      this.showReactionPickerForId = null;
      this.reactionDetailMessageId = null;
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.lightboxUrl) {
      this.lightboxUrl = null;
    }
  }

  // ===== LIGHTBOX =====

  openLightbox(url: string): void {
    this.lightboxUrl = url;
  }

  closeLightbox(): void {
    this.lightboxUrl = null;
  }

  // ===== WEBSOCKET =====

  private setupWebSocketListeners(): void {
    this.webSocketService.newMessage$
      .pipe(takeUntil(this.destroy$))
      .subscribe((message: Message) => {
        if (
          this.conversation &&
          (message.conversationId === this.conversation._id ||
            this.isMessageForCurrentConversation(message))
        ) {
          if (!this.messages.find((m) => m._id === message._id)) {
            this.messages.push(message);
            this.shouldScrollToBottom = true;
          }
        }
      });

    this.webSocketService.typingStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe((status) => {
        if (
          this.conversation &&
          status.conversationId === this.conversation._id
        ) {
          if (status.isTyping && status.userId !== this.currentUserId) {
            this.isTyping[status.userId] = true;
            if (!this.typingUsers.includes(status.username)) {
              this.typingUsers.push(status.username);
            }
          } else {
            delete this.isTyping[status.userId];
            this.typingUsers = this.typingUsers.filter(
              (u) => u !== status.username
            );
          }
        }
      });

    this.webSocketService.userStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe((status) => {
        if (status.isOnline) {
          this.onlineUsers.add(status.userId);
        } else {
          this.onlineUsers.delete(status.userId);
        }
      });

    this.webSocketService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe((error) => {
        this.error = error;
      });
  }

  private setupTypingDetection(): void {
    const contentControl = this.messageForm.get('content');
    if (!contentControl) return;

    contentControl.valueChanges
      .pipe(debounceTime(1000), takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.conversation?._id) {
          this.webSocketService.stopTyping(this.conversation._id);
        }
      });

    contentControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((value: string) => {
      if (this.conversation?._id && value?.trim()) {
        this.webSocketService.startTyping(this.conversation._id);
        clearTimeout(this.typingTimer);
        this.typingTimer = setTimeout(() => {
          if (this.conversation?._id) {
            this.webSocketService.stopTyping(this.conversation._id);
          }
        }, 3000);
      }
    });
  }

  private joinConversation(): void {
    if (this.conversation?._id) {
      this.webSocketService.joinConversation(this.conversation._id);
    }
  }

  private isMessageForCurrentConversation(message: Message): boolean {
    if (!this.conversation) return false;
    return (
      this.conversation.participants.some((p) => p.id === message.senderId.id) &&
      this.conversation.participants.some((p) => p.id === message.receiverId.id)
    );
  }

  // ===== LOAD MESSAGES =====

  loadMessages(): void {
    if (!this.conversation?._id) {
      this.messages = [];
      return;
    }

    this.loadingMessages = true;
    this.error = null;

    const sub = this.messagingService
      .getMessages(this.conversation._id, 1, 50)
      .subscribe({
        next: (response: MessagesResponse) => {
          // Backend returns desc (newest first) — reverse for chronological display
          this.messages = [...response.messages].reverse();
          this.loadingMessages = false;
          this.markMessagesAsRead();
          this.shouldScrollToBottom = true;
        },
        error: (error) => {
          this.error = error.message;
          this.loadingMessages = false;
        },
      });

    this.subscriptions.add(sub);
  }

  markMessagesAsRead(): void {
    if (!this.conversation?._id) return;
    const sub = this.messagingService
      .markMessagesAsRead(this.conversation._id)
      .subscribe({ error: () => {} });
    this.subscriptions.add(sub);
  }

  // ===== SEND MESSAGE =====

  sendMessage(): void {
    if (!this.conversation || this.sendingMessage) return;

    if (this.selectedFile) {
      this.sendImageMessage();
      return;
    }

    const content = this.messageForm.get('content')?.value?.trim();
    if (!content) return;

    const otherParticipant = this.getOtherParticipant();
    if (!otherParticipant) return;

    this.sendingMessage = true;
    this.error = null;

    if (this.conversation._id) {
      this.webSocketService.stopTyping(this.conversation._id);
    }

    if (!this.conversation._id || !this.webSocketService.isConnected()) {
      const sub = this.messagingService
        .sendMessage({
          receiverId: otherParticipant.id,
          content,
          messageType: 'text',
        })
        .subscribe({
          next: (response) => {
            if (!this.messages.find((m) => m._id === response.data._id)) {
              this.messages.push(response.data);
            }
            if (!this.conversation!._id && response.data.conversationId) {
              this.conversation!._id = response.data.conversationId;
              this.joinConversation();
            }
            this.messageForm.reset();
            this.sendingMessage = false;
            this.shouldScrollToBottom = true;
          },
          error: (error) => {
            this.error = error.message;
            this.sendingMessage = false;
          },
        });
      this.subscriptions.add(sub);
    } else {
      this.webSocketService.sendMessage({
        receiverId: otherParticipant.id,
        content,
        messageType: 'text',
      });
      this.messageForm.reset();
      this.sendingMessage = false;
    }
  }

  // ===== IMAGE UPLOAD =====

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    if (!file.type.startsWith('image/')) {
      this.error = 'Seules les images sont acceptées';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.error = "L'image ne peut pas dépasser 10 Mo";
      return;
    }

    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.imagePreview = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  clearSelectedFile(): void {
    this.selectedFile = null;
    this.imagePreview = null;
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  private sendImageMessage(): void {
    if (!this.selectedFile || !this.conversation) return;

    const otherParticipant = this.getOtherParticipant();
    if (!otherParticipant) return;

    const caption = this.messageForm.get('content')?.value?.trim() || '';

    this.sendingMessage = true;
    this.isUploadingImage = true;
    this.error = null;

    const formData = new FormData();
    formData.append('files', this.selectedFile);
    formData.append('recipientId', otherParticipant.id);
    if (this.conversation._id) {
      formData.append('conversationId', this.conversation._id);
    }
    if (caption) formData.append('content', caption);
    formData.append('messageType', 'image');

    const sub = this.messagingService.sendMediaMessage(formData).subscribe({
      next: (response) => {
        const msg = response?.data?.message || response?.data;
        if (msg && !this.messages.find((m) => m._id === msg._id)) {
          this.messages.push(msg);
        }
        this.messageForm.reset();
        this.clearSelectedFile();
        this.sendingMessage = false;
        this.isUploadingImage = false;
        this.shouldScrollToBottom = true;
      },
      error: (error) => {
        this.error = error.error?.message || "Erreur lors de l'envoi de l'image";
        this.sendingMessage = false;
        this.isUploadingImage = false;
      },
    });
    this.subscriptions.add(sub);
  }

  // ===== MESSAGE ACTIONS =====

  toggleMessageMenu(messageId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.showReactionPickerForId = null;
    this.activeMenuMessageId =
      this.activeMenuMessageId === messageId ? null : messageId;
  }

  toggleReactionPicker(messageId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.activeMenuMessageId = null;
    this.reactionDetailMessageId = null;
    this.showReactionPickerForId =
      this.showReactionPickerForId === messageId ? null : messageId;
  }

  openReactionDetail(messageId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.activeMenuMessageId = null;
    this.showReactionPickerForId = null;
    this.reactionDetailMessageId =
      this.reactionDetailMessageId === messageId ? null : messageId;
  }

  closeReactionDetail(): void {
    this.reactionDetailMessageId = null;
  }

  getReactionEntries(message: Message): { emoji: string; label: string; isMe: boolean }[] {
    if (!message?.reactions?.length) return [];
    const other = this.getOtherParticipant();
    return message.reactions.map((r) => ({
      emoji: r.emoji,
      label: r.userId === this.currentUserId ? 'Vous' : (other?.username || 'Utilisateur'),
      isMe: r.userId === this.currentUserId,
    }));
  }

  reactToMessage(messageId: string, reaction: string): void {
    this.showReactionPickerForId = null;
    const userReaction = this.getUserReaction(
      this.messages.find((m) => m._id === messageId)!
    );

    if (userReaction === reaction) {
      this.removeReaction(messageId);
      return;
    }

    const sub = this.messagingService.reactToMessage(messageId, reaction).subscribe({
      next: (response) => {
        const msg = this.messages.find((m) => m._id === messageId);
        if (msg && response?.data?.reactions) {
          msg.reactions = response.data.reactions;
        }
      },
      error: () => {},
    });
    this.subscriptions.add(sub);
  }

  removeReaction(messageId: string): void {
    const sub = this.messagingService.removeReaction(messageId).subscribe({
      next: (response) => {
        const msg = this.messages.find((m) => m._id === messageId);
        if (msg && response?.data?.reactions !== undefined) {
          msg.reactions = response.data.reactions;
        }
      },
      error: () => {},
    });
    this.subscriptions.add(sub);
  }

  getUserReaction(message: Message): string | null {
    if (!message?.reactions) return null;
    return (
      message.reactions.find((r) => r.userId === this.currentUserId)?.emoji ||
      null
    );
  }

  getReactionGroups(
    message: Message
  ): { emoji: string; count: number; includesMe: boolean }[] {
    if (!message?.reactions?.length) return [];
    const groups: { [emoji: string]: { count: number; includesMe: boolean } } = {};
    for (const r of message.reactions) {
      if (!groups[r.emoji]) groups[r.emoji] = { count: 0, includesMe: false };
      groups[r.emoji].count++;
      if (r.userId === this.currentUserId) groups[r.emoji].includesMe = true;
    }
    return Object.entries(groups).map(([emoji, data]) => ({
      emoji,
      ...data,
    }));
  }

  deleteMessage(messageId: string): void {
    this.activeMenuMessageId = null;
    const sub = this.messagingService.deleteMessage(messageId).subscribe({
      next: () => {
        const idx = this.messages.findIndex((m) => m._id === messageId);
        if (idx !== -1) {
          this.messages[idx] = {
            ...this.messages[idx],
            isDeleted: true,
            content: '',
          };
        }
      },
      error: () => {},
    });
    this.subscriptions.add(sub);
  }

  startEditMessage(message: Message): void {
    this.activeMenuMessageId = null;
    this.editingMessageId = message._id;
    this.editContent = message.content;
  }

  cancelEdit(): void {
    this.editingMessageId = null;
    this.editContent = '';
  }

  saveEdit(): void {
    if (!this.editingMessageId || !this.editContent.trim()) return;
    const messageId = this.editingMessageId;
    const content = this.editContent.trim();

    const sub = this.messagingService.editMessage(messageId, content).subscribe({
      next: () => {
        const msg = this.messages.find((m) => m._id === messageId);
        if (msg) {
          msg.content = content;
          msg.isEdited = true;
        }
        this.editingMessageId = null;
        this.editContent = '';
      },
      error: () => {
        this.editingMessageId = null;
      },
    });
    this.subscriptions.add(sub);
  }

  // ===== UI HELPERS =====

  isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }

  getMediaUrl(message: Message): string | null {
    return (
      message.mediaUrl ||
      (message.metadata?.['imageUrl'] as string) ||
      null
    );
  }

  getAudioUrl(message: Message): string | null {
    return (message.metadata?.['audioUrl'] as string) || null;
  }

  getAudioDuration(message: Message): number {
    return (message.metadata?.['audioDuration'] as number) || 0;
  }

  getOtherParticipant(): any {
    if (!this.conversation || !this.currentUserId) return null;
    return (
      this.conversation.participants.find((p) => p.id !== this.currentUserId) ||
      this.conversation.participants[0]
    );
  }

  isMyMessage(message: Message): boolean {
    return message.senderId.id === this.currentUserId;
  }

  isLastInGroup(index: number): boolean {
    if (index === this.messages.length - 1) return true;
    const curr = this.messages[index];
    const next = this.messages[index + 1];
    return curr.senderId?.id !== next.senderId?.id;
  }

  shouldShowDateSeparator(index: number): boolean {
    if (index === 0) return true;
    const curr = new Date(this.messages[index].createdAt);
    const prev = new Date(this.messages[index - 1].createdAt);
    return (
      curr.getFullYear() !== prev.getFullYear() ||
      curr.getMonth() !== prev.getMonth() ||
      curr.getDate() !== prev.getDate()
    );
  }

  getDateSeparatorLabel(date: Date): string {
    const msgDate = new Date(date);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msgDay = new Date(msgDate.getFullYear(), msgDate.getMonth(), msgDate.getDate());
    const diffDays = Math.round((today.getTime() - msgDay.getTime()) / 86400000);

    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) {
      const day = msgDate.toLocaleDateString('fr-FR', { weekday: 'long' });
      return day.charAt(0).toUpperCase() + day.slice(1);
    }
    const label = msgDate.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  formatMessageDate(date: Date): string {
    return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  getTypingText(): string {
    if (this.typingUsers.length === 0) return '';
    if (this.typingUsers.length === 1) return `${this.typingUsers[0]} tape...`;
    if (this.typingUsers.length === 2)
      return `${this.typingUsers[0]} et ${this.typingUsers[1]} tapent...`;
    return `${this.typingUsers[0]} et ${this.typingUsers.length - 1} autres tapent...`;
  }

  get hasInputContent(): boolean {
    return !!(this.messageForm.get('content')?.value?.trim() || this.selectedFile);
  }

  async onMicClick(): Promise<void> {
    if (this.isRecording) return;
    this.error = null;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];
      this.recordingDuration = 0;
      this.isRecording = true;

      const mimeType = this._getSupportedMimeType();
      this.mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      this.mediaRecorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) this.audioChunks.push(e.data);
      };
      this.mediaRecorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        this.ngZone.run(() => this._sendAudioMessage());
      };
      this.mediaRecorder.start();

      this.recordingTimer = setInterval(() => {
        this.recordingDuration++;
      }, 1000);
    } catch {
      this.error = 'Accès au microphone refusé. Vérifiez les permissions de votre navigateur.';
    }
  }

  cancelRecording(): void {
    if (this.mediaRecorder) {
      this.mediaRecorder.onstop = null;
      if (this.mediaRecorder.state !== 'inactive') {
        try { this.mediaRecorder.stop(); } catch { /* ignore */ }
      }
      this.mediaRecorder = null;
    }
    clearInterval(this.recordingTimer);
    this.isRecording = false;
    this.recordingDuration = 0;
    this.audioChunks = [];
  }

  sendRecording(): void {
    if (!this.mediaRecorder || !this.isRecording) return;
    clearInterval(this.recordingTimer);
    this.isRecording = false;
    if (this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop(); // triggers onstop → _sendAudioMessage
    }
  }

  private _getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ];
    return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
  }

  private _sendAudioMessage(): void {
    if (!this.audioChunks.length || !this.conversation) return;
    const mimeType = this._getSupportedMimeType() || 'audio/webm';
    const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
    const blob = new Blob(this.audioChunks, { type: mimeType });
    const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: mimeType });
    const otherParticipant = this.getOtherParticipant();
    if (!otherParticipant) return;

    const duration = this.recordingDuration;
    const formData = new FormData();
    formData.append('files', file);
    formData.append('recipientId', otherParticipant.id);
    if (this.conversation._id) formData.append('conversationId', this.conversation._id);
    formData.append('messageType', 'audio');
    formData.append('audioDuration', String(duration));

    this.sendingMessage = true;
    const sub = this.messagingService.sendMediaMessage(formData).subscribe({
      next: (response) => {
        const msg = response?.data?.message || response?.data;
        if (msg && !this.messages.find((m) => m._id === msg._id)) {
          this.messages.push(msg);
        }
        this.audioChunks = [];
        this.sendingMessage = false;
        this.shouldScrollToBottom = true;
      },
      error: () => {
        this.error = "Erreur lors de l'envoi du message vocal";
        this.sendingMessage = false;
      },
    });
    this.subscriptions.add(sub);
  }

  // ===== AUDIO PLAYBACK =====

  toggleAudio(message: Message): void {
    const url = this.getAudioUrl(message);
    if (!url) return;

    if (this._audioEl && this.playingAudioId === message._id) {
      this._audioEl.pause();
      this.playingAudioId = null;
      return;
    }

    if (this._audioEl) {
      this._audioEl.pause();
      this._audioEl.src = '';
    }

    this.playingAudioId = message._id;
    this._audioEl = new Audio(url);
    this._audioEl.currentTime = this.audioElapsed[message._id] || 0;

    this._audioEl.ontimeupdate = () => {
      this.ngZone.run(() => {
        this.audioElapsed[message._id] = Math.floor(this._audioEl!.currentTime);
      });
    };
    this._audioEl.onended = () => {
      this.ngZone.run(() => {
        this.playingAudioId = null;
        delete this.audioElapsed[message._id];
      });
    };
    this._audioEl.play().catch(() => {
      this.ngZone.run(() => { this.playingAudioId = null; });
    });
  }

  private _stopAudio(): void {
    if (this._audioEl) {
      this._audioEl.pause();
      this._audioEl.src = '';
      this._audioEl = null;
    }
    this.playingAudioId = null;
    this.audioElapsed = {};
  }

  getAudioProgress(message: Message): number {
    const duration = this.getAudioDuration(message);
    if (!duration) return 0;
    return Math.min(100, ((this.audioElapsed[message._id] || 0) / duration) * 100);
  }

  getBarPlayed(index: number, totalBars: number, message: Message): boolean {
    return (index / totalBars * 100) <= this.getAudioProgress(message);
  }

  formatAudioTime(seconds: number): string {
    const s = Math.floor(seconds);
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  }

  getWaveformBars(messageId: string): number[] {
    if (this._waveformCache.has(messageId)) return this._waveformCache.get(messageId)!;
    const result: number[] = [];
    for (let i = 0; i < 30; i++) {
      const c = messageId.charCodeAt(i % messageId.length);
      result.push(4 + ((c * (i + 1) * 7) % 20));
    }
    this._waveformCache.set(messageId, result);
    return result;
  }

  formatRecordingDuration(seconds: number): string {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  onSubmit(): void {
    this.sendMessage();
  }

  onEnterKeydown(event: KeyboardEvent): void {
    if (!event.shiftKey) {
      event.preventDefault();
      this.onSubmit();
    }
  }

  onEditEnterKeydown(event: KeyboardEvent): void {
    if (!event.shiftKey) {
      event.preventDefault();
      this.saveEdit();
    }
    if (event.key === 'Escape') {
      this.cancelEdit();
    }
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop =
          this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (err) {}
  }
}
