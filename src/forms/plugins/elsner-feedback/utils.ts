export function shouldShowElsnerTrendLine(
  isAuthenticated: boolean,
  isKioskUser: boolean,
): boolean {
  return isAuthenticated && !isKioskUser
}
