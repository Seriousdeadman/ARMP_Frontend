import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-campus-module-placeholder',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './campus-module-placeholder.component.html',
  styleUrl: './campus-module-placeholder.component.scss'
})
export class CampusModulePlaceholderComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);

  title = 'Campus module';

  ngOnInit(): void {
    const t = this.route.snapshot.data['title'];
    if (typeof t === 'string' && t.trim()) {
      this.title = t.trim();
    }
  }
}
