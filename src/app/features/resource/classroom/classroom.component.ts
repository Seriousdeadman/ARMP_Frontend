import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment.development';
import { AuthService } from '../../../services/auth.service';
import { User, UserRole } from '../../../models/user.models';
import { Classroom, ClassroomType, ResourceStatus } from '../../../models/resource.models';

@Component({
  selector: 'app-classroom',
  templateUrl: './classroom.component.html',
  styleUrl: './classroom.component.scss'
})
export class ClassroomComponent implements OnInit {

  currentUser: User | null = null;
  classrooms: Classroom[] = [];
  isLoading = true;

  showForm = false;
  isEditing = false;
  selectedId: number | null = null;

  searchQuery = '';
  filterStatus = 'ALL';
  filterType = 'ALL';
  sortField: keyof Classroom = 'name';
  sortAsc = true;

  page = 1;
  pageSize = 5;

  classroomTypes = Object.values(ClassroomType);
  statusOptions = Object.values(ResourceStatus);

  form = {
    name: '',
    capacity: 0,
    building: '',
    roomNumber: '',
    classroomType: ClassroomType.LECTURE_HALL,
    status: ResourceStatus.AVAILABLE
  };

  constructor(private http: HttpClient, private authService: AuthService) {}

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    this.load();
  }

  get isStaff() {
    return this.currentUser?.role === UserRole.LOGISTICS_STAFF ||
           this.currentUser?.role === UserRole.SUPER_ADMIN;
  }

  get displayedItems(): Classroom[] {
    let res = [...this.classrooms];

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      res = res.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.building.toLowerCase().includes(q) ||
        c.roomNumber.toLowerCase().includes(q)
      );
    }

    if (this.filterStatus !== 'ALL') res = res.filter(c => c.status === this.filterStatus);
    if (this.filterType !== 'ALL') res = res.filter(c => c.classroomType === this.filterType);

    res.sort((a, b) => {
      const A = a[this.sortField];
      const B = b[this.sortField];
      if (typeof A === 'number' && typeof B === 'number') return this.sortAsc ? A - B : B - A;
      return this.sortAsc ? String(A).localeCompare(String(B)) : String(B).localeCompare(String(A));
    });

    return res;
  }

  get paginatedItems() {
    const start = (this.page - 1) * this.pageSize;
    return this.displayedItems.slice(start, start + this.pageSize);
  }

  get totalPages() {
    return Math.ceil(this.displayedItems.length / this.pageSize);
  }

  nextPage(){ if(this.page < this.totalPages) this.page++; }
  prevPage(){ if(this.page > 1) this.page--; }

  setSort(field: keyof Classroom){
    this.sortField === field ? this.sortAsc = !this.sortAsc : (this.sortField = field, this.sortAsc = true);
  }

  sortIcon(field: keyof Classroom){
    return this.sortField !== field ? '↕' : this.sortAsc ? '↑' : '↓';
  }

  resetFilters(){
    this.searchQuery=''; this.filterStatus='ALL'; this.filterType='ALL'; this.page=1;
  }

  load(){
    this.http.get<Classroom[]>(`${environment.apiUrl}/api/classrooms`)
      .subscribe(data => { this.classrooms = data; this.isLoading=false; });
  }

  openCreate(){ this.isEditing=false; this.showForm=true; }
  openEdit(c: Classroom){ this.isEditing=true; this.selectedId=c.id; this.form={...c}; this.showForm=true; }

  submit(){
    if(!this.form.name.trim()) return alert('Name required');
    if(this.form.capacity <=0) return alert('Capacity > 0');
    if(!this.form.building.trim()) return alert('Building required');
    if(!this.form.roomNumber.trim()) return alert('Room required');

    const req = this.isEditing
      ? this.http.put(`${environment.apiUrl}/api/classrooms/${this.selectedId}`, this.form)
      : this.http.post(`${environment.apiUrl}/api/classrooms`, this.form);

    req.subscribe(()=>{ this.load(); this.showForm=false; });
  }

  delete(id:number){
    if(!confirm('Delete?')) return;
    this.http.delete(`${environment.apiUrl}/api/classrooms/${id}`)
      .subscribe(()=>this.load());
  }

  cancel(){ this.showForm=false; }
}