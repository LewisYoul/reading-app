import { Preferences } from "@capacitor/preferences";
import { useEffect, useState, useCallback } from "react";
import { CapacitorHttp } from '@capacitor/core';
import './Bin.css';
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonList, IonModal, IonSpinner, IonTitle, IonToast, IonToolbar } from "@ionic/react";
import { close } from 'ionicons/icons';

type Collection = {
  service: string;
  round: string;
  schedule: string;
  day: string;
  date: string;
}

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

export default function Bin() {
  const [address, setAddress] = useState<Address | null>(null)
  const [collections, setCollections] = useState<Collection[] | null>(null)
  const [nextCollection, setNextCollection] = useState<Collection | null>(null)
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const [isAddressModalOpen, setIsAddressModalOpen] = useState<boolean>(false)
  
  // Address setting states
  const [postcode, setPostcode] = useState<string>('');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [showToast, setShowToast] = useState<boolean>(false);

  const SELECTED_ADDRESS_KEY = 'bin_collection_selected_address';

  useEffect(() => {
    const getAddress = async () => {
      const storedAddress = await Preferences.get({ key: SELECTED_ADDRESS_KEY })

      console.log('storedAddress', storedAddress)

      if (storedAddress.value) {
        setAddress(JSON.parse(storedAddress.value) as Address)
      }
    }
    
    getAddress()
  }, [])

  useEffect(() => {
    const fetchCollections = async () => {
      if (!address) return

      console.log('address', address)
      const response = await CapacitorHttp.get({
        url: `http://116.203.83.250/api/reading/api/collections/${address.AccountSiteUprn}`
      });

      console.log('response', response)

      setCollections(response.data.collections)
      setNextCollection(response.data.collections[0])
    }

    fetchCollections()
  }, [address])

  const getServiceIcon = (service: string): string => {
    const serviceLower = service.toLowerCase();
    if (serviceLower.includes('food')) return '🍎';
    if (serviceLower.includes('recycling')) return '♻️';
    if (serviceLower.includes('garden') || serviceLower.includes('green')) return '🌿';
    if (serviceLower.includes('domestic') || serviceLower.includes('general')) return '🗑️';
    return '📦';
  };

  const getServiceShortName = (service: string): string => {
    const serviceLower = service.toLowerCase();
    if (serviceLower.includes('food')) return 'Food';
    if (serviceLower.includes('recycling')) return 'Recycling';
    if (serviceLower.includes('garden') || serviceLower.includes('green')) return 'Garden';
    if (serviceLower.includes('domestic') || serviceLower.includes('general')) return 'Waste';
    return 'Other';
  };

  const getServiceCssClass = (service: string): string => {
    const serviceLower = service.toLowerCase();
    if (serviceLower.includes('food')) return 'food';
    if (serviceLower.includes('recycling')) return 'recycling';
    if (serviceLower.includes('garden') || serviceLower.includes('green')) return 'garden';
    if (serviceLower.includes('domestic') || serviceLower.includes('general')) return 'waste';
    return 'default';
  };

  const formatDate = (dateString: string): string => {
    // Parse DD/MM/YYYY HH:MM:SS format
    const [datePart] = dateString.split(' ');
    const [day, month, year] = datePart.split('/');
    
    // Create date object (month is 0-indexed in JS)
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    
    return date.toLocaleDateString('en-GB', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    });
  };

  // Address setting functions
  const validatePostcode = (postcode: string): boolean => {
    const postcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}$/i;
    return postcodeRegex.test(postcode.replace(/\s/g, ''));
  };

  const formatPostcode = (postcode: string): string => {
    return postcode.replace(/\s/g, '').toUpperCase();
  };

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
      
      const response = await CapacitorHttp.get({
        url: `http://116.203.83.250/api/reading/rbc/getaddresses/${formattedPostcode}`
      });
      
      if (response.status !== 200) {
        if (response.status === 404) {
          throw new Error('No addresses found for this postcode');
        }
        throw new Error(`Failed to fetch addresses: ${response.status}`);
      }

      const data = response.data;
      
      if (data.Addresses && Array.isArray(data.Addresses)) {
        setAddresses(data.Addresses);
        console.log('Found', data.Addresses.length, 'addresses');
      } else {
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

  const handleAddressSelect = async (selectedAddress: Address) => {
    setAddress(selectedAddress);
    await saveSelectedAddress(selectedAddress);
    setIsAddressModalOpen(false);
    
    // Reset address modal state
    setPostcode('');
    setAddresses([]);
    setError('');
  };

  const handleSetAddress = () => {
    setIsAddressModalOpen(true);
  };

  return (
    <div>
      {/* Collections Modal */}
      <IonModal isOpen={isOpen}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>{address?.SiteShortAddress}</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setIsOpen(false)}>
                <IonIcon icon={close} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <IonList>
            {collections?.map((collection, index) => (
              <IonItem key={`${collection.date}-${index}`} className="collection-item">
                <div className="collection-icon" slot="start">
                  {getServiceIcon(collection.service)}
                </div>
                <IonLabel>
                  <h2>{getServiceShortName(collection.service)}</h2>
                  <p>{formatDate(collection.date)}</p>
                </IonLabel>
              </IonItem>
            ))}
          </IonList>
        </IonContent>
      </IonModal>

      {/* Address Setting Modal */}
      <IonModal isOpen={isAddressModalOpen} onDidDismiss={() => setIsAddressModalOpen(false)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Set Address</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setIsAddressModalOpen(false)}>
                <IonIcon icon={close} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div className="address-lookup-section">
            <h2>Find Your Address</h2>
            <p>Enter your postcode to find your bin collection schedule:</p>
            
            <IonItem>
              <IonLabel position="stacked">Enter your postcode</IonLabel>
              <IonInput
                value={postcode}
                placeholder="e.g. RG30 1DB"
                onIonInput={(e) => setPostcode(e.detail.value!)}
                clearInput
                disabled={loading}
              />
            </IonItem>
            
            <IonButton 
              expand="block" 
              onClick={searchAddresses}
              disabled={loading || !postcode.trim()}
              style={{ marginTop: '16px' }}
            >
              {loading ? <IonSpinner name="crescent" /> : 'Search'}
            </IonButton>

            {addresses.length > 0 && (
              <div className="addresses-section" style={{ marginTop: '24px' }}>
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
              <div className="no-results" style={{ marginTop: '16px' }}>
                <p>No addresses found. Please check your postcode and try again.</p>
              </div>
            )}
          </div>
        </IonContent>
      </IonModal>

      {/* Main Bin Display */}
      {address && nextCollection ? (
        <div 
          className={`bin-square ${getServiceCssClass(nextCollection.service)}`} 
          onClick={() => setIsOpen(true)}
        >
          <div className="bin-icon">{getServiceIcon(nextCollection.service)}</div>
          <h1>{getServiceShortName(nextCollection.service)}</h1>
          <h3>{formatDate(nextCollection.date)}</h3>
        </div>
      ) : address && !nextCollection ? (
        <div className="bin-square bin-loading">
          <div className="bin-icon">⏳</div>
          <h1>Loading</h1>
          <h3>Fetching collection data...</h3>
        </div>
      ) : (
        <div className="bin-square set-address" onClick={handleSetAddress}>
          <div className="bin-icon">📍</div>
          <h1>Set Address</h1>
          <h3>Configure your location</h3>
        </div>
      )}

      {/* Toast for errors */}
      <IonToast
        isOpen={showToast}
        message={error}
        duration={3000}
        color="danger"
        onDidDismiss={() => setShowToast(false)}
      />
    </div>
  );
}