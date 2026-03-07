export type NotificationType =
  | 'word_approved'
  | 'word_rejected'
  | 'word_revision'
  | 'revision_approved'
  | 'revision_rejected'
  | 'language_approved'
  | 'language_rejected'
  | 'new_follower'
  | 'post_liked'
  | 'comment'
  | 'pending_moderation'
  | 'new_message'
  | 'contributor_approved'
  | 'contributor_rejected';

export interface AppNotification {
  _id: string;
  type: NotificationType;
  recipientId: string;
  triggeredBy?: { _id: string; username: string };
  message: string;
  isRead: boolean;
  readAt?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface NotificationsPage {
  data: AppNotification[];
  total: number;
  unreadCount: number;
}
