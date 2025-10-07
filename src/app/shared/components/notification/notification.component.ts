import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NotificationService } from '../../../services/notification.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification.component.html',
  styleUrl: './notification.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationComponent {
  public readonly notificationService = inject(NotificationService);
}
