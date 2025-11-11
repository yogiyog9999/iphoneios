import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { ToastController, AlertController, LoadingController } from '@ionic/angular';

@Component({
  standalone: false,
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss']
})
export class RegisterPage {
  email = '';
  firstName = '';
  lastName = '';
  password = '';
  confirmPassword = '';
  acceptTerms = false;
  loading = false;
  error = '';
  showPassword = false;
  showConfirmPassword = false;

  // Password strength variables
  strengthPercent = 0;
  strengthText = '';
  strengthColor: 'danger' | 'warning' | 'success' | 'medium' = 'medium';
  strengthClass = '';
  
  uppercaseRegex: RegExp = /[A-Z]/;
lowercaseRegex: RegExp = /[a-z]/;
numberRegex: RegExp = /\d/;
specialCharRegex: RegExp = /[!@#$%^&*(),.?":{}|<>]/;  
  constructor(
    private auth: AuthService,
    private router: Router,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController
  ) {}

  togglePassword(field: 'password' | 'confirm') {
    if (field === 'password') this.showPassword = !this.showPassword;
    else this.showConfirmPassword = !this.showConfirmPassword;
  }

  checkPasswordStrength() {
    const password = this.password || '';
    let score = 0;

    if (password.length >= 12) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;

    this.strengthPercent = (score / 5) * 100;

    if (score <= 2) {
      this.strengthText = 'Weak';
      this.strengthColor = 'danger';
      this.strengthClass = 'strength-weak';
    } else if (score === 3 || score === 4) {
      this.strengthText = 'Medium';
      this.strengthColor = 'warning';
      this.strengthClass = 'strength-medium';
    } else if (score === 5) {
      this.strengthText = 'Strong';
      this.strengthColor = 'success';
      this.strengthClass = 'strength-strong';
    }
  }

  async register() {
    this.error = '';

    // ✅ Password validation
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{12,}$/;

    if (!passwordRegex.test(this.password)) {
      this.error =
        'Password must be at least 12 characters long and include uppercase, lowercase, number, and special character.';
      return;
    }

    // ✅ Confirm password
    if (this.password !== this.confirmPassword) {
      this.error = 'Passwords do not match';
      return;
    }

    // ✅ Terms
    if (!this.acceptTerms) {
      this.error = 'Please accept the terms and conditions.';
      return;
    }

    this.loading = true;
    const loader = await this.loadingCtrl.create({
      message: 'Creating account...',
      spinner: 'crescent'
    });
    await loader.present();

    try {
      const { user } = await this.auth.signUp(
        this.email,
        this.password,
        this.firstName,
        this.lastName
      );
      await loader.dismiss();

      if (user) {
        if (!user.identities || user.identities.length === 0) {
          if (!user.email_confirmed_at) {
            const alert = await this.alertCtrl.create({
              header: 'Email Not Verified',
              message:
                'This email is already registered but not verified. Would you like us to resend the verification link?',
              buttons: [
                { text: 'Cancel', role: 'cancel' },
                {
                  text: 'Resend Link',
                  handler: async () => {
                    try {
                      await this.auth.resendVerificationEmail(this.email);
                      this.showToast('Verification email sent again! 📩', 'success');
                    } catch (err: any) {
                      this.showToast(
                        err.message || 'Failed to resend verification email',
                        'danger'
                      );
                    }
                  }
                }
              ]
            });
            await alert.present();
          } else {
            this.error = 'This email is already registered. Please login instead.';
            this.showAlert('Registration Failed', this.error);
          }
          return;
        }

        await this.showAlert(
  'Verify Your Email',
  'Registration successful! Please check your inbox (and also your Spam or Junk folder) to verify your email before logging in.'
);

        this.router.navigate(['/auth/login']);
      }
    } catch (e: any) {
      await loader.dismiss();
      this.error = e.message || 'Registration failed';
      this.showAlert('Registration Failed', this.error);
    } finally {
      this.loading = false;
    }
  }

  gotoLogin() {
    this.router.navigate(['auth/login']);
  }

  async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'top'
    });
    toast.present();
  }

  async showAlert(header: string, message: string) {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }
  getPasswordHintColor(regex: RegExp): string {
  return regex.test(this.password) ? 'green' : 'red';
}
allPasswordHintsPassed(): boolean {
  return (
    this.password.length >= 12 &&
    this.uppercaseRegex.test(this.password) &&
    this.lowercaseRegex.test(this.password) &&
    this.numberRegex.test(this.password) &&
    this.specialCharRegex.test(this.password)
  );
}

}
