import type { PanelLead, PanelVehicle } from '@/lib/panel-types'

const DAY_MS = 24 * 60 * 60 * 1000

type VehicleLike = Pick<
  PanelVehicle,
  | 'id'
  | 'brand'
  | 'model'
  | 'variant'
  | 'year'
  | 'price'
  | 'mileage'
  | 'fuel'
  | 'transmission'
  | 'color'
  | 'status'
  | 'scans'
  | 'leads'
  | 'createdAt'
  | 'bodyType'
  | 'engineSize'
  | 'horsePower'
  | 'hasDamage'
  | 'previousOwners'
  | 'serviceHistory'
  | 'warrantyStatus'
  | 'description'
>

export type VehiclePriceAnalysis = {
  tone: 'low' | 'fair' | 'high' | 'neutral'
  label: string
  benchmarkPrice: number | null
  deltaRate: number
  peerCount: number
  summary: string
}

export type PriceDropRecommendation = {
  level: 'success' | 'info' | 'warning' | 'critical'
  shouldDrop: boolean
  label: string
  detail: string
  suggestedDiscountRate: number
  suggestedPrice: number
}

export type LeadLossRisk = {
  tone: 'low' | 'medium' | 'high' | 'closed'
  label: string
  score: number
  reasons: string[]
}

export function getVehicleAgeDays(vehicle: Pick<PanelVehicle, 'createdAt'>, now = Date.now()) {
  const createdAt = vehicle.createdAt ? Date.parse(vehicle.createdAt) : Number.NaN
  if (!Number.isFinite(createdAt)) return 0
  return Math.max(0, Math.floor((now - createdAt) / DAY_MS))
}

function median(values: number[]) {
  if (values.length === 0) return null
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[middle]
  return Math.round((sorted[middle - 1] + sorted[middle]) / 2)
}

export function analyzeVehiclePrice(vehicle: VehicleLike, peers: VehicleLike[]): VehiclePriceAnalysis {
  const sameModel = peers.filter(
    (peer) =>
      peer.id !== vehicle.id &&
      peer.status !== 'sold' &&
      peer.price > 0 &&
      peer.brand.toLowerCase() === vehicle.brand.toLowerCase() &&
      peer.model.toLowerCase() === vehicle.model.toLowerCase(),
  )
  const sameBrand = peers.filter(
    (peer) =>
      peer.id !== vehicle.id &&
      peer.status !== 'sold' &&
      peer.price > 0 &&
      peer.brand.toLowerCase() === vehicle.brand.toLowerCase(),
  )
  const activeMarket = peers.filter((peer) => peer.id !== vehicle.id && peer.status !== 'sold' && peer.price > 0)
  const referencePool = sameModel.length >= 2 ? sameModel : sameBrand.length >= 2 ? sameBrand : activeMarket.length >= 3 ? activeMarket : []
  const benchmarkPrice = median(referencePool.map((peer) => peer.price))

  if (!benchmarkPrice || benchmarkPrice <= 0 || vehicle.price <= 0) {
    return {
      tone: 'neutral',
      label: 'Referans eksik',
      benchmarkPrice: null,
      deltaRate: 0,
      peerCount: 0,
      summary: 'Fiyat kıyaslaması için yeterli aktif araç verisi yok.',
    }
  }

  const deltaRate = Math.round(((vehicle.price - benchmarkPrice) / benchmarkPrice) * 100)
  if (deltaRate >= 9) {
    return {
      tone: 'high',
      label: 'Piyasanın üstünde',
      benchmarkPrice,
      deltaRate,
      peerCount: referencePool.length,
      summary: `Benzer araç medyanının yaklaşık %${deltaRate} üzerinde. Talep düşükse fiyat revizyonu düşünülmeli.`,
    }
  }
  if (deltaRate <= -9) {
    return {
      tone: 'low',
      label: 'Piyasanın altında',
      benchmarkPrice,
      deltaRate,
      peerCount: referencePool.length,
      summary: `Benzer araç medyanının yaklaşık %${Math.abs(deltaRate)} altında. Hızlı satış veya fiyat artırma fırsatı olabilir.`,
    }
  }

  return {
    tone: 'fair',
    label: 'Piyasa ile uyumlu',
    benchmarkPrice,
    deltaRate,
    peerCount: referencePool.length,
    summary: 'Fiyat benzer araç aralığıyla uyumlu görünüyor.',
  }
}

