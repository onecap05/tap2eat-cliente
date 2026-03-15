import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { RegisterComponent } from './components/register/register.component'; // <-- Import the RegisterComponent

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RegisterComponent], // <-- We added RegisterComponent here
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  title = 'renderer';
}