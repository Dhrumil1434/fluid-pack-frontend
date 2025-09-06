import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { GlobalLoaderComponent } from './shared/components/global-loader/global-loader.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ButtonModule, ToastModule, GlobalLoaderComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'], // fixed plural styleUrls
  standalone: true, // for standalone components
})
export class AppComponent {
  title = 'VINAISM_FRONTEND';
}
