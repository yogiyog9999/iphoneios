import { Component, NgZone, ViewChild, AfterViewInit } from '@angular/core';
import { IonInput, ToastController, LoadingController } from '@ionic/angular';
import { ReviewService } from '../../services/review.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { supabase } from '../../services/supabase.client';
 import { debounceTime } from 'rxjs/operators';
import { fromEvent } from 'rxjs';

declare var google: any;

@Component({
  standalone: false,
  selector: 'app-review-new',
  templateUrl: './review-new.page.html',
  styleUrls: ['./review-new.page.scss']
})
export class ReviewNewPage implements AfterViewInit {
  @ViewChild('autocompleteAddress', { static: false }) autocompleteInput!: IonInput;
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
  homeowner_name = '';
  project_type = '';
  address = '';
  zip = '';
  project_date = '';
  comments = '';
  files: File[] = [];
  me: any;
  services: any[] = [];
  autocomplete: any;
  lat: number | null = null;
  lng: number | null = null;
  selectedState: string = '';
  selectedCity: string = '';

  ratingCategories = [
    { key: 'rating_payment', label: 'Payment Timeliness', model: 0 },
    { key: 'rating_communication', label: 'Communication', model: 0 },
    { key: 'rating_scope', label: 'Scope Clarity', model: 0 },
    { key: 'rating_change_orders', label: 'Change Order Fairness', model: 0 },
    { key: 'rating_overall', label: 'Overall Experience', model: 0 }
  ];

  constructor(
    private reviewSvc: ReviewService,
    private auth: AuthService,
    private router: Router,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private ngZone: NgZone
  ) {}

  async ngOnInit() {
    try {
      this.services = await this.reviewSvc.getServices();
    } catch (err) {
      console.error('Failed to load services:', err);
    }
  }

  ngAfterViewInit() {
    this.initAutocomplete();
  }


initAutocomplete() {
  this.autocompleteInput.getInputElement().then((inputEl: HTMLInputElement) => {
    inputEl.setAttribute('autocomplete', 'off');

    this.autocomplete = new google.maps.places.Autocomplete(inputEl, {
      types: ['address'],
      componentRestrictions: { country: 'us' },
      fields: ['formatted_address', 'address_components', 'geometry']
    });

    let suggestionPicked = false;

    // Google suggestion selected
    this.autocomplete.addListener('place_changed', () => {
      this.ngZone.run(() => {
        const place = this.autocomplete.getPlace();
        if (!place || !place.formatted_address) return;

        suggestionPicked = true;
        this.address = place.formatted_address;
        this.updateAddressFromPlace(place);
      });
    });

    // Debounced typing
    fromEvent(inputEl, 'input')
      .pipe(debounceTime(500)) // wait 0.5s after user stops typing
      .subscribe(() => {
        if (!suggestionPicked) {
          const typedValue = inputEl.value.trim();
          if (typedValue) {
            this.address = typedValue;
            this.geocodeManualAddress(typedValue);
          } else {
            this.clearAddressFields();
          }
        }
      });

    // Paste event
    inputEl.addEventListener('paste', () => {
      setTimeout(() => {
        const typedValue = inputEl.value.trim();
        if (typedValue) this.geocodeManualAddress(typedValue);
      }, 200);
    });

    // Blur event
    inputEl.addEventListener('blur', () => {
      const typedValue = inputEl.value.trim();
      if (!typedValue) {
        this.clearAddressFields();
        suggestionPicked = false;
        return;
      }

      if (!suggestionPicked) {
        this.address = typedValue;
        this.geocodeManualAddress(typedValue);
      }

      suggestionPicked = false;
    });
  });
}

/** Clears city/state/zip/lat/lng */
clearAddressFields() {
  this.selectedCity = '';
  this.selectedState = '';
  this.zip = '';
  this.lat = null;
  this.lng = null;
}

/** Geocode manually typed/pasted address */
geocodeManualAddress(address: string) {
  const geocoder = new google.maps.Geocoder();
  geocoder.geocode({ address, region: 'US' }, (results: any, status: any) => {
    this.ngZone.run(() => {
      if (status === 'OK' && results && results[0]) {
        this.updateAddressFromPlace(results[0]);
      } else {
        console.warn('Geocode failed:', status);

        // Fallback regex parsing
        const zipMatch = address.match(/\b\d{5}(?:-\d{4})?\b/);
        const stateMatch = address.match(/\b[A-Z]{2}\b/);
        if (zipMatch) this.zip = zipMatch[0];
        if (stateMatch) this.selectedState = this.stateList.find(s => s.includes(stateMatch[0])) || stateMatch[0];

        const cityCandidate = address.replace(this.zip, '').replace(stateMatch?.[0] || '', '').split(',')[0];
        if (cityCandidate) this.selectedCity = cityCandidate.trim();
      }
    });
  });
}

/** Fill city/state/zip/lat/lng from Google place or fallback to geocode */
updateAddressFromPlace(place: any) {
  if (!place.address_components) return;

  const components = place.address_components;
  const get = (types: string[]) => {
    const comp = components.find((c: any) =>
      types.some((t: string) => c.types.includes(t))
    );
    return comp ? comp.long_name : '';
  };

  this.zip = get(['postal_code']) || '';
  this.selectedCity = get([
    'locality',
    'postal_town',
    'sublocality',
    'sublocality_level_1',
    'administrative_area_level_3'
  ]) || '';

  const stateCode = get(['administrative_area_level_1']) || '';
  const matchedState = this.stateList.find(
    s => s.toLowerCase() === stateCode.toLowerCase() || s.toLowerCase().includes(stateCode.toLowerCase())
  );
  this.selectedState = matchedState || stateCode || '';

  if (place.geometry?.location) {
    this.lat = place.geometry.location.lat();
    this.lng = place.geometry.location.lng();
  }

  // If any component missing, fallback to geocode
  if (!this.selectedCity || !this.selectedState || !this.zip) {
    this.geocodeManualAddress(this.address);
  }
}


