import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import io from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { AppNotification } from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationsSocketService implements OnDestroy {
  private socket: ReturnType<typeof io> | null = null;

  private unreadCountSubject = new BehaviorSubject<number>(0);
  private notificationSubject = new Subject<AppNotification>();

  public unreadCount$ = this.unreadCountSubject.asObservable();
  public notification$ = this.notificationSubject.asObservable();

  constructor(private authService: AuthService) {
    this.authService.currentUser$.subscribe((user) => {
      if (user) {
        this.connect();
      } else {
        this.disconnect();
      }
    });
  }

  private connect(): void {
    if (this.socket?.connected) return;

    const token = this.authService.getToken();
    if (!token) return;

    this.socket = io(`${environment.websocketUrl}/notifications`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    this.socket.on('notification:new', (notif: AppNotification) => {
      this.notificationSubject.next(notif);
    });

    this.socket.on('notification:count', (data: { count: number }) => {
      this.unreadCountSubject.next(data.count);
    });
  }

  private disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.unreadCountSubject.next(0);
  }

  setUnreadCount(count: number): void {
    this.unreadCountSubject.next(count);
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
