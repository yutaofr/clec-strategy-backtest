import { Preferences } from '@capacitor/preferences'
import { Capacitor } from '@capacitor/core'

/**
 * Storage service that uses @capacitor/preferences on native platforms
 * and falls back to localStorage on web
 */
class StorageService {
  private async isNative(): Promise<boolean> {
    return Capacitor.isNativePlatform()
  }

  async get(key: string): Promise<string | null> {
    if (await this.isNative()) {
      try {
        const { value } = await Preferences.get({ key })
        return value
      } catch (error) {
        console.warn('Failed to get preference:', error)
        return null
      }
    } else {
      return localStorage.getItem(key)
    }
  }

  async set(key: string, value: string): Promise<void> {
    if (await this.isNative()) {
      try {
        await Preferences.set({ key, value })
      } catch (error) {
        console.warn('Failed to set preference:', error)
        // Fallback to localStorage if Preferences fails
        localStorage.setItem(key, value)
      }
    } else {
      localStorage.setItem(key, value)
    }
  }

  async remove(key: string): Promise<void> {
    if (await this.isNative()) {
      try {
        await Preferences.remove({ key })
      } catch (error) {
        console.warn('Failed to remove preference:', error)
        // Fallback to localStorage if Preferences fails
        localStorage.removeItem(key)
      }
    } else {
      localStorage.removeItem(key)
    }
  }

  async clear(): Promise<void> {
    if (await this.isNative()) {
      try {
        await Preferences.clear()
      } catch (error) {
        console.warn('Failed to clear preferences:', error)
      }
    } else {
      localStorage.clear()
    }
  }
}

export const storage = new StorageService()
