import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { supabase } from '../../services/supabase.client';
import { AuthService, ContractorProfile } from '../../services/auth.service';
import { ToastController, LoadingController } from '@ionic/angular';
import { ReviewService } from '../../services/review.service';
@Component({
  standalone: false,
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss']
})
export class ProfilePage implements OnInit {
  userId = '';
  user: any = {};          // user info including profile image
  reviewCount: number = 0; // number of reviews
  userBadge: any; 
  isLoading = false; 
  form: ContractorProfile = {
    business_name: '',
	first_name: '',
	last_name: '',
    trade: '',
    city: '',
    state: '',
    country: '',
    license_number: '',
    profile_image_url: ''
  };
services: any[] = [];
states: any[] = [];

  constructor(
    private reviewSvc: ReviewService,
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController
  ) {}

  async ngOnInit() {
    this.isLoading = true; // start loading
    try {
      this.services = await this.reviewSvc.getServices();
    } catch (err) {
      console.error('Failed to load services:', err);
    }
    this.route.queryParams.subscribe(async params => {
      this.userId = params['userId'];
      if (!this.userId) {
        const user = await this.auth.currentUser();
        if (user) this.userId = user.id;
      }
      if (!this.userId) {
        this.isLoading = false;
        return;
      }

      const existing = await this.auth.getProfile(this.userId);
      if (existing) this.form = { ...existing };

      this.isLoading = false; // stop loading
    });
	
	try {
    this.states = await this.reviewSvc.getStates(); // fetch from service
  } catch (err) {
    console.error('Failed to load states', err);
    this.presentToast('Failed to load states', 'danger');
  }
  
  try {
    this.userBadge = await this.reviewSvc.fetchUserBadge(this.userId);
  } catch (err) {
    console.error('Failed to fetch user badge', err);
  }
   this.reviewCount = await this.reviewSvc.getUserReviewCount(this.userId);
  
  }

  async presentToast(message: string, color: string = 'primary') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      position: 'bottom',
      color
    });
    await toast.present();
  }

  async uploadImage(event: any) {
  const file = event.target.files[0];
  if (!file || !this.userId) return;

  const ext = file.name.split('.').pop();
  const path = `profile-images/${this.userId}.${ext}`;

  const loading = await this.loadingCtrl.create({ message: 'Uploading...' });
  await loading.present();

  try {
    const { error: uploadError } = await supabase.storage
      .from('profile-images')
      .upload(path, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('profile-images').getPublicUrl(path);
    this.form.profile_image_url = `${data.publicUrl}?t=${Date.now()}`;

    // Optional: also save in DB
    await this.auth.upsertProfile(this.userId, { ...this.form });

    this.presentToast('Profile image updated!', 'success');
  } catch (e: any) {
    this.presentToast(e.message || 'Image upload failed', 'danger');
  } finally {
    loading.dismiss();
  }
}

  async save() {
  if (!this.userId) {
    this.presentToast('No user found', 'danger');
    return;
  }

  // Required field validation
  const required = ['business_name', 'trade', 'city', 'state'] as const;
  for (const k of required) {
    if (!(this.form as any)[k]) {
      this.presentToast(`Please fill ${k.replace('_', ' ')}`, 'warning');
      return;
    }
  }

  // --- Phone validation ---
  const phoneRaw = (this.form.phone || '').replace(/\D/g, ''); // strip formatting
  //const phoneRegex = /^[2-9]\d{2}[2-9]\d{2}\d{4}$/; // NANP format (10 digits)
  const phoneRegex = /^\d{10}$/; 

  if (!phoneRegex.test(phoneRaw)) {
    this.presentToast('Please enter a valid 10-digit US phone number', 'warning');
    return;
  }
  // save only raw numeric phone
  this.form.phone = phoneRaw;

  // --- ZIP validation ---
  const zipRegex = /^\d{5}$/;
  if (!zipRegex.test(this.form.zip || '')) {
    this.presentToast('Please enter a valid 5-digit ZIP code', 'warning');
    return;
  }

  const loading = await this.loadingCtrl.create({ message: 'Saving...' });
  await loading.present();

  try {
    await this.auth.upsertProfile(this.userId, this.form);
    this.presentToast('Profile saved successfully!', 'success');
    this.router.navigate(['/tabs/profile']);
  } catch (e: any) {
    this.presentToast(e.message || 'Failed to save profile', 'danger');
  } finally {
    loading.dismiss();
  }
}
formatPhone(event: any) {
  let input = event.target.value.replace(/\D/g, ''); // strip all non-numeric
  if (input.length > 10) {
    input = input.substring(0, 10); // max 10 digits
  }

  // format visually
  if (input.length > 6) {
    this.form.phone = `(${input.substring(0, 3)}) ${input.substring(3, 6)}-${input.substring(6)}`;
  } else if (input.length > 3) {
    this.form.phone = `(${input.substring(0, 3)}) ${input.substring(3)}`;
  } else if (input.length > 0) {
    this.form.phone = `(${input}`;
  } else {
    this.form.phone = '';
  }
}

}