export function getPriceDropRecommendation(vehicle: VehicleLike, now = Date.now()): PriceDropRecommendation {
  const ageDays = getVehicleAgeDays(vehicle, now)
  const suggestedByAge = ageDays >= 90 ? 7 : ageDays >= 60 ? 5 : ageDays >= 30 ? 3 : 0
  const suggestedByDemand = vehicle.scans >= 20 && vehicle.leads === 0 ? 4 : vehicle.scans >= 10 && vehicle.leads === 0 ? 3 : 0
  const suggestedDiscountRate = vehicle.status === 'active' ? Math.max(suggestedByAge, suggestedByDemand) : 0
  const shouldDrop = suggestedDiscountRate > 0
  const suggestedPrice = shouldDrop ? Math.round(vehicle.price * (1 - suggestedDiscountRate / 100)) : vehicle.price

  if (vehicle.status !== 'active') {
    return {
      level: 'info',
      shouldDrop: false,
      label: 'Fiyat koru',
      detail: 'Araç satılık durumda değil; otomatik fiyat düşürme önerisi uygulanmadı.',
      suggestedDiscountRate: 0,
      suggestedPrice: vehicle.price,
    }
  }

  if (!shouldDrop) {
    return {
      level: vehicle.leads > 0 ? 'success' : 'info',
      shouldDrop: false,
      label: vehicle.leads > 0 ? 'Talep var, fiyatı koru' : 'Henüz bekle',
      detail: vehicle.leads > 0 ? 'Araç müşteri talebi üretiyor; önce görüşmeleri takip edin.' : 'Stok yaşı ve talep verisi fiyat revizyonu için kritik seviyede değil.',
      suggestedDiscountRate: 0,
      suggestedPrice: vehicle.price,
    }
  }

  return {
    level: suggestedDiscountRate >= 5 ? 'critical' : 'warning',
    shouldDrop: true,
    label: `%${suggestedDiscountRate} fiyat revizyonu önerilir`,
    detail: `${ageDays} gün stokta, ${vehicle.scans} QR tarama ve ${vehicle.leads} müşteri talebi. Önerilen yeni fiyat: ${suggestedPrice.toLocaleString('tr-TR')} TL.`,
    suggestedDiscountRate,
    suggestedPrice,
  }
}

export function generateVehicleDescription(vehicle: Partial<VehicleLike>) {
  const title = [vehicle.year, vehicle.brand, vehicle.model, vehicle.variant].filter(Boolean).join(' ')
  const specs = [
    vehicle.mileage ? `${Number(vehicle.mileage).toLocaleString('tr-TR')} km` : '',
    vehicle.fuel,
    vehicle.transmission,
    vehicle.color,
  ].filter(Boolean)
  const highlights = [
    vehicle.bodyType ? `${vehicle.bodyType} kasa` : '',
    vehicle.engineSize ? `${vehicle.engineSize} cc motor` : '',
    vehicle.horsePower ? `${vehicle.horsePower} HP` : '',
    vehicle.serviceHistory === 'yes' ? 'yetkili servis bakımlı' : vehicle.serviceHistory === 'partial' ? 'bakım kayıtları kısmi mevcut' : '',
    vehicle.warrantyStatus === 'yes' ? 'garanti kapsamında' : '',
    vehicle.hasDamage === 'no' ? 'hasar kaydı bulunmayan' : '',
  ].filter(Boolean)

  const titleText = title || 'Bu araç'
  const specText = specs.length > 0 ? ` ${specs.join(', ')} özellikleriyle` : ''
  const highlightText = highlights.length > 0 ? ` Öne çıkan noktalar: ${highlights.join(', ')}.` : ''
  const ownerText = vehicle.previousOwners ? ` Önceki sahip sayısı: ${vehicle.previousOwners}.` : ''

  return `${titleText}${specText} satışa hazır durumda galerimizde yerini aldı.${highlightText}${ownerText} Detaylı bilgi, ekspertiz notları ve test sürüşü randevusu için bizimle iletişime geçebilirsiniz.`
}

