// Cebindegaleri Mock Data
// Merkezi mock veri dosyası

export interface Dealership {
  id: string
  name: string
  slug: string
  logo?: string
  phone: string
  whatsapp: string
  email: string
  address: string
  city: string
  district: string
  googleMapsUrl?: string
  workingHours: {
    weekdays: string
    saturday: string
    sunday: string
  }
  socialMedia?: {
    instagram?: string
    facebook?: string
    youtube?: string
    twitter?: string
  }
  plan: 'starter' | 'professional' | 'plus'
  vehicleCount: number
  activeVehicleCount: number
  createdAt: string
}

export interface Vehicle {
  id: string
  dealershipId: string
  title: string
  brand: string
  model: string
  year: number
  price: number
  currency: string
  mileage: number
  fuelType: 'benzin' | 'dizel' | 'lpg' | 'elektrik' | 'hibrit'
  transmission: 'manuel' | 'otomatik' | 'yarı-otomatik'
  bodyType: string
  color: string
  engineSize: string
  horsepower: number
  doors: number
  seats: number
  features: string[]
  images: string[]
  status: 'yayinda' | 'satildi' | 'rezerve' | 'taslak'
  views: number
  qrScans: number
  whatsappClicks: number
  phoneClicks: number
  featured: boolean
  createdAt: string
  updatedAt: string
}

export interface Lead {
  id: string
  dealershipId: string
  vehicleId?: string
  vehicleTitle?: string
  customerName: string
  customerPhone: string
  customerEmail?: string
  source: 'qr' | 'showroom' | 'whatsapp' | 'telefon' | 'form' | 'test-surusu'
  status: 'yeni' | 'arandi' | 'gorusuluyor' | 'test-surusu' | 'satisa-dondu' | 'kayip'
  notes: string[]
  followUpDate?: string
  createdAt: string
  updatedAt: string
}

export interface QRStats {
  totalScans: number
  uniqueVisitors: number
  whatsappClicks: number
  phoneClicks: number
  testDriveRequests: number
  leadConversionRate: number
}

export interface DailyStats {
  date: string
  scans: number
  visitors: number
  leads: number
}

export interface HourlyStats {
  hour: number
  scans: number
}

export interface VehiclePerformance {
  vehicleId: string
  vehicleTitle: string
  image: string
  scans: number
  leads: number
  whatsappClicks: number
  phoneClicks: number
  conversionRate: number
}

export interface Plan {
  id: string
  name: string
  slug: 'starter' | 'professional' | 'plus'
  price: number
  period: 'monthly' | 'yearly'
  vehicleLimit: number
  qrLimit: number
  features: {
    leadTracking: boolean
    analytics: boolean
    customGalleryPage: boolean
    bulkQRPrint: boolean
    teamMembers: number
    prioritySupport: boolean
  }
  popular?: boolean
}

// Mock Dealership
export const mockDealership: Dealership = {
  id: 'dlr_001',
  name: 'Prestij Otomotiv',
  slug: 'prestij-otomotiv',
  logo: '/logo-placeholder.png',
  phone: '+90 530 973 82 40',
  whatsapp: '+905309738240',
  email: 'info@prestijotomotiv.com',
  address: 'Oto Sanayi Sitesi, A Blok No:15',
  city: 'İstanbul',
  district: 'Maslak',
  googleMapsUrl: 'https://maps.google.com/?q=41.1082,29.0265',
  workingHours: {
    weekdays: '09:00 - 19:00',
    saturday: '09:00 - 18:00',
    sunday: '10:00 - 16:00'
  },
  socialMedia: {
    instagram: 'prestijotomotiv',
    facebook: 'prestijotomotiv',
    youtube: 'prestijotomotiv'
  },
  plan: 'professional',
  vehicleCount: 24,
  activeVehicleCount: 18,
  createdAt: '2024-01-15'
}

