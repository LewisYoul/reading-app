import React, { useState, useEffect, useCallback } from 'react';
import { 
  IonModal, 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonContent, 
  IonButton, 
  IonButtons, 
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonSpinner,
  IonToast
} from '@ionic/react';
import { Preferences } from '@capacitor/preferences';
import { close } from 'ionicons/icons';
import './BinCollection.css';

interface Address {
  AccountSiteUprn: string;
  SiteShortAddress: string;
  SiteAddressPrefix?: string;
  SiteAddress2?: string;
  SiteLatitude?: string;
  SiteLongitude?: string;
  SiteNorthing?: string;
  SiteEasting?: string;
  SiteId?: string;
  AccountSiteId?: string;
  usrn?: string;
}

interface Collection {
  service: string;
  round: string;
  schedule: string;
  day: string;
  date: string;
  read_date: string;
}

interface BinCollectionProps {
  isOpen: boolean;
  onClose: () => void;
}

const BinCollection: React.FC<BinCollectionProps> = ({ isOpen, onClose }) => {
  const [postcode, setPostcode] = useState<string>('');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [collectionsLoading, setCollectionsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [showToast, setShowToast] = useState<boolean>(false);

  // Preferences keys
  const POSTCODE_KEY = 'bin_collection_postcode';
  const SELECTED_ADDRESS_KEY = 'bin_collection_selected_address';

  // Save postcode to preferences
  const savePostcode = async (postcodeValue: string) => {
    try {
      await Preferences.set({
        key: POSTCODE_KEY,
        value: postcodeValue
      });
      console.log('Postcode saved to preferences:', postcodeValue);
    } catch (error) {
      console.error('Error saving postcode to preferences:', error);
    }
  };

  // Save selected address to preferences
  const saveSelectedAddress = async (address: Address) => {
    try {
      await Preferences.set({
        key: SELECTED_ADDRESS_KEY,
        value: JSON.stringify(address)
      });
      console.log('Selected address saved to preferences:', address.SiteShortAddress);
    } catch (error) {
      console.error('Error saving selected address to preferences:', error);
    }
  };


  const validatePostcode = (postcode: string): boolean => {
    // Basic UK postcode validation
    const postcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}$/i;
    return postcodeRegex.test(postcode.replace(/\s/g, ''));
  };

  const formatPostcode = (postcode: string): string => {
    // Remove spaces and convert to uppercase
    return postcode.replace(/\s/g, '').toUpperCase();
  };

  const searchAddresses = useCallback(async () => {
    if (!postcode.trim()) {
      setError('Please enter a postcode');
      setShowToast(true);
      return;
    }

    if (!validatePostcode(postcode)) {
      setError('Please enter a valid UK postcode');
      setShowToast(true);
      return;
    }

    setLoading(true);
    setError('');
    setAddresses([]);

    try {
      const formattedPostcode = formatPostcode(postcode);
      console.log('Searching for postcode:', formattedPostcode);
      
      // Save postcode to preferences when searching
      await savePostcode(formattedPostcode);
      
      const response = await fetch(`http://116.203.83.250/api/reading/rbc/getaddresses/${formattedPostcode}`);
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('No addresses found for this postcode');
        }
        throw new Error(`Failed to fetch addresses: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('API response:', data);
      
      // The API response has an "Addresses" array
      if (data.Addresses && Array.isArray(data.Addresses)) {
        setAddresses(data.Addresses);
        console.log('Found', data.Addresses.length, 'addresses');
      } else {
        console.log('No Addresses array found in response');
        throw new Error('No addresses found for this postcode');
      }
      
    } catch (err) {
      console.error('Error fetching addresses:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch addresses';
      setError(errorMessage);
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  }, [postcode]);

  // Debounced search function
  const debouncedSearchAddresses = useCallback(() => {
    const timeoutId = setTimeout(() => {
      if (postcode.trim() && validatePostcode(postcode)) {
        searchAddresses();
      } else if (postcode.trim() && !validatePostcode(postcode)) {
        // Clear addresses if postcode is invalid
        setAddresses([]);
        setSelectedAddress(null);
        setCollections([]);
      } else {
        // Clear everything if postcode is empty
        setAddresses([]);
        setSelectedAddress(null);
        setCollections([]);
        setError('');
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [postcode, searchAddresses]);


  // Auto-search when postcode changes
  useEffect(() => {
    const cleanup = debouncedSearchAddresses();
    return cleanup;
  }, [debouncedSearchAddresses]);

  const fetchCollections = useCallback(async (uprn: string) => {
    setCollectionsLoading(true);
    setError('');
    
    try {
      console.log('Fetching collections for UPRN:', uprn);
      
      // Use NestJS API proxy server
      const response = await fetch(`http://116.203.83.250/api/reading/api/collections/${uprn}`);
      console.log('Collections response status:', response.status);
      console.log('Collections response headers:', response.headers);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('No collection data found for this address');
        }
        throw new Error(`Failed to fetch collections: ${response.status} ${response.statusText}`);
      }

      const responseText = await response.text();
      console.log('Raw response text:', responseText.substring(0, 500));
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse JSON:', parseError);
        if (responseText.includes('<!doctype html>')) {
          throw new Error('Dev server proxy not working. Please restart the dev server (npm run dev) after vite.config.ts changes.');
        }
        throw new Error('Invalid response format from server');
      }
      
      console.log('Collections API response:', data);
      
      if (data.success && data.collections && Array.isArray(data.collections)) {
        // Filter to only show future collections (including today)
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to start of today
        console.log('Today date for filtering:', today.toISOString());
        
        const futureCollections = data.collections
        
        setCollections(futureCollections);
        console.log('Found', data.collections.length, 'total collections,', futureCollections.length, 'future collections');
      } else {
        console.log('No collections array found in response or API error');
        if (data.error_description) {
          throw new Error(data.error_description);
        }
        setCollections([]);
      }
      
    } catch (err) {
      console.error('Error fetching collections:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch collection data';
      setError(errorMessage);
      setShowToast(true);
      setCollections([]);
    } finally {
      setCollectionsLoading(false);
    }
  }, []);

  // Load saved preferences
  const loadSavedData = useCallback(async () => {
    try {
      // Load saved postcode
      const savedPostcode = await Preferences.get({ key: POSTCODE_KEY });
      if (savedPostcode.value) {
        setPostcode(savedPostcode.value);
        console.log('Loaded saved postcode:', savedPostcode.value);
      }

      // Load saved address
      const savedAddress = await Preferences.get({ key: SELECTED_ADDRESS_KEY });
      if (savedAddress.value) {
        const address = JSON.parse(savedAddress.value) as Address;
        setSelectedAddress(address);
        console.log('Loaded saved address:', address.SiteShortAddress);
        
        // Automatically fetch collections for the saved address
        await fetchCollections(address.AccountSiteUprn);
      }
    } catch (error) {
      console.error('Error loading saved data from preferences:', error);
    }
  }, [fetchCollections]);

  // Load saved data when component mounts
  useEffect(() => {
    if (isOpen) {
      loadSavedData();
    }
  }, [isOpen, loadSavedData]);

  const handleAddressSelect = async (address: Address) => {
    setSelectedAddress(address);
    console.log('Selected address:', address);
    
    // Save selected address to preferences
    await saveSelectedAddress(address);
    
    // Fetch collection data for the selected address
    await fetchCollections(address.AccountSiteUprn);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    // Enter key now just blurs the input since search is automatic
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  const formatCollectionDate = (collection: Collection): { date: string; dayOfWeek: string } => {
    const date = new Date(collection.date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Use the read_date from API if available, otherwise format ourselves
    if (collection.read_date) {
      // Check if it's today or tomorrow
      if (date.toDateString() === today.toDateString()) {
        return { date: `Today (${collection.read_date})`, dayOfWeek: collection.day };
      } else if (date.toDateString() === tomorrow.toDateString()) {
        return { date: `Tomorrow (${collection.read_date})`, dayOfWeek: collection.day };
      } else {
        return { date: collection.read_date, dayOfWeek: collection.day };
      }
    } else {
      // Fallback to manual formatting
      const dayOfWeek = date.toLocaleDateString('en-GB', { weekday: 'long' });
      const formattedDate = date.toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
      
      if (date.toDateString() === today.toDateString()) {
        return { date: `Today (${formattedDate})`, dayOfWeek };
      } else if (date.toDateString() === tomorrow.toDateString()) {
        return { date: `Tomorrow (${formattedDate})`, dayOfWeek };
      } else {
        return { date: formattedDate, dayOfWeek };
      }
    }
  };

  const getServiceIcon = (service: string): string => {
    const serviceLower = service.toLowerCase();
    if (serviceLower.includes('food')) return '🍎';
    if (serviceLower.includes('recycling')) return '♻️';
    if (serviceLower.includes('garden') || serviceLower.includes('green')) return '🌿';
    if (serviceLower.includes('domestic') || serviceLower.includes('general')) return '🗑️';
    return '📦';
  };

  const getServiceColor = (service: string): string => {
    const serviceLower = service.toLowerCase();
    if (serviceLower.includes('recycling')) return 'success';
    if (serviceLower.includes('garden') || serviceLower.includes('green')) return 'secondary';
    if (serviceLower.includes('domestic') || serviceLower.includes('general')) return 'primary';
    return 'medium';
  };

  const resetForm = () => {
    setPostcode('');
    setAddresses([]);
    setSelectedAddress(null);
    setCollections([]);
    setError('');
  };

  const handleModalDismiss = () => {
    resetForm();
    onClose();
  };

  return (
    <>
      <IonModal isOpen={isOpen} onDidDismiss={handleModalDismiss}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Bin Collection</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={handleModalDismiss}>
                <IonIcon icon={close} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          {!selectedAddress ? (
            <div className="address-lookup-section">
              <h2>Find Your Address</h2>
              <p>Enter your postcode to automatically search for your bin collection schedule:</p>
              
              <IonItem>
                <IonLabel position="stacked">Enter your postcode</IonLabel>
                <IonInput
                  value={postcode}
                  placeholder="e.g. RG30 1DB"
                  onIonInput={(e) => setPostcode(e.detail.value!)}
                  onKeyPress={handleKeyPress}
                  clearInput
                  disabled={loading}
                />
              </IonItem>
              
              {loading && (
                <div className="loading-search" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '16px 0' }}>
                  <IonSpinner name="crescent" />
                  <span style={{ marginLeft: '8px' }}>Searching...</span>
                </div>
              )}

              {addresses.length > 0 && (
                <div className="addresses-section">
                  <h3>Select your address:</h3>
                  <IonList>
                    {addresses.map((address, index) => (
                      <IonItem
                        key={address.AccountSiteUprn || index}
                        button
                        onClick={() => handleAddressSelect(address)}
                        className="address-item"
                      >
                        <IonLabel>
                          <h2>{address.SiteShortAddress}</h2>
                          {address.AccountSiteUprn && (
                            <p>UPRN: {address.AccountSiteUprn}</p>
                          )}
                        </IonLabel>
                      </IonItem>
                    ))}
                  </IonList>
                </div>
              )}

              {addresses.length === 0 && !loading && postcode && (
                <div className="no-results">
                  <p>No addresses found. Please check your postcode and try again.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bin-collection-info">
              <h2>Bin Collection Schedule</h2>
              <div className="selected-address">
                <h3>Address:</h3>
                <p>{selectedAddress.SiteShortAddress}</p>
              </div>
              
              <IonButton 
                fill="outline" 
                onClick={() => setSelectedAddress(null)}
                className="change-address-button"
              >
                Change Address
              </IonButton>
              
              {collectionsLoading ? (
                <div className="loading-collections">
                  <IonSpinner name="crescent" />
                  <p>Loading collection schedule...</p>
                </div>
              ) : collections.length > 0 ? (
                <div className="collection-schedule">
                  <h3>Upcoming Collections:</h3>
                  <IonList>
                    {collections.map((collection, index) => {
                      const { date } = formatCollectionDate(collection);
                      const icon = getServiceIcon(collection.service);
                      const color = getServiceColor(collection.service);
                      
                      return (
                        <IonItem key={index} className={`collection-item collection-${color}`}>
                          <div className="collection-icon" slot="start">
                            {icon}
                          </div>
                          <IonLabel>
                            <h2>{collection.service.replace(/ Collection Service$/i, '')}</h2>
                            <p>{date}</p>
                          </IonLabel>
                        </IonItem>
                      );
                    })}
                  </IonList>
                </div>
              ) : (
                <div className="no-collections">
                  <p>No upcoming collections found for this address.</p>
                  <p>Please contact Reading Borough Council if you believe this is an error.</p>
                </div>
              )}
            </div>
          )}
        </IonContent>
      </IonModal>

      <IonToast
        isOpen={showToast}
        message={error}
        duration={3000}
        color="danger"
        onDidDismiss={() => setShowToast(false)}
      />
    </>
  );
};

export default BinCollection;