export function getLeadLossRisk(lead: PanelLead, now = Date.now()): LeadLossRisk {
  if (lead.status === 'satisa-dondu' || lead.status === 'kayip') {
    return {
      tone: 'closed',
      label: lead.status === 'satisa-dondu' ? 'Satış kapandı' : 'Kayıp kapandı',
      score: 0,
      reasons: ['Bu müşteri talebi açık takip kuyruğunda değil.'],
    }
  }

  const reasons: string[] = []
  let score = 0
  const todayKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date(now))
  const updatedAt = Date.parse(lead.updatedAt || lead.createdAt)
  const inactiveDays = Number.isFinite(updatedAt) ? Math.floor((now - updatedAt) / DAY_MS) : 0

  if (lead.followUpDate && lead.followUpDate < todayKey) {
    score += 45
    reasons.push('Takip tarihi geçmiş.')
  }
  if (!lead.followUpDate) {
    score += 20
    reasons.push('Yeni takip tarihi planlanmamış.')
  }
  if (inactiveDays >= 7) {
    score += 35
    reasons.push(`${inactiveDays} gündür güncelleme yok.`)
  } else if (inactiveDays >= 3) {
    score += 20
    reasons.push(`${inactiveDays} gündür temas yok.`)
  }
  if (lead.status === 'yeni') {
    score += 15
    reasons.push('Müşteri hâlâ yeni statüsünde.')
  }
  if (lead.notes.length === 0) {
    score += 10
    reasons.push('Görüşme notu eklenmemiş.')
  }

  if (score >= 60) {
    return { tone: 'high', label: 'Kayıp riski yüksek', score: Math.min(100, score), reasons }
  }
  if (score >= 35) {
    return { tone: 'medium', label: 'Kayıp riski orta', score, reasons }
  }
  return { tone: 'low', label: 'Kayıp riski düşük', score, reasons: reasons.length > 0 ? reasons : ['Takip akışı sağlıklı görünüyor.'] }
}

export function buildSalesGoalSnapshot(vehicles: VehicleLike[], leads: PanelLead[], now = new Date()) {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const activeStock = vehicles.filter((vehicle) => vehicle.status === 'active').length
  const monthlyTarget = Math.max(3, Math.ceil(activeStock * 0.12))
  const wonThisMonth = leads.filter((lead) => lead.status === 'satisa-dondu' && Date.parse(lead.updatedAt) >= monthStart).length
  const pipeline = leads.filter((lead) => ['gorusuluyor', 'test-surusu'].includes(lead.status)).length
  const progressRate = monthlyTarget > 0 ? Math.min(100, Math.round((wonThisMonth / monthlyTarget) * 100)) : 0

  return {
    monthlyTarget,
    wonThisMonth,
    remaining: Math.max(0, monthlyTarget - wonThisMonth),
    pipeline,
    progressRate,
    label: wonThisMonth >= monthlyTarget ? 'Hedef tamamlandı' : `${Math.max(0, monthlyTarget - wonThisMonth)} satış kaldı`,
  }
}

export function buildQrPerformanceRows(vehicles: VehicleLike[]) {
  return vehicles
    .filter((vehicle) => vehicle.scans > 0 || vehicle.leads > 0)
    .map((vehicle) => ({
      id: vehicle.id,
      title: `${vehicle.brand} ${vehicle.model}${vehicle.variant ? ` ${vehicle.variant}` : ''}`,
      scans: vehicle.scans,
      leads: vehicle.leads,
      conversionRate: vehicle.scans > 0 ? Math.round((vehicle.leads / vehicle.scans) * 1000) / 10 : 0,
      signal: vehicle.scans >= 10 && vehicle.leads === 0 ? 'Çok bakılıyor, lead yok' : vehicle.leads > 0 ? 'Lead üretiyor' : 'Veri birikiyor',
    }))
    .sort((left, right) => right.scans - left.scans)
}
