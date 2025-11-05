import { Component, NgZone, ViewChild, AfterViewInit, OnInit } from '@angular/core';
import { IonInput, ToastController, LoadingController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { ReviewService } from '../../services/review.service';
import { supabase } from '../../services/supabase.client';

declare var google: any;

@Component({
  standalone: false,
  selector: 'app-editreview',
  templateUrl: './editreview.page.html',
  styleUrls: ['./editreview.page.scss']
})
export class EditreviewPage implements OnInit, AfterViewInit {
  @ViewChild('autocompleteAddress', { static: false }) autocompleteInput!: IonInput;

  reviewId!: string;
  homeowner_name = '';
  project_type = '';
  address = '';
  zip = '';
  project_date: string | null = null;
  comments = '';
  files: File[] = [];
  existingFiles: { name: string; url: string }[] = [];
  services: any[] = [];

  lat: number | null = null;
  lng: number | null = null;
  selectedState: string = '';
  selectedCity: string = '';

  autocomplete: any;

  stateList: string[] = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
    'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
    'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
    'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
    'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
    'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
    'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
    'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
    'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
    'West Virginia', 'Wisconsin', 'Wyoming'
  ];

  ratingCategories = [
    { key: 'rating_payment', label: 'Payment Timeliness', model: 0 },
    { key: 'rating_communication', label: 'Communication', model: 0 },
    { key: 'rating_scope', label: 'Scope Clarity', model: 0 },
    { key: 'rating_change_orders', label: 'Change Order Fairness', model: 0 },
    { key: 'rating_overall', label: 'Overall Experience', model: 0 }
  ];

  constructor(
    private route: ActivatedRoute,
    private reviewSvc: ReviewService,
    private router: Router,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private ngZone: NgZone
  ) {}

  async ngOnInit() {
    this.reviewId = this.route.snapshot.paramMap.get('id')!;
    try {
      this.services = await this.reviewSvc.getServices();

      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('id', this.reviewId);

      if (error) throw error;
      if (!data || data.length === 0) {
        this.presentToast('Review not found', 'danger');
        this.router.navigateByUrl('/tabs/myreview');
        return;
      }

      const review = data[0];
      this.homeowner_name = review.homeowner_name;
      this.project_type = review.project_type;
      this.address = review.address;
      this.zip = review.zip;
      this.project_date = review.project_date;
      this.comments = review.comments;
      this.selectedState = review.state || '';
      this.selectedCity = review.city || '';
      this.lat = review.lat || null;
      this.lng = review.lng || null;

      this.ratingCategories.forEach(cat => {
        cat.model = review[cat.key] || 0;
      });

      if (review.files) {
        try {
          const parsedFiles: string[] = JSON.parse(review.files);
          if (Array.isArray(parsedFiles)) {
            this.existingFiles = parsedFiles.map(url => ({
              name: url.split('/').pop() || 'file',
              url
            }));
          }
        } catch (err) {
          console.error('Failed to parse files:', err);
        }
      }
    } catch (err) {
      console.error('Failed to load review:', err);
      this.presentToast('Failed to load review', 'danger');
    }
  }

  ngAfterViewInit() {
    this.initAutocomplete();
  }

  initAutocomplete() {
    this.autocompleteInput.getInputElement().then((inputEl: HTMLInputElement) => {
      this.autocomplete = new google.maps.places.Autocomplete(inputEl, {
        types: ['address'],
        componentRestrictions: { country: 'us' }
      });

      this.autocomplete.addListener('place_changed', () => {
        this.ngZone.run(() => {
          const place = this.autocomplete.getPlace();
          if (place && place.formatted_address) {
            this.extractAddressComponents(place, true);
          }
        });
      });

      inputEl.addEventListener('blur', () => {
        const enteredAddress = inputEl.value.trim();
        if (enteredAddress) this.geocodeManualAddress(enteredAddress);
      });
    });
  }

  extractAddressComponents(place: any, overwriteAddress = true) {
    if (overwriteAddress && place.formatted_address) {
      this.address = place.formatted_address;
    }

    const comps = place.address_components || [];
    const getComp = (type: string) =>
      comps.find((c: any) => c.types.includes(type))?.long_name || '';

    this.zip = getComp('postal_code');
    this.selectedCity = getComp('locality') || getComp('sublocality') || '';

    const stateRaw = getComp('administrative_area_level_1') || '';
    if (stateRaw) {
      const matchedState = this.stateList.find(
        s => s.toLowerCase() === stateRaw.toLowerCase()
      );
      this.selectedState = matchedState || '';
    }

    if (place.geometry && place.geometry.location) {
      this.lat = place.geometry.location.lat();
      this.lng = place.geometry.location.lng();
    }
  }

  geocodeManualAddress(address: string) {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address, region: 'US', componentRestrictions: { country: 'us' } }, (results: any, status: any) => {
      if (status === 'OK' && results.length > 0) {
        this.ngZone.run(() => this.extractAddressComponents(results[0], false));
      } else {
        console.warn('Manual geocode failed:', status);
      }
    });
  }

  onFileChange(ev: any) {
    this.files = Array.from(ev.target.files || []);
  }

  async deleteFile(file: { name: string; url: string }) {
    const confirmDelete = window.confirm(`Delete "${file.name}"?`);
    if (!confirmDelete) return;
    this.existingFiles = this.existingFiles.filter(f => f.url !== file.url);
    this.presentToast(`File "${file.name}" removed`);
  }

  async update() {
    if (!this.homeowner_name || !this.address || !this.zip || !this.project_type) {
      this.presentToast('Please fill all required fields', 'danger');
      return;
    }
    const unRated = this.ratingCategories.some(cat => cat.model === 0);
    if (unRated) {
      this.presentToast('Please rate all categories before updating', 'danger');
      return;
    }

    const loading = await this.loadingCtrl.create({ message: 'Updating review...', spinner: 'crescent' });
    await loading.present();

    try {
      const newFilesUrls: string[] = [];
      for (const file of this.files) {
        const path = `reviews/${this.reviewId}_${Date.now()}_${file.name}`;
        const { error: uploadErr } = await supabase.storage.from('profile-images').upload(path, file, { upsert: true });
        if (uploadErr) throw uploadErr;
        const { data } = supabase.storage.from('profile-images').getPublicUrl(path);
        newFilesUrls.push(data.publicUrl);
      }

      const finalFiles = [...this.existingFiles.map(f => f.url), ...newFilesUrls];

      const updates: any = {
        homeowner_name: this.homeowner_name,
        project_type: this.project_type,
        address: this.address,
        zip: this.zip,
        state: this.selectedState,
        city: this.selectedCity,
        lat: this.lat,
        lng: this.lng,
        project_date: this.project_date || null,
        comments: this.comments,
        files: JSON.stringify(finalFiles)
      };

      this.ratingCategories.forEach(cat => (updates[cat.key] = cat.model));

      await this.reviewSvc.updateReview(this.reviewId, updates);
      this.presentToast('Review updated successfully');
      this.router.navigateByUrl('/tabs/myreview', { replaceUrl: true });
    } catch (err: any) {
      console.error('Update failed:', err);
      this.presentToast(err.message || 'Update failed', 'danger');
    } finally {
      loading.dismiss();
    }
  }

  async presentToast(message: string, color: string = 'success') {
    const toast = await this.toastCtrl.create({ message, duration: 2500, color });
    toast.present();
  }
}
