
'use client';

export interface UserData {
  isLoggedIn: boolean;
  firmaId: number;
  firmaAdi: string;
  email: string;
}

export class UnifiedAuthService {
  private static lastAuthCheck = 0;
  private static readonly AUTH_CHECK_COOLDOWN = 1000;
  private static authInProgress = false;

  static checkLoginStatus(): UserData {
    try {
      if (typeof window === 'undefined') {
        return {
          isLoggedIn: false,
          firmaId: 0,
          firmaAdi: '',
          email: ''
        };
      }

      // Basit cooldown kontrolü
      const now = Date.now();
      if (UnifiedAuthService.authInProgress || (now - UnifiedAuthService.lastAuthCheck) < UnifiedAuthService.AUTH_CHECK_COOLDOWN) {
        return {
          isLoggedIn: false,
          firmaId: 0,
          firmaAdi: '',
          email: ''
        };
      }

      UnifiedAuthService.authInProgress = true;
      UnifiedAuthService.lastAuthCheck = now;

      console.log('Unified auth kontrolü başlatılıyor...');

      // 1. Unified format kontrolü
      const unifiedData = localStorage.getItem('user_login_data');
      if (unifiedData) {
        try {
          const parsedData = JSON.parse(unifiedData);
          if (parsedData.email && parsedData.firmaAdi && parsedData.firmaId) {
            const userData = {
              isLoggedIn: true,
              firmaId: parsedData.firmaId,
              firmaAdi: parsedData.firmaAdi,
              email: parsedData.email
            };

            console.log('✅ Unified format: Giriş geçerli');
            UnifiedAuthService.authInProgress = false;
            return userData;
          }
        } catch (parseError) {
          console.warn('⚠️ Unified data parse hatası:', parseError);
        }
      }

      // 2. Legacy format kontrolü
      const isLoggedIn = localStorage.getItem('isLoggedIn');
      const userEmail = localStorage.getItem('userEmail');
      const firmaAdi = localStorage.getItem('firmaAdi');
      const firmaId = localStorage.getItem('firmaId');

      if (isLoggedIn === 'true' && userEmail && firmaAdi && firmaId) {
        const userData = {
          isLoggedIn: true,
          firmaId: parseInt(firmaId) || 0,
          firmaAdi: firmaAdi,
          email: userEmail
        };

        console.log('✅ Legacy format: Giriş geçerli');
        UnifiedAuthService.authInProgress = false;
        return userData;
      }

      console.log('❌ Geçerli giriş bulunamadı');
      UnifiedAuthService.authInProgress = false;
      return {
        isLoggedIn: false,
        firmaId: 0,
        firmaAdi: '',
        email: ''
      };

    } catch (error) {
      console.error('❌ Auth kontrol hatası:', error);
      UnifiedAuthService.authInProgress = false;
      return {
        isLoggedIn: false,
        firmaId: 0,
        firmaAdi: '',
        email: ''
      };
    }
  }

  static login(userData: {
    email: string;
    firmaAdi: string;
    firmaId: number;
  }): boolean {
    try {
      if (typeof window === 'undefined') return false;

      console.log('Unified giriş kayıt sistemi...', userData.email);

      // Unified format kayıt
      const unifiedData = {
        email: userData.email,
        firmaAdi: userData.firmaAdi,
        firmaId: userData.firmaId,
        loginTime: new Date().toISOString(),
        version: '2.0'
      };

      localStorage.setItem('user_login_data', JSON.stringify(unifiedData));

      // Legacy format kayıt (geriye uyumluluk)
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userEmail', userData.email);
      localStorage.setItem('firmaAdi', userData.firmaAdi);
      localStorage.setItem('firmaId', userData.firmaId.toString());

      console.log('✅ Giriş kayıt başarılı');
      return true;

    } catch (error) {
      console.error('❌ Giriş kayıt hatası:', error);
      return false;
    }
  }

  static logout(): void {
    try {
      if (typeof window === 'undefined') return;

      console.log('Unified çıkış temizliği...');

      // Unified format temizlik
      localStorage.removeItem('user_login_data');
      
      // Legacy format temizlik  
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('firmaAdi');
      localStorage.removeItem('firmaId');
      
      sessionStorage.clear();

      // Auth reset
      UnifiedAuthService.authInProgress = false;
      UnifiedAuthService.lastAuthCheck = 0;

      console.log('✅ Çıkış temizliği tamamlandı');

    } catch (error) {
      console.error('❌ Çıkış temizlik hatası:', error);
    }
  }

  static getCurrentUser(): {
    email: string;
    firmaAdi: string;
    firmaId: number;
  } | null {
    try {
      const userData = UnifiedAuthService.checkLoginStatus();

      if (!userData.isLoggedIn) {
        return null;
      }

      return {
        email: userData.email,
        firmaAdi: userData.firmaAdi,
        firmaId: userData.firmaId
      };

    } catch (error) {
      console.error('❌ Mevcut kullanıcı alım hatası:', error);
      return null;
    }
  }

  static isLoggedIn(): boolean {
    const userData = UnifiedAuthService.checkLoginStatus();
    return userData.isLoggedIn;
  }

  static getFirmaId(): number {
    const userData = UnifiedAuthService.checkLoginStatus();
    return userData.firmaId;
  }

  static getFirmaAdi(): string {
    const userData = UnifiedAuthService.checkLoginStatus();
    return userData.firmaAdi;
  }

  static getEmail(): string {
    const userData = UnifiedAuthService.checkLoginStatus();
    return userData.email;
  }
}