// Mock Vehicles
export const mockVehicles: Vehicle[] = [
  {
    id: 'vhc_001',
    dealershipId: 'dlr_001',
    title: '2023 BMW 320i M Sport',
    brand: 'BMW',
    model: '320i',
    year: 2023,
    price: 2850000,
    currency: 'TRY',
    mileage: 15000,
    fuelType: 'benzin',
    transmission: 'otomatik',
    bodyType: 'Sedan',
    color: 'Siyah',
    engineSize: '2.0',
    horsepower: 184,
    doors: 4,
    seats: 5,
    features: ['Deri Döşeme', 'Sunroof', 'Navigasyon', 'Geri Görüş Kamerası', 'Adaptif Cruise', 'LED Farlar'],
    images: ['/vehicles/bmw-320i-1.jpg', '/vehicles/bmw-320i-2.jpg'],
    status: 'yayinda',
    views: 342,
    qrScans: 89,
    whatsappClicks: 45,
    phoneClicks: 23,
    featured: true,
    createdAt: '2024-03-01',
    updatedAt: '2024-03-15'
  },
  {
    id: 'vhc_002',
    dealershipId: 'dlr_001',
    title: '2022 Mercedes-Benz C200 AMG',
    brand: 'Mercedes-Benz',
    model: 'C200',
    year: 2022,
    price: 3100000,
    currency: 'TRY',
    mileage: 28000,
    fuelType: 'benzin',
    transmission: 'otomatik',
    bodyType: 'Sedan',
    color: 'Beyaz',
    engineSize: '1.5',
    horsepower: 204,
    doors: 4,
    seats: 5,
    features: ['Deri Döşeme', 'Panoramik Cam Tavan', 'Burmester Ses', 'MBUX', '360 Kamera', 'Isıtmalı Koltuk'],
    images: ['/vehicles/mercedes-c200-1.jpg'],
    status: 'yayinda',
    views: 287,
    qrScans: 76,
    whatsappClicks: 38,
    phoneClicks: 19,
    featured: true,
    createdAt: '2024-02-20',
    updatedAt: '2024-03-10'
  },
  {
    id: 'vhc_003',
    dealershipId: 'dlr_001',
    title: '2024 Audi A4 40 TFSI',
    brand: 'Audi',
    model: 'A4',
    year: 2024,
    price: 2650000,
    currency: 'TRY',
    mileage: 5000,
    fuelType: 'benzin',
    transmission: 'otomatik',
    bodyType: 'Sedan',
    color: 'Gri',
    engineSize: '2.0',
    horsepower: 190,
    doors: 4,
    seats: 5,
    features: ['Virtual Cockpit', 'Matrix LED', 'Bang & Olufsen', 'Quattro', 'Adaptif Süspansiyon'],
    images: ['/vehicles/audi-a4-1.jpg'],
    status: 'yayinda',
    views: 198,
    qrScans: 52,
    whatsappClicks: 28,
    phoneClicks: 14,
    featured: false,
    createdAt: '2024-03-05',
    updatedAt: '2024-03-12'
  },
  {
    id: 'vhc_004',
    dealershipId: 'dlr_001',
    title: '2021 Volkswagen Passat 1.5 TSI',
    brand: 'Volkswagen',
    model: 'Passat',
    year: 2021,
    price: 1450000,
    currency: 'TRY',
    mileage: 62000,
    fuelType: 'benzin',
    transmission: 'otomatik',
    bodyType: 'Sedan',
    color: 'Lacivert',
    engineSize: '1.5',
    horsepower: 150,
    doors: 4,
    seats: 5,
    features: ['Apple CarPlay', 'Android Auto', 'Park Sensörü', 'Şerit Takip', 'Yokuş Kalkış'],
    images: ['/vehicles/vw-passat-1.jpg'],
    status: 'yayinda',
    views: 156,
    qrScans: 34,
    whatsappClicks: 21,
    phoneClicks: 12,
    featured: false,
    createdAt: '2024-02-10',
    updatedAt: '2024-03-08'
  },
  {
    id: 'vhc_005',
    dealershipId: 'dlr_001',
    title: '2023 Toyota Corolla 1.8 Hybrid',
    brand: 'Toyota',
    model: 'Corolla',
    year: 2023,
    price: 1280000,
    currency: 'TRY',
    mileage: 18000,
    fuelType: 'hibrit',
    transmission: 'otomatik',
    bodyType: 'Sedan',
    color: 'Kırmızı',
    engineSize: '1.8',
    horsepower: 140,
    doors: 4,
    seats: 5,
    features: ['Hibrit Sistem', 'Toyota Safety Sense', 'Kablosuz Şarj', 'JBL Ses Sistemi'],
    images: ['/vehicles/toyota-corolla-1.jpg'],
    status: 'yayinda',
    views: 234,
    qrScans: 67,
    whatsappClicks: 34,
    phoneClicks: 18,
    featured: true,
    createdAt: '2024-02-25',
    updatedAt: '2024-03-14'
  },
  {
    id: 'vhc_006',
    dealershipId: 'dlr_001',
    title: '2020 Honda Civic 1.5 VTEC',
    brand: 'Honda',
    model: 'Civic',
    year: 2020,
    price: 980000,
    currency: 'TRY',
    mileage: 78000,
    fuelType: 'benzin',
    transmission: 'otomatik',
    bodyType: 'Hatchback',
    color: 'Beyaz',
    engineSize: '1.5',
    horsepower: 182,
    doors: 5,
    seats: 5,
    features: ['Honda Sensing', 'Sunroof', 'LED Farlar', 'Elektrikli Koltuk'],
    images: ['/vehicles/honda-civic-1.jpg'],
    status: 'satildi',
    views: 312,
    qrScans: 98,
    whatsappClicks: 56,
    phoneClicks: 34,
    featured: false,
    createdAt: '2024-01-15',
    updatedAt: '2024-03-01'
  },
  {
    id: 'vhc_007',
    dealershipId: 'dlr_001',
    title: '2022 Volvo XC60 B5 AWD',
    brand: 'Volvo',
    model: 'XC60',
    year: 2022,
    price: 3450000,
    currency: 'TRY',
    mileage: 32000,
    fuelType: 'hibrit',
    transmission: 'otomatik',
    bodyType: 'SUV',
    color: 'Gümüş',
    engineSize: '2.0',
    horsepower: 250,
    doors: 5,
    seats: 5,
    features: ['AWD', 'Pilot Assist', 'Harman Kardon', 'Air Suspension', '360 Kamera', 'Masaj Koltuk'],
    images: ['/vehicles/volvo-xc60-1.jpg'],
    status: 'yayinda',
    views: 178,
    qrScans: 45,
    whatsappClicks: 28,
    phoneClicks: 15,
    featured: true,
    createdAt: '2024-03-08',
    updatedAt: '2024-03-15'
  },
  {
    id: 'vhc_008',
    dealershipId: 'dlr_001',
    title: '2023 Range Rover Evoque D200',
    brand: 'Land Rover',
    model: 'Range Rover Evoque',
    year: 2023,
    price: 4200000,
    currency: 'TRY',
    mileage: 12000,
    fuelType: 'dizel',
    transmission: 'otomatik',
    bodyType: 'SUV',
    color: 'Yeşil',
    engineSize: '2.0',
    horsepower: 204,
    doors: 5,
    seats: 5,
    features: ['Terrain Response', 'Meridian Ses', 'Panoramik Tavan', 'Adaptif Dinamik', 'ClearSight'],
    images: ['/vehicles/evoque-1.jpg'],
    status: 'rezerve',
    views: 145,
    qrScans: 38,
    whatsappClicks: 22,
    phoneClicks: 11,
    featured: false,
    createdAt: '2024-03-10',
    updatedAt: '2024-03-14'
  }
]

