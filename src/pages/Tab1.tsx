import { IonContent, IonPage, IonButton } from '@ionic/react';
import { useState } from 'react';
import './Tab1.css';
import WelcomeHeader from '../components/WelcomeHeader';
import WeatherSummary from '../components/WeatherSummary';
import BinCollection from '../components/BinCollection';

const Tab1: React.FC = () => {
  const [isBinCollectionOpen, setIsBinCollectionOpen] = useState(false);

  return (
    <IonPage>
      <IonContent fullscreen>
        <WelcomeHeader />
        <WeatherSummary />
        
        <div className="blocky-button-container">
          <IonButton 
            className="blocky-button"
            expand="block"
            size="large"
            onClick={() => setIsBinCollectionOpen(true)}
          >
            Bin Collection
          </IonButton>
        </div>

        <BinCollection 
          isOpen={isBinCollectionOpen} 
          onClose={() => setIsBinCollectionOpen(false)} 
        />
      </IonContent>
    </IonPage>
  );
};

export default Tab1;
