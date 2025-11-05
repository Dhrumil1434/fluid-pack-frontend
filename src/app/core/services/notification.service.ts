import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { io, Socket } from 'socket.io-client';
import { BaseApiService } from './base-api.service';
import { AuthService } from './auth.service';
import { API_ENDPOINTS } from '../constants/api.constants';
import { environment } from '../../../environments/environment';

export interface Notification {
  _id: string;
  recipientId: string;
  senderId?: {
    _id: string;
    username?: string;
    email?: string;
  };
  type: string;
  title: string;
  message: string;
  read: boolean;
  readAt?: string;
  relatedEntityType?: 'machine' | 'approval' | 'user';
  relatedEntityId?: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private socket: Socket | null = null;
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  private unreadCountSubject = new BehaviorSubject<number>(0);
  private newNotificationSubject = new Subject<Notification>();

  public notifications$ = this.notificationsSubject.asObservable();
  public unreadCount$ = this.unreadCountSubject.asObservable();
  public newNotification$ = this.newNotificationSubject.asObservable();

  constructor(
    private baseApiService: BaseApiService,
    private authService: AuthService
  ) {
    // Initialize socket connection when user is authenticated
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.connect();
      } else {
        this.disconnect();
      }
    });
  }

  /**
   * Connect to Socket.IO server
   */
  private connect(): void {
    if (this.socket?.connected) {
      return;
    }

    const user = this.authService.getCurrentUser();
    if (!user?._id) {
      return;
    }

    // Connect to Socket.IO server using environment configuration
    this.socket = io(environment.baseUrl, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    this.socket.on('connect', () => {
      console.log('Socket.IO connected');
      // Join user's notification room
      this.socket?.emit('user:join', user._id);
    });

    this.socket.on('disconnect', () => {
      console.log('Socket.IO disconnected');
    });

    // Listen for new notifications
    this.socket.on(
      'notification:new',
      (data: { notification: Notification }) => {
        const notification = data.notification;
        this.newNotificationSubject.next(notification);

        // Add to notifications list
        const currentNotifications = this.notificationsSubject.value;
        this.notificationsSubject.next([notification, ...currentNotifications]);

        // Update unread count
        this.getUnreadCount().subscribe();
      }
    );

    this.socket.on('connect_error', (error: Error) => {
      console.error('Socket.IO connection error:', error);
    });
  }

  /**
   * Disconnect from Socket.IO server
   */
  private disconnect(): void {
    if (this.socket) {
      const user = this.authService.getCurrentUser();
      if (user?._id) {
        this.socket.emit('user:leave', user._id);
      }
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Get user's notifications
   */
  getNotifications(filters?: {
    read?: boolean;
    limit?: number;
  }): Observable<NotificationListResponse> {
    const params: Record<string, string> = {};
    if (filters?.read !== undefined) {
      params['read'] = String(filters.read);
    }
    if (filters?.limit) {
      params['limit'] = String(filters.limit);
    }

    return this.baseApiService
      .get<NotificationListResponse>(API_ENDPOINTS.NOTIFICATIONS, params)
      .pipe(map((response: any) => response?.data || response));
  }

  /**
   * Get unread count
   */
  getUnreadCount(): Observable<{ count: number }> {
    return this.baseApiService
      .get<{ count: number }>(API_ENDPOINTS.NOTIFICATION_UNREAD_COUNT)
      .pipe(map((response: any) => response?.data || response));
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): Observable<Notification> {
    return this.baseApiService
      .patch<Notification>(
        API_ENDPOINTS.NOTIFICATION_MARK_READ.replace(':id', notificationId),
        {}
      )
      .pipe(map((response: any) => response?.data || response));
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): Observable<{ markedCount: number }> {
    return this.baseApiService
      .patch<{
        markedCount: number;
      }>(API_ENDPOINTS.NOTIFICATION_MARK_ALL_READ, {})
      .pipe(map((response: any) => response?.data || response));
  }

  /**
   * Delete notification
   */
  deleteNotification(notificationId: string): Observable<void> {
    return this.baseApiService
      .delete<void>(
        API_ENDPOINTS.NOTIFICATION_BY_ID.replace(':id', notificationId)
      )
      .pipe(map(() => undefined));
  }

  /**
   * Load notifications and update subjects
   */
  loadNotifications(): void {
    this.getNotifications({ limit: 50 }).subscribe({
      next: (response: NotificationListResponse) => {
        this.notificationsSubject.next(response.notifications || []);
        this.unreadCountSubject.next(response.unreadCount || 0);
      },
      error: (error: Error) => {
        console.error('Error loading notifications:', error);
      },
    });
  }

  /**
   * Update unread count
   */
  updateUnreadCount(): void {
    this.getUnreadCount().subscribe({
      next: (response: { count: number }) => {
        this.unreadCountSubject.next(response.count || 0);
      },
      error: (error: Error) => {
        console.error('Error getting unread count:', error);
      },
    });
  }
}
