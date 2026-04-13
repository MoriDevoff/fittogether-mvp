"use client"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

const trainingTypes = [
  { id: "gym", label: "Зал" },
  { id: "running", label: "Бег" },
  { id: "functional", label: "Функциональные" },
  { id: "home", label: "Домашние" },
]

export function SearchFilters() {
  return (
    <div className="space-y-8 bg-white border border-border rounded-3xl p-8 sticky top-8">
      <div>
        <Label className="text-base">Уровень подготовки</Label>
        <Select>
          <SelectTrigger className="mt-3">
            <SelectValue placeholder="Любой" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="beginner">Новичок</SelectItem>
            <SelectItem value="intermediate">Средний</SelectItem>
            <SelectItem value="advanced">Продвинутый</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-base">Тип тренировок</Label>
        <div className="mt-3 space-y-3">
          {trainingTypes.map((type) => (
            <div key={type.id} className="flex items-center gap-3">
              <Checkbox id={type.id} />
              <Label htmlFor={type.id} className="font-normal">{type.label}</Label>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-4">
        <Button className="w-full">Применить фильтры</Button>
      </div>
    </div>
  )
}