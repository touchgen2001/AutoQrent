'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { carBrands } from '@/lib/vehicle-display'

interface SearchFilterBarProps {
  onSearch?: (query: string) => void
  onFilterChange?: (filters: FilterState) => void
  showBrandFilter?: boolean
  showYearFilter?: boolean
  showPriceFilter?: boolean
  showFuelFilter?: boolean
  showTransmissionFilter?: boolean
  showSortOptions?: boolean
  className?: string
}

export interface FilterState {
  brand?: string
  yearMin?: string
  yearMax?: string
  priceMin?: string
  priceMax?: string
  fuelType?: string
  transmission?: string
  sortBy?: string
}

export function SearchFilterBar({
  onSearch,
  onFilterChange,
  showBrandFilter = true,
  showYearFilter = true,
  showPriceFilter = true,
  showFuelFilter = true,
  showTransmissionFilter = true,
  showSortOptions = true,
  className
}: SearchFilterBarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<FilterState>({})

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 20 }, (_, i) => (currentYear - i).toString())

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    onSearch?.(value)
  }

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value === 'all' ? undefined : value }
    setFilters(newFilters)
    onFilterChange?.(newFilters)
  }

  const clearFilters = () => {
    setFilters({})
    setSearchQuery('')
    onSearch?.('')
    onFilterChange?.({})
  }

  const hasActiveFilters = Object.values(filters).some(v => v) || searchQuery

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Araç ara... (marka, model)"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowFilters(!showFilters)}
          className={cn(showFilters && 'bg-accent text-accent-foreground')}
        >
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
        {hasActiveFilters && (
          <Button variant="ghost" size="icon" onClick={clearFilters}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 p-4 bg-muted/50 rounded-lg border border-border">
          {showBrandFilter && (
            <Select value={filters.brand || 'all'} onValueChange={(v) => handleFilterChange('brand', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Marka" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Markalar</SelectItem>
                {carBrands.map(brand => (
                  <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {showYearFilter && (
            <Select value={filters.yearMin || 'all'} onValueChange={(v) => handleFilterChange('yearMin', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Min Yıl" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Min Yıl</SelectItem>
                {years.map(year => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {showPriceFilter && (
            <Select value={filters.priceMax || 'all'} onValueChange={(v) => handleFilterChange('priceMax', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Max Fiyat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Max Fiyat</SelectItem>
                <SelectItem value="500000">500.000 TL</SelectItem>
                <SelectItem value="1000000">1.000.000 TL</SelectItem>
                <SelectItem value="1500000">1.500.000 TL</SelectItem>
                <SelectItem value="2000000">2.000.000 TL</SelectItem>
                <SelectItem value="3000000">3.000.000 TL</SelectItem>
                <SelectItem value="5000000">5.000.000 TL</SelectItem>
              </SelectContent>
            </Select>
          )}

          {showFuelFilter && (
            <Select value={filters.fuelType || 'all'} onValueChange={(v) => handleFilterChange('fuelType', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Yakıt" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Yakıtlar</SelectItem>
                <SelectItem value="benzin">Benzin</SelectItem>
                <SelectItem value="dizel">Dizel</SelectItem>
                <SelectItem value="lpg">LPG</SelectItem>
                <SelectItem value="hibrit">Hibrit</SelectItem>
                <SelectItem value="elektrik">Elektrik</SelectItem>
              </SelectContent>
            </Select>
          )}

          {showTransmissionFilter && (
            <Select value={filters.transmission || 'all'} onValueChange={(v) => handleFilterChange('transmission', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Vites" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Vitesler</SelectItem>
                <SelectItem value="otomatik">Otomatik</SelectItem>
                <SelectItem value="manuel">Manuel</SelectItem>
                <SelectItem value="yarı-otomatik">Yarı Otomatik</SelectItem>
              </SelectContent>
            </Select>
          )}

          {showSortOptions && (
            <Select value={filters.sortBy || 'newest'} onValueChange={(v) => handleFilterChange('sortBy', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Sıralama" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">En Yeni</SelectItem>
                <SelectItem value="price-asc">Fiyat (Artan)</SelectItem>
                <SelectItem value="price-desc">Fiyat (Azalan)</SelectItem>
                <SelectItem value="views">En Çok İncelenen</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      )}
    </div>
  )
}
