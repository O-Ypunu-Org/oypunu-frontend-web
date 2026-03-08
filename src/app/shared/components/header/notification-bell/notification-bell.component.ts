import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  NgZone,
} from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { NotificationsService } from '../../../../core/services/notifications.service';
import { NotificationsSocketService } from '../../../../core/services/notifications-socket.service';
import { AppNotification } from '../../../../core/models/notification.model';

@Component({
  selector: 'app-notification-bell',
  templateUrl: './notification-bell.component.html',
  styleUrls: ['./notification-bell.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  isOpen = false;
  unreadCount = 0;
  notifications: AppNotification[] = [];
  isLoading = false;

  private subs = new Subscription();

  constructor(
    private notificationsService: NotificationsService,
    private socketService: NotificationsSocketService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
  ) {}

  ngOnInit(): void {
    // Badge mis à jour via WebSocket (notification:count)
    // NgZone.run() est nécessaire car les callbacks Socket.IO s'exécutent hors zone Angular
    this.subs.add(
      this.socketService.unreadCount$.subscribe((count) => {
        this.ngZone.run(() => {
          this.unreadCount = count;
          this.cdr.detectChanges();
        });
      }),
    );

    // Nouvelle notification reçue → prepend liste + incrément badge
    this.subs.add(
      this.socketService.notification$.subscribe((notif) => {
        this.ngZone.run(() => {
          this.notifications = [notif, ...this.notifications].slice(0, 10);
          this.socketService.setUnreadCount(this.unreadCount + 1);
          this.cdr.detectChanges();
        });
      }),
    );

    // Compteur initial via HTTP
    this.fetchUnreadCount();

    // Re-fetch quand l'onglet reprend le focus
    window.addEventListener('focus', this.onWindowFocus);
  }

  private readonly onWindowFocus = () => this.fetchUnreadCount();

  private fetchUnreadCount(): void {
    this.notificationsService.getUnreadCount().subscribe({
      next: ({ count }) => {
        console.log('[Bell] unreadCount from API:', count);
        this.ngZone.run(() => {
          this.unreadCount = count;
          this.cdr.detectChanges();
        });
      },
      error: (err) => console.error('[Bell] getUnreadCount error:', err),
    });
  }

  toggleDropdown(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.loadNotifications();
    }
  }

  private loadNotifications(): void {
    this.isLoading = true;
    this.notificationsService.getNotifications(1, 10).subscribe({
      next: (page) => {
        this.ngZone.run(() => {
          this.notifications = page.data;
          this.unreadCount = page.unreadCount;
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  onNotificationClick(notif: AppNotification): void {
    if (!notif.isRead) {
      this.notificationsService.markAsRead(notif._id).subscribe(() => {
        notif.isRead = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
        this.cdr.detectChanges();
      });
    }
    this.isOpen = false;
    this.navigateToEntity(notif);
  }

  private navigateToEntity(notif: AppNotification): void {
    if (notif.entityType === 'word' && notif.entityId) {
      this.router.navigate(['/dictionary/word', notif.entityId]);
    } else if (notif.entityType === 'language') {
      this.router.navigate(['/languages']);
    } else if (notif.entityType === 'conversation') {
      this.router.navigate(['/messaging']);
    } else if (notif.entityType === 'contributor_request') {
      this.router.navigate(['/profile']);
    } else {
      this.router.navigate(['/notifications']);
    }
  }

  markAllAsRead(): void {
    this.notificationsService.markAllAsRead().subscribe(() => {
      this.notifications.forEach((n) => (n.isRead = true));
      this.unreadCount = 0;
      this.cdr.detectChanges();
    });
  }

  goToAll(): void {
    this.isOpen = false;
    this.router.navigate(['/notifications']);
  }

  getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      word_approved: '✅',
      word_rejected: '❌',
      word_revision: '📝',
      revision_approved: '✅',
      revision_rejected: '❌',
      language_approved: '🌍',
      language_rejected: '🌍',
      new_follower: '👤',
      post_liked: '❤️',
      comment: '💬',
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

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.notification-bell-wrapper')) {
      this.isOpen = false;
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    window.removeEventListener('focus', this.onWindowFocus);
  }
}
