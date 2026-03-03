import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  Message,
  Conversation,
  SendMessageRequest,
  MessagesResponse,
} from '../models/message';

@Injectable({
  providedIn: 'root',
})
export class MessagingService {
  private readonly _API_URL = `${environment.apiUrl}/messaging`;

  constructor(private _http: HttpClient) {}

  /**
   * Envoyer un message
   */
  sendMessage(
    messageData: SendMessageRequest
  ): Observable<{ success: boolean; message: string; data: Message }> {
    return this._http
      .post<{ success: boolean; message: string; data: Message }>(
        `${this._API_URL}/send`,
        messageData
      )
      .pipe(
        catchError((error) => {
          const errorMessage =
            error.error?.message || "Erreur lors de l'envoi du message";
          return throwError(() => new Error(errorMessage));
        })
      );
  }

  /**
   * Récupérer les conversations de l'utilisateur
   */
  getUserConversations(): Observable<Conversation[]> {
    return this._http
      .get<{ success: boolean; data: any[] }>(
        `${this._API_URL}/conversations`
      )
      .pipe(
        map((response) => {
          const raw = response.data || [];
          return raw.map((conv: any) => {
            const convId = conv._id || conv.id;
            const normalizedParticipants = (conv.participants || []).map((p: any) => ({
              ...p,
              id: p.id || p.userId,
              profilePicture: p.profilePicture || p.avatar,
            }));
            return {
              ...conv,
              _id: convId,
              participants: normalizedParticipants,
              lastMessage: conv.lastMessage
                ? {
                    ...conv.lastMessage,
                    _id: conv.lastMessage._id || conv.lastMessage.id,
                    senderId: (() => {
                      const sid = conv.lastMessage.senderId;
                      if (!sid) return { username: '', id: '' };
                      if (typeof sid === 'string') {
                        // Resolve sender username from participants
                        const match = normalizedParticipants.find(
                          (p: any) => p.id === sid || p.userId === sid
                        );
                        return match
                          ? { id: sid, username: match.username, profilePicture: match.profilePicture }
                          : { id: sid, username: '' };
                      }
                      return { id: sid.id || sid._id?.toString() || '', ...sid };
                    })(),
                  }
                : undefined,
            } as Conversation;
          });
        }),
        catchError((error) => {
          const errorMessage =
            error.error?.message ||
            'Erreur lors de la récupération des conversations';
          return throwError(() => new Error(errorMessage));
        })
      );
  }

  /**
   * Récupérer les messages d'une conversation
   */
  getMessages(
    conversationId: string,
    page: number = 1,
    limit: number = 20
  ): Observable<MessagesResponse> {
    let params = new HttpParams()
      .set('conversationId', conversationId)
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this._http
      .get<{ success: boolean; data: MessagesResponse }>(
        `${this._API_URL}/messages`,
        { params }
      )
      .pipe(
        map((response) => response.data),
        catchError((error) => {
          const errorMessage =
            error.error?.message ||
            'Erreur lors de la récupération des messages';
          return throwError(() => new Error(errorMessage));
        })
      );
  }

  /**
   * Marquer les messages d'une conversation comme lus
   */
  markMessagesAsRead(
    conversationId: string
  ): Observable<{ success: boolean; message: string }> {
    return this._http
      .patch<{ success: boolean; message: string }>(
        `${this._API_URL}/conversations/${conversationId}/read`,
        {}
      )
      .pipe(
        catchError((error) => {
          const errorMessage =
            error.error?.message || 'Erreur lors du marquage des messages';
          return throwError(() => new Error(errorMessage));
        })
      );
  }

  /**
   * Récupérer le nombre de messages non lus
   */
  getUnreadMessagesCount(): Observable<number> {
    return this._http
      .get<{ success: boolean; data: { count: number } }>(
        `${this._API_URL}/unread-count`
      )
      .pipe(
        map((response) => response.data.count),
        catchError((error) => {
          const errorMessage =
            error.error?.message ||
            'Erreur lors de la récupération du nombre de messages non lus';
          return throwError(() => new Error(errorMessage));
        })
      );
  }

  /**
   * Trouver une conversation entre deux utilisateurs
   */
  findConversationWithUser(userId: string): Observable<Conversation | null> {
    return this.getUserConversations().pipe(
      map((conversations) => {
        const conversation = conversations.find((conv) =>
          conv.participants.some((participant) => participant.id === userId)
        );
        return conversation || null;
      })
    );
  }

  // ===== API ENHANCED =====

  deleteMessage(
    messageId: string,
    deleteFor: 'me' | 'everyone' = 'everyone'
  ): Observable<any> {
    return this._http
      .delete(`${this._API_URL}/enhanced/messages/${messageId}`, {
        params: { deleteFor },
      })
      .pipe(
        catchError((error) => {
          return throwError(
            () => new Error(error.error?.message || 'Erreur lors de la suppression')
          );
        })
      );
  }

  editMessage(messageId: string, content: string): Observable<any> {
    return this._http
      .patch(`${this._API_URL}/enhanced/messages/${messageId}`, { content })
      .pipe(
        catchError((error) => {
          return throwError(
            () => new Error(error.error?.message || 'Erreur lors de la modification')
          );
        })
      );
  }

  reactToMessage(messageId: string, reaction: string): Observable<any> {
    return this._http
      .post(`${this._API_URL}/enhanced/messages/react`, { messageId, reaction })
      .pipe(
        catchError((error) => {
          return throwError(
            () => new Error(error.error?.message || 'Erreur lors de la réaction')
          );
        })
      );
  }

  removeReaction(messageId: string): Observable<any> {
    return this._http
      .delete(`${this._API_URL}/enhanced/messages/${messageId}/reactions`)
      .pipe(
        catchError((error) => {
          return throwError(
            () => new Error(error.error?.message || 'Erreur lors du retrait de la réaction')
          );
        })
      );
  }

  sendMediaMessage(formData: FormData): Observable<any> {
    return this._http
      .post(`${this._API_URL}/enhanced/messages/media`, formData)
      .pipe(
        catchError((error) => {
          return throwError(
            () => new Error(error.error?.message || "Erreur lors de l'envoi du fichier")
          );
        })
      );
  }
}
