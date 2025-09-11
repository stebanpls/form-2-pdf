import { Injectable, signal } from '@angular/core';
import { Notification, NotificationType } from '../models/notification.model';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  readonly notification = signal<Notification | null>(null);
  private timer: any;

  show(message: string, type: NotificationType = 'info', duration: number = 4000) {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.notification.set({ message, type });
    this.timer = setTimeout(() => this.hide(), duration);
  }

  hide() {
    this.notification.set(null);
  }
}
