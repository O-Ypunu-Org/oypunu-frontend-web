/**
 * @fileoverview Composant modal Content Detail - SOLID Principles
 *
 * Composant modal pour afficher les détails complets d'un contenu à modérer.
 * Gère l'affichage dynamique selon le type de contenu.
 *
 * @author Équipe O'Ypunu Frontend
 * @version 1.0.0
 * @since 2025-01-01
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
} from '@angular/core';

import {
  ModerableContentType,
  ReportReason,
  ReportSeverity,
  ReportStatus,
  ModerableContent,
  PendingWord,
  PendingCommunityPost,
  ReportedPrivateMessage,
  ReportedUserProfile,
  ReportedComment,
  ReportedMediaContent,
  AIFlaggedContent,
  PendingLanguage,
  PendingCategory,
} from '../../models/admin.models';

/**
 * Interface pour les actions de modération sur le contenu détaillé
 */
export interface ContentModerationAction {
  readonly type: 'approve' | 'reject' | 'escalate';
  readonly content: ModerableContent;
  readonly reason?: string;
  readonly notes?: string;
}

/**
 * Composant ContentDetailModal - Single Responsibility Principle
 *
 * Responsabilité unique : Afficher les détails complets d'un contenu à modérer
 */
@Component({
  selector: 'app-content-detail-modal',
  standalone: false,
  templateUrl: './content-detail-modal.component.html',
  styleUrls: ['./content-detail-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContentDetailModalComponent implements OnInit, OnDestroy {
  // ===== INPUTS =====

  @Input() isVisible: boolean = false;
  @Input() content: ModerableContent | null = null;
  @Input() isLoading: boolean = false;

  // ===== OUTPUTS =====

  @Output() actionTaken = new EventEmitter<ContentModerationAction>();
  @Output() modalClosed = new EventEmitter<void>();

  // ===== PROPRIÉTÉS INTERNES =====

  public showReasonInput: boolean = false;
  public actionReason: string = '';
  public actionNotes: string = '';
  public selectedAction: ContentModerationAction['type'] | null = null;

  // Énums exposés au template
  public readonly ModerableContentType = ModerableContentType;
  public readonly ReportReason = ReportReason;
  public readonly ReportSeverity = ReportSeverity;
  public readonly ReportStatus = ReportStatus;

  // ===== LIFECYCLE HOOKS =====

  ngOnInit(): void {
    // Écouter la touche Échap pour fermer la modal
    document.addEventListener('keydown', this.onKeyDown.bind(this));
  }

  ngOnDestroy(): void {
    document.removeEventListener('keydown', this.onKeyDown.bind(this));
  }

  // ===== MÉTHODES PUBLIQUES =====

  /**
   * Fermeture de la modal
   */
  public onClose(): void {
    this.resetForm();
    this.modalClosed.emit();
  }

  /**
   * Gestion des actions de modération
   */
  public onAction(actionType: ContentModerationAction['type']): void {
    if (!this.content) return;

    // Certaines actions nécessitent une raison
    if (this.requiresReason(actionType) && !this.actionReason.trim()) {
      this.selectedAction = actionType;
      this.showReasonInput = true;
      return;
    }

    const action: ContentModerationAction = {
      type: actionType,
      content: this.content,
      reason: this.actionReason.trim() || undefined,
      notes: this.actionNotes.trim() || undefined,
    };

    this.actionTaken.emit(action);
    this.onClose();
  }

  /**
   * Confirmation d'une action avec raison
   */
  public onConfirmActionWithReason(): void {
    if (this.selectedAction && this.actionReason.trim()) {
      this.onAction(this.selectedAction);
    }
  }

  /**
   * Annulation de la saisie de raison
   */
  public onCancelReason(): void {
    this.resetForm();
  }

  /**
   * Clic sur le backdrop pour fermer
   */
  public onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }

  // ===== MÉTHODES DE VÉRIFICATION DE TYPE =====

  /**
   * Vérifie si le contenu est un mot en attente
   */
  public isPendingWord(content: ModerableContent): content is PendingWord {
    return (
      'word' in content && 'definition' in content && 'meanings' in content
    );
  }

  /**
   * Extrait les URLs audio d'un mot en attente (format Map objet ou tableau)
   */
  public getWordAudioUrls(word: PendingWord): { label: string; url: string }[] {
    const af = word.audioFiles;
    if (!af || typeof af !== 'object') return [];
    const result: { label: string; url: string }[] = [];
    if (Array.isArray(af)) {
      for (const item of af) {
        if (item?.url) {
          const label = [item.language, item.accent].filter(Boolean).join('/') || 'audio';
          result.push({ label, url: item.url });
        }
      }
    } else {
      for (const v of Object.values(af as Record<string, any>)) {
        if (v?.url) {
          const label = [v.language, v.accent].filter(Boolean).join('/') || 'audio';
          result.push({ label, url: v.url });
        }
      }
    }
    return result;
  }

  /**
   * Vérifie si le contenu est un post de communauté
   */
  public isPendingCommunityPost(
    content: ModerableContent
  ): content is PendingCommunityPost {
    return 'title' in content && 'community' in content && 'author' in content;
  }

  /**
   * Vérifie si le contenu est un message privé signalé
   */
  public isReportedPrivateMessage(
    content: ModerableContent
  ): content is ReportedPrivateMessage {
    return (
      'sender' in content &&
      'recipient' in content &&
      'conversationId' in content
    );
  }

  /**
   * Vérifie si le contenu est un profil utilisateur signalé
   */
  public isReportedUserProfile(
    content: ModerableContent
  ): content is ReportedUserProfile {
    return 'user' in content && 'reportedFields' in content;
  }

  /**
   * Vérifie si le contenu est un commentaire signalé
   */
  public isReportedComment(
    content: ModerableContent
  ): content is ReportedComment {
    return (
      'targetType' in content &&
      'targetId' in content &&
      'parentComment' in content
    );
  }

  /**
   * Vérifie si le contenu est du multimédia signalé
   */
  public isReportedMediaContent(
    content: ModerableContent
  ): content is ReportedMediaContent {
    return 'mediaType' in content && 'filename' in content && 'url' in content;
  }

  /**
   * Vérifie si le contenu est une langue en attente
   */
  public isPendingLanguage(
    content: ModerableContent
  ): content is PendingLanguage {
    return (
      'name' in content &&
      'systemStatus' in content &&
      !('languageId' in content) &&
      !('word' in content) &&
      !('username' in content) &&
      !('title' in content) &&
      !('sender' in content) &&
      !('user' in content) &&
      !('filename' in content)
    );
  }

  /**
   * Vérifie si le contenu est une catégorie en attente
   */
  public isPendingCategory(
    content: ModerableContent
  ): content is PendingCategory {
    return (
      'name' in content &&
      'languageId' in content &&
      'systemStatus' in content &&
      !('region' in content) &&
      !('word' in content)
    );
  }

  /**
   * Type guard pour les demandes de contributeur
   */
  public isContributorRequest(content: ModerableContent): boolean {
    return (
      'username' in content &&
      'motivation' in content &&
      'email' in content &&
      'status' in content &&
      ('priority' in content || 'reviewCount' in content)
    );
  }

  /**
   * Vérifie si le contenu est auto-détecté par IA
   */
  public isAIFlaggedContent(
    content: ModerableContent
  ): content is AIFlaggedContent {
    return (
      'aiModel' in content &&
      'confidence' in content &&
      'flaggedReasons' in content
    );
  }

  // ===== MÉTHODES UTILITAIRES =====

  /**
   * Obtient le titre du contenu selon son type
   */
  public getContentTitle(): string {
    if (!this.content) return '';

    if (this.isPendingWord(this.content)) {
      return `Mot : ${this.content.word}`;
    }
    if (this.isPendingLanguage(this.content)) {
      return `Langue : ${this.content.name}`;
    }
    if (this.isPendingCategory(this.content)) {
      return `Catégorie : ${this.content.name}`;
    }
    if (this.isContributorRequest(this.content)) {
      return `Demande de contributeur : ${this.getContributorUsername(this.content)}`;
    }
    if (this.isPendingCommunityPost(this.content)) {
      return `Post : ${this.content.title}`;
    }
    if (this.isReportedPrivateMessage(this.content)) {
      return `Message privé de ${this.content.sender.username}`;
    }
    if (this.isReportedUserProfile(this.content)) {
      return `Profil de ${this.content.user.username}`;
    }
    if (this.isReportedComment(this.content)) {
      return `Commentaire sur ${this.content.targetType}`;
    }
    if (this.isReportedMediaContent(this.content)) {
      return `Média : ${this.content.filename}`;
    }
    if (this.isAIFlaggedContent(this.content)) {
      return `Contenu détecté par IA`;
    }

    return 'Contenu à modérer';
  }

  /**
   * Obtient l'icône appropriée selon le type de contenu
   */
  public getContentIcon(): string {
    if (!this.content) return '📄';

    if (this.isPendingWord(this.content)) return '📝';
    if (this.isPendingLanguage(this.content)) return '🌍';
    if (this.isPendingCategory(this.content)) return '📂';
    if (this.isContributorRequest(this.content)) return '🤝';
    if (this.isPendingCommunityPost(this.content)) return '💬';
    if (this.isReportedPrivateMessage(this.content)) return '📩';
    if (this.isReportedUserProfile(this.content)) return '👤';
    if (this.isReportedComment(this.content)) return '💭';
    if (this.isReportedMediaContent(this.content)) return '🎵';
    if (this.isAIFlaggedContent(this.content)) return '🤖';

    return '📄';
  }

  /**
   * Obtient la couleur de sévérité
   */
  public getSeverityColor(severity: ReportSeverity): string {
    const colors: Record<ReportSeverity, string> = {
      [ReportSeverity.LOW]: 'text-green-400',
      [ReportSeverity.MEDIUM]: 'text-yellow-400',
      [ReportSeverity.HIGH]: 'text-orange-400',
      [ReportSeverity.CRITICAL]: 'text-red-400',
    };
    return colors[severity] || 'text-gray-400';
  }

  /**
   * Obtient le libellé de la raison de signalement
   */
  public getReportReasonLabel(reason: ReportReason): string {
    const labels: Record<ReportReason, string> = {
      [ReportReason.INAPPROPRIATE]: 'Contenu inapproprié',
      [ReportReason.SPAM]: 'Spam',
      [ReportReason.INCORRECT]: 'Information incorrecte',
      [ReportReason.OFFENSIVE]: 'Contenu offensant',
      [ReportReason.COPYRIGHT]: "Violation de droits d'auteur",
      [ReportReason.HARASSMENT]: 'Harcèlement',
      [ReportReason.HATE_SPEECH]: 'Discours de haine',
      [ReportReason.MISINFORMATION]: 'Désinformation',
      [ReportReason.OTHER]: 'Autre',
    };
    return labels[reason] || reason;
  }

  /**
   * Obtient le libellé du statut
   */
  public getStatusLabel(status: ReportStatus): string {
    const labels: Record<ReportStatus, string> = {
      [ReportStatus.PENDING]: 'En attente',
      [ReportStatus.UNDER_REVIEW]: 'En cours de révision',
      [ReportStatus.RESOLVED]: 'Résolu',
      [ReportStatus.DISMISSED]: 'Rejeté',
      [ReportStatus.ESCALATED]: 'Escaladé',
    };
    return labels[status] || status;
  }

  /**
   * Obtient le nom de la langue pour l'affichage
   * Gère les cas où languageId peut être un string ou un objet language populé
   */
  public getLanguageDisplayName(content: ModerableContent): string {
    // Vérifier si c'est un type qui a une propriété language
    if (
      'language' in content &&
      content.language &&
      typeof content.language === 'string'
    ) {
      return content.language;
    }

    // Vérifier si c'est un type qui a une propriété languageId
    if ('languageId' in content && content.languageId) {
      // Si languageId est un objet language populé
      if (typeof content.languageId === 'object') {
        const languageObj = content.languageId as any;
        return (
          languageObj.name ||
          languageObj.nativeName ||
          `ID: ${languageObj._id || languageObj.id}`
        );
      }

      // Si languageId est une chaîne simple
      if (typeof content.languageId === 'string') {
        return `ID: ${content.languageId}`;
      }
    }

    // Cas par défaut
    return 'Langue inconnue';
  }

  /**
   * Formate une date
   */
  public formatDate(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  }

  /**
   * Obtient le type de contenu depuis l'objet
   */
  public getContentTypeFromContent(content: ModerableContent): string {
    if (this.isPendingWord(content)) return 'word';
    if (this.isPendingLanguage(content)) return 'language';
    if (this.isPendingCategory(content)) return 'category';
    if (this.isContributorRequest(content)) return 'contributor_request';
    if (this.isPendingCommunityPost(content)) return 'community_post';
    if (this.isReportedPrivateMessage(content)) return 'private_message';
    if (this.isReportedUserProfile(content)) return 'user_profile';
    if (this.isReportedComment(content)) return 'comment';
    if (this.isReportedMediaContent(content)) return 'media_content';
    if (this.isAIFlaggedContent(content)) return 'ai_flagged';
    return 'unknown';
  }

  /**
   * Obtient la date de création d'un contenu
   */
  public getContentCreationDate(content: ModerableContent): Date {
    if ('submittedAt' in content) return content.submittedAt;
    if ('createdAt' in content) return content.createdAt;
    if ('reportedAt' in content) return content.reportedAt;
    if ('detectedAt' in content) return content.detectedAt;
    return new Date();
  }

  /**
   * Obtient le modérateur d'un contenu
   */
  public getModeratedBy(content: ModerableContent): string | null {
    if ('moderatedBy' in content && content.moderatedBy) {
      return content.moderatedBy.username;
    }
    if ('reviewedBy' in content && content.reviewedBy) {
      return content.reviewedBy.username;
    }
    return null;
  }

  /**
   * Formate la taille d'un fichier
   */
  public formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  // ===== MÉTHODES PRIVÉES =====

  /**
   * Vérifie si une action nécessite une raison
   */
  private requiresReason(actionType: ContentModerationAction['type']): boolean {
    return actionType === 'reject' || actionType === 'escalate';
  }

  /**
   * Réinitialise le formulaire
   */
  private resetForm(): void {
    this.showReasonInput = false;
    this.actionReason = '';
    this.actionNotes = '';
    this.selectedAction = null;
  }

  /**
   * Gestion des touches clavier
   */
  private onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.isVisible) {
      this.onClose();
    }
  }

  // ===== MÉTHODES UTILITAIRES POUR LES LANGUES =====

  /**
   * Obtient le libellé du statut système des langues
   */
  public getSystemStatusLabel(systemStatus: string): string {
    const labels: Record<string, string> = {
      pending_approval: "En attente d'approbation",
      approved: 'Approuvée',
      rejected: 'Rejetée',
    };
    return labels[systemStatus] || systemStatus;
  }

  /**
   * Obtient la classe CSS pour le statut système
   */
  public getSystemStatusClass(systemStatus: string): string {
    const classes: Record<string, string> = {
      pending_approval: 'bg-yellow-600 text-white',
      approved: 'bg-green-600 text-white',
      rejected: 'bg-red-600 text-white',
    };
    return classes[systemStatus] || 'bg-gray-600 text-white';
  }

  /**
   * Obtient la classe CSS pour la couleur de priorité
   */
  public getPriorityColorClass(priority: number): string {
    if (priority >= 8) return 'bg-red-500'; // Haute priorité
    if (priority >= 5) return 'bg-yellow-500'; // Priorité moyenne
    return 'bg-green-500'; // Basse priorité
  }

  /**
   * Formate un nombre avec des séparateurs
   */
  public formatNumber(value: number): string {
    return new Intl.NumberFormat('fr-FR').format(value);
  }

  /**
   * Obtient la classe CSS pour le statut des demandes de contributeur
   */
  public getContributorStatusClass(status: string): string {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'under_review':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  /**
   * Obtient le label du statut des demandes de contributeur
   */
  public getContributorStatusLabel(status: string): string {
    switch (status) {
      case 'pending':
        return 'En attente';
      case 'approved':
        return 'Approuvé';
      case 'rejected':
        return 'Rejeté';
      case 'under_review':
        return 'En révision';
      default:
        return status;
    }
  }

  /**
   * Obtient la classe CSS pour la priorité des demandes de contributeur
   */
  public getContributorPriorityClass(priority: string): string {
    switch (priority) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'urgent':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  /**
   * Méthodes helper pour les demandes de contributeur
   */
  public getContributorProperty(content: ModerableContent, property: string): any {
    return (content as any)[property];
  }

  public getContributorUsername(content: ModerableContent): string {
    return (content as any).username || '';
  }

  public getContributorEmail(content: ModerableContent): string {
    return (content as any).email || '';
  }

  public getContributorLinkedIn(content: ModerableContent): string {
    return (content as any).linkedIn || '';
  }

  public getContributorPortfolio(content: ModerableContent): string {
    return (content as any).portfolio || '';
  }

  public getContributorMotivation(content: ModerableContent): string {
    return (content as any).motivation || '';
  }

  public getContributorExperience(content: ModerableContent): string {
    return (content as any).experience || 'Aucune experience fournie';
  }

  public getContributorLanguages(content: ModerableContent): string {
    return (content as any).languages || 'Non specifiees';
  }

  public getContributorStatus(content: ModerableContent): string {
    return (content as any).status || '';
  }

  public getContributorPriority(content: ModerableContent): string {
    return (content as any).priority || '';
  }

  public getContributorScore(content: ModerableContent): number {
    return (content as any).evaluationScore || 0;
  }

  public getContributorReviewCount(content: ModerableContent): number {
    return (content as any).reviewCount || 0;
  }

  public isContributorCommitted(content: ModerableContent): boolean {
    return (content as any).commitment || false;
  }

  public getEndangermentLabel(status: string | undefined): string {
    const labels: Record<string, string> = {
      safe: 'Sûre',
      vulnerable: 'Vulnérable',
      endangered: 'En danger',
      critically_endangered: 'En danger critique',
      extinct: 'Éteinte',
      unknown: 'Inconnu',
    };
    return status ? (labels[status] ?? status) : 'Non spécifié';
  }

  public getContentAuthorFromProposedBy(content: ModerableContent): string {
    const c = content as any;
    if (c.proposedBy) {
      if (typeof c.proposedBy === 'object') {
        return c.proposedBy.username || c.proposedBy.email || 'Utilisateur non trouvé';
      }
      return `ID: ${c.proposedBy}`;
    }
    return this.getContentAuthor(content);
  }

  public getContributorExpiresAt(content: ModerableContent): Date {
    return new Date((content as any).expiresAt);
  }

  public getContributorJoinDate(content: ModerableContent): Date {
    return new Date((content as any).userJoinDate);
  }

  /**
   * Obtient l'auteur du contenu
   */
  public getContentAuthor(content: ModerableContent): string {
    // Vérifier les demandes de contributeur
    if (this.isContributorRequest(content)) {
      return (content as any).username || (content as any).email || 'Nom utilisateur manquant';
    }

    // Vérifier proposedBy pour les catégories (nom réel de la propriété côté backend)
    if (
      'proposedBy' in content &&
      content.proposedBy &&
      typeof content.proposedBy === 'object'
    ) {
      const user = content.proposedBy as any;
      return user.username || user.email || 'Nom utilisateur manquant';
    }

    // Vérifier submittedBy pour les catégories et langues
    if (
      'submittedBy' in content &&
      content.submittedBy &&
      typeof content.submittedBy === 'object'
    ) {
      return (
        content.submittedBy.username ||
        content.submittedBy.email ||
        'Nom utilisateur manquant'
      );
    }

    // Vérifier createdBy pour les mots
    if (
      'createdBy' in content &&
      content.createdBy &&
      typeof content.createdBy === 'object'
    ) {
      return (
        content.createdBy.username ||
        content.createdBy.email ||
        'Nom utilisateur manquant'
      );
    }

    // Vérifier author pour les posts de communauté
    if (
      'author' in content &&
      content.author &&
      typeof content.author === 'object'
    ) {
      return (
        content.author.username ||
        content.author.email ||
        'Nom utilisateur manquant'
      );
    }

    // Vérifier sender pour les messages privés
    if (
      'sender' in content &&
      content.sender &&
      typeof content.sender === 'object'
    ) {
      return (
        content.sender.username ||
        content.sender.email ||
        'Nom utilisateur manquant'
      );
    }

    // Vérifier uploadedBy pour les médias
    if (
      'uploadedBy' in content &&
      content.uploadedBy &&
      typeof content.uploadedBy === 'object'
    ) {
      return (
        content.uploadedBy.username ||
        content.uploadedBy.email ||
        'Nom utilisateur manquant'
      );
    }

    return 'Utilisateur non trouvé';
  }

  // ===== MÉTHODES D'ASSISTANCE POUR LE TEMPLATE =====

  /**
   * Accès sécurisé au nom pour les catégories
   */
  public getCategoryName(content: ModerableContent): string {
    return (content as any).name || '';
  }

  /**
   * Accès sécurisé à la description pour les catégories
   */
  public getCategoryDescription(content: ModerableContent): string {
    return (content as any).description || '';
  }

  /**
   * Accès sécurisé au systemStatus pour les catégories
   */
  public getCategorySystemStatus(content: ModerableContent): string {
    return (content as any).systemStatus || '';
  }

  /**
   * Accès sécurisé à l'ordre pour les catégories
   */
  public getCategoryOrder(content: ModerableContent): number {
    return (content as any).order || 0;
  }

  /**
   * Accès sécurisé au submittedAt pour les catégories
   */
  public getCategorySubmittedAt(content: ModerableContent): Date {
    const submittedAt = (content as any).submittedAt;
    return submittedAt ? new Date(submittedAt) : new Date();
  }

  /**
   * Accès sécurisé aux notes de modération pour les catégories
   */
  public getCategoryModerationNotes(content: ModerableContent): string {
    return (content as any).moderationNotes || '';
  }
}
