import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AppNotification, NotificationsPage } from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly base = `${environment.apiUrl}/notifications`;

  constructor(private http: HttpClient) {}

  getNotifications(
    page = 1,
    limit = 20,
    unreadOnly = false,
  ): Observable<NotificationsPage> {
    const params = new HttpParams()
      .set('page', page)
      .set('limit', limit)
      .set('unreadOnly', unreadOnly);
    return this.http.get<NotificationsPage>(this.base, { params });
  }

  getUnreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.base}/unread/count`);
  }

  markAsRead(id: string): Observable<AppNotification> {
    return this.http.patch<AppNotification>(`${this.base}/${id}/read`, {});
  }

  markAllAsRead(): Observable<{ updated: number }> {
    return this.http.patch<{ updated: number }>(`${this.base}/read-all`, {});
  }
}