// Mock Leads
export const mockLeads: Lead[] = [
  {
    id: 'lead_001',
    dealershipId: 'dlr_001',
    vehicleId: 'vhc_001',
    vehicleTitle: '2023 BMW 320i M Sport',
    customerName: 'Ahmet Yılmaz',
    customerPhone: '+90 532 111 2233',
    customerEmail: 'ahmet@email.com',
    source: 'qr',
    status: 'gorusuluyor',
    notes: ['Fiyat pazarlığı yapılıyor', 'Takas araç var'],
    followUpDate: '2024-03-18',
    createdAt: '2024-03-12T10:30:00',
    updatedAt: '2024-03-15T14:20:00'
  },
  {
    id: 'lead_002',
    dealershipId: 'dlr_001',
    vehicleId: 'vhc_002',
    vehicleTitle: '2022 Mercedes-Benz C200 AMG',
    customerName: 'Fatma Demir',
    customerPhone: '+90 533 222 3344',
    source: 'whatsapp',
    status: 'test-surusu',
    notes: ['Test sürüşü için randevu alındı - 16 Mart 14:00'],
    followUpDate: '2024-03-16',
    createdAt: '2024-03-14T09:15:00',
    updatedAt: '2024-03-14T09:15:00'
  },
  {
    id: 'lead_003',
    dealershipId: 'dlr_001',
    vehicleId: 'vhc_005',
    vehicleTitle: '2023 Toyota Corolla 1.8 Hybrid',
    customerName: 'Mehmet Kaya',
    customerPhone: '+90 534 333 4455',
    customerEmail: 'mehmet.kaya@email.com',
    source: 'showroom',
    status: 'yeni',
    notes: [],
    createdAt: '2024-03-15T16:45:00',
    updatedAt: '2024-03-15T16:45:00'
  },
  {
    id: 'lead_004',
    dealershipId: 'dlr_001',
    vehicleId: 'vhc_003',
    vehicleTitle: '2024 Audi A4 40 TFSI',
    customerName: 'Ayşe Çelik',
    customerPhone: '+90 535 444 5566',
    source: 'telefon',
    status: 'arandi',
    notes: ['Arandı, meşguldü. Tekrar aranacak.'],
    followUpDate: '2024-03-16',
    createdAt: '2024-03-13T11:00:00',
    updatedAt: '2024-03-15T10:30:00'
  },
  {
    id: 'lead_005',
    dealershipId: 'dlr_001',
    vehicleId: 'vhc_006',
    vehicleTitle: '2020 Honda Civic 1.5 VTEC',
    customerName: 'Ali Öztürk',
    customerPhone: '+90 536 555 6677',
    source: 'qr',
    status: 'satisa-dondu',
    notes: ['Satış tamamlandı', 'Kredi kullanıldı'],
    createdAt: '2024-02-28T14:20:00',
    updatedAt: '2024-03-05T16:00:00'
  },
  {
    id: 'lead_006',
    dealershipId: 'dlr_001',
    vehicleId: 'vhc_004',
    vehicleTitle: '2021 Volkswagen Passat 1.5 TSI',
    customerName: 'Zeynep Arslan',
    customerPhone: '+90 537 666 7788',
    source: 'form',
    status: 'kayip',
    notes: ['Bütçe uygun değil', 'Daha düşük fiyatlı araç arıyor'],
    createdAt: '2024-03-10T09:00:00',
    updatedAt: '2024-03-12T15:30:00'
  },
  {
    id: 'lead_007',
    dealershipId: 'dlr_001',
    vehicleId: 'vhc_007',
    vehicleTitle: '2022 Volvo XC60 B5 AWD',
    customerName: 'Emre Şahin',
    customerPhone: '+90 538 777 8899',
    customerEmail: 'emre.sahin@email.com',
    source: 'test-surusu',
    status: 'gorusuluyor',
    notes: ['Test sürüşü yapıldı, beğendi', 'Finansman seçenekleri sunuldu'],
    followUpDate: '2024-03-17',
    createdAt: '2024-03-11T13:30:00',
    updatedAt: '2024-03-14T17:00:00'
  },
  {
    id: 'lead_008',
    dealershipId: 'dlr_001',
    vehicleTitle: 'Genel Bilgi Talebi',
    customerName: 'Selin Yıldız',
    customerPhone: '+90 539 888 9900',
    source: 'showroom',
    status: 'yeni',
    notes: [],
    createdAt: '2024-03-15T18:00:00',
    updatedAt: '2024-03-15T18:00:00'
  }
]

