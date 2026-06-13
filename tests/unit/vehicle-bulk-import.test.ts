import { describe, expect, it } from 'vitest'
import { parseVehicleCsv } from '@/lib/vehicle-bulk-import'

describe('parseVehicleCsv', () => {
  it('parses Turkish headers and formatted integer values', () => {
    const rows = parseVehicleCsv(
      'marka,model,paket,yil,fiyat,km,yakit,vites,aciklama\nToyota,Corolla,Flame,2022,1.250.000,42.000,Benzin,Otomatik,"Temiz, bakımlı"',
    )

    expect(rows).toEqual([
      expect.objectContaining({
        brand: 'Toyota',
        model: 'Corolla',
        year: 2022,
        price: 1250000,
        mileage: 42000,
        description: 'Temiz, bakımlı',
      }),
    ])
  })

  it('parses semicolon-delimited files exported by Turkish Excel', () => {
    const rows = parseVehicleCsv('marka;model;yil;fiyat;km;yakit;vites\nRenault;Clio;2021;900000;35000;Benzin;Otomatik')
    expect(rows[0]).toEqual(expect.objectContaining({ brand: 'Renault', model: 'Clio', year: 2021 }))
  })
})
