import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { NotificationsService } from '../../../../core/services/notifications.service';
import { NotificationsSocketService } from '../../../../core/services/notifications-socket.service';
import { AppNotification } from '../../../../core/models/notification.model';
import { Router } from '@angular/router';

@Component({
  selector: 'app-notifications-page',
  templateUrl: './notifications-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class NotificationsPageComponent implements OnInit {
  notifications: AppNotification[] = [];
  total = 0;
  unreadCount = 0;
  isLoading = false;
  page = 1;
  limit = 20;
  unreadOnly = false;

  constructor(
    private notificationsService: NotificationsService,
    private socketService: NotificationsSocketService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
    this.socketService.notification$.subscribe((notif) => {
      this.notifications = [notif, ...this.notifications];
      this.unreadCount++;
      this.total++;
      this.cdr.markForCheck();
    });
  }

  load(): void {
    this.isLoading = true;
    this.notificationsService
      .getNotifications(this.page, this.limit, this.unreadOnly)
      .subscribe({
        next: (res) => {
          this.notifications = res.data;
          this.total = res.total;
          this.unreadCount = res.unreadCount;
          this.socketService.setUnreadCount(res.unreadCount);
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  toggleFilter(): void {
    this.unreadOnly = !this.unreadOnly;
    this.page = 1;
    this.load();
  }

  markAllAsRead(): void {
    this.notificationsService.markAllAsRead().subscribe(() => {
      this.notifications.forEach((n) => (n.isRead = true));
      this.unreadCount = 0;
      this.socketService.setUnreadCount(0);
      this.cdr.markForCheck();
    });
  }

  onNotificationClick(notif: AppNotification): void {
    if (!notif.isRead) {
      this.notificationsService.markAsRead(notif._id).subscribe(() => {
        notif.isRead = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
        this.socketService.setUnreadCount(this.unreadCount);
        this.cdr.markForCheck();
      });
    }
    if (notif.entityType === 'word' && notif.entityId) {
      this.router.navigate(['/dictionary/word', notif.entityId]);
    } else if (notif.entityType === 'language') {
      this.router.navigate(['/languages']);
    }
  }

  loadMore(): void {
    this.page++;
    this.notificationsService
      .getNotifications(this.page, this.limit, this.unreadOnly)
      .subscribe((res) => {
        this.notifications = [...this.notifications, ...res.data];
        this.cdr.markForCheck();
      });
  }

  getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      word_approved: '✅', word_rejected: '❌', word_revision: '📝',
      revision_approved: '✅', revision_rejected: '❌',
      language_approved: '🌍', language_rejected: '🌍',
      new_follower: '👤', post_liked: '❤️', comment: '💬',
      pending_moderation: '🛡️',
      new_message: '✉️',
      contributor_approved: '🎉',
      contributor_rejected: '❌',
    };
    return icons[type] || '🔔';
  }

  getTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Il y a ${hours} h`;
    const days = Math.floor(hours / 24);
    return `Il y a ${days} j`;
  }

  get hasMore(): boolean {
    return this.notifications.length < this.total;
  }
}
