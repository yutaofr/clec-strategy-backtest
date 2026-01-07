import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

/**
 * Haptic feedback utilities for mobile interactions
 */
export class HapticService {
  private async isNative(): Promise<boolean> {
    return Capacitor.isNativePlatform()
  }

  /**
   * Light impact for general interactions (button presses, selections)
   */
  async lightImpact(): Promise<void> {
    if (!(await this.isNative())) return
    try {
      await Haptics.impact({ style: ImpactStyle.Light })
    } catch (error) {
      console.warn('Haptic feedback not available:', error)
    }
  }

  /**
   * Medium impact for important actions (saving, confirming)
   */
  async mediumImpact(): Promise<void> {
    if (!(await this.isNative())) return
    try {
      await Haptics.impact({ style: ImpactStyle.Medium })
    } catch (error) {
      console.warn('Haptic feedback not available:', error)
    }
  }

  /**
   * Heavy impact for significant actions (deleting, running simulations)
   */
  async heavyImpact(): Promise<void> {
    if (!(await this.isNative())) return
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy })
    } catch (error) {
      console.warn('Haptic feedback not available:', error)
    }
  }

  /**
   * Success notification for completed actions
   */
  async successNotification(): Promise<void> {
    if (!(await this.isNative())) return
    try {
      await Haptics.notification({ type: NotificationType.Success })
    } catch (error) {
      console.warn('Haptic feedback not available:', error)
    }
  }

  /**
   * Warning notification for cautionary actions
   */
  async warningNotification(): Promise<void> {
    if (!(await this.isNative())) return
    try {
      await Haptics.notification({ type: NotificationType.Warning })
    } catch (error) {
      console.warn('Haptic feedback not available:', error)
    }
  }

  /**
   * Error notification for failed actions
   */
  async errorNotification(): Promise<void> {
    if (!(await this.isNative())) return
    try {
      await Haptics.notification({ type: NotificationType.Error })
    } catch (error) {
      console.warn('Haptic feedback not available:', error)
    }
  }
}

export const haptics = new HapticService()
