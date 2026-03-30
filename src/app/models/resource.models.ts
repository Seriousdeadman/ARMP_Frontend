export enum ResourceStatus {
  AVAILABLE = 'AVAILABLE',
  UNAVAILABLE = 'UNAVAILABLE'
}

export enum ClassroomType {
  LECTURE_HALL = 'LECTURE_HALL',
  TUTORIAL_ROOM = 'TUTORIAL_ROOM',
  AMPHITHEATER = 'AMPHITHEATER',
  SEMINAR_ROOM = 'SEMINAR_ROOM'
}

export enum LabType {
  COMPUTER_LAB = 'COMPUTER_LAB',
  SCIENCE_LAB = 'SCIENCE_LAB',
  LANGUAGE_LAB = 'LANGUAGE_LAB',
  ENGINEERING_LAB = 'ENGINEERING_LAB'
}

export enum SpaceType {
  MEETING_ROOM = 'MEETING_ROOM',
  PROJECT_ROOM = 'PROJECT_ROOM',
  STUDY_ROOM = 'STUDY_ROOM',
  INNOVATION_SPACE = 'INNOVATION_SPACE'
}

export enum EquipmentType {
  COMPUTER = 'COMPUTER',
  PROJECTOR = 'PROJECTOR',
  PRINTER = 'PRINTER',
  LABORATORY_DEVICE = 'LABORATORY_DEVICE',
  AUDIO_VISUAL = 'AUDIO_VISUAL'
}

export interface Classroom {
  id: number;
  name: string;
  capacity: number;
  building: string;
  roomNumber: string;
  classroomType: ClassroomType;
  status: ResourceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Laboratory {
  id: number;
  name: string;
  capacity: number;
  building: string;
  roomNumber: string;
  labType: LabType;
  status: ResourceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CollaborativeSpace {
  id: number;
  name: string;
  capacity: number;
  building: string;
  roomNumber: string;
  spaceType: SpaceType;
  status: ResourceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Equipment {
  id: number;
  name: string;
  brand: string;
  model: string;
  equipmentType: EquipmentType;
  status: ResourceStatus;
  createdAt: string;
  updatedAt: string;
}
export enum ReservationStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED'
}

export enum ResourceType {
  CLASSROOM = 'CLASSROOM',
  LABORATORY = 'LABORATORY',
  COLLABORATIVE_SPACE = 'COLLABORATIVE_SPACE',
  EQUIPMENT = 'EQUIPMENT'
}

export interface ReservationRequest {
  resourceType: ResourceType;
  resourceId: number;
  startDatetime: string; 
  endDatetime: string;   
}

export interface ReservationResponse {
  id: number;
  userId: string;
  resourceType: ResourceType;
  resourceId: number;
  resourceName: string;
  startDatetime: string;
  endDatetime: string;
  status: string;
  createdAt: string;
}
export interface ResourceSuggestionRequest {
  resourceType: ResourceType;
  minCapacity?: number;
  maxCapacity?: number;
  building?: string;
  startDatetime?: string;
  endDatetime?: string;
  limit?: number;
}

export interface ResourceSuggestionResponse {
  id: number;
  name: string;
  resourceType: ResourceType;
  capacity?: number;
  building?: string;
  roomNumber?: string;
  score: number;
  reason: string;
  available: boolean;
}