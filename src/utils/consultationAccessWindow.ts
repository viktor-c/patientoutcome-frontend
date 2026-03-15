export interface ConsultationAccessWindow {
  consultationAccessDaysBefore: number
  consultationAccessDaysAfter: number
  activeFrom: string
  activeUntil: string
  isActive: boolean
}

export interface ConsultationAccessWindowSettings {
  consultationAccessDaysBefore: number
  consultationAccessDaysAfter: number
}

function addDays(date: Date, amount: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function endOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(23, 59, 59, 999)
  return next
}

export function buildConsultationAccessWindow(
  consultationDate: string | Date | undefined,
  settings: ConsultationAccessWindowSettings,
): ConsultationAccessWindow | null {
  if (!consultationDate) return null

  const date = new Date(consultationDate)
  if (Number.isNaN(date.getTime())) return null

  const activeFrom = startOfDay(addDays(date, -settings.consultationAccessDaysBefore))
  const activeUntil = endOfDay(addDays(date, settings.consultationAccessDaysAfter))
  const now = new Date()

  return {
    consultationAccessDaysBefore: settings.consultationAccessDaysBefore,
    consultationAccessDaysAfter: settings.consultationAccessDaysAfter,
    activeFrom: activeFrom.toISOString(),
    activeUntil: activeUntil.toISOString(),
    isActive: now >= activeFrom && now <= activeUntil,
  }
}

export function extractConsultationAccessWindow(value: unknown): ConsultationAccessWindow | null {
  if (!value || typeof value !== 'object') return null

  const record = value as Record<string, unknown>
  const activeFrom = typeof record.activeFrom === 'string' ? record.activeFrom : null
  const activeUntil = typeof record.activeUntil === 'string' ? record.activeUntil : null

  if (!activeFrom || !activeUntil) return null

  const startsAt = new Date(activeFrom)
  const endsAt = new Date(activeUntil)
  const now = new Date()

  return {
    consultationAccessDaysBefore: typeof record.consultationAccessDaysBefore === 'number' ? record.consultationAccessDaysBefore : 0,
    consultationAccessDaysAfter: typeof record.consultationAccessDaysAfter === 'number' ? record.consultationAccessDaysAfter : 0,
    activeFrom,
    activeUntil,
    isActive: typeof record.isActive === 'boolean' ? record.isActive : now >= startsAt && now <= endsAt,
  }
}

export function getConsultationAccessWindowFromConsultation(
  consultation: unknown,
  fallbackSettings?: ConsultationAccessWindowSettings | null,
): ConsultationAccessWindow | null {
  if (!consultation || typeof consultation !== 'object') return null

  const record = consultation as Record<string, unknown>
  const fromBackend = extractConsultationAccessWindow(record.consultationAccessWindow)
  if (fromBackend) return fromBackend

  if (!fallbackSettings) return null

  const consultationDate = record.dateAndTime
  if (typeof consultationDate !== 'string' && !(consultationDate instanceof Date)) return null

  return buildConsultationAccessWindow(consultationDate, fallbackSettings)
}