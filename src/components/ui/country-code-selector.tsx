'use client'

import { useState, useMemo } from 'react'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Search } from "lucide-react"
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command"

interface CountryCode {
  code: string
  name: string
  dial_code: string
  flag: string
}

const countryCodes: CountryCode[] = [
  { code: 'CO', name: 'Colombia', dial_code: '+57', flag: '🇨🇴' },
  { code: 'US', name: 'Estados Unidos', dial_code: '+1', flag: '🇺🇸' },
  { code: 'MX', name: 'México', dial_code: '+52', flag: '🇲🇽' },
  { code: 'ES', name: 'España', dial_code: '+34', flag: '🇪🇸' },
  { code: 'AR', name: 'Argentina', dial_code: '+54', flag: '🇦🇷' },
  { code: 'CL', name: 'Chile', dial_code: '+56', flag: '🇨🇱' },
  { code: 'PE', name: 'Perú', dial_code: '+51', flag: '🇵🇪' },
  { code: 'VE', name: 'Venezuela', dial_code: '+58', flag: '🇻🇪' },
  { code: 'EC', name: 'Ecuador', dial_code: '+593', flag: '🇪🇨' },
  { code: 'UY', name: 'Uruguay', dial_code: '+598', flag: '🇺🇾' },
  { code: 'PY', name: 'Paraguay', dial_code: '+595', flag: '🇵🇾' },
  { code: 'BO', name: 'Bolivia', dial_code: '+591', flag: '🇧🇴' },
  { code: 'BR', name: 'Brasil', dial_code: '+55', flag: '🇧🇷' },
  { code: 'IT', name: 'Italia', dial_code: '+39', flag: '🇮🇹' },
  { code: 'FR', name: 'Francia', dial_code: '+33', flag: '🇫🇷' },
  { code: 'DE', name: 'Alemania', dial_code: '+49', flag: '🇩🇪' },
  { code: 'UK', name: 'Reino Unido', dial_code: '+44', flag: '🇬🇧' },
  // Agrega más países según necesites
]

interface CountryCodeSelectorProps {
  value?: string
  onChange?: (value: string) => void
  onPhoneChange?: (value: string) => void
  phoneValue?: string
  required?: boolean
}

export function CountryCodeSelector({
  value,
  onChange,
  onPhoneChange,
  phoneValue = '',
  required = false
}: CountryCodeSelectorProps) {
  const [selectedCode, setSelectedCode] = useState(value || '+57')
  const [phoneNumber, setPhoneNumber] = useState(phoneValue.replace(/^\+\d+\s*/, '') || '')
  const [open, setOpen] = useState(false)

  // Encontrar el país seleccionado
  const selectedCountry = useMemo(() => {
    return countryCodes.find(country => country.dial_code === selectedCode)
  }, [selectedCode])

  const handleCodeChange = (newCode: string) => {
    setSelectedCode(newCode)
    setOpen(false)
    if (onChange) {
      onChange(newCode)
    }
    // Si ya hay un número, actualizar el valor completo
    if (phoneNumber && onPhoneChange) {
      onPhoneChange(`${newCode} ${phoneNumber}`)
    }
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPhone = e.target.value
    setPhoneNumber(newPhone)
    if (onPhoneChange) {
      onPhoneChange(`${selectedCode} ${newPhone}`)
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="phone">Teléfono</Label>
      <div className="flex gap-2">
        <div className="w-40">
          <Select open={open} onOpenChange={setOpen} value={selectedCode}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {selectedCountry && (
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{selectedCountry.flag}</span>
                    <span>{selectedCountry.dial_code}</span>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <Command>
                <CommandInput placeholder="Buscar país..." className="h-9" />
                <CommandList>
                  <CommandEmpty>No se encontró el país.</CommandEmpty>
                  <CommandGroup>
                    {countryCodes.map((country) => (
                      <CommandItem
                        key={country.code}
                        value={`${country.name} ${country.dial_code}`}
                        onSelect={() => handleCodeChange(country.dial_code)}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center gap-2 w-full">
                          <span className="text-lg">{country.flag}</span>
                          <div className="flex-1">
                            <div className="text-sm font-medium">{country.name}</div>
                            <div className="text-xs text-muted-foreground">{country.dial_code}</div>
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <Input
            id="phone"
            type="tel"
            placeholder="Número de teléfono"
            value={phoneNumber}
            onChange={handlePhoneChange}
            required={required}
          />
        </div>
      </div>
      <p className="text-xs text-gray-500">
        Ejemplo: {selectedCode} 300 123 4567
      </p>
    </div>
  )
}