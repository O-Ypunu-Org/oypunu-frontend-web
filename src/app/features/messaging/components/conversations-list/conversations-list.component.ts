import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { MessagingService } from '../../../../core/services/messaging.service';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { Conversation } from '../../../../core/models/message';
import { AuthService } from '../../../../core/services/auth.service';
import { User } from '../../../../core/models/user';

@Component({
  selector: 'app-conversations-list',
  standalone: false,
  templateUrl: './conversations-list.component.html',
  styleUrls: ['./conversations-list.component.scss'],
})
export class ConversationsListComponent implements OnInit, OnDestroy {
  @Output() conversationSelected = new EventEmitter<Conversation>();

  conversations: Conversation[] = [];
  filteredConversations: Conversation[] = [];
  loading = false;
  error: string | null = null;
  currentUserId: string | null = null;
  currentUsername: string | null = null;
  onlineUsers: Set<string> = new Set();
  isWebSocketConnected = false;

  // Propriétés pour les filtres et la recherche
  searchControl = new FormControl('');
  showFiltersMenu = false;
  currentFilter: 'all' | 'unread' | 'favorites' | 'contacts' | 'groups' = 'all';

  // PHASE 2-3: Subject pour gérer le cleanup des subscriptions
  private destroy$ = new Subject<void>();

  // Propriétés pour le modal de nouvelle conversation
  showNewConversationModal = false;

  constructor(
    private messagingService: MessagingService,
    private webSocketService: WebSocketService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.authService.getCurrentUserId();
    this.currentUsername = this.authService.getCurrentUser()?.username || null;
    this.loadConversations();
    this.setupWebSocketListeners();
    this.setupSearchListener();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Charger les conversations de l'utilisateur
   */
  loadConversations(): void {
    this.loading = true;
    this.error = null;

    this.messagingService.getUserConversations().subscribe({
      next: (conversations) => {
        this.conversations = conversations;
        this.filterConversations();
        this.loading = false;
      },
      error: (error) => {
        this.error = error.message;
        this.loading = false;
      },
    });
  }

  /**
   * Filtrer les conversations selon le filtre actuel et la recherche
   */
  filterConversations(): void {
    let filtered = [...this.conversations];
    const searchTerm = this.searchControl.value?.toLowerCase() || '';

    // Filtrage par recherche
    if (searchTerm) {
      filtered = filtered.filter((conversation) => {
        const otherParticipant = this.getOtherParticipant(conversation);
        return (
          otherParticipant?.username?.toLowerCase().includes(searchTerm) ||
          conversation.lastMessage?.content?.toLowerCase().includes(searchTerm)
        );
      });
    }

    // Filtrage par type
    switch (this.currentFilter) {
      case 'unread':
        filtered = filtered.filter(
          (conv) => conv.lastMessage && !conv.lastMessage.isRead
        );
        break;
      case 'favorites':
        // TODO: Implémenter la logique des favoris
        break;
      case 'contacts':
        // TODO: Implémenter la logique des contacts
        break;
      case 'groups':
        // TODO: Implémenter la logique des groupes
        break;
      case 'all':
      default:
        // Afficher toutes les conversations
        break;
    }

    this.filteredConversations = filtered;
  }

  /**
   * Basculer l'affichage du menu des filtres
   */
  toggleFiltersMenu(): void {
    this.showFiltersMenu = !this.showFiltersMenu;
  }

  /**
   * Appliquer un filtre
   */
  applyFilter(
    filter: 'all' | 'unread' | 'favorites' | 'contacts' | 'groups'
  ): void {
    this.currentFilter = filter;
    this.filterConversations();
    this.showFiltersMenu = false;
  }

  /**
   * Sélectionner une conversation
   */
  selectConversation(conversation: Conversation): void {
    this.conversationSelected.emit(conversation);
  }

  /**
   * Obtenir l'autre participant de la conversation
   */
  getOtherParticipant(conversation: Conversation): any {
    if (!this.currentUserId) {
      // Si on n'a pas l'ID de l'utilisateur connecté, prendre le premier participant
      return conversation.participants[0];
    }

    // Retourner le participant qui n'est pas l'utilisateur connecté
    return (
      conversation.participants.find(
        (participant) => participant.id !== this.currentUserId
      ) || conversation.participants[0]
    );
  }

  isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }

  /**
   * Formater la date du dernier message
   */
  formatLastMessageDate(date: Date): string {
    const now = new Date();
    const messageDate = new Date(date);

    // Comparer les jours calendaires (normalisés à minuit local)
    const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msgDay = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
    const diffDays = Math.round((nowDay.getTime() - msgDay.getTime()) / 86400000);

    // Aujourd'hui → HH:MM
    if (diffDays === 0) {
      return messageDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }

    // Hier
    if (diffDays === 1) return 'hier';

    // Cette semaine (2–6 jours) → jour court
    if (diffDays < 7) {
      const day = messageDate.toLocaleDateString('fr-FR', { weekday: 'short' });
      return day.charAt(0).toUpperCase() + day.slice(1);
    }

    // Plus d'une semaine → DD/MM/YYYY
    return messageDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  /**
   * Tronquer le contenu du message
   */
  truncateMessage(content: string, maxLength: number = 50): string {
    if (content.length <= maxLength) {
      return content;
    }
    return content.substring(0, maxLength) + '...';
  }

  openNewConversationModal() {
    this.showNewConversationModal = true;
  }

  closeNewConversationModal() {
    this.showNewConversationModal = false;
  }

  onUserSelected(user: User) {
    this.closeNewConversationModal();

    this.messagingService.findConversationWithUser(user.id).subscribe({
      next: (existingConversation) => {
        if (existingConversation) {
          this.selectConversation(existingConversation);
        } else {
          const currentUser = this.authService.getCurrentUser();

          // Sinon, créer une nouvelle conversation temporaire
          const newConversation: Conversation = {
            _id: '', // Sera créé lors du premier message
            participants: currentUser ? [currentUser, user] : [user],
            lastMessage: undefined,
            lastActivity: new Date(),
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          // Ajouter immédiatement à la liste locale
          this.conversations.unshift(newConversation);
          this.filterConversations();

          this.selectConversation(newConversation);
        }
      },
      error: () => {
        this.error = 'Erreur lors de la recherche de conversation';
      },
    });
  }

  private setupWebSocketListeners(): void {
    this.webSocketService.userStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (status) => {
          if (status.isOnline) {
            this.onlineUsers.add(status.userId);
          } else {
            this.onlineUsers.delete(status.userId);
          }
        },
      });

    this.webSocketService.connectionStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (connected) => {
          this.isWebSocketConnected = connected;
        },
      });
  }

  /**
   * Configurer l'écouteur de recherche
   * PHASE 2-3: Méthode corrigée avec protection contre memory leaks
   */
  private setupSearchListener(): void {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.filterConversations();
      });
  }
}