// Mock QR Stats
export const mockQRStats: QRStats = {
  totalScans: 1247,
  uniqueVisitors: 892,
  whatsappClicks: 312,
  phoneClicks: 178,
  testDriveRequests: 45,
  leadConversionRate: 18.5
}

// Mock Daily Stats (Last 7 days)
export const mockDailyStats: DailyStats[] = [
  { date: '2024-03-09', scans: 156, visitors: 112, leads: 8 },
  { date: '2024-03-10', scans: 189, visitors: 134, leads: 12 },
  { date: '2024-03-11', scans: 145, visitors: 98, leads: 6 },
  { date: '2024-03-12', scans: 201, visitors: 156, leads: 15 },
  { date: '2024-03-13', scans: 178, visitors: 128, leads: 10 },
  { date: '2024-03-14', scans: 223, visitors: 167, leads: 18 },
  { date: '2024-03-15', scans: 155, visitors: 97, leads: 9 }
]

// Mock Hourly Stats
export const mockHourlyStats: HourlyStats[] = [
  { hour: 8, scans: 12 },
  { hour: 9, scans: 28 },
  { hour: 10, scans: 45 },
  { hour: 11, scans: 52 },
  { hour: 12, scans: 38 },
  { hour: 13, scans: 31 },
  { hour: 14, scans: 48 },
  { hour: 15, scans: 56 },
  { hour: 16, scans: 62 },
  { hour: 17, scans: 58 },
  { hour: 18, scans: 44 },
  { hour: 19, scans: 35 },
  { hour: 20, scans: 22 },
  { hour: 21, scans: 15 }
]