  async presentToast(message: string, color: string = 'success') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
    });
    toast.present();
  }

  async submit() {
    this.me = await this.auth.currentUser();
    if (!this.me) {
      this.presentToast('Not logged in', 'danger');
      return;
    }

    if (!this.homeowner_name || !this.address || !this.zip || !this.project_type) {
      this.presentToast('Please fill all required fields', 'danger');
      return;
    }
    const unRated = this.ratingCategories.some(cat => cat.model === 0);
if (unRated) {
  this.presentToast('Please rate all categories before submitting', 'danger');
  return;
}
    const loading = await this.loadingCtrl.create({
      message: 'Submitting review...',
      spinner: 'crescent',
    });
    await loading.present();

    try {
      const review: any = {
        contractor_id: this.me.id,
        homeowner_name: this.homeowner_name,
        address: this.address,
        zip: this.zip,
        project_type: this.project_type,
        project_date: this.project_date || null,
        comments: this.comments,
        lat: this.lat,
        lng: this.lng,
        state: this.selectedState,
        city: this.selectedCity
      };

      this.ratingCategories.forEach(cat => {
        review[cat.key] = cat.model;
      });

      review.auto_flag = this.ratingCategories.some(r => r.model <= 2);

      const uploadedUrls: string[] = [];
      for (const file of this.files) {
        const ext = file.name.split('.').pop();
        const path = `reviews/${this.me.id}_${Date.now()}.${ext}`;
        const { error } = await supabase.storage
          .from('profile-images')
          .upload(path, file, { upsert: true });
        if (error) throw error;

        const { data } = supabase.storage.from('profile-images').getPublicUrl(path);
        uploadedUrls.push(data.publicUrl);
      }

      await this.reviewSvc.submitReview({ ...review, files: uploadedUrls });
      this.router.navigateByUrl('/tabs/thanks', { replaceUrl: true });
    } catch (e: any) {
      this.presentToast(e.message || 'Failed to submit review', 'danger');
    } finally {
      loading.dismiss();
    }
  }

  onFileChange(ev: any) {
    this.files = Array.from(ev.target.files || []);
  }
}