// Mock Vehicle Performance
export const mockVehiclePerformance: VehiclePerformance[] = [
  {
    vehicleId: 'vhc_001',
    vehicleTitle: '2023 BMW 320i M Sport',
    image: '/vehicles/bmw-320i-1.jpg',
    scans: 89,
    leads: 12,
    whatsappClicks: 45,
    phoneClicks: 23,
    conversionRate: 13.5
  },
  {
    vehicleId: 'vhc_002',
    vehicleTitle: '2022 Mercedes-Benz C200 AMG',
    image: '/vehicles/mercedes-c200-1.jpg',
    scans: 76,
    leads: 9,
    whatsappClicks: 38,
    phoneClicks: 19,
    conversionRate: 11.8
  },
  {
    vehicleId: 'vhc_005',
    vehicleTitle: '2023 Toyota Corolla 1.8 Hybrid',
    image: '/vehicles/toyota-corolla-1.jpg',
    scans: 67,
    leads: 11,
    whatsappClicks: 34,
    phoneClicks: 18,
    conversionRate: 16.4
  },
  {
    vehicleId: 'vhc_003',
    vehicleTitle: '2024 Audi A4 40 TFSI',
    image: '/vehicles/audi-a4-1.jpg',
    scans: 52,
    leads: 6,
    whatsappClicks: 28,
    phoneClicks: 14,
    conversionRate: 11.5
  },
  {
    vehicleId: 'vhc_007',
    vehicleTitle: '2022 Volvo XC60 B5 AWD',
    image: '/vehicles/volvo-xc60-1.jpg',
    scans: 45,
    leads: 8,
    whatsappClicks: 28,
    phoneClicks: 15,
    conversionRate: 17.8
  }
]

// Mock Plans
export const mockPlans: Plan[] = [
  {
    id: 'plan_starter',
    name: 'Başlangıç',
    slug: 'starter',
    price: 299,
    period: 'monthly',
    vehicleLimit: 10,
    qrLimit: 10,
    features: {
      leadTracking: false,
      analytics: false,
      customGalleryPage: false,
      bulkQRPrint: false,
      teamMembers: 1,
      prioritySupport: false
    }
  },
  {
    id: 'plan_professional',
    name: 'Profesyonel',
    slug: 'professional',
    price: 599,
    period: 'monthly',
    vehicleLimit: 50,
    qrLimit: 50,
    features: {
      leadTracking: true,
      analytics: true,
      customGalleryPage: true,
      bulkQRPrint: true,
      teamMembers: 3,
      prioritySupport: false
    },
    popular: true
  },
  {
    id: 'plan_plus',
    name: 'Galeri Plus',
    slug: 'plus',
    price: 999,
    period: 'monthly',
    vehicleLimit: -1, // unlimited
    qrLimit: -1, // unlimited
    features: {
      leadTracking: true,
      analytics: true,
      customGalleryPage: true,
      bulkQRPrint: true,
      teamMembers: 10,
      prioritySupport: true
    }
  }
]

// Helper Functions
export function formatPrice(price: number, currency: string = 'TRY'): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price)
}

export function formatMileage(km: number): string {
  return new Intl.NumberFormat('tr-TR').format(km) + ' km'
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function getLeadStatusLabel(status: Lead['status']): string {
  const labels: Record<Lead['status'], string> = {
    'yeni': 'Yeni',
    'arandi': 'Arandı',
    'gorusuluyor': 'Görüşülüyor',
    'test-surusu': 'Test Sürüşü',
    'satisa-dondu': 'Satışa Döndü',
    'kayip': 'Kayıp'
  }
  return labels[status]
}

export function getLeadSourceLabel(source: Lead['source']): string {
  const labels: Record<Lead['source'], string> = {
    'qr': 'QR Kod',
    'showroom': 'Showroom',
    'whatsapp': 'WhatsApp',
    'telefon': 'Telefon',
    'form': 'Form',
    'test-surusu': 'Test Sürüşü'
  }
  return labels[source]
}

export function getVehicleStatusLabel(status: Vehicle['status']): string {
  const labels: Record<Vehicle['status'], string> = {
    'yayinda': 'Yayında',
    'satildi': 'Satıldı',
    'rezerve': 'Rezerve',
    'taslak': 'Taslak'
  }
  return labels[status]
}

export function getFuelTypeLabel(fuel: Vehicle['fuelType']): string {
  const labels: Record<Vehicle['fuelType'], string> = {
    'benzin': 'Benzin',
    'dizel': 'Dizel',
    'lpg': 'LPG',
    'elektrik': 'Elektrik',
    'hibrit': 'Hibrit'
  }
  return labels[fuel]
}

export function getTransmissionLabel(transmission: Vehicle['transmission']): string {
  const labels: Record<Vehicle['transmission'], string> = {
    'manuel': 'Manuel',
    'otomatik': 'Otomatik',
    'yarı-otomatik': 'Yarı Otomatik'
  }
  return labels[transmission]
}

// Car brands for Turkey market
export const carBrands = [
  'Audi', 'BMW', 'Chevrolet', 'Citroën', 'Dacia', 'Fiat', 'Ford', 'Honda',
  'Hyundai', 'Jeep', 'Kia', 'Land Rover', 'Mazda', 'Mercedes-Benz', 'Mini',
  'Mitsubishi', 'Nissan', 'Opel', 'Peugeot', 'Porsche', 'Renault', 'Seat',
  'Skoda', 'Suzuki', 'Tesla', 'Toyota', 'Volkswagen', 'Volvo'
]

// Turkish cities
export const turkishCities = [
  'Adana', 'Ankara', 'Antalya', 'Bursa', 'Denizli', 'Diyarbakır', 'Eskişehir',
  'Gaziantep', 'İstanbul', 'İzmir', 'Kayseri', 'Kocaeli', 'Konya', 'Malatya',
  'Manisa', 'Mersin', 'Muğla', 'Sakarya', 'Samsun', 'Şanlıurfa', 'Trabzon'
]
